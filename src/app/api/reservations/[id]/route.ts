import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const trimmedId = String(id || "").trim();
    if (!trimmedId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";
    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[reservations/:id] verifyIdToken",
    );
    const uid = decoded.uid;

    const docRef = adminDb.collection("bookings").doc(trimmedId);
    const doc = await withTimeout(
      docRef.get(),
      3_000,
      "[reservations/:id] booking doc",
    );
    if (!doc.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const d = doc.data() as any;
    const ownerId = String(
      d?.uid || d?.customerId || d?.context?.customerId || "",
    ).trim();
    if (!ownerId || ownerId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const internalService =
      d?.service === "drive_my_car"
        ? "drive_my_car"
        : d?.listingId && d?.rentalUnit
          ? "rental"
          : "chauffeur";

    const service =
      internalService === "drive_my_car" ? "drive_my_car" : "chauffeur";

    let driverRatingStats: {
      thumbsUp: number;
      thumbsDown: number;
      totalRatings: number;
    } | null = null;
    if (typeof d?.driverId === "string" && d.driverId.trim()) {
      try {
        const driverSnap = await withTimeout(
          adminDb.collection("drivers").doc(String(d.driverId)).get(),
          2_500,
          "[reservations/:id] driver doc",
        );
        const dd = driverSnap.exists ? (driverSnap.data() as any) : {};
        const thumbsUp = typeof dd?.thumbsUp === "number" ? dd.thumbsUp : 0;
        const thumbsDown =
          typeof dd?.thumbsDown === "number" ? dd.thumbsDown : 0;
        const totalRatings =
          typeof dd?.totalRatings === "number"
            ? dd.totalRatings
            : thumbsUp + thumbsDown;
        driverRatingStats = { thumbsUp, thumbsDown, totalRatings };
      } catch {
        driverRatingStats = null;
      }
    }

    const out = {
      id: doc.id,
      service,
      status: d?.status || "confirmed",
      driverId: d?.driverId ?? null,
      driverInfo: d?.driverInfo ?? null,
      partnerDriverId: d?.partnerDriverId ?? null,
      partnerDriverInfo: d?.partnerDriverInfo ?? null,
      vehicleInfo: d?.vehicleInfo ?? null,
      driveMyCar: d?.driveMyCar ?? null,
      rentalUnit: d?.rentalUnit ?? null,
      listingId: d?.listingId ?? null,
      startDate: d?.startDate ?? null,
      endDate: d?.endDate ?? null,
      startTime: d?.startTime ?? null,
      endTime: d?.endTime ?? null,
      pickupAddress: d?.pickupAddress ?? "",
      pickupCoords: Array.isArray(d?.pickupCoords) ? d.pickupCoords : undefined,
      city: d?.city ?? null,
      fareNgn: d?.fareNgn ?? null,
      feedback: d?.feedback ?? null,
      driverRatingStats,
      payment: {
        status: d?.payment?.status ?? "pending",
        amountKobo: d?.payment?.amountKobo ?? null,
        reference: d?.payment?.reference ?? null,
        currency: d?.payment?.currency ?? "NGN",
      },
      createdAt: d?.createdAt?.toDate?.()?.toISOString?.() ?? null,
      scheduledPickupTime: d?.scheduledPickupTime ?? null,
      metadata: d?.metadata ?? {},
    };

    return NextResponse.json({ reservation: out }, { status: 200 });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation." },
      { status: 500 },
    );
  }
}
