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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 50)
        : 20;

    const oversample = Math.min(50, Math.max(limit, limit * 4));

    const portal = normalizePortal(searchParams.get("portal")) || "app";

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const snap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("notifications")
      .orderBy("createdAt", "desc")
      .limit(oversample)
      .get();

    const notifications = snap.docs
      .map((d) => {
        const data = d.data() as any;
        const createdAt =
          data?.createdAt?.toDate?.() ||
          (data?.createdAt instanceof Date ? data.createdAt : null);
        const portalValue =
          normalizePortal(data?.portal) || inferPortalFromType(data?.type);
        return {
          id: d.id,
          title: String(data?.title || "Notification"),
          description:
            typeof data?.description === "string"
              ? data.description
              : typeof data?.message === "string"
                ? data.message
                : undefined,
          createdAt: createdAt ? createdAt.toISOString() : undefined,
          unread: Boolean(data?.unread === true),
          portal: portalValue,
        };
      })
      .filter((n) => n.portal === portal)
      .slice(0, limit);

    const trimmed = notifications.map(({ portal: _portal, ...rest }) => rest);

    return NextResponse.json({ notifications: trimmed }, { status: 200 });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications." },
      { status: 500 },
    );
  }
}
