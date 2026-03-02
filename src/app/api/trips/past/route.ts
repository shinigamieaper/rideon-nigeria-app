import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/trips/past
// Returns an array of past bookings for the authenticated user.
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const now = new Date();

    // Pull a reasonable page of data and filter in memory for MVP simplicity.
    const snap = await adminDb
      .collection("bookings")
      .where("uid", "==", uid)
      .limit(100)
      .get();

    const trips: any[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;
      const status: string = String(d.status || "confirmed");

      // Compute scheduled time
      const sched: Date | null = (() => {
        try {
          const t =
            d.scheduledPickupTime?.toDate?.() ?? d.scheduledPickupTime ?? null;
          if (t) {
            const dt = new Date(t);
            if (!isNaN(dt.getTime())) return dt;
          }
        } catch {}
        if (d.startDate) {
          const [y, m, dd] = String(d.startDate)
            .split("-")
            .map((n: string) => parseInt(n, 10));
          const [hh, mm] = String(d.startTime || "00:00")
            .split(":")
            .map((n: string) => parseInt(n, 10));
          const dt = new Date(
            y || 1970,
            (m || 1) - 1,
            dd || 1,
            hh || 0,
            mm || 0,
          );
          return isNaN(dt.getTime()) ? null : dt;
        }
        return null;
      })();

      const completion: Date | null = (() => {
        try {
          const c = d.completionTime?.toDate?.() ?? d.completionTime ?? null;
          if (c) {
            const dt = new Date(c);
            if (!isNaN(dt.getTime())) return dt;
          }
        } catch {}
        return null;
      })();

      const isCancelled = [
        "cancelled",
        "cancelled_by_customer",
        "cancelled_by_driver",
      ].includes(status);
      const isCompleted = status === "completed";
      const isPastByTime = sched ? sched.getTime() < now.getTime() : false;

      if (isCancelled || isCompleted || isPastByTime) {
        trips.push({
          id: doc.id,
          pickupAddress: d.pickupAddress ?? "",
          dropoffAddress: d.dropoffAddress ?? "",
          completedAt:
            completion ?? sched ?? (d.createdAt ? new Date(d.createdAt) : null),
          fareNgn: d.fareNgn ?? null,
        });
      }
    });

    // Sort by most recent first
    trips.sort((a, b) => {
      const ad = new Date(a.completedAt || 0).getTime();
      const bd = new Date(b.completedAt || 0).getTime();
      return bd - ad;
    });

    return NextResponse.json({ trips }, { status: 200 });
  } catch (error) {
    console.error("Error fetching past trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch past trips." },
      { status: 500 },
    );
  }
}
