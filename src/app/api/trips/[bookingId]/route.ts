import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/trips/[bookingId]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing bookingId." },
        { status: 400 },
      );
    }

    const snap = await adminDb.collection("bookings").doc(bookingId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const data = snap.data() as any;

    if (data.uid !== uid && data.customerId !== uid) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const scheduledPickupTime = (() => {
      const v = data.scheduledPickupTime;
      if (!v) return null;
      if (typeof v?.toDate === "function") return v.toDate().toISOString();
      if (v instanceof Date) return v.toISOString();
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? null : d.toISOString();
    })();

    const payment = data.payment
      ? {
          status: data.payment.status ?? null,
          provider: data.payment.provider ?? null,
          method: data.payment.method ?? null,
          amountKobo:
            typeof data.payment.amountKobo === "number" &&
            Number.isFinite(data.payment.amountKobo)
              ? data.payment.amountKobo
              : null,
          currency: data.payment.currency ?? null,
          refunded: Boolean(data.payment.refunded),
          refundAmount:
            typeof data.payment.refundAmount === "number" &&
            Number.isFinite(data.payment.refundAmount)
              ? data.payment.refundAmount
              : null,
          refund: data.payment.refund
            ? {
                provider: data.payment.refund.provider ?? null,
                status: data.payment.refund.status ?? null,
                refundId: data.payment.refund.refundId ?? null,
                refundReference: data.payment.refund.refundReference ?? null,
                amountKobo:
                  typeof data.payment.refund.amountKobo === "number" &&
                  Number.isFinite(data.payment.refund.amountKobo)
                    ? data.payment.refund.amountKobo
                    : null,
                currency: data.payment.refund.currency ?? null,
                updatedAt: data.payment.refund.updatedAt ?? null,
              }
            : null,
        }
      : null;

    return NextResponse.json(
      {
        id: snap.id,
        pickupAddress: data.pickupAddress ?? "",
        dropoffAddress: data.dropoffAddress ?? "",
        pickupCoords: Array.isArray(data.pickupCoords)
          ? data.pickupCoords
          : undefined,
        dropoffCoords: Array.isArray(data.dropoffCoords)
          ? data.dropoffCoords
          : undefined,
        scheduledPickupTime,
        startDate: data.startDate ?? null,
        startTime: data.startTime ?? null,
        endDate: data.endDate ?? null,
        endTime: data.endTime ?? null,
        status: data.status ?? "confirmed",
        driverId: data.driverId ?? null,
        driverInfo: data.driverInfo ?? null,
        vehicleInfo: data.vehicleInfo ?? null,
        vehicleClass: data.vehicleClass ?? null,
        passengers: Number.isFinite(data?.passengers)
          ? Number(data.passengers)
          : null,
        fareNgn: data.fareNgn ?? null,
        distanceKm: data.distanceKm ?? null,
        notes: data.notes ?? "",
        feedback: data.feedback ?? null,
        payment,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching trip details:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip details." },
      { status: 500 },
    );
  }
}
