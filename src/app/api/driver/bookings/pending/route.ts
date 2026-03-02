export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { syncDriveMyCarOffersForDriver } from "@/services/assignment";

/**
 * GET /api/driver/bookings/pending
 * Fetch pending trip offers for a driver to accept/reject
 * These are bookings assigned to the driver but not yet accepted
 */
export async function GET(req: NextRequest) {
  try {
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

    try {
      await syncDriveMyCarOffersForDriver(driverId, {
        maxBookings: 50,
        maxOffers: 25,
        throttleMs: 20000,
      });
    } catch (e) {
      console.warn("[driver/bookings/pending] offer sync attempt failed", e);
    }

    // Offer marketplace model:
    // - query booking_offers for this driver where status=='pending' and not expired
    // - join booking details for display
    const now = new Date();
    const nowMs = Date.now();
    let usedFallback = false;

    async function fetchWithOrder() {
      return await adminDb
        .collection("booking_offers")
        .where("driverId", "==", driverId)
        .where("status", "==", "pending")
        .where("expiresAtMs", ">", nowMs)
        .orderBy("expiresAtMs", "asc")
        .limit(25)
        .get();
    }

    async function fetchWithoutOrder() {
      return await adminDb
        .collection("booking_offers")
        .where("driverId", "==", driverId)
        .where("status", "==", "pending")
        .limit(50)
        .get();
    }

    let offerSnap: any;
    try {
      offerSnap = await fetchWithOrder();
    } catch (e: any) {
      const msg = String(e?.message || "");
      const code = (e && (e.code ?? e.status)) as unknown;
      if (msg.includes("requires an index") || code === 9) {
        console.warn(
          "[driver/bookings/pending] Missing index, falling back to equality-only offer query",
        );
        usedFallback = true;
        offerSnap = await fetchWithoutOrder();
      } else {
        throw e;
      }
    }

    function toIso(input: any): string | null {
      if (!input) return null;
      if (typeof input === "string") return input;
      if (input?.toDate) {
        try {
          return input.toDate().toISOString();
        } catch {
          return new Date().toISOString();
        }
      }
      if (input instanceof Date) return input.toISOString();
      return null;
    }

    const offerDocs = offerSnap.docs.slice(0, 25);
    const pendingBookingsRaw = await Promise.all(
      offerDocs.map(async (offerDoc: any) => {
        const o = offerDoc.data() as any;
        const bookingId =
          String(o?.bookingId || "").trim() ||
          String(offerDoc.id || "").split("_")[0] ||
          "";
        if (!bookingId) return null;

        const expiresAtMs = Number(o?.expiresAtMs || 0);
        if (!usedFallback && expiresAtMs && expiresAtMs <= nowMs) return null;
        if (usedFallback && expiresAtMs && expiresAtMs <= nowMs) return null;

        const bookingSnap = await adminDb
          .collection("bookings")
          .doc(bookingId)
          .get();
        if (!bookingSnap.exists) return null;
        const d = bookingSnap.data() as any;

        const isDriveMyCar =
          String(d?.service || "") === "drive_my_car" || !!d?.driveMyCar;
        if (!isDriveMyCar) return null;

        // If someone else has already claimed it, hide it from this driver's inbox
        if (d?.driverId && String(d.driverId) !== driverId) return null;

        // Only show offers for confirmed+paid bookings (publish should ensure this, but double-check)
        if (String(d?.payment?.status || "") !== "succeeded") return null;
        if (String(d?.status || "") !== "confirmed") return null;

        const sched =
          toIso(d?.scheduledPickupTime) ||
          String(o?.scheduledPickupTime || "") ||
          new Date().toISOString();
        if (sched) {
          try {
            if (Date.parse(sched) < now.getTime()) return null;
          } catch {
            // ignore
          }
        }

        let pickupCoords: [number, number] | undefined;
        let dropoffCoords: [number, number] | undefined;
        if (d?.pickupLocation?.coordinates) {
          pickupCoords = [
            d.pickupLocation.coordinates[0],
            d.pickupLocation.coordinates[1],
          ];
        }
        if (d?.dropoffLocation?.coordinates) {
          dropoffCoords = [
            d.dropoffLocation.coordinates[0],
            d.dropoffLocation.coordinates[1],
          ];
        }

        if (
          !pickupCoords &&
          Array.isArray(d?.pickupCoords) &&
          d.pickupCoords.length >= 2
        ) {
          pickupCoords = [d.pickupCoords[0], d.pickupCoords[1]];
        }
        if (
          !dropoffCoords &&
          Array.isArray(d?.dropoffCoords) &&
          d.dropoffCoords.length >= 2
        ) {
          dropoffCoords = [d.dropoffCoords[0], d.dropoffCoords[1]];
        }

        return {
          id: bookingId,
          pickupAddress: d?.pickupAddress || String(o?.pickupAddress || ""),
          dropoffAddress:
            d?.dropoffAddress ||
            (o?.dropoffAddress ? String(o.dropoffAddress) : undefined),
          pickupCoords,
          dropoffCoords,
          scheduledPickupTime: sched,
          fareNgn: d?.fareNgn || d?.fare || o?.fareNgn || 0,
          distanceKm: d?.distance || null,
          customerInfo: d?.customerInfo || null,
          notes: d?.notes || d?.specialInstructions || "",
          assignedAt: toIso(d?.assignedAt),
          rentalUnit: d?.rentalUnit || undefined,
          city: d?.city || o?.city || undefined,
          startDate: d?.startDate || undefined,
          endDate: d?.endDate || undefined,
          startTime: d?.startTime || undefined,
          endTime: d?.endTime || undefined,
        };
      }),
    );

    let pendingBookings = pendingBookingsRaw.filter(Boolean);

    // If we used the fallback (no orderBy), ensure ascending order by scheduledPickupTime
    if (usedFallback) {
      pendingBookings = pendingBookings.sort((a, b) => {
        const ta = a.scheduledPickupTime
          ? Date.parse(a.scheduledPickupTime)
          : 0;
        const tb = b.scheduledPickupTime
          ? Date.parse(b.scheduledPickupTime)
          : 0;
        return ta - tb;
      });
    }

    return NextResponse.json({ bookings: pendingBookings }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/driver/bookings/pending] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending bookings" },
      { status: 500 },
    );
  }
}
