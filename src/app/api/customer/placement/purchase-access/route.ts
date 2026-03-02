export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type AccessTier = {
  durationDays: number;
  priceNgn: number;
  label: string;
};

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeDays(n: unknown): number | null {
  const v = nf(n);
  if (v == null) return null;
  const days = Math.round(v);
  if (days < 1) return null;
  if (days > 365) return 365;
  return days;
}

function parseAccessExpiresAt(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof (raw as any)?.toDate === "function") {
    try {
      return (raw as any).toDate();
    } catch {
      return null;
    }
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

async function getCustomerUid(
  req: Request,
): Promise<{ uid: string; email?: string } | null> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  if (session) {
    const decoded = await verifyRideOnSessionCookie(session);
    if (decoded?.uid) {
      return {
        uid: decoded.uid,
        email:
          typeof (decoded as any)?.email === "string"
            ? (decoded as any).email
            : undefined,
      };
    }
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") return null;
    return {
      uid: decoded.uid,
      email:
        typeof (decoded as any)?.email === "string"
          ? (decoded as any).email
          : undefined,
    };
  } catch {
    return null;
  }
}

function getBaseUrl(req: Request): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");

  const origin = (req.headers.get("origin") || "").trim();
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {}
  }

  const forwardedHost = (req.headers.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = (forwardedHost || req.headers.get("host") || "").trim();
  const forwardedProto = (req.headers.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const proto = forwardedProto || "https";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 },
      );
    }

    const authed = await getCustomerUid(req);
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = authed.uid;

    let customerEmail = authed.email;
    if (!customerEmail) {
      try {
        const u = await adminAuth.getUser(uid);
        customerEmail = u.email ?? undefined;
      } catch {}
    }
    if (!customerEmail) {
      try {
        const userSnap = await adminDb.collection("users").doc(uid).get();
        if (userSnap.exists) {
          const d = userSnap.data() as any;
          if (typeof d?.email === "string") customerEmail = d.email;
        }
      } catch {}
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required for payment." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const durationDays = normalizeDays(
      (body as any)?.durationDays ?? (body as any)?.tierDurationDays,
    );

    if (!durationDays) {
      return NextResponse.json(
        { error: "durationDays is required." },
        { status: 400 },
      );
    }

    const configSnap = await adminDb
      .collection("config")
      .doc("placement_access_pricing")
      .get();
    const configData = configSnap.exists ? (configSnap.data() as any) : {};
    const enabled = configData?.enabled === true;

    if (!enabled) {
      return NextResponse.json(
        { error: "This service is currently unavailable." },
        { status: 503 },
      );
    }

    const rawTiers = Array.isArray(configData?.accessTiers)
      ? configData.accessTiers
      : [];
    const tiers: AccessTier[] = rawTiers
      .map((t: any) => ({
        durationDays: Math.max(
          1,
          Math.min(365, Math.round(Number(t?.durationDays || 0))),
        ),
        priceNgn: Math.max(0, Math.round(Number(t?.priceNgn || 0))),
        label: typeof t?.label === "string" ? t.label.trim().slice(0, 40) : "",
      }))
      .filter(
        (t: AccessTier) =>
          Number.isFinite(t.durationDays) && t.durationDays > 0,
      );

    const tier = tiers.find((t) => t.durationDays === durationDays);
    if (!tier) {
      return NextResponse.json(
        { error: "Selected tier is not available." },
        { status: 400 },
      );
    }

    if (!tier.priceNgn || tier.priceNgn <= 0) {
      return NextResponse.json(
        { error: "This tier is not currently purchasable." },
        { status: 400 },
      );
    }

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const placementAccess =
      userData?.placementAccess && typeof userData.placementAccess === "object"
        ? userData.placementAccess
        : {};

    const existingExpiresAt = parseAccessExpiresAt(
      placementAccess?.accessExpiresAt,
    );
    const now = new Date();
    const base =
      existingExpiresAt && existingExpiresAt.getTime() > now.getTime()
        ? existingExpiresAt
        : now;
    const accessExpiresAt = new Date(
      base.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );
    const accessExpiresAtTs = Timestamp.fromDate(accessExpiresAt);

    const existingPurchaseId =
      typeof placementAccess?.purchaseId === "string"
        ? placementAccess.purchaseId
        : null;

    const purchaseRef = adminDb.collection("placement_access_purchases").doc();
    const reference = `placement_${purchaseRef.id}_${Date.now()}`;

    const purchaseDoc: Record<string, unknown> = {
      customerId: uid,
      tierDurationDays: durationDays,
      amountNgn: tier.priceNgn,
      paymentReference: reference,
      status: "pending",
      accessExpiresAt: accessExpiresAtTs,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (existingPurchaseId) {
      purchaseDoc.renewedFromPurchaseId = existingPurchaseId;
    }

    await purchaseRef.set(purchaseDoc, { merge: true });

    const baseUrl = getBaseUrl(req);
    const callback_url = `${baseUrl.replace(/\/$/, "")}/app/payment/callback?purpose=placement_access`;

    const amountKobo = Math.max(100, Math.round(tier.priceNgn * 100));

    const initResp = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountKobo,
          email: customerEmail,
          reference,
          callback_url,
          currency: "NGN",
          metadata: {
            type: "placement_access",
            purchaseId: purchaseRef.id,
            customerId: uid,
            tierDurationDays: durationDays,
          },
        }),
      },
    );

    const initJson = await initResp.json().catch(() => null);
    if (!initResp.ok || !initJson?.status) {
      try {
        await purchaseRef.set(
          {
            status: "failed",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } catch {}

      const message = initJson?.message || "Failed to initialize payment.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const authorization_url = String(initJson.data.authorization_url || "");

    if (!authorization_url) {
      return NextResponse.json(
        { error: "Payment initialization failed." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        authorization_url,
        reference,
        purchaseId: purchaseRef.id,
        accessExpiresAt: accessExpiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[POST /api/customer/placement/purchase-access] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to initialize payment." },
      { status: 500 },
    );
  }
}
