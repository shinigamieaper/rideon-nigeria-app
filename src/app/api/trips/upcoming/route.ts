import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/trips/upcoming
// Returns an array of upcoming bookings for the authenticated user.
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Prefer a filtered query if field exists; otherwise fetch a slice and filter in memory
    const now = new Date();

    // Firestore limitations: we can't apply OR on fields easily.
    // We'll pull a reasonable window and filter client-side for MVP reliability.
    const snap = await adminDb
      .collection("bookings")
      .where("uid", "==", uid)
      .limit(50)
      .get();

    const results: any[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;

      // Determine a comparable date: prefer scheduledPickupTime; else combine startDate + startTime
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

      const status: string = String(d.status || "confirmed");
      const isFuture = sched ? sched.getTime() >= now.getTime() : true; // if unknown, include as upcoming
      const paymentStatus: string = String(d?.payment?.status || "pending");
      const isPaid = paymentStatus === "succeeded";
      const isUpcomingStatus = [
        "confirmed",
        "driver_assigned",
        "en_route",
        "in_progress",
        "needs_reassignment",
      ].includes(status);

      if (isFuture && isUpcomingStatus && isPaid) {
        results.push({
          id: doc.id,
          pickupAddress: d.pickupAddress ?? "",
          dropoffAddress: d.dropoffAddress ?? "",
          pickupCoords: Array.isArray(d.pickupCoords)
            ? d.pickupCoords
            : undefined,
          dropoffCoords: Array.isArray(d.dropoffCoords)
            ? d.dropoffCoords
            : undefined,
          scheduledPickupTime: d.scheduledPickupTime ?? null,
          startDate: d.startDate ?? null,
          startTime: d.startTime ?? null,
          status,
          driverId: d.driverId ?? null,
          driverInfo: d.driverInfo ?? null,
          vehicleInfo: d.vehicleInfo ?? null,
          fareNgn: d.fareNgn ?? null,
        });
      }
    });

    // Sort by date ascending (soonest first)
    results.sort((a, b) => {
      const ad = new Date(
        a.scheduledPickupTime?.toDate?.() ??
          a.scheduledPickupTime ??
          `${a.startDate || ""}T${a.startTime || "00:00"}`,
      );
      const bd = new Date(
        b.scheduledPickupTime?.toDate?.() ??
          b.scheduledPickupTime ??
          `${b.startDate || ""}T${b.startTime || "00:00"}`,
      );
      return ad.getTime() - bd.getTime();
    });

    return NextResponse.json({ trips: results }, { status: 200 });
  } catch (error) {
    console.error("Error fetching upcoming trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming trips." },
      { status: 500 },
    );
  }
}
