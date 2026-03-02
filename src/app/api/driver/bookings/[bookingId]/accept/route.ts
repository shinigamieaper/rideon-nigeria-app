export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendDriverEnRouteNotification } from "@/lib/fcmAdmin";

/**
 * POST /api/driver/bookings/[bookingId]/accept
 * Driver accepts an assigned booking
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

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

    const nowMs = Date.now();
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const offerRef = adminDb
      .collection("booking_offers")
      .doc(`${bookingId}_${driverId}`);

    const [userSnap, driverSnap] = await Promise.all([
      adminDb.collection("users").doc(driverId).get(),
      adminDb.collection("drivers").doc(driverId).get(),
    ]);
    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const driverData = driverSnap.exists ? (driverSnap.data() as any) : {};
    const driverName =
      `${String(userData?.firstName || driverData?.firstName || "")} ${String(userData?.lastName || driverData?.lastName || "")}`.trim() ||
      "Driver";
    const driverPhone =
      (userData?.phoneNumber || driverData?.phoneNumber) ?? null;
    const driverProfileImageUrl =
      (userData?.profileImageUrl || driverData?.profileImageUrl) ?? null;

    const txResult = await adminDb.runTransaction(async (tx) => {
      const [offerSnap, bookingSnap] = await Promise.all([
        tx.get(offerRef),
        tx.get(bookingRef),
      ]);

      if (!offerSnap.exists) {
        return {
          ok: false as const,
          status: 404,
          error: "Offer not found for this booking.",
        };
      }
      const offer = offerSnap.data() as any;
      const offerStatus = String(offer?.status || "");
      const expiresAtMs = Number(offer?.expiresAtMs || 0);
      if (expiresAtMs && expiresAtMs <= nowMs) {
        if (offerStatus === "pending") {
          tx.update(offerRef, {
            status: "expired",
            respondedAt: FieldValue.serverTimestamp(),
            respondedAtMs: nowMs,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { ok: false as const, status: 410, error: "Offer expired." };
      }
      if (offerStatus !== "pending") {
        return {
          ok: false as const,
          status: 400,
          error: "Offer is no longer available.",
        };
      }

      if (!bookingSnap.exists) {
        return { ok: false as const, status: 404, error: "Booking not found" };
      }
      const data = bookingSnap.data() as any;

      try {
        const qs = adminDb
          .collection("bookings")
          .where("driverId", "==", driverId)
          .limit(20);
        const activeSnap = await tx.get(qs);
        const activeStatuses = new Set([
          "driver_assigned",
          "en_route",
          "in_progress",
        ]);
        const hasActive = activeSnap.docs.some((d) => {
          if (d.id === bookingId) return false;
          const s = String((d.data() as any)?.status || "");
          return activeStatuses.has(s);
        });
        if (hasActive) {
          return {
            ok: false as const,
            status: 409,
            error: "You already have an active booking.",
          };
        }
      } catch {}

      const isDriveMyCar =
        String(data?.service || "") === "drive_my_car" || !!data?.driveMyCar;
      if (!isDriveMyCar) {
        return {
          ok: false as const,
          status: 400,
          error: "Invalid service type.",
        };
      }

      if (String(data?.payment?.status || "") !== "succeeded") {
        return { ok: false as const, status: 400, error: "Booking not paid." };
      }

      // If already claimed by another driver
      if (data?.driverId && String(data.driverId) !== driverId) {
        tx.update(offerRef, {
          status: "expired",
          respondedAt: FieldValue.serverTimestamp(),
          respondedAtMs: nowMs,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return {
          ok: false as const,
          status: 409,
          error: "Booking already taken.",
        };
      }

      // Already accepted by this driver (idempotent)
      if (String(data?.driverId || "") === driverId) {
        return {
          ok: true as const,
          customerId: String(data?.customerId || data?.uid || ""),
          status: String(data?.status || ""),
        };
      }

      if (String(data?.status || "") !== "confirmed") {
        return {
          ok: false as const,
          status: 400,
          error: `Cannot accept booking with status: ${data?.status}`,
        };
      }

      const sched = (() => {
        const v = (data as any)?.scheduledPickupTime;
        if (!v) return null;
        if (typeof (v as any)?.toDate === "function")
          return (v as any).toDate() as Date;
        if (v instanceof Date) return v;
        const d = new Date(String(v));
        return isNaN(d.getTime()) ? null : d;
      })();
      if (sched && sched.getTime() <= nowMs) {
        tx.update(offerRef, {
          status: "expired",
          respondedAt: FieldValue.serverTimestamp(),
          respondedAtMs: nowMs,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return {
          ok: false as const,
          status: 410,
          error: "Booking has already started.",
        };
      }

      tx.update(bookingRef, {
        driverId,
        driverInfo: {
          name: driverName,
          phoneNumber: driverPhone,
          profileImageUrl: driverProfileImageUrl,
        },
        status: "en_route",
        assignedAt: FieldValue.serverTimestamp(),
        driverAcceptedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        manualAssignment: false,
        autoAssignment: false,
        offerAssignment: true,
      });

      tx.set(
        adminDb.collection("drivers").doc(driverId),
        {
          lastAssignedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      tx.update(offerRef, {
        status: "accepted",
        respondedAt: FieldValue.serverTimestamp(),
        respondedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: true as const,
        customerId: String(data?.customerId || data?.uid || ""),
        status: "en_route" as const,
      };
    });

    if (!txResult.ok) {
      return NextResponse.json(
        { error: (txResult as any).error || "Failed to accept booking" },
        { status: (txResult as any).status || 400 },
      );
    }

    console.info(
      `[driver/bookings/accept] Booking ${bookingId} accepted by driver ${driverId}`,
    );

    // Best-effort: expire other pending offers for this booking
    adminDb
      .collection("booking_offers")
      .where("bookingId", "==", bookingId)
      .where("status", "==", "pending")
      .limit(500)
      .get()
      .then((snap) => {
        if (snap.empty) return;
        const batch = adminDb.batch();
        for (const d of snap.docs) {
          if (d.id === `${bookingId}_${driverId}`) continue;
          batch.update(d.ref, {
            status: "expired",
            respondedAt: FieldValue.serverTimestamp(),
            respondedAtMs: nowMs,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return batch.commit();
      })
      .catch(() => {
        // ignore
      });

    const customerId = (txResult as any)?.customerId;
    if (customerId) {
      sendDriverEnRouteNotification(customerId, {
        bookingId,
        driverName,
      }).catch((err) => {
        console.warn(
          `[driver/bookings/accept] Failed to notify customer:`,
          err,
        );
      });
    }

    return NextResponse.json(
      { success: true, status: "en_route" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(
      "[POST /api/driver/bookings/[bookingId]/accept] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to accept booking" },
      { status: 500 },
    );
  }
}
