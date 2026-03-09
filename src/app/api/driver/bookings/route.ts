import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/driver/bookings?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";
    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }
    const uid = decoded.uid;

    const start = (searchParams.get("start") || "").trim();
    const end = (searchParams.get("end") || "").trim();

    if (
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(start) ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(end)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing start/end (YYYY-MM-DD)." },
        { status: 400 },
      );
    }

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    // Filter by driverId and scheduledPickupTime within range
    // IMPORTANT: Only show trips the driver has ACCEPTED (not just assigned)
    // Statuses after acceptance: confirmed, en_route, in_progress, completed
    const snap = await adminDb
      .collection("bookings")
      .where("driverId", "==", uid)
      .where("status", "in", [
        "driver_assigned",
        "en_route",
        "in_progress",
        "completed",
      ])
      .where("scheduledPickupTime", ">=", startDate)
      .where("scheduledPickupTime", "<=", endDate)
      .get();

    const bookings = snap.docs.map((d) => {
      const v = d.data() as any;
      const isDriveMyCar =
        String(v?.service || "") === "drive_my_car" || !!v?.driveMyCar;
      const fareNgn = Number(v.fareNgn ?? v.fare ?? 0) || 0;
      const payoutNgn = Number(v.driverPayoutNgn ?? v.driverPayout ?? 0) || 0;
      const effectivePayoutNgn = isDriveMyCar
        ? payoutNgn > 0
          ? payoutNgn
          : Math.max(0, Math.round(fareNgn * 0.8))
        : fareNgn;
      return {
        id: d.id,
        pickupAddress: v.pickupAddress,
        dropoffAddress: v.dropoffAddress || null, // Optional for rentals
        scheduledPickupTime:
          v.scheduledPickupTime?.toDate?.() ?? v.scheduledPickupTime ?? null,
        status: v.status ?? "confirmed",
        // Rental-specific fields
        rentalUnit: v.rentalUnit ?? null, // '4h' | 'day'
        city: v.city ?? null,
        blocks: v.blocks ?? null, // Number of rental units
        fareNgn: effectivePayoutNgn,
        startDate: v.startDate ?? null,
        startTime: v.startTime ?? null,
        endDate: v.endDate ?? null,
        endTime: v.endTime ?? null,
      };
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching driver bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings." },
      { status: 500 },
    );
  }
}
