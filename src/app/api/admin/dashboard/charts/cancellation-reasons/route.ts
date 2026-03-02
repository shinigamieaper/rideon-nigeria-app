import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/admin/dashboard/charts/cancellation-reasons
 * Returns cancellation reasons breakdown
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
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

    // Query a recent window of bookings and filter cancellations in memory.
    // This is more resilient than relying on a fixed list of cancelled_* statuses.
    const bookingsSnapshot = await adminDb
      .collection("bookings")
      .orderBy("createdAt", "desc")
      .limit(800)
      .get();

    // Count by cancellation reason
    const reasonCounts = new Map<string, number>();

    bookingsSnapshot.docs.forEach((doc) => {
      const booking = doc.data();

      if (service !== "all" && inferService(booking) !== service) return;

      const s = String(booking.status || "").trim();
      const isCancelled =
        s === "cancelled" ||
        s.startsWith("cancelled_") ||
        s.startsWith("cancelled-by") ||
        s.startsWith("cancelledby");

      if (!isCancelled) return;

      const reason = booking.cancellationReason || "Not Specified";
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    // Color palette for different reasons (blue/cyan theme)
    const colorPalette = [
      "#0ea5e9", // sky-500
      "#06b6d4", // cyan-500
      "#0284c7", // sky-600
      "#0891b2", // cyan-600
      "#0369a1", // sky-700
      "#64748b", // slate-500
    ];

    // Convert to array and assign colors
    const reasons = Array.from(reasonCounts.entries())
      .map(([reason, count], index) => ({
        reason,
        count,
        color: colorPalette[index % colorPalette.length],
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Calculate total and percentages
    const total = reasons.reduce((sum, r) => sum + r.count, 0) || 1; // Avoid division by zero
    const data = reasons.map((reason) => ({
      ...reason,
      percentage: parseFloat(((reason.count / total) * 100).toFixed(1)),
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cancellation reasons:", error);
    return NextResponse.json(
      { error: "Failed to fetch cancellation reasons data" },
      { status: 500 },
    );
  }
}
