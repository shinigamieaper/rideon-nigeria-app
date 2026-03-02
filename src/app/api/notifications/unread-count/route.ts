import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type Portal = "app" | "driver" | "full-time-driver";

function normalizePortal(raw: unknown): Portal | null {
  const p = typeof raw === "string" ? raw.trim() : "";
  if (p === "app" || p === "driver" || p === "full-time-driver") return p;
  return null;
}

function inferPortalFromType(type: unknown): Portal {
  const t = typeof type === "string" ? type.trim() : "";

  if (t.startsWith("placement_")) {
    if (t.endsWith("_update")) return "app";
    if (t.includes("access")) return "app";
    return "driver";
  }
  if (t.startsWith("driver_") || t.startsWith("recruitment_")) return "driver";
  if (t.startsWith("full_time_driver_")) return "full-time-driver";

  return "app";
}

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const portal = normalizePortal(searchParams.get("portal")) || "app";

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: any;
    try {
      decoded = await withTimeout(
        adminAuth.verifyIdToken(token),
        2500,
        "[unread-count] verifyIdToken",
      );
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = decoded.uid;

    if (isFirestoreInOutage()) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const unreadQuery = adminDb
      .collection("users")
      .doc(uid)
      .collection("notifications")
      .where("unread", "==", true)
      .select("unread", "portal", "type");

    let snap: any;
    try {
      snap = await withTimeout(unreadQuery.get(), 3000, "[unread-count] query");
    } catch (e) {
      markFirestoreOutage(30_000);
      console.warn(
        "[GET /api/notifications/unread-count] Firestore unavailable; returning 0",
        e,
      );
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const count = (snap?.docs || []).reduce((acc: number, d: any) => {
      const data = d?.data?.() ? d.data() : d?.data || {};
      const portalValue =
        normalizePortal(data?.portal) || inferPortalFromType(data?.type);
      return acc + (portalValue === portal ? 1 : 0);
    }, 0);

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    markFirestoreOutage(30_000);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
