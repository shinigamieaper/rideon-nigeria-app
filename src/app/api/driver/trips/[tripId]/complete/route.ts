export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendTripCompletedNotification } from "@/lib/fcmAdmin";

/**
 * POST /api/driver/trips/[tripId]/complete
 * Driver completes a trip
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await context.params;

    // Verify driver auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const driverId = decoded.uid;
    const role = decoded?.role ?? decoded?.claims?.role;

    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }

    // Fetch booking
    const bookingRef = adminDb.collection("bookings").doc(tripId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const data = bookingSnap.data() as any;

    // Verify ownership
    if (data?.driverId !== driverId) {
      return NextResponse.json(
        { error: "Forbidden: not your trip" },
        { status: 403 },
      );
    }

    // Validate current status
    const currentStatus = data?.status;
    if (currentStatus !== "in_progress") {
      return NextResponse.json(
        { error: `Cannot complete trip with status: ${currentStatus}` },
        { status: 400 },
      );
    }

    // Update booking to completed
    await bookingRef.update({
      status: "completed",
      completionTime: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.info(
      `[driver/trips/complete] Trip ${tripId} completed by driver ${driverId}`,
    );

    // Notify customer that trip is completed (fire and forget)
    if (data?.customerId) {
      sendTripCompletedNotification(data.customerId, {
        bookingId: tripId,
        fare: data?.fareNgn || data?.fare,
      }).catch((err) => {
        console.warn(`[driver/trips/complete] Failed to notify customer:`, err);
      });
    }

    return NextResponse.json(
      { success: true, status: "completed" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[POST /api/driver/trips/[tripId]/complete] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete trip" },
      { status: 500 },
    );
  }
}
