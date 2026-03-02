export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { assignDriverToBooking } from "@/services/assignment";
import { requireAdmin } from "@/lib/adminRbac";

/**
 * POST /api/admin/bookings/[bookingId]/assign-driver
 *
 * Manually assigns a driver to a booking (admin only).
 *
 * Request body:
 * - driverId: string - The driver's UID to assign
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    // Parse request body
    const body = await req.json();
    const { driverId } = body;

    if (!driverId || typeof driverId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid driverId" },
        { status: 400 },
      );
    }

    // Assign driver to booking (throws on failure)
    await assignDriverToBooking(bookingId, driverId);

    return NextResponse.json(
      { success: true, message: "Driver assigned successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(
      "[POST /api/admin/bookings/[bookingId]/assign-driver] Error:",
      error,
    );
    return NextResponse.json(
      { error: error?.message || "Failed to assign driver" },
      { status: 500 },
    );
  }
}
