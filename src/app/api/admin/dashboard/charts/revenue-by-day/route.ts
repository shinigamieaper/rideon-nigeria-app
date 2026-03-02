import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/admin/dashboard/charts/revenue-by-day
 * Returns daily revenue breakdown (GMV, fees, discounts, refunds)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const serviceRaw = (searchParams.get("service") || "all").trim();

    const service =
      serviceRaw === "chauffeur" ||
      serviceRaw === "rental" ||
      serviceRaw === "drive_my_car"
        ? serviceRaw
        : "all";

    const inferService = (d: any): "chauffeur" | "rental" | "drive_my_car" => {
      const s = String(d?.service || "").trim();
      if (s === "drive_my_car") return "drive_my_car";
      if (s === "rental") return "rental";
      if (s === "chauffeur") return "chauffeur";
      if (d?.listingId && (d?.rentalUnit === "day" || d?.rentalUnit === "4h"))
        return "rental";
      if (d?.driveMyCar) return "drive_my_car";
      return "chauffeur";
    };

    // Calculate date range
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const endDate = new Date();
    const startDate = new Date();
    // Include "today" in the chart window
    startDate.setDate(startDate.getDate() - Math.max(0, days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Query completed bookings within range for revenue calculation
    const bookingsSnapshot = await adminDb
      .collection("bookings")
      .where("createdAt", ">=", Timestamp.fromDate(startDate))
      .where("createdAt", "<=", Timestamp.fromDate(endDate))
      .get();

    // Group revenue data by date
    const dateMap = new Map<
      string,
      { gmv: number; fees: number; discounts: number; refunds: number }
    >();

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dateMap.set(dateKey, { gmv: 0, fees: 0, discounts: 0, refunds: 0 });
    }

    // Process bookings and calculate revenue
    bookingsSnapshot.docs.forEach((doc) => {
      const booking = doc.data();

      if (service !== "all" && inferService(booking) !== service) return;

      const createdAt = booking.createdAt?.toDate();
      if (!createdAt) return;

      const dateKey = createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const revenue = dateMap.get(dateKey);
      if (!revenue) return;

      // Calculate GMV (Gross Merchandise Value)
      const fare =
        booking.pricing?.totalNgn ?? booking.fareNgn ?? booking.fare ?? 0;

      if (booking.status === "completed" && fare > 0) {
        revenue.gmv += fare;

        // Platform fees (assume 15% of fare)
        const platformFee = booking.pricing?.platformFee || fare * 0.15;
        revenue.fees += platformFee;

        // Discounts applied
        const discount =
          booking.pricing?.discount || booking.discountAmount || 0;
        revenue.discounts += discount;
      }

      // Refunds (for cancelled completed bookings)
      const s = String(booking.status || "");
      const isCancelled =
        s === "cancelled" ||
        s.startsWith("cancelled_") ||
        s.startsWith("cancelled-by") ||
        s.startsWith("cancelledby");
      const isRefunded =
        Boolean(booking?.payment?.refunded) || Boolean(booking?.refunded);
      if (isCancelled && isRefunded) {
        const refundAmount =
          booking.payment?.refundAmount ?? booking.refundAmount ?? fare;
        revenue.refunds += Number(refundAmount || 0);
      }
    });

    // Convert to array and calculate net
    const data = Array.from(dateMap.entries()).map(([date, revenue]) => ({
      date,
      gmv: Math.round(revenue.gmv),
      fees: Math.round(revenue.fees),
      discounts: Math.round(revenue.discounts),
      refunds: Math.round(revenue.refunds),
      net: Math.round(
        revenue.gmv + revenue.fees - revenue.discounts - revenue.refunds,
      ),
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 },
    );
  }
}
