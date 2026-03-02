export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/driver/trips/[tripId]/start
 * Driver starts an assigned trip
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

    const isDriveMyCar =
      String(data?.service || "") === "drive_my_car" || !!data?.driveMyCar;
    if (!isDriveMyCar) {
      return NextResponse.json(
        { error: "Invalid service type." },
        { status: 400 },
      );
    }

    // Verify ownership
    if (data?.driverId !== driverId) {
      return NextResponse.json(
        { error: "Forbidden: not your trip" },
        { status: 403 },
      );
    }

    // Validate current status: driver must Accept first (en_route)
    const currentStatus = data?.status;
    if (currentStatus !== "en_route") {
      return NextResponse.json(
        {
          error: `Cannot start trip with status: ${currentStatus}. Accept the trip first.`,
        },
        { status: 400 },
      );
    }

    const expectedPin =
      typeof data?.driveMyCar?.pickupPin === "string"
        ? String(data.driveMyCar.pickupPin).trim()
        : "";
    if (expectedPin) {
      const body = await req.json().catch(() => ({}) as any);
      const providedPin =
        typeof body?.pickupPin === "string"
          ? String(body.pickupPin).trim()
          : "";
      if (!providedPin) {
        return NextResponse.json(
          { error: "Pickup PIN is required." },
          { status: 400 },
        );
      }
      if (providedPin !== expectedPin) {
        return NextResponse.json(
          { error: "Invalid Pickup PIN." },
          { status: 400 },
        );
      }
    }

    // Update booking to in_progress
    await bookingRef.update({
      status: "in_progress",
      actualPickupTime: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(expectedPin
        ? {
            "driveMyCar.pickupPinVerifiedAt": FieldValue.serverTimestamp(),
            "driveMyCar.pickupPinVerifiedBy": driverId,
          }
        : {}),
    });

    console.info(
      `[driver/trips/start] Trip ${tripId} started by driver ${driverId}`,
    );

    return NextResponse.json(
      { success: true, status: "in_progress" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[POST /api/driver/trips/[tripId]/start] Error:", error);
    return NextResponse.json(
      { error: "Failed to start trip" },
      { status: 500 },
    );
  }
}
