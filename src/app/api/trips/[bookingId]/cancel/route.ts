import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createAuditLog } from "@/lib/auditLog";
import { createPaystackRefund } from "@/lib/paystackRefund";
import { sendRefundAttentionAdmins } from "@/lib/adminRefundAlerts";

export const runtime = "nodejs";

// POST /api/trips/[bookingId]/cancel
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bookingId: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { bookingId } = await ctx.params;
    if (!bookingId)
      return NextResponse.json(
        { error: "Missing bookingId." },
        { status: 400 },
      );

    const ref = adminDb.collection("bookings").doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    const data = snap.data() as any;
    if (data.uid !== uid && data.customerId !== uid) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const status: string = String(data.status || "confirmed");
    const terminal = [
      "completed",
      "cancelled",
      "cancelled_by_customer",
      "cancelled_by_driver",
      "cancelled_by_admin",
    ];
    if (terminal.includes(status)) {
      return NextResponse.json(
        { error: "Trip already finalized." },
        { status: 400 },
      );
    }

    if (status === "in_progress" || status === "started") {
      return NextResponse.json(
        { error: "Trip already started." },
        { status: 400 },
      );
    }

    const scheduled: Date | null = (() => {
      const v = data?.scheduledPickupTime;
      if (!v) return null;
      if (typeof v?.toDate === "function") return v.toDate();
      if (v instanceof Date) return v;
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? null : d;
    })();
    if (scheduled && Date.now() >= scheduled.getTime()) {
      return NextResponse.json(
        { error: "Trip has already started." },
        { status: 400 },
      );
    }

    // Optional structured reasons and note from client
    let reasons: string[] = [];
    let note: string | undefined = undefined;
    try {
      const body = await req.json();
      if (Array.isArray(body?.reasons)) {
        reasons = (body.reasons as any[]).slice(0, 10).map(String);
      }
      if (typeof body?.note === "string") {
        note = String(body.note).slice(0, 1000);
      }
    } catch {}

    await ref.set(
      {
        status: "cancelled_by_customer",
        cancellationTime: new Date().toISOString(),
        cancellationReasons: reasons,
        cancellationNote: note || "",
      },
      { merge: true },
    );

    await createAuditLog({
      actionType: "booking_cancelled",
      actorId: uid,
      actorEmail: (decoded as any)?.email || "customer",
      targetId: bookingId,
      targetType: "booking",
      details: `Customer cancelled booking ${bookingId}`,
      metadata: {
        reasons,
        note: note || "",
      },
    });

    try {
      const isDriveMyCar =
        String(data?.service || "") === "drive_my_car" || !!data?.driveMyCar;
      const payProvider = String(data?.payment?.provider || "");
      const payStatus = String(data?.payment?.status || "");
      const alreadyRefunded =
        Boolean(data?.payment?.refunded) || Boolean(data?.refunded);
      const existingRefundStatus = String(data?.payment?.refund?.status || "");

      const canAttemptRefund =
        isDriveMyCar &&
        payProvider === "paystack" &&
        payStatus === "succeeded" &&
        !alreadyRefunded &&
        existingRefundStatus !== "pending" &&
        existingRefundStatus !== "processing" &&
        existingRefundStatus !== "processed";

      if (canAttemptRefund) {
        const txId = data?.payment?.transactionId;
        const txRef = data?.payment?.reference;
        const transaction =
          typeof txId === "number" && Number.isFinite(txId) && txId > 0
            ? txId
            : String(txRef || "").trim();

        if (transaction) {
          const r = await createPaystackRefund({ transaction });
          const refundData = (r as any)?.data || {};
          await ref.set(
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
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          await createAuditLog({
            actionType: "refund_initiated",
            actorId: uid,
            actorEmail: (decoded as any)?.email || "customer",
            targetId: bookingId,
            targetType: "booking",
            details: `Refund initiated for booking ${bookingId}`,
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
      console.warn("[trip.cancel] refund initiation failed:", e);
      try {
        await ref.set(
          {
            payment: {
              refund: {
                provider: "paystack",
                status: "failed",
                updatedAt: new Date().toISOString(),
              },
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch {}

      try {
        await sendRefundAttentionAdmins({
          bookingId,
          title: "Refund Initiation Failed",
          message: `Refund initiation failed for booking ${bookingId}. Please review in admin portal.`,
        });
      } catch {}
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error cancelling trip:", error);
    return NextResponse.json(
      { error: "Failed to cancel trip." },
      { status: 500 },
    );
  }
}
