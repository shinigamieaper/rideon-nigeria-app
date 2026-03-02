import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { publishDriveMyCarBookingOffers } from "@/services/assignment";
import { sendPartnerNewReservationRequestNotification } from "@/lib/fcmAdmin";
import {
  sendCustomerPaymentSucceededEmail,
  sendPartnerNewReservationRequestEmail,
} from "@/lib/bookingEmails";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";

export const runtime = "nodejs";

// GET /api/payments/paystack/verify?reference=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = (searchParams.get("reference") || "").trim();

    if (!reference) {
      return NextResponse.json(
        { error: "Missing reference." },
        { status: 400 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";
    if (!token) throw new Error("Missing Authorization Bearer token");

    // Verify user token (ensures only the customer can verify their own booking)
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    let userEmail: string | null =
      typeof (decoded as any)?.email === "string"
        ? String((decoded as any).email)
        : null;
    if (!userEmail) {
      try {
        const u = await adminAuth.getUser(uid);
        userEmail = u.email ?? null;
      } catch {
        userEmail = null;
      }
    }

    const isDev = process.env.NODE_ENV !== "production";
    const isDevPlacementReference =
      isDev && reference.startsWith("dev_placement_");

    if (isDevPlacementReference) {
      const qs = await adminDb
        .collection("placement_access_purchases")
        .where("paymentReference", "==", reference)
        .limit(1)
        .get();

      if (qs.empty) {
        return NextResponse.json(
          { error: "Purchase not found for reference." },
          { status: 404 },
        );
      }

      const purchaseSnap = qs.docs[0];
      const purchase = purchaseSnap.data() as any;
      const customerId =
        typeof purchase?.customerId === "string" ? purchase.customerId : "";
      if (!customerId) {
        return NextResponse.json(
          { error: "Purchase is missing customerId." },
          { status: 400 },
        );
      }

      if (customerId !== uid) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const accessExpiresAt = purchase?.accessExpiresAt;
      const expiresDate =
        accessExpiresAt?.toDate?.() instanceof Date
          ? accessExpiresAt.toDate()
          : null;
      const accessExpiresAtTs = expiresDate
        ? Timestamp.fromDate(expiresDate)
        : accessExpiresAt;

      await adminDb
        .collection("users")
        .doc(customerId)
        .set(
          {
            placementAccess: {
              hasAccess: true,
              accessExpiresAt: accessExpiresAtTs || null,
              purchaseId: purchaseSnap.id,
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      if (String(purchase?.status || "pending") !== "completed") {
        await adminDb
          .collection("placement_access_purchases")
          .doc(purchaseSnap.id)
          .set(
            {
              status: "completed",
              updatedAt: FieldValue.serverTimestamp(),
              completedAt: FieldValue.serverTimestamp(),
              gateway: {
                provider: "dev",
                status: "success",
                reference,
              },
            },
            { merge: true },
          );
      }

      return NextResponse.json(
        {
          purpose: "placement_access",
          purchaseId: purchaseSnap.id,
          paymentStatus: "succeeded",
          accessExpiresAt: expiresDate ? expiresDate.toISOString() : null,
        },
        { status: 200 },
      );
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
    }

    // Verify with Paystack
    const verifyResp = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        cache: "no-store",
      },
    );
    const verifyJson = await verifyResp.json().catch(() => null);
    if (!verifyResp.ok || !verifyJson?.status) {
      const message = verifyJson?.message || "Failed to verify transaction.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const data = verifyJson.data || {};
    const status = String(data.status || ""); // 'success', 'failed', 'abandoned'
    const paidAt = data.paid_at || null;
    const amount = Number(data.amount || 0); // in kobo
    const currency = String(data.currency || "");
    const transactionId = Number(data.id || 0);
    const authCode = data?.authorization?.authorization_code;

    const paystackCustomerEmail =
      typeof data?.customer?.email === "string"
        ? String(data.customer.email).trim().toLowerCase()
        : "";
    if (userEmail && paystackCustomerEmail) {
      if (paystackCustomerEmail !== String(userEmail).trim().toLowerCase()) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

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

    // Locate booking by reference stored during init
    const snap = await adminDb
      .collection("bookings")
      .where("payment.reference", "==", reference)
      .limit(1)
      .get();

    if (snap.empty) {
      if (!placementHint) {
        return NextResponse.json(
          { error: "Booking not found for reference." },
          { status: 404 },
        );
      }

      let purchaseSnap: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null =
        null;

      if (metaPurchaseId) {
        const s = await adminDb
          .collection("placement_access_purchases")
          .doc(metaPurchaseId)
          .get();
        purchaseSnap = s.exists ? s : null;
      }

      if (!purchaseSnap) {
        const qs = await adminDb
          .collection("placement_access_purchases")
          .where("paymentReference", "==", reference)
          .limit(1)
          .get();
        purchaseSnap = qs.empty ? null : qs.docs[0];
      }

      if (!purchaseSnap) {
        return NextResponse.json(
          { error: "Purchase not found for reference." },
          { status: 404 },
        );
      }

      const purchase = purchaseSnap.data() as any;
      const customerId =
        typeof purchase?.customerId === "string"
          ? purchase.customerId
          : typeof metadata?.customerId === "string"
            ? metadata.customerId
            : "";

      if (!customerId) {
        return NextResponse.json(
          { error: "Purchase is missing customerId." },
          { status: 400 },
        );
      }

      if (customerId !== uid) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const accessExpiresAt = purchase?.accessExpiresAt;
      const expiresDate =
        accessExpiresAt?.toDate?.() instanceof Date
          ? accessExpiresAt.toDate()
          : null;
      const accessExpiresAtTs = expiresDate
        ? Timestamp.fromDate(expiresDate)
        : accessExpiresAt;

      const expectedAmountKobo = Math.round(
        Number(purchase?.amountNgn || 0) * 100,
      );

      let newPaymentStatus: "succeeded" | "failed" | "abandoned" | "pending" =
        "pending";
      if (status === "success") newPaymentStatus = "succeeded";
      else if (status === "failed") newPaymentStatus = "failed";
      else if (status === "abandoned") newPaymentStatus = "abandoned";

      if (newPaymentStatus === "succeeded") {
        if (String(currency || "").toUpperCase() !== "NGN") {
          await createAuditLog({
            actionType: "payment_currency_mismatch",
            actorId: "system",
            actorEmail: "paystack",
            targetId: purchaseSnap.id,
            targetType: "placement_purchase",
            details: `Currency mismatch for placement access purchase ${purchaseSnap.id}`,
            metadata: { reference, currency },
          });
          return NextResponse.json(
            { error: "Payment verification failed." },
            { status: 409 },
          );
        }

        if (
          expectedAmountKobo > 0 &&
          Number.isFinite(amount) &&
          amount !== expectedAmountKobo
        ) {
          await createAuditLog({
            actionType: "payment_amount_mismatch",
            actorId: "system",
            actorEmail: "paystack",
            targetId: purchaseSnap.id,
            targetType: "placement_purchase",
            details: `Amount mismatch for placement access purchase ${purchaseSnap.id}`,
            metadata: { reference, expectedAmountKobo, amountKobo: amount },
          });
          return NextResponse.json(
            { error: "Payment verification failed." },
            { status: 409 },
          );
        }
      }

      if (newPaymentStatus === "succeeded") {
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
                paidAt: paidAt || null,
                authorizationCode: authCode || null,
                currency: currency || "NGN",
                amountKobo: Number.isFinite(amount) ? amount : null,
                transactionId:
                  transactionId && Number.isFinite(transactionId)
                    ? transactionId
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
      } else if (
        newPaymentStatus === "failed" ||
        newPaymentStatus === "abandoned"
      ) {
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
                status: newPaymentStatus,
                reference,
              },
            },
            { merge: true },
          );
      }

      return NextResponse.json(
        {
          purpose: "placement_access",
          purchaseId: purchaseSnap.id,
          paymentStatus: newPaymentStatus,
          accessExpiresAt: expiresDate ? expiresDate.toISOString() : null,
        },
        { status: 200 },
      );
    }

    const doc = snap.docs[0];
    const booking = doc.data() as any;

    if (String(booking?.payment?.status || "") === "succeeded") {
      return NextResponse.json(
        {
          bookingId: doc.id,
          paymentStatus: "succeeded",
          status: booking.status,
          service: booking?.service ?? null,
        },
        { status: 200 },
      );
    }

    const derivedService: "drive_my_car" | "rental" | "chauffeur" =
      booking?.service === "drive_my_car"
        ? "drive_my_car"
        : booking?.listingId && booking?.rentalUnit
          ? "rental"
          : "chauffeur";

    // Authorization: ensure the booking belongs to this user
    if (booking.uid !== uid && booking.customerId !== uid) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Amount/currency/metadata checks (do not confirm if mismatch)
    const expectedAmount = Number(booking?.payment?.amountKobo || 0);
    if (status === "success") {
      if (String(currency || "").toUpperCase() !== "NGN") {
        await createAuditLog({
          actionType: "payment_currency_mismatch",
          actorId: "system",
          actorEmail: "paystack",
          targetId: doc.id,
          targetType: "booking",
          details: `Currency mismatch for booking ${doc.id}`,
          metadata: { reference, currency },
        });
        return NextResponse.json(
          { error: "Payment verification failed." },
          { status: 409 },
        );
      }

      if (expectedAmount && amount && amount !== expectedAmount) {
        await createAuditLog({
          actionType: "payment_amount_mismatch",
          actorId: "system",
          actorEmail: "paystack",
          targetId: doc.id,
          targetType: "booking",
          details: `Amount mismatch for booking ${doc.id}`,
          metadata: {
            reference,
            expectedAmountKobo: expectedAmount,
            amountKobo: amount,
          },
        });
        return NextResponse.json(
          { error: "Payment verification failed." },
          { status: 409 },
        );
      }

      const metaBookingId =
        typeof metadata?.bookingId === "string"
          ? String(metadata.bookingId).trim()
          : "";
      const metaUid =
        typeof metadata?.uid === "string" ? String(metadata.uid).trim() : "";
      if (metaBookingId && metaBookingId !== doc.id) {
        await createAuditLog({
          actionType: "payment_metadata_mismatch",
          actorId: "system",
          actorEmail: "paystack",
          targetId: doc.id,
          targetType: "booking",
          details: `Metadata bookingId mismatch for booking ${doc.id}`,
          metadata: { reference, metaBookingId },
        });
        return NextResponse.json(
          { error: "Payment verification failed." },
          { status: 409 },
        );
      }

      const bookingUid = String(
        booking?.uid || booking?.customerId || "",
      ).trim();
      if (metaUid && bookingUid && metaUid !== bookingUid) {
        await createAuditLog({
          actionType: "payment_metadata_mismatch",
          actorId: "system",
          actorEmail: "paystack",
          targetId: doc.id,
          targetType: "booking",
          details: `Metadata uid mismatch for booking ${doc.id}`,
          metadata: { reference, metaUid, bookingUid },
        });
        return NextResponse.json(
          { error: "Payment verification failed." },
          { status: 409 },
        );
      }
    }

    // Update booking based on status
    let newPaymentStatus: "succeeded" | "failed" | "abandoned" | "pending" =
      "pending";
    let newBookingStatus: string | undefined = undefined;
    if (status === "success") {
      newPaymentStatus = "succeeded";
      newBookingStatus = "confirmed";
    } else if (status === "failed") {
      newPaymentStatus = "failed";
      newBookingStatus = "requested";
    } else if (status === "abandoned") {
      newPaymentStatus = "abandoned";
      newBookingStatus = "requested";
    }

    await adminDb
      .collection("bookings")
      .doc(doc.id)
      .set(
        {
          payment: {
            ...(booking.payment || {}),
            provider: "paystack",
            status: newPaymentStatus,
            amountKobo: expectedAmount || amount || undefined,
            currency: currency || "NGN",
            reference,
            transactionId:
              transactionId && Number.isFinite(transactionId)
                ? transactionId
                : undefined,
            paidAt: paidAt || null,
            authorizationCode: authCode || undefined,
            gatewayResponse: status,
          },
          ...(newBookingStatus ? { status: newBookingStatus } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

    if (newPaymentStatus === "succeeded") {
      void (async () => {
        try {
          const customerId = String(
            (booking as any)?.uid || (booking as any)?.customerId || "",
          ).trim();
          if (!customerId) return;

          await sendCustomerPaymentSucceededEmail({
            bookingId: doc.id,
            customerId,
            amountKobo: Number.isFinite(amount) ? amount : null,
            currency: currency || "NGN",
            pickupAddress: ((booking as any)?.pickupAddress ?? null) as
              | string
              | null,
            city: ((booking as any)?.city ?? null) as string | null,
            scheduledPickupTimeIso:
              (booking as any)?.scheduledPickupTime
                ?.toDate?.()
                ?.toISOString?.() ?? null,
          });
        } catch (e) {
          console.warn(
            "[paystack.verify] Customer payment email attempt failed",
            e,
          );
        }
      })();
    }

    // Best-effort offer publishing for drive_my_car after successful payment
    if (newPaymentStatus === "succeeded" && derivedService === "drive_my_car") {
      try {
        await publishDriveMyCarBookingOffers(doc.id, {
          targetTotalOffers: 10,
          wave: 1,
        });
      } catch (e) {
        console.warn("[paystack.verify] offer publishing attempt failed", e);
      }
    }

    if (newPaymentStatus === "succeeded") {
      void (async () => {
        try {
          if ((booking as any)?.partnerBookingRequestNotifiedAt) return;

          const listingId = String((booking as any)?.listingId || "").trim();
          const rentalUnit = String((booking as any)?.rentalUnit || "").trim();
          if (!listingId) return;
          if (rentalUnit !== "day" && rentalUnit !== "4h") return;

          const vehicleSnap = await adminDb
            .collection("vehicles")
            .doc(listingId)
            .get();
          if (!vehicleSnap.exists) return;
          const vehicle = vehicleSnap.data() as any;
          const partnerId =
            typeof vehicle?.partnerId === "string"
              ? vehicle.partnerId.trim()
              : "";
          if (!partnerId) return;

          let emailSent = false;
          try {
            const emailRes = await sendPartnerNewReservationRequestEmail({
              bookingId: doc.id,
              partnerId,
              city: ((booking as any)?.city ?? null) as string | null,
              pickupAddress: ((booking as any)?.pickupAddress ?? null) as
                | string
                | null,
              scheduledPickupTimeIso:
                (booking as any)?.scheduledPickupTime
                  ?.toDate?.()
                  ?.toISOString?.() ?? null,
              fareNgn:
                typeof (booking as any)?.fareNgn === "number"
                  ? (booking as any).fareNgn
                  : null,
            });
            emailSent = emailRes.sent;
          } catch (e) {
            console.warn("[paystack.verify] Partner email attempt failed", e);
            emailSent = false;
          }

          const res = await sendPartnerNewReservationRequestNotification(
            partnerId,
            {
              bookingId: doc.id,
              city: ((booking as any)?.city ?? null) as string | null,
              pickupAddress: ((booking as any)?.pickupAddress ?? null) as
                | string
                | null,
              scheduledPickupTime:
                (booking as any)?.scheduledPickupTime
                  ?.toDate?.()
                  ?.toISOString?.() ?? null,
              fareNgn:
                typeof (booking as any)?.fareNgn === "number"
                  ? (booking as any).fareNgn
                  : null,
            },
          );

          if (res.success || emailSent) {
            await adminDb.collection("bookings").doc(doc.id).set(
              {
                partnerBookingRequestNotifiedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          }
        } catch (e) {
          console.warn(
            "[paystack.verify] Partner notification attempt failed",
            e,
          );
        }
      })();
    }

    return NextResponse.json(
      {
        bookingId: doc.id,
        paymentStatus: newPaymentStatus,
        status: newBookingStatus || booking.status,
        service: derivedService,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment." },
      { status: 500 },
    );
  }
}
