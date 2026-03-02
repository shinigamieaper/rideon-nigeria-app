export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendDriverEnRouteNotification } from "@/lib/fcmAdmin";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await context.params;

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

    const nowMs = Date.now();
    const bookingRef = adminDb.collection("bookings").doc(tripId);
    const offerRef = adminDb
      .collection("booking_offers")
      .doc(`${tripId}_${driverId}`);

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

      if (!bookingSnap.exists) {
        return { ok: false as const, status: 404, error: "Trip not found" };
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
          if (d.id === tripId) return false;
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
        return { ok: false as const, status: 400, error: "Trip not paid." };
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
        if (offerSnap.exists) {
          tx.update(offerRef, {
            status: "expired",
            respondedAt: FieldValue.serverTimestamp(),
            respondedAtMs: nowMs,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return {
          ok: false as const,
          status: 410,
          error: "Trip has already started.",
        };
      }

      const currentStatus = String(data?.status || "");

      if (!offerSnap.exists) {
        const assigned = String(data?.driverId || "") === driverId;
        const canAcceptAssigned =
          assigned &&
          (currentStatus === "driver_assigned" ||
            currentStatus === "confirmed");
        if (!canAcceptAssigned) {
          return {
            ok: false as const,
            status: 404,
            error: "Offer not found for this trip.",
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
          offerAssignment: false,
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
          customerId: String(data?.customerId || data?.uid || ""),
          status: "en_route" as const,
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
          error: "Trip already taken.",
        };
      }

      if (String(data?.driverId || "") === driverId) {
        return {
          ok: true as const,
          customerId: String(data?.customerId || data?.uid || ""),
          status: String(data?.status || ""),
        };
      }

      if (currentStatus !== "confirmed") {
        return {
          ok: false as const,
          status: 400,
          error: `Cannot accept trip with status: ${data?.status}`,
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
        { error: (txResult as any).error || "Failed to accept trip" },
        { status: (txResult as any).status || 400 },
      );
    }

    console.info(
      `[driver/trips/accept] Trip ${tripId} accepted (en_route) by driver ${driverId}`,
    );

    // Best-effort: expire other pending offers for this trip
    adminDb
      .collection("booking_offers")
      .where("bookingId", "==", tripId)
      .where("status", "==", "pending")
      .limit(500)
      .get()
      .then((snap) => {
        if (snap.empty) return;
        const batch = adminDb.batch();
        for (const d of snap.docs) {
          if (d.id === `${tripId}_${driverId}`) continue;
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
        bookingId: tripId,
        driverName,
      }).catch((err) => {
        console.warn(`[driver/trips/accept] Failed to notify customer:`, err);
      });
    }

    return NextResponse.json(
      { success: true, status: "en_route" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[POST /api/driver/trips/[tripId]/accept] Error:", error);
    return NextResponse.json(
      { error: "Failed to accept trip" },
      { status: 500 },
    );
  }
}
