export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

async function verifyAdmin(req: NextRequest) {
  return requireAdmin(req, ["super_admin", "admin", "ops_admin"]);
}

/**
 * GET /api/admin/users/customers/[customerId]/reservations
 * Fetch reservation history for a specific customer
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  try {
    const auth = await verifyAdmin(req);
    if (auth.response) return auth.response;

    const { customerId } = await params;

    const bookingsSnapshot = await adminDb
      .collection("bookings")
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const reservations = bookingsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status || "unknown",
        pickupAddress: data.pickupAddress || "",
        dropoffAddress: data.dropoffAddress || "",
        vehicleClass: data.vehicleClass || "",
        fareNgn: data.fareNgn || data.totalAmount || 0,
        startDate: data.startDate || null,
        startTime: data.startTime || null,
        driverName: data.driverInfo?.name || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        paymentStatus: data.payment?.status || "pending",
      };
    });

    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching customer reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 },
    );
  }
}
