import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";
import { publishDriveMyCarBookingOffers } from "@/services/assignment";
import { createAuditLog } from "@/lib/auditLog";
import { sendRefundAttentionAdmins } from "@/lib/adminRefundAlerts";
import { sendPartnerNewReservationRequestNotification } from "@/lib/fcmAdmin";
import {
  sendCustomerPaymentSucceededEmail,
  sendPartnerNewReservationRequestEmail,
} from "@/lib/bookingEmails";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * POST /api/payments/paystack/webhook
 *
 * Paystack calls this endpoint when payment events occur.
 * This ensures we update booking status even if the frontend never calls /verify.
 *
 * Events we handle:
 * - charge.success: Payment succeeded
 * - charge.failed: Payment failed
 *
 * Security:
 * - Verifies x-paystack-signature header using HMAC SHA512
 * - Only processes events with valid signatures
 */
export async function POST(req: Request) {
  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      console.error("[Paystack Webhook] Missing PAYSTACK_SECRET_KEY");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const enforceIpWhitelist =
      String(
        process.env.PAYSTACK_WEBHOOK_ENFORCE_IP_WHITELIST || "",
      ).toLowerCase() === "true";
    if (enforceIpWhitelist) {
      const allowedIps = new Set([
        "52.31.139.75",
        "52.49.173.169",
        "52.214.14.220",
      ]);
      const xff = (req.headers.get("x-forwarded-for") || "").trim();
      const ip = xff.split(",")[0]?.trim() || "";
      if (!ip || !allowedIps.has(ip)) {
        console.warn(
          "[Paystack Webhook] Rejected request from non-whitelisted IP",
        );
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    }

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify signature
    const signature = (req.headers.get("x-paystack-signature") || "").trim();
    if (!signature) {
      console.warn("[Paystack Webhook] Missing signature header");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    let signatureValid = false;
    try {
      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expectedSignature, "hex");
      signatureValid =
        sigBuf.length === expBuf.length &&
        crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      console.warn(
        "[Paystack Webhook] Invalid signature - possible spoofing attempt",
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse body after signature verification
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("[Paystack Webhook] Invalid JSON body");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const event = payload?.event as string;
    const data = payload?.data || {};

    console.log(
      `[Paystack Webhook] Received event: ${event}, reference: ${data?.reference}`,
    );

    // Handle different event types
    if (event === "charge.success") {
      await handleChargeSuccess(data);
    } else if (event === "charge.failed") {
      await handleChargeFailed(data);
    } else if (
      event === "refund.pending" ||
      event === "refund.processing" ||
      event === "refund.processed" ||
      event === "refund.failed"
    ) {
      await handleRefundEvent(event, data);
    } else {
      // Log but don't fail for unknown events - Paystack may add new ones
      console.log(`[Paystack Webhook] Ignoring unhandled event type: ${event}`);
    }

    // Always return 200 quickly - Paystack expects fast responses
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Paystack Webhook] Error processing webhook:", error);
    // Return 200 anyway to prevent Paystack from retrying endlessly
    // We log the error and can investigate manually
    return NextResponse.json(
      { received: true, error: "Processing failed" },
      { status: 200 },
    );
  }
}

/**
 * Handle successful payment
 * Updates booking to confirmed status
 */
async function handleChargeSuccess(data: any) {
  const reference = data?.reference as string;
  const amount = Number(data?.amount || 0); // in kobo
  const paidAt = data?.paid_at || null;
  const authCode = data?.authorization?.authorization_code;
  const currency = data?.currency || "NGN";
  const transactionId = Number(data?.id || 0);

  const metadata =
    data?.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const metaType =
    typeof metadata?.type === "string" ? String(metadata.type).trim() : "";
  const metaPurchaseId =
    typeof metadata?.purchaseId === "string"
      ? String(metadata.purchaseId).trim()
      : "";
  const placementHint =
    metaType === "placement_access" || Boolean(metaPurchaseId);

  if (!reference) {
    console.warn("[Paystack Webhook] charge.success missing reference");
    return;
  }

  // Find booking by reference
  const snap = await adminDb
    .collection("bookings")
    .where("payment.reference", "==", reference)
    .limit(1)
    .get();

  if (snap.empty) {
    if (placementHint) {
      const handled = await handlePlacementAccessChargeSuccess({
        reference,
        amount,
        paidAt,
        authCode,
        currency,
        transactionId,
        metadata,
      });
      if (handled) return;
    }
    console.warn(
      `[Paystack Webhook] No booking found for reference: ${reference}`,
    );
    return;
  }

  const doc = snap.docs[0];
  const booking = doc.data() as any;
  const bookingId = doc.id;

  // Idempotency check: don't re-process if already confirmed/completed
  const currentPaymentStatus = booking?.payment?.status;

  if (currentPaymentStatus === "succeeded") {
    try {
      const customerId = String(
        booking?.uid || booking?.customerId || "",
      ).trim();
      if (customerId) {
        await sendCustomerPaymentSucceededEmail({
          bookingId,
          customerId,
          amountKobo: Number.isFinite(amount) ? amount : null,
          currency: currency || "NGN",
          pickupAddress: (booking?.pickupAddress ?? null) as string | null,
          city: (booking?.city ?? null) as string | null,
          scheduledPickupTimeIso:
            booking?.scheduledPickupTime?.toDate?.()?.toISOString?.() ?? null,
        });
      }
    } catch (e) {
      console.warn(
        "[Paystack Webhook] Customer payment email attempt failed:",
        e,
      );
    }

    if (booking?.partnerBookingRequestNotifiedAt) {
      console.log(
        `[Paystack Webhook] Booking ${bookingId} already marked as paid - skipping`,
      );
      return;
    }
    await tryNotifyPartnerForBooking(bookingId, booking);
    return;
  }

  // Amount sanity check (log only, don't block)
  const expectedAmount = Number(booking?.payment?.amountKobo || 0);
  if (String(currency || "").toUpperCase() !== "NGN") {
    console.warn(
      `[Paystack Webhook] Currency mismatch for ${bookingId}: ${currency}`,
    );
    await createAuditLog({
      actionType: "payment_currency_mismatch",
      actorId: "system",
      actorEmail: "paystack",
      targetId: bookingId,
      targetType: "booking",
      details: `Currency mismatch for booking ${bookingId}`,
      metadata: { reference, currency },
    });
    return;
  }

  if (expectedAmount && amount && amount !== expectedAmount) {
    console.warn(
      `[Paystack Webhook] Amount mismatch for ${bookingId}: expected ${expectedAmount}, got ${amount}`,
    );
    await createAuditLog({
      actionType: "payment_amount_mismatch",
      actorId: "system",
      actorEmail: "paystack",
      targetId: bookingId,
      targetType: "booking",
      details: `Amount mismatch for booking ${bookingId}`,
      metadata: {
        reference,
        expectedAmountKobo: expectedAmount,
        amountKobo: amount,
      },
    });
    return;
  }

  const metaBookingId =
    typeof metadata?.bookingId === "string" ? metadata.bookingId.trim() : "";
  const metaUid = typeof metadata?.uid === "string" ? metadata.uid.trim() : "";
  if (metaBookingId && metaBookingId !== bookingId) {
    await createAuditLog({
      actionType: "payment_metadata_mismatch",
      actorId: "system",
      actorEmail: "paystack",
      targetId: bookingId,
      targetType: "booking",
      details: `Metadata bookingId mismatch for booking ${bookingId}`,
      metadata: { reference, metaBookingId },
    });
    return;
  }

  const bookingUid = String(booking?.uid || booking?.customerId || "").trim();
  if (metaUid && bookingUid && metaUid !== bookingUid) {
    await createAuditLog({
      actionType: "payment_metadata_mismatch",
      actorId: "system",
      actorEmail: "paystack",
      targetId: bookingId,
      targetType: "booking",
      details: `Metadata uid mismatch for booking ${bookingId}`,
      metadata: { reference, metaUid, bookingUid },
    });
    return;
  }

  // Update booking
  await adminDb
    .collection("bookings")
    .doc(bookingId)
    .update({
      "payment.status": "succeeded",
      "payment.paidAt": paidAt,
      "payment.authorizationCode": authCode || null,
      "payment.gatewayResponse": "success",
      "payment.currency": currency,
      "payment.amountKobo": amount || expectedAmount,
      "payment.transactionId":
        transactionId && Number.isFinite(transactionId) ? transactionId : null,
      status: "confirmed",
      updatedAt: new Date().toISOString(),
      webhookProcessedAt: new Date().toISOString(),
    });

  console.log(
    `[Paystack Webhook] ✓ Booking ${bookingId} confirmed via webhook`,
  );

  try {
    const customerId = String(booking?.uid || booking?.customerId || "").trim();
    if (customerId) {
      await sendCustomerPaymentSucceededEmail({
        bookingId,
        customerId,
        amountKobo: Number.isFinite(amount) ? amount : null,
        currency: currency || "NGN",
        pickupAddress: (booking?.pickupAddress ?? null) as string | null,
        city: (booking?.city ?? null) as string | null,
        scheduledPickupTimeIso:
          booking?.scheduledPickupTime?.toDate?.()?.toISOString?.() ?? null,
      });
    }
  } catch (e) {
    console.warn(
      "[Paystack Webhook] Customer payment email attempt failed:",
      e,
    );
  }

  await tryNotifyPartnerForBooking(bookingId, booking);

  // Publish offers only for drive_my_car (best-effort)
  try {
    const service = String(booking?.service || "");
    if (service === "drive_my_car") {
      await publishDriveMyCarBookingOffers(bookingId, {
        targetTotalOffers: 10,
        wave: 1,
      });
    }
  } catch (e) {
    console.warn("[Paystack Webhook] Offer publishing attempt failed:", e);
  }
}

async function tryNotifyPartnerForBooking(bookingId: string, booking: any) {
  try {
    if (!bookingId) return;
    if (booking?.partnerBookingRequestNotifiedAt) return;

    const listingId = String(booking?.listingId || "").trim();
    const rentalUnit = String(booking?.rentalUnit || "").trim();
    if (!listingId) return;
    if (rentalUnit !== "day" && rentalUnit !== "4h") return;

    const vehicleSnap = await adminDb
      .collection("vehicles")
      .doc(listingId)
      .get();
    if (!vehicleSnap.exists) return;
    const vehicle = vehicleSnap.data() as any;
    const partnerId =
      typeof vehicle?.partnerId === "string" ? vehicle.partnerId.trim() : "";
    if (!partnerId) return;

    let emailSent = false;
    try {
      const emailRes = await sendPartnerNewReservationRequestEmail({
        bookingId,
        partnerId,
        city: (booking?.city ?? null) as string | null,
        pickupAddress: (booking?.pickupAddress ?? null) as string | null,
        scheduledPickupTimeIso:
          booking?.scheduledPickupTime?.toDate?.()?.toISOString?.() ?? null,
        fareNgn: typeof booking?.fareNgn === "number" ? booking.fareNgn : null,
      });
      emailSent = emailRes.sent;
    } catch (e) {
      console.warn("[Paystack Webhook] Partner email attempt failed:", e);
      emailSent = false;
    }

    const res = await sendPartnerNewReservationRequestNotification(partnerId, {
      bookingId,
      city: (booking?.city ?? null) as string | null,
      pickupAddress: (booking?.pickupAddress ?? null) as string | null,
      scheduledPickupTime:
        booking?.scheduledPickupTime?.toDate?.()?.toISOString?.() ?? null,
      fareNgn: typeof booking?.fareNgn === "number" ? booking.fareNgn : null,
    });

    if (res.success || emailSent) {
      await adminDb
        .collection("bookings")
        .doc(bookingId)
        .set(
          { partnerBookingRequestNotifiedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
    }
  } catch (e) {
    console.warn("[Paystack Webhook] Partner notification attempt failed:", e);
  }
}

/**
 * Handle failed payment
 * Updates booking payment status to failed
 */
async function handleChargeFailed(data: any) {
  const reference = data?.reference as string;
  const gatewayResponse = data?.gateway_response || "failed";

  const metadata =
    data?.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const metaType =
    typeof metadata?.type === "string" ? String(metadata.type).trim() : "";
  const metaPurchaseId =
    typeof metadata?.purchaseId === "string"
      ? String(metadata.purchaseId).trim()
      : "";
  const placementHint =
    metaType === "placement_access" || Boolean(metaPurchaseId);

  if (!reference) {
    console.warn("[Paystack Webhook] charge.failed missing reference");
    return;
  }

  // Find booking by reference
  const snap = await adminDb
    .collection("bookings")
    .where("payment.reference", "==", reference)
    .limit(1)
    .get();

  if (snap.empty) {
    if (placementHint) {
      const handled = await handlePlacementAccessChargeFailed({
        reference,
        gatewayResponse,
        metadata,
      });
      if (handled) return;
    }
    console.warn(
      `[Paystack Webhook] No booking found for reference: ${reference}`,
    );
    return;
  }

  const doc = snap.docs[0];
  const booking = doc.data() as any;
  const bookingId = doc.id;

  // Idempotency: don't downgrade a successful payment
  const currentPaymentStatus = booking?.payment?.status;
  if (currentPaymentStatus === "succeeded") {
    console.warn(
      `[Paystack Webhook] Booking ${bookingId} already succeeded - ignoring failed event`,
    );
    return;
  }

  // Update booking
  await adminDb.collection("bookings").doc(bookingId).update({
    "payment.status": "failed",
    "payment.gatewayResponse": gatewayResponse,
    status: "requested", // Back to requested so they can retry
    updatedAt: new Date().toISOString(),
    webhookProcessedAt: new Date().toISOString(),
  });

  console.log(
    `[Paystack Webhook] ✗ Booking ${bookingId} marked as payment failed`,
  );
}

async function handlePlacementAccessChargeSuccess(input: {
  reference: string;
  amount: number;
  paidAt: any;
  authCode: any;
  currency: any;
  transactionId: number;
  metadata: any;
}): Promise<boolean> {
  const reference = String(input.reference || "").trim();
  if (!reference) return false;

  const purchaseId =
    typeof input.metadata?.purchaseId === "string"
      ? String(input.metadata.purchaseId).trim()
      : "";

  let purchaseSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null =
    null;

  if (purchaseId) {
    const snap = await adminDb
      .collection("placement_access_purchases")
      .doc(purchaseId)
      .get();
    purchaseSnap = snap.exists ? snap : null;
  }

  if (!purchaseSnap) {
    const qs = await adminDb
      .collection("placement_access_purchases")
      .where("paymentReference", "==", reference)
      .limit(1)
      .get();
    purchaseSnap = qs.empty ? null : qs.docs[0];
  }

  if (!purchaseSnap) return false;

  const purchase = purchaseSnap.data() as any;
  const currentStatus = String(purchase?.status || "pending");
  if (currentStatus === "completed") return true;

  const expectedAmountKobo = Math.round(Number(purchase?.amountNgn || 0) * 100);
  if (
    expectedAmountKobo > 0 &&
    Number.isFinite(input.amount) &&
    input.amount !== expectedAmountKobo
  ) {
    await createAuditLog({
      actionType: "payment_amount_mismatch",
      actorId: "system",
      actorEmail: "paystack",
      targetId: purchaseSnap.id,
      targetType: "placement_purchase",
      details: `Amount mismatch for placement access purchase ${purchaseSnap.id}`,
      metadata: { reference, expectedAmountKobo, amountKobo: input.amount },
    });
    return true;
  }

  if (String(input.currency || "").toUpperCase() !== "NGN") {
    await createAuditLog({
      actionType: "payment_currency_mismatch",
      actorId: "system",
      actorEmail: "paystack",
      targetId: purchaseSnap.id,
      targetType: "placement_purchase",
      details: `Currency mismatch for placement access purchase ${purchaseSnap.id}`,
      metadata: { reference, currency: input.currency },
    });
    return true;
  }

  const customerId =
    typeof purchase?.customerId === "string"
      ? purchase.customerId
      : typeof input.metadata?.customerId === "string"
        ? input.metadata.customerId
        : "";

  if (!customerId) return false;

  const accessExpiresAt = purchase?.accessExpiresAt;
  const expiresDate =
    accessExpiresAt?.toDate?.() instanceof Date
      ? accessExpiresAt.toDate()
      : null;
  const accessExpiresAtTs = expiresDate
    ? Timestamp.fromDate(expiresDate)
    : accessExpiresAt;

  await adminDb.runTransaction(async (tx) => {
    const purchaseRef = adminDb
      .collection("placement_access_purchases")
      .doc(purchaseSnap!.id);
    const userRef = adminDb.collection("users").doc(customerId);

    const fresh = await tx.get(purchaseRef);
    const freshData = fresh.exists ? (fresh.data() as any) : {};
    if (String(freshData?.status || "pending") === "completed") return;

    tx.set(
      purchaseRef,
      {
        status: "completed",
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: FieldValue.serverTimestamp(),
        gateway: {
          provider: "paystack",
          status: "success",
          reference,
          paidAt: input.paidAt || null,
          authorizationCode: input.authCode || null,
          currency: input.currency || "NGN",
          amountKobo: Number.isFinite(input.amount) ? input.amount : null,
          transactionId:
            input.transactionId && Number.isFinite(input.transactionId)
              ? input.transactionId
              : null,
        },
      },
      { merge: true },
    );

    tx.set(
      userRef,
      {
        placementAccess: {
          hasAccess: true,
          accessExpiresAt: accessExpiresAtTs || null,
          purchaseId: purchaseSnap!.id,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return true;
}

async function handlePlacementAccessChargeFailed(input: {
  reference: string;
  gatewayResponse: any;
  metadata: any;
}): Promise<boolean> {
  const reference = String(input.reference || "").trim();
  if (!reference) return false;

  const purchaseId =
    typeof input.metadata?.purchaseId === "string"
      ? String(input.metadata.purchaseId).trim()
      : "";

  let purchaseSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null =
    null;

  if (purchaseId) {
    const snap = await adminDb
      .collection("placement_access_purchases")
      .doc(purchaseId)
      .get();
    purchaseSnap = snap.exists ? snap : null;
  }

  if (!purchaseSnap) {
    const qs = await adminDb
      .collection("placement_access_purchases")
      .where("paymentReference", "==", reference)
      .limit(1)
      .get();
    purchaseSnap = qs.empty ? null : qs.docs[0];
  }

  if (!purchaseSnap) return false;

  const purchase = purchaseSnap.data() as any;
  const currentStatus = String(purchase?.status || "pending");
  if (currentStatus === "completed") return true;

  await adminDb
    .collection("placement_access_purchases")
    .doc(purchaseSnap.id)
    .set(
      {
        status: "failed",
        updatedAt: FieldValue.serverTimestamp(),
        failedAt: FieldValue.serverTimestamp(),
        gateway: {
          provider: "paystack",
          status: "failed",
          reference,
          gatewayResponse: input.gatewayResponse || "failed",
        },
      },
      { merge: true },
    );

  return true;
}

async function handleRefundEvent(event: string, data: any) {
  const refundId = data?.id ?? null;
  const refundReference = data?.reference ?? null;
  const amountKobo = Number(data?.amount || 0);
  const currency = String(data?.currency || "NGN");

  const txRef =
    typeof data?.transaction?.reference === "string"
      ? data.transaction.reference.trim()
      : "";
  const txIdRaw = data?.transaction?.id ?? data?.transaction;
  const txId = Number(txIdRaw || 0);

  let bookingDoc: any = null;

  if (txRef) {
    const snap = await adminDb
      .collection("bookings")
      .where("payment.reference", "==", txRef)
      .limit(1)
      .get();
    bookingDoc = snap.empty ? null : snap.docs[0];
  }

  if (!bookingDoc && txId && Number.isFinite(txId)) {
    const snap = await adminDb
      .collection("bookings")
      .where("payment.transactionId", "==", txId)
      .limit(1)
      .get();
    bookingDoc = snap.empty ? null : snap.docs[0];
  }

  if (!bookingDoc) {
    console.warn("[Paystack Webhook] refund event could not locate booking", {
      event,
      txRef,
      txId,
      refundReference,
    });
    return;
  }

  const bookingId = bookingDoc.id as string;
  const booking = bookingDoc.data() as any;

  const status = event.split(".").slice(1).join(".") || "";
  const normalizedStatus =
    status === "pending" ||
    status === "processing" ||
    status === "processed" ||
    status === "failed"
      ? status
      : "pending";

  const refundAmountNgn = amountKobo > 0 ? Math.round(amountKobo / 100) : 0;

  const update: Record<string, any> = {
    payment: {
      ...(booking?.payment || {}),
      refund: {
        ...(booking?.payment?.refund || {}),
        provider: "paystack",
        status: normalizedStatus,
        refundId,
        refundReference,
        amountKobo: amountKobo || null,
        currency,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };

  if (normalizedStatus === "processed") {
    update.payment.refunded = true;
    update.payment.refundAmount = refundAmountNgn;
    update.refunded = true;
    update.refundAmount = refundAmountNgn;
  }

  if (normalizedStatus === "failed") {
    update.payment.refunded = false;
    update.payment.refundAmount =
      refundAmountNgn || (booking?.payment?.refundAmount ?? null);
    update.refunded = false;
    update.refundAmount = refundAmountNgn || (booking?.refundAmount ?? null);
  }

  await adminDb
    .collection("bookings")
    .doc(bookingId)
    .set(update, { merge: true });

  const actionType =
    normalizedStatus === "pending"
      ? "refund_pending"
      : normalizedStatus === "processing"
        ? "refund_processing"
        : normalizedStatus === "processed"
          ? "refund_processed"
          : "refund_failed";

  await createAuditLog({
    actionType,
    actorId: "system",
    actorEmail: "paystack",
    targetId: bookingId,
    targetType: "booking",
    details: `Paystack refund ${normalizedStatus} for booking ${bookingId}`,
    metadata: {
      event,
      refundId,
      refundReference,
      transactionReference: txRef || null,
      transactionId: txId || null,
      amountKobo: amountKobo || null,
      amountNgn: refundAmountNgn || null,
      currency,
    },
  });

  if (normalizedStatus === "failed") {
    await sendRefundAttentionAdmins({
      bookingId,
      title: "Refund Failed",
      message: `Refund failed for booking ${bookingId}. Please review in admin portal.`,
    });
  }
}
