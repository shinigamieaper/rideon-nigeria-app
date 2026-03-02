import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";
import { createPaystackRefund } from "@/lib/paystackRefund";
import { sendRefundAttentionAdmins } from "@/lib/adminRefundAlerts";
import {
  sendDriverAssignedNotification,
  sendNotificationToDriver,
} from "@/lib/fcmAdmin";

export const runtime = "nodejs";

async function verifyAdminRead(req: NextRequest) {
  return requireAdmin(req, [
    "super_admin",
    "admin",
    "ops_admin",
    "finance_admin",
  ]);
}

async function verifyAdminWrite(req: NextRequest) {
  return requireAdmin(req, ["super_admin", "admin", "ops_admin"]);
}

/**
 * GET /api/admin/reservations/[reservationId]
 * Fetch single reservation details
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ reservationId: string }> },
) {
  try {
    const auth = await verifyAdminRead(req);
    if (auth.response) return auth.response;

    const { reservationId } = await context.params;

    const docRef = adminDb.collection("bookings").doc(reservationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const data = doc.data()!;

    // Get customer info
    let customerName = "Unknown Customer";
    let customerEmail = "";
    let customerPhone = "";
    if (data.customerId) {
      try {
        const userDoc = await adminDb
          .collection("users")
          .doc(data.customerId)
          .get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          customerName =
            `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
            "Unknown";
          customerEmail = userData.email || "";
          customerPhone = userData.phoneNumber || "";
        }
      } catch {}
    }

    // Get driver info if assigned
    let driverName = null;
    let driverEmail = null;
    let driverPhone = null;
    if (data.driverId) {
      try {
        const driverUserDoc = await adminDb
          .collection("users")
          .doc(data.driverId)
          .get();
        if (driverUserDoc.exists) {
          const driverData = driverUserDoc.data()!;
          driverName =
            `${driverData.firstName || ""} ${driverData.lastName || ""}`.trim() ||
            "Driver";
          driverEmail = driverData.email || "";
          driverPhone = driverData.phoneNumber || "";
        }
      } catch {}
    }

    const reservation = {
      id: doc.id,
      service: (() => {
        const direct = String((data as any)?.service || "").trim();
        if (direct) return direct === "rental" ? "chauffeur" : direct;
        if ((data as any)?.driveMyCar) return "drive_my_car";
        const unit = String((data as any)?.rentalUnit || "").trim();
        if ((data as any)?.listingId && (unit === "day" || unit === "4h"))
          return "chauffeur";
        return "chauffeur";
      })(),
      customerId: data.customerId,
      customerName,
      customerEmail,
      customerPhone,
      driverId: data.driverId || null,
      driverName,
      driverEmail,
      driverPhone,
      pickupAddress: data.pickupAddress || "",
      dropoffAddress: data.dropoffAddress || "",
      pickupCoordinates: data.pickupCoordinates || null,
      dropoffCoordinates: data.dropoffCoordinates || null,
      vehicleClass: data.vehicleClass || "",
      city: data.city || null,
      rentalUnit: data.rentalUnit || null,
      listingId: data.listingId || null,
      status: data.status || "requested",
      fareNgn: data.fareNgn || 0,
      driverPayoutNgn: data.driverPayoutNgn || 0,
      startDate: data.startDate || null,
      startTime: data.startTime || null,
      scheduledPickupTime:
        data.scheduledPickupTime?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || null,
      cancellationReason: data.cancellationReason || null,
      paymentStatus: data.payment?.status || "pending",
      paymentMethod: data.payment?.method || null,
      notes: data.notes || "",
    };

    return NextResponse.json({ reservation }, { status: 200 });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/reservations/[reservationId]
 * Update reservation (cancel, reassign driver)
 * Body: { action: 'cancel' | 'reassign', reason?: string, driverId?: string }
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ reservationId: string }> },
) {
  try {
    const auth = await verifyAdminWrite(req);
    if (auth.response) return auth.response;
    const caller = auth.caller!;

    const { reservationId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { action, reason, driverId, listingId, settlementOverrideNgn } =
      body as {
        action?: string;
        reason?: string;
        driverId?: string;
        listingId?: string;
        settlementOverrideNgn?: number | string | null;
      };

    const docRef = adminDb.collection("bookings").doc(reservationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const currentData = doc.data()!;
    const currentStatus = currentData.status;

    switch (action) {
      case "cancel": {
        // Can only cancel if not already completed or cancelled
        if (
          [
            "completed",
            "cancelled_by_customer",
            "cancelled_by_driver",
            "cancelled_by_admin",
          ].includes(currentStatus)
        ) {
          return NextResponse.json(
            { error: "Cannot cancel this reservation" },
            { status: 400 },
          );
        }

        const sched: Date | null = (() => {
          const v = (currentData as any)?.scheduledPickupTime;
          if (!v) return null;
          if (typeof (v as any)?.toDate === "function")
            return (v as any).toDate();
          if (v instanceof Date) return v;
          const d = new Date(String(v));
          return isNaN(d.getTime()) ? null : d;
        })();
        if (sched && Date.now() >= sched.getTime()) {
          return NextResponse.json(
            { error: "Reservation has already started." },
            { status: 400 },
          );
        }

        await docRef.update({
          status: "cancelled_by_admin",
          cancelledAt: FieldValue.serverTimestamp(),
          cancelledBy: caller.uid,
          cancellationReason: reason || "Cancelled by admin",
          updatedAt: FieldValue.serverTimestamp(),
        });

        await createAuditLog({
          actionType: "reservation_cancelled",
          actorId: caller.uid,
          actorEmail: caller.email || "admin",
          targetId: reservationId,
          targetType: "reservation",
          details: `Cancelled reservation ${reservationId}`,
          metadata: reason ? { reason } : undefined,
        });

        try {
          const isDriveMyCar =
            String((currentData as any)?.service || "") === "drive_my_car" ||
            !!(currentData as any)?.driveMyCar;
          const payProvider = String(
            (currentData as any)?.payment?.provider || "",
          );
          const payStatus = String((currentData as any)?.payment?.status || "");
          const alreadyRefunded =
            Boolean((currentData as any)?.payment?.refunded) ||
            Boolean((currentData as any)?.refunded);
          const existingRefundStatus = String(
            (currentData as any)?.payment?.refund?.status || "",
          );

          const canAttemptRefund =
            isDriveMyCar &&
            payProvider === "paystack" &&
            payStatus === "succeeded" &&
            !alreadyRefunded &&
            existingRefundStatus !== "pending" &&
            existingRefundStatus !== "processing" &&
            existingRefundStatus !== "processed";

          if (canAttemptRefund) {
            const txId = (currentData as any)?.payment?.transactionId;
            const txRef = (currentData as any)?.payment?.reference;
            const transaction =
              typeof txId === "number" && Number.isFinite(txId) && txId > 0
                ? txId
                : String(txRef || "").trim();

            if (transaction) {
              const r = await createPaystackRefund({ transaction });
              const refundData = (r as any)?.data || {};

              await docRef.set(
                {
                  payment: {
                    refund: {
                      provider: "paystack",
                      status: String(refundData?.status || "pending"),
                      refundId: refundData?.id ?? null,
                      refundReference: refundData?.reference ?? null,
                      amountKobo: refundData?.amount ?? null,
                      currency: refundData?.currency ?? "NGN",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  },
                  updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
              );

              await createAuditLog({
                actionType: "refund_initiated",
                actorId: caller.uid,
                actorEmail: caller.email || "admin",
                targetId: reservationId,
                targetType: "booking",
                details: `Refund initiated for booking ${reservationId}`,
                metadata: {
                  transaction,
                  refundId: refundData?.id ?? null,
                  refundReference: refundData?.reference ?? null,
                  status: refundData?.status ?? null,
                },
              });
            }
          }
        } catch (e) {
          console.warn(
            "[admin.reservations.cancel] refund initiation failed:",
            e,
          );
          try {
            await docRef.set(
              {
                payment: {
                  refund: {
                    provider: "paystack",
                    status: "failed",
                    updatedAt: new Date().toISOString(),
                  },
                },
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          } catch {}

          await createAuditLog({
            actionType: "refund_failed",
            actorId: caller.uid,
            actorEmail: caller.email || "admin",
            targetId: reservationId,
            targetType: "booking",
            details: `Refund initiation failed for booking ${reservationId}`,
            metadata: { error: e instanceof Error ? e.message : String(e) },
          });

          try {
            await sendRefundAttentionAdmins({
              bookingId: reservationId,
              title: "Refund Initiation Failed",
              message: `Refund initiation failed for booking ${reservationId}. Please review in admin portal.`,
            });
          } catch {}
        }

        return NextResponse.json(
          { success: true, status: "cancelled_by_admin" },
          { status: 200 },
        );
      }

      case "reassign": {
        // Can only reassign if not completed or cancelled
        if (
          [
            "completed",
            "cancelled_by_customer",
            "cancelled_by_driver",
            "cancelled_by_admin",
          ].includes(currentStatus)
        ) {
          return NextResponse.json(
            { error: "Cannot reassign this reservation" },
            { status: 400 },
          );
        }

        if (!driverId) {
          return NextResponse.json(
            { error: "Driver ID is required for reassignment" },
            { status: 400 },
          );
        }

        // Verify driver exists and is approved
        const driverDoc = await adminDb
          .collection("drivers")
          .doc(driverId)
          .get();
        if (!driverDoc.exists) {
          return NextResponse.json(
            { error: "Driver not found" },
            { status: 404 },
          );
        }

        const driverData = driverDoc.data()!;
        if (driverData.status !== "approved") {
          return NextResponse.json(
            { error: "Driver is not approved" },
            { status: 400 },
          );
        }

        // Prevent assigning placement-track drivers to standard reservations
        try {
          const uSnap = await adminDb.collection("users").doc(driverId).get();
          const u = uSnap.exists ? (uSnap.data() as any) : {};
          const rawTrack = u?.driverTrack as string | undefined;
          const normalized =
            rawTrack === "placement_only" ? "placement" : rawTrack;
          const driverTrack =
            normalized === "fleet" ||
            normalized === "placement" ||
            normalized === "both"
              ? normalized
              : "fleet";
          if (driverTrack === "placement") {
            return NextResponse.json(
              {
                error: "Cannot assign placement-track drivers to reservations",
              },
              { status: 400 },
            );
          }
        } catch {
          // If we fail to read track, default to allow (backwards-compatible)
        }

        // Get driver name for notification
        let driverName = "Driver";
        let driverPhone: string | null = null;
        let driverProfileImageUrl: string | null = null;
        try {
          const driverUserDoc = await adminDb
            .collection("users")
            .doc(driverId)
            .get();
          if (driverUserDoc.exists) {
            const userData = driverUserDoc.data()!;
            driverName =
              `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
              "Driver";
            driverPhone = (userData as any)?.phoneNumber ?? null;
            driverProfileImageUrl = (userData as any)?.profileImageUrl ?? null;
          }
        } catch {}

        const previousDriverId = currentData.driverId;

        const shouldResolveNeedsReassignment =
          String(currentStatus) === "needs_reassignment";

        await docRef.update({
          driverId,
          driverInfo: {
            name: driverName,
            phoneNumber: driverPhone,
            profileImageUrl: driverProfileImageUrl,
          },
          status: "driver_assigned",
          assignedAt: FieldValue.serverTimestamp(),
          assignedBy: caller.uid,
          previousDriverId: previousDriverId || null,
          manualAssignment: true,
          autoAssignment: false,
          offerAssignment: false,
          ...(shouldResolveNeedsReassignment
            ? {
                needsReassignmentResolvedAt: FieldValue.serverTimestamp(),
                needsReassignmentResolvedBy: caller.uid,
                needsReassignmentResolution: "driver_assigned",
              }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });

        await createAuditLog({
          actionType: "driver_reassigned",
          actorId: caller.uid,
          actorEmail: caller.email || "admin",
          targetId: reservationId,
          targetType: "reservation",
          details: `Reassigned reservation ${reservationId} to ${driverName}`,
          metadata: { driverId, previousDriverId },
        });

        try {
          await sendNotificationToDriver(driverId, {
            title: "New reservation assigned",
            body: `You have been assigned a new reservation. Tap to review and accept.`,
            data: { type: "admin_assignment", bookingId: reservationId },
            clickAction: `/driver/trips/${reservationId}`,
          });
        } catch (e) {
          console.warn(
            "[admin.reservations.reassign] Failed to notify driver:",
            e,
          );
        }

        try {
          const customerId = String(
            currentData?.customerId || currentData?.uid || "",
          ).trim();
          if (customerId) {
            const schedIso = currentData?.scheduledPickupTime?.toDate?.()
              ? currentData.scheduledPickupTime.toDate().toISOString()
              : typeof currentData?.scheduledPickupTime === "string"
                ? currentData.scheduledPickupTime
                : undefined;
            await sendDriverAssignedNotification(customerId, {
              bookingId: reservationId,
              driverName,
              scheduledTime: schedIso,
            });
          }
        } catch (e) {
          console.warn(
            "[admin.reservations.reassign] Failed to notify customer:",
            e,
          );
        }

        return NextResponse.json(
          { success: true, status: "driver_assigned", driverId },
          { status: 200 },
        );
      }

      case "reassign_vehicle": {
        if (
          [
            "completed",
            "cancelled_by_customer",
            "cancelled_by_driver",
            "cancelled_by_admin",
          ].includes(currentStatus)
        ) {
          return NextResponse.json(
            { error: "Cannot reassign this reservation" },
            { status: 400 },
          );
        }

        const paymentStatus = String(currentData?.payment?.status || "pending");
        if (paymentStatus !== "succeeded") {
          return NextResponse.json(
            {
              error:
                "Vehicle reassignment is only allowed for paid reservations.",
            },
            { status: 400 },
          );
        }

        const nextListingId =
          typeof listingId === "string" ? listingId.trim() : "";
        if (!nextListingId) {
          return NextResponse.json(
            { error: "listingId is required for vehicle reassignment" },
            { status: 400 },
          );
        }

        const prevListingId =
          typeof currentData?.listingId === "string"
            ? String(currentData.listingId).trim()
            : "";
        if (!prevListingId) {
          return NextResponse.json(
            { error: "Reservation is missing listingId" },
            { status: 400 },
          );
        }
        if (nextListingId === prevListingId) {
          return NextResponse.json(
            { error: "New listing must be different from current listing" },
            { status: 400 },
          );
        }

        const nextListingDoc = await adminDb
          .collection("vehicles")
          .doc(nextListingId)
          .get();
        if (!nextListingDoc.exists) {
          return NextResponse.json(
            { error: "Listing not found" },
            { status: 404 },
          );
        }
        const nextListing = nextListingDoc.data() as any;
        const nextListingStatus = String(nextListing?.status || "available");
        if (nextListing?.adminActive === false) {
          return NextResponse.json(
            { error: "Listing is hidden by admin" },
            { status: 400 },
          );
        }
        if (nextListingStatus !== "available") {
          return NextResponse.json(
            { error: "Listing is not available" },
            { status: 400 },
          );
        }

        const bookingCity = currentData?.city ? String(currentData.city) : "";
        const listingCity = nextListing?.city ? String(nextListing.city) : "";
        if (bookingCity && listingCity && bookingCity !== listingCity) {
          return NextResponse.json(
            { error: "Listing city does not match reservation city" },
            { status: 400 },
          );
        }

        const toDateSafe = (dateStr?: string, timeStr?: string) => {
          if (!dateStr) return null;
          const ts = `${dateStr}T${timeStr || "00:00"}:00`;
          const d = new Date(ts);
          return isNaN(d.getTime()) ? null : d;
        };

        const rentalUnit = String(currentData?.rentalUnit || "").trim();
        const startDate = String(currentData?.startDate || "").trim();
        const startTime = String(currentData?.startTime || "").trim();
        const endDate = String(currentData?.endDate || "").trim();
        const endTime = String(currentData?.endTime || "").trim();

        let reqStart: Date | null = null;
        let reqEnd: Date | null = null;

        if (rentalUnit === "day") {
          reqStart = toDateSafe(startDate, "00:00");
          if (endDate) {
            reqEnd = toDateSafe(endDate, "23:59");
          } else {
            reqEnd = toDateSafe(startDate, "23:59");
          }
        } else {
          reqStart = toDateSafe(startDate, startTime || "08:00");
          if (endTime) {
            reqEnd = toDateSafe(startDate, endTime);
          } else if (reqStart) {
            reqEnd = new Date(reqStart.getTime() + 4 * 60 * 60 * 1000);
          }
        }

        if (!reqStart || !reqEnd || reqEnd.getTime() <= reqStart.getTime()) {
          return NextResponse.json(
            {
              error: "Reservation has invalid or incomplete date/time window.",
            },
            { status: 400 },
          );
        }

        const existingSnap = await adminDb
          .collection("bookings")
          .where("listingId", "==", nextListingId)
          .limit(200)
          .get();

        const blockingStatuses = new Set([
          "confirmed",
          "driver_assigned",
          "en_route",
          "in_progress",
          "pending",
          "needs_reassignment",
        ]);
        const conflicts: string[] = [];

        existingSnap.forEach((d) => {
          if (d.id === reservationId) return;
          const b = d.data() as any;
          const status = String(b?.status || "confirmed");
          const pay = String(b?.payment?.status || "pending");

          const isBlockingStatus =
            blockingStatuses.has(status) ||
            (status === "requested" &&
              (pay === "pending" || pay === "succeeded"));

          if (!isBlockingStatus) return;

          const parseExisting = (): { s: Date; e: Date } | null => {
            try {
              const sd = String(b?.startDate || "").trim();
              const ed = String(b?.endDate || "").trim();
              const st = String(b?.startTime || "").trim();
              const et = String(b?.endTime || "").trim();
              const unit = String(b?.rentalUnit || "").trim();

              if (sd) {
                const s = toDateSafe(
                  sd,
                  st || (unit === "4h" ? "08:00" : "00:00"),
                );
                let e: Date | null = null;
                if (ed) {
                  e = toDateSafe(ed, et || (unit === "4h" ? "12:00" : "23:59"));
                } else if (et) {
                  e = toDateSafe(sd, et);
                } else if (s) {
                  e =
                    unit === "4h"
                      ? new Date(s.getTime() + 4 * 60 * 60 * 1000)
                      : toDateSafe(sd, "23:59");
                }
                if (s && e && e.getTime() > s.getTime()) return { s, e };
              }
            } catch {}
            return null;
          };

          const interval = parseExisting();
          if (!interval) return;

          const sA = reqStart!.getTime();
          const eA = reqEnd!.getTime();
          const sB = interval.s.getTime();
          const eB = interval.e.getTime();

          if (sA < eB && sB < eA) {
            conflicts.push(d.id);
          }
        });

        if (conflicts.length > 0) {
          return NextResponse.json(
            {
              error:
                "Replacement listing is not available for this time window.",
              conflicts,
            },
            { status: 409 },
          );
        }

        const parsedOverride = (() => {
          if (settlementOverrideNgn == null || settlementOverrideNgn === "")
            return null;
          const n =
            typeof settlementOverrideNgn === "string"
              ? Number(settlementOverrideNgn)
              : Number(settlementOverrideNgn);
          if (!Number.isFinite(n)) return null;
          return Math.max(0, Math.round(n));
        })();

        const vehicleInfo: any = {
          make: nextListing?.make || "Vehicle",
          model: nextListing?.model || "",
          licensePlate:
            (nextListing?.licensePlate as string | undefined) || undefined,
        };

        await docRef.update({
          listingId: nextListingId,
          previousListingId: prevListingId,
          vehicleInfo,
          reassignedVehicleAt: FieldValue.serverTimestamp(),
          reassignedVehicleBy: caller.uid,
          status: "confirmed",
          needsReassignmentResolvedAt: FieldValue.serverTimestamp(),
          needsReassignmentResolvedBy: caller.uid,
          needsReassignmentResolution: "vehicle_reassigned",
          settlement: {
            mode: "customer_price_unchanged",
            replacementListingId: nextListingId,
            replacementPartnerId: nextListing?.partnerId || null,
            partnerPayoutOverrideNgn: parsedOverride,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: caller.uid,
          },
          updatedAt: FieldValue.serverTimestamp(),
        });

        await createAuditLog({
          actionType: "reservation_vehicle_reassigned",
          actorId: caller.uid,
          actorEmail: caller.email || "admin",
          targetId: reservationId,
          targetType: "reservation",
          details: `Reassigned reservation ${reservationId} to listing ${nextListingId}`,
          metadata: {
            previousListingId: prevListingId,
            listingId: nextListingId,
            replacementPartnerId: nextListing?.partnerId || null,
            settlementOverrideNgn: parsedOverride,
          },
        });

        return NextResponse.json(
          { success: true, status: "confirmed", listingId: nextListingId },
          { status: 200 },
        );
      }

      case "unassign": {
        // Remove driver from reservation
        if (!currentData.driverId) {
          return NextResponse.json(
            { error: "No driver assigned" },
            { status: 400 },
          );
        }

        const paymentStatus = String(currentData?.payment?.status || "pending");
        const isPaid = paymentStatus === "succeeded";

        const nextStatus = isPaid ? "needs_reassignment" : "requested";

        await docRef.update({
          driverId: FieldValue.delete(),
          driverInfo: FieldValue.delete(),
          status: nextStatus,
          previousDriverId: currentData.driverId,
          ...(isPaid
            ? {
                needsReassignmentAt: FieldValue.serverTimestamp(),
                needsReassignmentReason: "Driver unassigned by admin",
                needsReassignmentSource: "admin_unassign",
                needsReassignmentBy: caller.uid,
              }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });

        await createAuditLog({
          actionType: "driver_unassigned",
          actorId: caller.uid,
          actorEmail: caller.email || "admin",
          targetId: reservationId,
          targetType: "reservation",
          details: `Unassigned driver from reservation ${reservationId}`,
          metadata: {
            previousDriverId: currentData.driverId,
            nextStatus,
            paymentStatus,
          },
        });

        return NextResponse.json(
          { success: true, status: nextStatus },
          { status: 200 },
        );
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 },
    );
  }
}
