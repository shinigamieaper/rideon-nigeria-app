/**
 * Driver Assignment Service
 *
 * Automatically assigns available drivers to pending rental reservations
 * based on city matching and driver availability.
 *
 * HARDENED:
 * - Uses Firestore transactions to prevent race conditions
 * - Conditional updates ensure booking is still assignable
 * - Generates unique assignment IDs for traceability
 * - Idempotent: safe to run multiple times concurrently
 */

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  sendDriverAssignedNotification,
  sendNewBookingOfferNotification,
} from "@/lib/fcmAdmin";

// Generate unique assignment ID for traceability
function generateAssignmentId(): string {
  return `assign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export interface AssignmentResult {
  success: boolean;
  assignedCount: number;
  skippedCount: number; // Bookings that were already assigned by another process
  errors: string[];
}

export interface AutoAssignOneBookingResult {
  success: boolean;
  assigned: boolean;
  bookingId: string;
  driverId?: string;
  assignmentId?: string;
  error?: string;
}

interface PendingBooking {
  id: string;
  city?: string;
  customerId: string;
  scheduledPickupTime: Date;
  rentalUnit?: string;
}

interface AvailableDriver {
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  servedCities?: string[];
}

/**
 * Runs the driver assignment batch process.
 *
 * HARDENED VERSION:
 * 1. Fetches all bookings with status='confirmed' and no driverId assigned
 * 2. For each booking, finds an available driver in the same city
 * 3. Uses TRANSACTION to atomically assign driver (prevents race conditions)
 * 4. Generates assignment IDs for traceability
 */
export async function runAssignmentProcess(): Promise<AssignmentResult> {
  try {
    const now = new Date();
    const errors: string[] = [];
    let assignedCount = 0;
    let skippedCount = 0;

    let qs: any;
    try {
      qs = await adminDb
        .collection("bookings")
        .where("service", "==", "drive_my_car")
        .where("status", "==", "confirmed")
        .where("scheduledPickupTime", ">=", now)
        .limit(20)
        .get();
    } catch (e) {
      console.warn(
        "[Assignment] Booking query failed; falling back to confirmed-only query:",
        e,
      );
      qs = await adminDb
        .collection("bookings")
        .where("status", "==", "confirmed")
        .where("scheduledPickupTime", ">=", now)
        .limit(50)
        .get();
    }

    for (const doc of qs.docs) {
      const d = doc.data() as any;

      const isDriveMyCar =
        String(d?.service || "") === "drive_my_car" || !!d?.driveMyCar;
      if (!isDriveMyCar) continue;

      if (String(d?.payment?.status || "") !== "succeeded") continue;

      if (d?.driverId) {
        skippedCount++;
        continue;
      }

      const one = await autoAssignDriveMyCarBooking(doc.id);
      if (one.success && one.assigned) assignedCount++;
      else if (one.success && !one.assigned) skippedCount++;
      else if (!one.success && one.error) errors.push(one.error);
    }

    return {
      success: errors.length === 0,
      assignedCount,
      skippedCount,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Assignment] runAssignmentProcess failed:", error);
    return {
      success: false,
      assignedCount: 0,
      skippedCount: 0,
      errors: [message],
    };
  }
}

function normalizeCity(input: unknown): string {
  return String(input || "").trim();
}

function toIso(input: any): string | undefined {
  try {
    if (!input) return undefined;
    if (typeof input === "string") return input;
    const dt = input?.toDate?.() ?? input;
    if (dt instanceof Date && !isNaN(dt.getTime())) return dt.toISOString();
    return undefined;
  } catch {
    return undefined;
  }
}

async function getDriverTrack(
  driverId: string,
): Promise<"fleet" | "placement" | "both"> {
  try {
    const userSnap = await adminDb.collection("users").doc(driverId).get();
    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const rawTrack = (userData as any)?.driverTrack as string | undefined;
    const normalized = rawTrack === "placement_only" ? "placement" : rawTrack;
    const track =
      normalized === "fleet" ||
      normalized === "placement" ||
      normalized === "both"
        ? normalized
        : "fleet";
    return track;
  } catch {
    return "fleet";
  }
}

async function isDriverBusy(driverId: string): Promise<boolean> {
  try {
    const qs = await adminDb
      .collection("bookings")
      .where("driverId", "==", driverId)
      .where("status", "in", ["driver_assigned", "en_route", "in_progress"])
      .limit(1)
      .get();
    return !qs.empty;
  } catch {
    return false;
  }
}

async function selectEligibleDriver(params: {
  city: string;
  excludeDriverIds: Set<string>;
}): Promise<{ driverId: string; driverInfo: AvailableDriver } | null> {
  const city = normalizeCity(params.city);
  if (!city) return null;

  let driverDocs: any;
  let usedFallback = false;
  try {
    driverDocs = await adminDb
      .collection("drivers")
      .where("status", "==", "approved")
      .where("onlineStatus", "==", true)
      .where("servedCities", "array-contains", city)
      .limit(50)
      .get();
  } catch (e) {
    usedFallback = true;
    console.warn(
      "[Assignment] Candidate query failed; falling back to approved+online:",
      e,
    );
    driverDocs = await adminDb
      .collection("drivers")
      .where("status", "==", "approved")
      .where("onlineStatus", "==", true)
      .limit(100)
      .get();
  }

  const candidates: Array<{
    driverId: string;
    driverInfo: AvailableDriver;
    lastAssignedAtMs: number;
  }> = [];

  for (const doc of driverDocs.docs) {
    const driverId = String(doc.id || "").trim();
    if (!driverId) continue;
    if (params.excludeDriverIds.has(driverId)) continue;

    const d = doc.data() as any;

    if (usedFallback) {
      const served = Array.isArray(d?.servedCities)
        ? d.servedCities.map((c: any) => String(c))
        : [];
      if (!served.includes(city)) continue;
    }

    const track = await getDriverTrack(driverId);
    if (track === "placement") continue;

    if (await isDriverBusy(driverId)) continue;

    let userData: any = null;
    try {
      const userSnap = await adminDb.collection("users").doc(driverId).get();
      userData = userSnap.exists ? (userSnap.data() as any) : null;
    } catch {
      userData = null;
    }

    const driverInfo: AvailableDriver = {
      uid: driverId,
      firstName: String(userData?.firstName || d?.firstName || ""),
      lastName: String(userData?.lastName || d?.lastName || ""),
      phoneNumber: (userData?.phoneNumber || d?.phoneNumber) ?? undefined,
      profileImageUrl:
        (userData?.profileImageUrl || d?.profileImageUrl) ?? undefined,
      servedCities: Array.isArray(d?.servedCities) ? d.servedCities : undefined,
    };

    const lastAssignedAt = d?.lastAssignedAt?.toDate?.() ?? null;
    const lastAssignedAtMs =
      lastAssignedAt instanceof Date && !isNaN(lastAssignedAt.getTime())
        ? lastAssignedAt.getTime()
        : 0;

    candidates.push({ driverId, driverInfo, lastAssignedAtMs });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.lastAssignedAtMs - b.lastAssignedAtMs);
  return {
    driverId: candidates[0].driverId,
    driverInfo: candidates[0].driverInfo,
  };
}

export async function autoAssignDriveMyCarBooking(
  bookingId: string,
  options?: { excludeDriverIds?: string[] },
): Promise<AutoAssignOneBookingResult> {
  const excludeDriverIds = new Set<string>(
    (options?.excludeDriverIds || []).map((x) => String(x)),
  );
  const assignmentId = generateAssignmentId();

  try {
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return {
        success: false,
        assigned: false,
        bookingId,
        error: "Booking not found",
      };
    }

    const booking = bookingSnap.data() as any;
    const isDriveMyCar =
      String(booking?.service || "") === "drive_my_car" ||
      !!booking?.driveMyCar;
    if (!isDriveMyCar) {
      return { success: true, assigned: false, bookingId };
    }

    if (String(booking?.payment?.status || "") !== "succeeded") {
      return { success: true, assigned: false, bookingId };
    }

    if (String(booking?.status || "") !== "confirmed") {
      return { success: true, assigned: false, bookingId };
    }

    if (booking?.driverId) {
      return { success: true, assigned: false, bookingId };
    }

    const city = normalizeCity(booking?.city);
    if (!city) {
      return {
        success: false,
        assigned: false,
        bookingId,
        error: "Booking missing city",
      };
    }

    const rejectedDriverIds: string[] = Array.isArray(
      booking?.rejectedDriverIds,
    )
      ? booking.rejectedDriverIds.map((x: any) => String(x))
      : [];
    for (const id of rejectedDriverIds) excludeDriverIds.add(id);

    const selected = await selectEligibleDriver({ city, excludeDriverIds });
    if (!selected) {
      return { success: true, assigned: false, bookingId };
    }

    const driverId = selected.driverId;
    const driverName =
      `${selected.driverInfo.firstName || ""} ${selected.driverInfo.lastName || ""}`.trim() ||
      "Driver";
    const scheduledIso = toIso(booking?.scheduledPickupTime);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const bSnap = await tx.get(bookingRef);
      if (!bSnap.exists) return { ok: false as const };
      const b = bSnap.data() as any;

      const stillDriveMyCar =
        String(b?.service || "") === "drive_my_car" || !!b?.driveMyCar;
      if (!stillDriveMyCar) return { ok: false as const };
      if (String(b?.payment?.status || "") !== "succeeded")
        return { ok: false as const };
      if (String(b?.status || "") !== "confirmed")
        return { ok: false as const };
      if (b?.driverId) return { ok: false as const };

      tx.update(bookingRef, {
        driverId,
        driverInfo: {
          name: driverName,
          phoneNumber: selected.driverInfo.phoneNumber || null,
          profileImageUrl: selected.driverInfo.profileImageUrl || null,
        },
        status: "driver_assigned",
        assignedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        assignmentId,
        manualAssignment: false,
        autoAssignment: true,
      });

      tx.set(
        adminDb.collection("drivers").doc(driverId),
        {
          lastAssignedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        ok: true as const,
        customerId: String(b?.customerId || b?.uid || ""),
        pickupAddress: String(b?.pickupAddress || ""),
      };
    });

    if (!txResult.ok) {
      return { success: true, assigned: false, bookingId };
    }

    sendNewBookingOfferNotification(driverId, {
      bookingId,
      city,
      pickupAddress:
        (txResult as any)?.pickupAddress ||
        String(booking?.pickupAddress || ""),
      scheduledTime: scheduledIso,
      payout: Number(booking?.fareNgn || booking?.fare || 0) || undefined,
    }).catch((e) =>
      console.warn("[Assignment] Failed to send driver offer notification:", e),
    );

    const customerId = (txResult as any)?.customerId;
    if (customerId) {
      sendDriverAssignedNotification(customerId, {
        bookingId,
        driverName,
        scheduledTime: scheduledIso,
      }).catch((e) =>
        console.warn(
          "[Assignment] Failed to send customer assigned notification:",
          e,
        ),
      );
    }

    console.log(
      `[Assignment] ✓ Auto assignment: driver ${driverId} → booking ${bookingId} (${assignmentId})`,
    );
    return { success: true, assigned: true, bookingId, driverId, assignmentId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Assignment] autoAssignDriveMyCarBooking failed:", error);
    return { success: false, assigned: false, bookingId, error: message };
  }
}

export interface PublishOffersResult {
  success: boolean;
  bookingId: string;
  wave: number;
  createdOffers: number;
  error?: string;
}

export interface OfferPublishingResult {
  success: boolean;
  publishedBookings: number;
  createdOffers: number;
  skippedCount: number;
  errors: string[];
}

export interface SyncDriverOffersResult {
  success: boolean;
  createdOffers: number;
  consideredBookings: number;
  error?: string;
}

function parseTimeToMinutes(input: unknown): number | null {
  const s = String(input || "").trim();
  if (!/^[0-9]{2}:[0-9]{2}$/.test(s)) return null;
  const [hh, mm] = s.split(":").map((x) => Number(x));
  if (!isFinite(hh) || !isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function getLagosTimeParts(
  date: Date,
): { weekdayKey: string; minutes: number; dateKey: string } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const weekdayRaw = String(
      parts.find((p) => p.type === "weekday")?.value || "",
    ).toLowerCase();
    const weekdayKey = weekdayRaw.slice(0, 3);
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = Number(parts.find((p) => p.type === "minute")?.value);
    const year = String(parts.find((p) => p.type === "year")?.value || "");
    const month = String(parts.find((p) => p.type === "month")?.value || "");
    const day = String(parts.find((p) => p.type === "day")?.value || "");
    if (
      !weekdayKey ||
      !isFinite(hour) ||
      !isFinite(minute) ||
      !year ||
      !month ||
      !day
    )
      return null;
    const dateKey = `${year}-${month}-${day}`;
    return { weekdayKey, minutes: hour * 60 + minute, dateKey };
  } catch {
    return null;
  }
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function getBookingPickupLatLng(
  booking: any,
): { lat: number; lng: number } | null {
  const loc = booking?.pickupLocation;
  const coords = Array.isArray(loc?.coordinates) ? loc.coordinates : null;
  if (coords && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (isFinite(lat) && isFinite(lng)) return { lat, lng };
  }
  const legacy = Array.isArray(booking?.pickupCoords)
    ? booking.pickupCoords
    : null;
  if (legacy && legacy.length >= 2) {
    const lng = Number(legacy[0]);
    const lat = Number(legacy[1]);
    if (isFinite(lat) && isFinite(lng)) return { lat, lng };
  }
  return null;
}

function getDateFromFirestore(input: any): Date | null {
  try {
    if (!input) return null;
    if (input instanceof Date) return input;
    if (typeof input === "string") {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    if (input?.toDate) {
      const d = input.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncDriveMyCarOffersForDriver(
  driverId: string,
  options?: { maxBookings?: number; maxOffers?: number; throttleMs?: number },
): Promise<SyncDriverOffersResult> {
  const now = new Date();
  const nowMs = Date.now();
  const maxBookings = Math.max(1, Number(options?.maxBookings ?? 30) || 30);
  const maxOffers = Math.max(1, Number(options?.maxOffers ?? 10) || 10);
  const throttleMs = Math.max(0, Number(options?.throttleMs ?? 20000) || 20000);

  try {
    const driverRef = adminDb.collection("drivers").doc(driverId);
    const driverSnap = await driverRef.get();
    if (!driverSnap.exists) {
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    const driverDoc = driverSnap.data() as any;
    const driverStatus = String(driverDoc?.status || "");
    if (driverStatus !== "approved") {
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    const onlineStatus =
      typeof driverDoc?.onlineStatus === "boolean"
        ? !!driverDoc.onlineStatus
        : !!driverDoc?.online;
    if (!onlineStatus) {
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    const lastSyncMs = Number(driverDoc?.lastOfferSyncAtMs || 0);
    if (
      throttleMs > 0 &&
      isFinite(lastSyncMs) &&
      lastSyncMs > 0 &&
      nowMs - lastSyncMs < throttleMs
    ) {
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    const track = await getDriverTrack(driverId);
    if (track === "placement") {
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    if (await isDriverBusy(driverId)) {
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    const servedCities = Array.isArray(driverDoc?.servedCities)
      ? driverDoc.servedCities
          .map((c: any) => String(c).trim())
          .filter((c: string) => c.length > 0)
      : [];
    if (servedCities.length === 0) {
      await driverRef.set(
        {
          lastOfferSyncAtMs: nowMs,
          lastOfferSyncAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    await driverRef.set(
      {
        lastOfferSyncAtMs: nowMs,
        lastOfferSyncAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    let bookingSnap: any;
    try {
      bookingSnap = await adminDb
        .collection("bookings")
        .where("service", "==", "drive_my_car")
        .where("status", "==", "confirmed")
        .where("scheduledPickupTime", ">=", now)
        .limit(maxBookings)
        .get();
    } catch (e) {
      console.warn(
        "[Offers] Driver sync booking query failed; falling back to confirmed-only query:",
        e,
      );
      bookingSnap = await adminDb
        .collection("bookings")
        .where("status", "==", "confirmed")
        .where("scheduledPickupTime", ">=", now)
        .limit(Math.max(maxBookings, 50))
        .get();
    }

    const candidates: Array<{
      bookingId: string;
      booking: any;
      scheduled: Date;
    }> = [];

    for (const doc of bookingSnap.docs) {
      const bookingId = String(doc.id || "").trim();
      if (!bookingId) continue;

      const booking = doc.data() as any;
      const isDriveMyCar =
        String(booking?.service || "") === "drive_my_car" ||
        !!booking?.driveMyCar;
      if (!isDriveMyCar) continue;
      if (String(booking?.payment?.status || "") !== "succeeded") continue;
      if (String(booking?.status || "") !== "confirmed") continue;
      if (booking?.driverId) continue;

      const city = normalizeCity(booking?.city);
      if (!city) continue;
      if (!servedCities.includes(city)) continue;

      const scheduled = getDateFromFirestore(booking?.scheduledPickupTime);
      if (!scheduled || isNaN(scheduled.getTime())) continue;
      if (scheduled.getTime() < nowMs) continue;

      if (!(await isDriverAvailableForTime(driverId, driverDoc, scheduled)))
        continue;

      const pickupLatLng = getBookingPickupLatLng(booking);
      const driverLoc = driverDoc?.currentLocation;
      const driverLat = Number(driverLoc?.lat);
      const driverLng = Number(driverLoc?.lng);
      const hasDriverLoc = isFinite(driverLat) && isFinite(driverLng);
      const hasDistance = !!pickupLatLng && hasDriverLoc;
      if (hasDistance) {
        const distanceKm = haversineKm(pickupLatLng!, {
          lat: driverLat,
          lng: driverLng,
        });
        const maxRadius = Number(driverDoc?.maxPickupRadiusKm);
        if (isFinite(maxRadius) && maxRadius > 0 && distanceKm > maxRadius)
          continue;
      }

      candidates.push({ bookingId, booking, scheduled });
      if (candidates.length >= maxBookings) break;
    }

    if (candidates.length === 0) {
      return { success: true, createdOffers: 0, consideredBookings: 0 };
    }

    const offerRefs = candidates.map((c) =>
      adminDb.collection("booking_offers").doc(`${c.bookingId}_${driverId}`),
    );
    const offerSnaps = await adminDb.getAll(...offerRefs);
    const existing = new Map<string, { status: string; expiresAtMs: number }>();
    for (let i = 0; i < offerSnaps.length; i++) {
      if (offerSnaps[i]?.exists) {
        const d = offerSnaps[i]!.data() as any;
        existing.set(String(candidates[i]!.bookingId), {
          status: String(d?.status || ""),
          expiresAtMs: Number(d?.expiresAtMs || 0),
        });
      }
    }

    const offerExpiryMs = Number(
      process.env.DRIVE_MY_CAR_OFFER_TTL_MS || 10 * 60 * 1000,
    );
    const reofferExpiredAfterMsRaw = Number(
      process.env.DRIVE_MY_CAR_REOFFER_EXPIRED_AFTER_MS || offerExpiryMs,
    );
    const reofferExpiredAfterMs =
      isFinite(reofferExpiredAfterMsRaw) && reofferExpiredAfterMsRaw > 0
        ? reofferExpiredAfterMsRaw
        : 10 * 60 * 1000;
    const expiresAtMs =
      nowMs +
      (isFinite(offerExpiryMs) && offerExpiryMs > 0
        ? offerExpiryMs
        : 10 * 60 * 1000);

    const batch = adminDb.batch();
    let createdOffers = 0;
    let consideredBookings = 0;

    for (const c of candidates) {
      consideredBookings++;
      if (createdOffers >= maxOffers) break;
      const prev = existing.get(c.bookingId);
      if (prev) {
        const prevStatus = String(prev.status || "");
        const prevExp = Number(prev.expiresAtMs || 0);
        const prevIsExpired =
          isFinite(prevExp) && prevExp > 0 && prevExp <= nowMs;

        if (prevStatus === "accepted" || prevStatus === "rejected") continue;
        if (prevStatus === "pending" && !prevIsExpired) continue;

        const canReoffer =
          (prevStatus === "expired" ||
            (prevStatus === "pending" && prevIsExpired)) &&
          prevIsExpired &&
          nowMs - prevExp >= reofferExpiredAfterMs;
        if (!canReoffer) continue;
      }

      const city = normalizeCity(c.booking?.city);
      const scheduledIso =
        toIso(c.booking?.scheduledPickupTime) || c.scheduled.toISOString();
      const offerRef = adminDb
        .collection("booking_offers")
        .doc(`${c.bookingId}_${driverId}`);
      const exists = existing.has(c.bookingId);
      const payload = {
        bookingId: c.bookingId,
        driverId,
        service: "drive_my_car",
        status: "pending",
        wave: 1,
        city,
        expiresAtMs,
        scheduledPickupTime: scheduledIso,
        pickupAddress: String(c.booking?.pickupAddress || ""),
        dropoffAddress: c.booking?.dropoffAddress
          ? String(c.booking.dropoffAddress)
          : null,
        fareNgn: Number(c.booking?.fareNgn || c.booking?.fare || 0) || 0,
        rejectionReason: null,
        respondedAt: null,
        respondedAtMs: null,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (exists) {
        batch.set(offerRef, payload, { merge: true });
      } else {
        batch.set(
          offerRef,
          {
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
            createdAtMs: nowMs,
          },
          { merge: false },
        );
      }
      createdOffers++;
    }

    if (createdOffers > 0) {
      await batch.commit();
    }

    return { success: true, createdOffers, consideredBookings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Offers] syncDriveMyCarOffersForDriver failed:", error);
    return {
      success: false,
      createdOffers: 0,
      consideredBookings: 0,
      error: message,
    };
  }
}

async function isDriverAvailableForTime(
  driverId: string,
  driverDoc: any,
  scheduled: Date,
): Promise<boolean> {
  const parts = getLagosTimeParts(scheduled);
  if (!parts) return true;

  const days = Array.isArray(driverDoc?.workingDays)
    ? driverDoc.workingDays.map((d: any) => String(d).toLowerCase().trim())
    : null;
  if (days && days.length > 0 && !days.includes(parts.weekdayKey)) return false;

  const whStart = parseTimeToMinutes(driverDoc?.workingHours?.start);
  const whEnd = parseTimeToMinutes(driverDoc?.workingHours?.end);
  if (whStart !== null && whEnd !== null) {
    if (parts.minutes < whStart || parts.minutes > whEnd) return false;
  }

  if (driverDoc?.hasDaySpecificAvailability === true) {
    try {
      const slotDocId = `${driverId}_${parts.dateKey}`;
      const slotSnap = await adminDb
        .collection("driver_availability")
        .doc(slotDocId)
        .get();
      if (slotSnap.exists) {
        const v = slotSnap.data() as any;
        const slots = Array.isArray(v?.slots) ? v.slots : [];
        if (!slots.length) return false;
        for (const s of slots) {
          const start = parseTimeToMinutes(s?.start);
          const end = parseTimeToMinutes(s?.end);
          if (start === null || end === null) continue;
          if (parts.minutes >= start && parts.minutes <= end) return true;
        }
        return false;
      }
    } catch {
      return true;
    }
  }

  return true;
}

export async function publishDriveMyCarBookingOffers(
  bookingId: string,
  options?: { targetTotalOffers?: number; wave?: number },
): Promise<PublishOffersResult> {
  const nowMs = Date.now();
  const targetTotalOffers = Math.max(
    0,
    Number(options?.targetTotalOffers || 0) || 0,
  );
  const wave = Math.max(1, Number(options?.wave || 1) || 1);

  try {
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return {
        success: false,
        bookingId,
        wave,
        createdOffers: 0,
        error: "Booking not found",
      };
    }

    const booking = bookingSnap.data() as any;
    const isDriveMyCar =
      String(booking?.service || "") === "drive_my_car" ||
      !!booking?.driveMyCar;
    if (!isDriveMyCar)
      return { success: true, bookingId, wave, createdOffers: 0 };
    if (String(booking?.payment?.status || "") !== "succeeded")
      return { success: true, bookingId, wave, createdOffers: 0 };
    if (String(booking?.status || "") !== "confirmed")
      return { success: true, bookingId, wave, createdOffers: 0 };
    if (booking?.driverId)
      return { success: true, bookingId, wave, createdOffers: 0 };

    const city = normalizeCity(booking?.city);
    if (!city) {
      return {
        success: false,
        bookingId,
        wave,
        createdOffers: 0,
        error: "Booking missing city",
      };
    }

    const scheduled =
      getDateFromFirestore(booking?.scheduledPickupTime) || new Date();
    const pickupLatLng = getBookingPickupLatLng(booking);

    const existingOffersSnap = await adminDb
      .collection("booking_offers")
      .where("bookingId", "==", bookingId)
      .limit(500)
      .get();
    const existingOfferByDriverId = new Map<
      string,
      { status: string; expiresAtMs: number }
    >();
    let activePendingOffers = 0;
    for (const d of existingOffersSnap.docs) {
      const od = d.data() as any;
      const did = String(od?.driverId || "").trim();
      if (did) {
        const st = String(od?.status || "");
        const exp = Number(od?.expiresAtMs || 0);
        existingOfferByDriverId.set(did, { status: st, expiresAtMs: exp });
      }

      const st = String(od?.status || "");
      const exp = Number(od?.expiresAtMs || 0);
      if (st === "pending" && isFinite(exp) && exp > nowMs) {
        activePendingOffers++;
      }
    }

    const existingTotal = activePendingOffers;
    const desiredTotal = targetTotalOffers > 0 ? targetTotalOffers : 10;
    const needed = Math.max(0, desiredTotal - existingTotal);
    if (needed === 0)
      return { success: true, bookingId, wave, createdOffers: 0 };

    let driverDocs: any;
    let usedFallback = false;
    try {
      driverDocs = await adminDb
        .collection("drivers")
        .where("status", "==", "approved")
        .where("onlineStatus", "==", true)
        .where("servedCities", "array-contains", city)
        .limit(300)
        .get();
    } catch (e) {
      usedFallback = true;
      console.warn(
        "[Offers] Candidate query failed; falling back to approved+online:",
        e,
      );
      driverDocs = await adminDb
        .collection("drivers")
        .where("status", "==", "approved")
        .where("onlineStatus", "==", true)
        .limit(500)
        .get();
    }

    const candidates: Array<{
      driverId: string;
      driverDoc: any;
      distanceKm?: number;
      hasDistance: boolean;
      lastAssignedAtMs: number;
    }> = [];

    const offerExpiryMs = Number(
      process.env.DRIVE_MY_CAR_OFFER_TTL_MS || 10 * 60 * 1000,
    );
    const reofferExpiredAfterMsRaw = Number(
      process.env.DRIVE_MY_CAR_REOFFER_EXPIRED_AFTER_MS || offerExpiryMs,
    );
    const reofferExpiredAfterMs =
      isFinite(reofferExpiredAfterMsRaw) && reofferExpiredAfterMsRaw > 0
        ? reofferExpiredAfterMsRaw
        : 10 * 60 * 1000;

    for (const doc of driverDocs.docs) {
      const driverId = String(doc.id || "").trim();
      if (!driverId) continue;
      const prev = existingOfferByDriverId.get(driverId);
      if (prev) {
        const prevStatus = String(prev.status || "");
        const prevExp = Number(prev.expiresAtMs || 0);
        const prevIsExpired =
          isFinite(prevExp) && prevExp > 0 && prevExp <= nowMs;
        const canReofferExpired =
          (prevStatus === "expired" ||
            (prevStatus === "pending" && prevIsExpired)) &&
          prevIsExpired &&
          nowMs - prevExp >= reofferExpiredAfterMs;

        const shouldExclude =
          (prevStatus === "pending" && !prevIsExpired) ||
          prevStatus === "accepted" ||
          prevStatus === "rejected" ||
          ((prevStatus === "expired" ||
            (prevStatus === "pending" && prevIsExpired)) &&
            !canReofferExpired);

        if (shouldExclude) continue;
      }

      const d = doc.data() as any;

      if (usedFallback) {
        const served = Array.isArray(d?.servedCities)
          ? d.servedCities.map((c: any) => String(c))
          : [];
        if (!served.includes(city)) continue;
      }

      const track = await getDriverTrack(driverId);
      if (track === "placement") continue;
      if (await isDriverBusy(driverId)) continue;

      if (!(await isDriverAvailableForTime(driverId, d, scheduled))) continue;

      const driverLoc = d?.currentLocation;
      const driverLat = Number(driverLoc?.lat);
      const driverLng = Number(driverLoc?.lng);
      const hasDriverLoc = isFinite(driverLat) && isFinite(driverLng);
      const hasDistance = !!pickupLatLng && hasDriverLoc;
      let distanceKm: number | undefined = undefined;
      if (hasDistance) {
        distanceKm = haversineKm(pickupLatLng!, {
          lat: driverLat,
          lng: driverLng,
        });
        const maxRadius = Number(d?.maxPickupRadiusKm);
        if (isFinite(maxRadius) && maxRadius > 0 && distanceKm > maxRadius)
          continue;
      }

      const lastAssignedAt = d?.lastAssignedAt?.toDate?.() ?? null;
      const lastAssignedAtMs =
        lastAssignedAt instanceof Date && !isNaN(lastAssignedAt.getTime())
          ? lastAssignedAt.getTime()
          : 0;

      candidates.push({
        driverId,
        driverDoc: d,
        distanceKm,
        hasDistance,
        lastAssignedAtMs,
      });
    }

    if (candidates.length === 0)
      return { success: true, bookingId, wave, createdOffers: 0 };

    candidates.sort((a, b) => {
      if (a.hasDistance !== b.hasDistance) return a.hasDistance ? -1 : 1;
      const da =
        typeof a.distanceKm === "number"
          ? a.distanceKm
          : Number.POSITIVE_INFINITY;
      const db =
        typeof b.distanceKm === "number"
          ? b.distanceKm
          : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.lastAssignedAtMs - b.lastAssignedAtMs;
    });

    const expiresAtMs =
      nowMs +
      (isFinite(offerExpiryMs) && offerExpiryMs > 0
        ? offerExpiryMs
        : 10 * 60 * 1000);
    const scheduledIso =
      toIso(booking?.scheduledPickupTime) || scheduled.toISOString();

    const batch = adminDb.batch();
    const created: Array<{ driverId: string }> = [];
    for (const c of candidates) {
      if (created.length >= needed) break;

      const offerId = `${bookingId}_${c.driverId}`;
      const offerRef = adminDb.collection("booking_offers").doc(offerId);
      const exists = existingOfferByDriverId.has(c.driverId);
      const payload = {
        bookingId,
        driverId: c.driverId,
        service: "drive_my_car",
        status: "pending",
        wave,
        city,
        expiresAtMs,
        scheduledPickupTime: scheduledIso,
        pickupAddress: String(booking?.pickupAddress || ""),
        dropoffAddress: booking?.dropoffAddress
          ? String(booking.dropoffAddress)
          : null,
        fareNgn: Number(booking?.fareNgn || booking?.fare || 0) || 0,
        rejectionReason: null,
        respondedAt: null,
        respondedAtMs: null,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (exists) {
        batch.set(offerRef, payload, { merge: true });
      } else {
        batch.set(
          offerRef,
          {
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
            createdAtMs: nowMs,
          },
          { merge: false },
        );
      }
      created.push({ driverId: c.driverId });
    }

    if (created.length === 0)
      return { success: true, bookingId, wave, createdOffers: 0 };

    await batch.commit();

    for (const o of created) {
      sendNewBookingOfferNotification(o.driverId, {
        bookingId,
        city,
        pickupAddress: String(booking?.pickupAddress || ""),
        scheduledTime: scheduledIso,
        payout: Number(booking?.fareNgn || booking?.fare || 0) || undefined,
      }).catch((e) =>
        console.warn("[Offers] Failed to send driver offer notification:", e),
      );
    }

    return { success: true, bookingId, wave, createdOffers: created.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Offers] publishDriveMyCarBookingOffers failed:", error);
    return {
      success: false,
      bookingId,
      wave,
      createdOffers: 0,
      error: message,
    };
  }
}

export async function runOfferPublishingProcess(): Promise<OfferPublishingResult> {
  try {
    const now = new Date();
    const nowMs = Date.now();
    const errors: string[] = [];
    let publishedBookings = 0;
    let createdOffers = 0;
    let skippedCount = 0;

    let qs: any;
    try {
      qs = await adminDb
        .collection("bookings")
        .where("service", "==", "drive_my_car")
        .where("status", "==", "confirmed")
        .where("scheduledPickupTime", ">=", now)
        .limit(20)
        .get();
    } catch (e) {
      console.warn(
        "[Offers] Booking query failed; falling back to confirmed-only query:",
        e,
      );
      qs = await adminDb
        .collection("bookings")
        .where("status", "==", "confirmed")
        .where("scheduledPickupTime", ">=", now)
        .limit(50)
        .get();
    }

    for (const doc of qs.docs) {
      const d = doc.data() as any;
      const isDriveMyCar =
        String(d?.service || "") === "drive_my_car" || !!d?.driveMyCar;
      if (!isDriveMyCar) continue;
      if (String(d?.payment?.status || "") !== "succeeded") continue;
      if (d?.driverId) {
        skippedCount++;
        continue;
      }

      let existingOffers: any;
      try {
        existingOffers = await adminDb
          .collection("booking_offers")
          .where("bookingId", "==", doc.id)
          .limit(500)
          .get();
      } catch {
        existingOffers = null;
      }

      let startAtMs = nowMs;
      if (existingOffers && !existingOffers.empty) {
        for (const od of existingOffers.docs) {
          const v = od.data() as any;
          const ms = Number(v?.createdAtMs);
          if (isFinite(ms) && ms > 0) startAtMs = Math.min(startAtMs, ms);
        }
      }

      const ageMs = nowMs - startAtMs;
      let wave = 1;
      let targetTotal = 10;
      if (ageMs > 90 * 1000) {
        wave = 3;
        targetTotal = 60;
      } else if (ageMs > 30 * 1000) {
        wave = 2;
        targetTotal = 25;
      }

      const r = await publishDriveMyCarBookingOffers(doc.id, {
        targetTotalOffers: targetTotal,
        wave,
      });
      if (r.success) {
        if (r.createdOffers > 0) publishedBookings++;
        createdOffers += r.createdOffers;
      } else {
        skippedCount++;
        if (r.error) errors.push(r.error);
      }
    }

    return {
      success: errors.length === 0,
      publishedBookings,
      createdOffers,
      skippedCount,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Offers] runOfferPublishingProcess failed:", error);
    return {
      success: false,
      publishedBookings: 0,
      createdOffers: 0,
      skippedCount: 0,
      errors: [message],
    };
  }
}

/**
 * Manually assigns a specific driver to a specific booking.
 * Used by admin panel for manual overrides.
 *
 * HARDENED: Uses transaction to prevent race conditions
 */
export async function assignDriverToBooking(
  bookingId: string,
  driverId: string,
): Promise<{ success: boolean; error?: string; assignmentId?: string }> {
  const assignmentId = generateAssignmentId();

  try {
    // Pre-fetch driver info (outside transaction for efficiency)
    const driverRef = adminDb.collection("drivers").doc(driverId);
    const driverSnap = await driverRef.get();

    if (!driverSnap.exists) {
      return { success: false, error: "Driver not found" };
    }

    const driverData = driverSnap.data();
    if (driverData?.status !== "approved") {
      return { success: false, error: "Driver is not approved" };
    }

    // Fetch driver user info
    const userSnap = await adminDb.collection("users").doc(driverId).get();
    const userData = userSnap.exists ? userSnap.data() : {};

    // Prevent assigning placement-track drivers to standard bookings
    try {
      const rawTrack = (userData as any)?.driverTrack as string | undefined;
      const normalized = rawTrack === "placement_only" ? "placement" : rawTrack;
      const driverTrack =
        normalized === "fleet" ||
        normalized === "placement" ||
        normalized === "both"
          ? normalized
          : "fleet";
      if (driverTrack === "placement") {
        return {
          success: false,
          error: "Cannot assign placement-track drivers to bookings",
        };
      }
    } catch {
      // If we fail to read track, default to allow (backwards-compatible)
    }

    // Use transaction for the actual assignment
    const result = await adminDb.runTransaction(async (transaction) => {
      const bookingRef = adminDb.collection("bookings").doc(bookingId);
      const bookingSnap = await transaction.get(bookingRef);

      if (!bookingSnap.exists) {
        return { success: false, error: "Booking not found" };
      }

      const bookingData = bookingSnap.data()!;
      const status = bookingData?.status;

      // Allow manual assignment to override existing assignment (admin power)
      // But still validate the booking is in a reasonable state
      if (!["confirmed", "requested", "driver_assigned"].includes(status)) {
        return {
          success: false,
          error: `Cannot assign driver to booking with status '${status}'`,
        };
      }

      // Perform the assignment
      transaction.update(bookingRef, {
        driverId,
        driverInfo: {
          name:
            `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
            "Driver",
          phoneNumber: userData?.phoneNumber || null,
          profileImageUrl: userData?.profileImageUrl || null,
        },
        status: "driver_assigned",
        assignedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        assignmentId,
        manualAssignment: true,
      });

      return { success: true };
    });

    if (result.success) {
      console.log(
        `[Assignment] ✓ Manual assignment: driver ${driverId} → booking ${bookingId} (${assignmentId})`,
      );
      return { success: true, assignmentId };
    } else {
      return result;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Assignment] Manual assignment failed:", error);
    return { success: false, error: message };
  }
}
