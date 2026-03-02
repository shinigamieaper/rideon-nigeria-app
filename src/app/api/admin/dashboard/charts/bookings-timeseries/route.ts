import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/admin/dashboard/charts/bookings-timeseries
 * Returns bookings data over time for charting
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

    // Query all bookings within range
    const bookingsSnapshot = await adminDb
      .collection("bookings")
      .where("createdAt", ">=", Timestamp.fromDate(startDate))
      .where("createdAt", "<=", Timestamp.fromDate(endDate))
      .get();

    // Group by date
    const dateMap = new Map<
      string,
      { total: number; completed: number; cancelled: number }
    >();

    // Initialize all dates with zero counts
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      dateMap.set(dateKey, { total: 0, completed: 0, cancelled: 0 });
    }

    // Count bookings by status and date
    bookingsSnapshot.docs.forEach((doc) => {
      const booking = doc.data();

      if (service !== "all" && inferService(booking) !== service) return;

      const createdAt = booking.createdAt?.toDate();
      if (!createdAt) return;

      const dateKey = createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const counts = dateMap.get(dateKey);
      if (!counts) return;

      counts.total++;

      const s = String(booking.status || "").trim();
      const isCancelled =
        s === "cancelled" ||
        s.startsWith("cancelled_") ||
        s.startsWith("cancelled-by") ||
        s.startsWith("cancelledby");

      if (s === "completed") {
        counts.completed++;
      } else if (isCancelled) {
        counts.cancelled++;
      }
    });

    // Convert to array
    const data = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bookings timeseries:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings timeseries data" },
      { status: 500 },
    );
  }
}
