export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

// GET /api/admin/drivers/[driverId]/bookings - Recent bookings for a driver
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ driverId: string }> },
) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
      "driver_admin",
    ]);
    if (response) return response;

    const { driverId } = await context.params;

    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "5", 10),
      50,
    );

    const query: FirebaseFirestore.Query = adminDb
      .collection("bookings")
      .where("driverId", "==", driverId)
      .orderBy("createdAt", "desc")
      .limit(limit);

    const snap = await query.get();
    const bookings: any[] = [];

    snap.forEach((doc) => {
      const d = doc.data();
      const createdAt = d.createdAt?.toDate?.() || null;
      const driverPayoutNgn = d.driverPayoutNgn || d.driverPayout || 0;

      bookings.push({
        id: doc.id,
        pickupAddress: d.pickupAddress || "",
        dropoffAddress: d.dropoffAddress || "",
        status: d.status || "requested",
        fareNgn: d.fareNgn || 0,
        driverPayoutNgn: Number(driverPayoutNgn) || 0,
        driverPaid: d.driverPaid === true,
        scheduledPickupTime:
          d.scheduledPickupTime?.toDate?.()?.toISOString() || null,
        createdAt: createdAt?.toISOString() || null,
        paymentStatus: d.payment?.status || "pending",
      });
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching driver bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver bookings." },
      { status: 500 },
    );
  }
}
