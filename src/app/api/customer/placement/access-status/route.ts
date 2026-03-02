export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";

let firestoreOutageUntil = 0;

function isFirestoreInOutage(): boolean {
  return Date.now() < firestoreOutageUntil;
}

function markFirestoreOutage(ms: number) {
  firestoreOutageUntil = Math.max(firestoreOutageUntil, Date.now() + ms);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
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

async function getCustomerUid(req: Request): Promise<string | null> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  if (session) {
    const decoded = await verifyRideOnSessionCookie(session);
    if (decoded?.uid) return decoded.uid;
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  try {
    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[GET /api/customer/placement/access-status] verifyIdToken",
    );
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const uid = await getCustomerUid(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isFirestoreInOutage()) {
      return NextResponse.json(
        {
          hasAccess: false,
          accessExpiresAt: null,
          purchaseId: null,
          savedDriverIds: [],
          unknown: true,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    const userSnap = await withTimeout(
      adminDb.collection("users").doc(uid).get(),
      2_500,
      "[GET /api/customer/placement/access-status] user doc",
    );
    const data = userSnap.exists ? (userSnap.data() as any) : {};

    const placementAccess =
      data?.placementAccess && typeof data.placementAccess === "object"
        ? data.placementAccess
        : {};

    const expiresAt = parseAccessExpiresAt(placementAccess?.accessExpiresAt);
    const now = new Date();

    const hasValidAccess = Boolean(
      expiresAt && expiresAt.getTime() > now.getTime(),
    );

    const savedDriverIds = Array.isArray(data?.savedDriverIds)
      ? data.savedDriverIds.filter((x: unknown) => typeof x === "string")
      : [];

    return NextResponse.json(
      {
        hasAccess: hasValidAccess,
        accessExpiresAt: expiresAt ? expiresAt.toISOString() : null,
        purchaseId:
          typeof placementAccess?.purchaseId === "string"
            ? placementAccess.purchaseId
            : null,
        savedDriverIds,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/customer/placement/access-status] Error:", error);
    markFirestoreOutage(60_000);
    return NextResponse.json(
      {
        hasAccess: false,
        accessExpiresAt: null,
        purchaseId: null,
        savedDriverIds: [],
        unknown: true,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
