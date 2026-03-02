import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export const runtime = "nodejs";

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeDays(n: unknown): number {
  const v = nf(n);
  const days = v == null ? 7 : Math.max(1, Math.min(365, Math.round(v)));
  return days;
}

async function ensurePlacementPricingEnabled() {
  const ref = adminDb.collection("config").doc("placement_access_pricing");
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as any) : {};
  if (
    data?.enabled === true &&
    Array.isArray(data?.accessTiers) &&
    data.accessTiers.length > 0
  )
    return;

  await ref.set(
    {
      enabled: true,
      accessTiers: [
        { durationDays: 7, priceNgn: 1000, label: "Starter" },
        { durationDays: 30, priceNgn: 3000, label: "Extended" },
      ],
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function resolveCustomerEmail(
  uid: string,
  decoded: any,
): Promise<string | null> {
  const fromToken =
    typeof decoded?.email === "string" ? decoded.email.trim() : "";
  if (fromToken) return fromToken;

  try {
    const u = await adminAuth.getUser(uid);
    if (u?.email) return u.email;
  } catch {}

  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    const d = snap.exists ? (snap.data() as any) : {};
    if (typeof d?.email === "string" && d.email.trim()) return d.email.trim();
  } catch {}

  return null;
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production." },
        { status: 403 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}) as any);
    const durationDays = normalizeDays(body?.durationDays);
    const sendEmail = body?.sendEmail !== false;

    await ensurePlacementPricingEnabled();

    const now = new Date();
    const accessExpiresAt = new Date(
      now.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );
    const accessExpiresAtTs = Timestamp.fromDate(accessExpiresAt);

    const purchaseRef = adminDb.collection("placement_access_purchases").doc();
    const reference = `dev_placement_${purchaseRef.id}_${Date.now()}`;

    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection("users").doc(uid);

      tx.set(
        purchaseRef,
        {
          customerId: uid,
          tierDurationDays: durationDays,
          amountNgn: 0,
          paymentReference: reference,
          status: "completed",
          accessExpiresAt: accessExpiresAtTs,
          gateway: {
            provider: "dev",
            status: "success",
            reference,
            paidAt: now.toISOString(),
            currency: "NGN",
            amountKobo: 0,
            transactionId: null,
            authorizationCode: null,
          },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          completedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.set(
        userRef,
        {
          placementAccess: {
            hasAccess: true,
            accessExpiresAt: accessExpiresAtTs,
            purchaseId: purchaseRef.id,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    let emailSent = false;
    let emailSkipped = false;

    if (sendEmail) {
      try {
        const resend = getResendClient();
        const from = getEmailFrom();
        const to = await resolveCustomerEmail(uid, decoded);

        if (!resend || !from || !to) {
          emailSkipped = true;
        } else {
          await resend.emails.send({
            from,
            to,
            subject: "Your Hire-a-Driver access is active (Dev)",
            html: `
              <p>Your Hire-a-Driver access has been activated in the dev environment.</p>
              <p>Expiry: <strong>${accessExpiresAt.toLocaleString()}</strong></p>
              <p>RideOn Team</p>
            `,
          });
          emailSent = true;
        }
      } catch (e) {
        console.warn(
          "[dev/fake-placement-access-payment] Failed to send email",
          e,
        );
      }
    }

    const redirectUrl = `/app/payment/callback?purpose=placement_access&reference=${encodeURIComponent(reference)}`;

    return NextResponse.json(
      {
        reference,
        purchaseId: purchaseRef.id,
        accessExpiresAt: accessExpiresAt.toISOString(),
        redirectUrl,
        emailSent,
        emailSkipped,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in dev/fake-placement-access-payment:", error);
    return NextResponse.json(
      { error: "Failed to simulate payment." },
      { status: 500 },
    );
  }
}
