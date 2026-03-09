export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { syncDriveMyCarOffersForDriver } from "@/services/assignment";

/**
 * GET /api/driver/trips/[tripId]
 * Fetch trip details for a driver (driver-specific view)
 */
export async function GET(
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
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;

    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }

    // Fetch booking from Firestore
    const bookingRef = adminDb.collection("bookings").doc(tripId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const data = bookingSnap.data() as any;

    // Verify this trip belongs to the authenticated driver OR that they have an active offer for it
    const assignedDriverId = data?.driverId ? String(data.driverId) : "";
    if (assignedDriverId && assignedDriverId !== driverId) {
      return NextResponse.json(
        { error: "Trip already taken by another driver." },
        { status: 409 },
      );
    }

    const accessViaOffer = assignedDriverId !== driverId;
    let offerStatus: string | null = null;
    if (accessViaOffer) {
      try {
        await syncDriveMyCarOffersForDriver(driverId, {
          maxBookings: 50,
          maxOffers: 25,
          throttleMs: 20000,
        });
      } catch (e) {
        console.warn(
          "[GET /api/driver/trips/[tripId]] offer sync attempt failed:",
          e,
        );
      }

      const offerId = `${tripId}_${driverId}`;
      const offerSnap = await adminDb
        .collection("booking_offers")
        .doc(offerId)
        .get();
      if (!offerSnap.exists) {
        return NextResponse.json(
          { error: "No active offer found for this trip." },
          { status: 403 },
        );
      }

      const offer = offerSnap.data() as any;
      offerStatus = String(offer?.status || "");
      const expiresAtMs = Number(offer?.expiresAtMs || 0);
      const nowMs = Date.now();
      if (expiresAtMs && expiresAtMs <= nowMs) {
        return NextResponse.json({ error: "Offer expired." }, { status: 410 });
      }
      if (offerStatus !== "pending" && offerStatus !== "accepted") {
        return NextResponse.json(
          { error: "Offer is no longer available." },
          { status: 410 },
        );
      }
    }

    // Extract coordinates
    let pickupCoords: [number, number] | undefined;
    let dropoffCoords: [number, number] | undefined;
    if (data?.pickupLocation?.coordinates) {
      pickupCoords = [
        data.pickupLocation.coordinates[0],
        data.pickupLocation.coordinates[1],
      ];
    }
    if (data?.dropoffLocation?.coordinates) {
      dropoffCoords = [
        data.dropoffLocation.coordinates[0],
        data.dropoffLocation.coordinates[1],
      ];
    }

    if (
      !pickupCoords &&
      Array.isArray(data?.pickupCoords) &&
      data.pickupCoords.length >= 2
    ) {
      pickupCoords = [data.pickupCoords[0], data.pickupCoords[1]];
    }
    if (
      !dropoffCoords &&
      Array.isArray(data?.dropoffCoords) &&
      data.dropoffCoords.length >= 2
    ) {
      dropoffCoords = [data.dropoffCoords[0], data.dropoffCoords[1]];
    }

    const scheduledPickupTime = data?.scheduledPickupTime?.toDate
      ? data.scheduledPickupTime.toDate().toISOString()
      : data?.scheduledPickupTime;

    const pickupPin =
      typeof data?.driveMyCar?.pickupPin === "string"
        ? String(data.driveMyCar.pickupPin).trim()
        : "";
    const pickupPinVerifiedAt = data?.driveMyCar?.pickupPinVerifiedAt?.toDate
      ? data.driveMyCar.pickupPinVerifiedAt.toDate().toISOString()
      : typeof data?.driveMyCar?.pickupPinVerifiedAt === "string"
        ? data.driveMyCar.pickupPinVerifiedAt
        : null;
    const pickupPinRequired = Boolean(pickupPin) && !pickupPinVerifiedAt;

    const customerInfoRaw = data?.customerInfo || null;
    const shouldMaskPhone = accessViaOffer && offerStatus !== "accepted";
    const customerInfo =
      shouldMaskPhone && customerInfoRaw
        ? { ...customerInfoRaw, phoneNumber: undefined }
        : customerInfoRaw;

    const fareNgn = Number(data?.fareNgn || data?.fare || 0) || 0;
    const payoutNgn =
      Number(data?.driverPayoutNgn || data?.driverPayout || 0) || 0;
    const effectivePayoutNgn =
      payoutNgn > 0 ? payoutNgn : Math.max(0, Math.round(fareNgn * 0.8));

    let customerInfoResolved: any = customerInfo;
    const customerIdRaw = String(data?.customerId || data?.uid || "").trim();
    if (
      (!customerInfoResolved || !customerInfoResolved?.name) &&
      customerIdRaw
    ) {
      try {
        const userSnap = await adminDb
          .collection("users")
          .doc(customerIdRaw)
          .get();
        if (userSnap.exists) {
          const u = userSnap.data() as any;
          const nm =
            `${String(u?.firstName || "")} ${String(u?.lastName || "")}`.trim();
          if (nm) {
            customerInfoResolved = {
              ...(customerInfoResolved || {}),
              name: nm,
            };
            if (shouldMaskPhone) {
              customerInfoResolved.phoneNumber = undefined;
            }
          }
        }
      } catch {}
    }

    // Return driver-focused trip details
    const tripDetail = {
      id: bookingSnap.id,
      pickupAddress: data?.pickupAddress || "",
      dropoffAddress: data?.dropoffAddress || undefined, // Optional for rentals
      pickupCoords,
      dropoffCoords,
      scheduledPickupTime,
      startDate: data?.startDate || null,
      startTime: data?.startTime || null,
      endDate: data?.endDate || null,
      endTime: data?.endTime || null,
      status: data?.status || "requested",
      pickupPinRequired,
      pickupPinVerifiedAt,
      customerId: data?.customerId || null,
      customerInfo: customerInfoResolved,
      fareNgn: effectivePayoutNgn,
      distanceKm: data?.distance || null,
      notes: data?.notes || data?.specialInstructions || "",
      // Rental-specific fields
      rentalUnit: data?.rentalUnit || undefined,
      city: data?.city || undefined,
      blocks: data?.blocks || undefined,
    };

    return NextResponse.json(tripDetail, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/driver/trips/[tripId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip details" },
      { status: 500 },
    );
  }
}
