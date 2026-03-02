import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/admin/dashboard/charts/trip-lifecycle-funnel
 * Returns trip lifecycle funnel data showing drop-offs at each stage
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

    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.max(0, days - 1));
    startDate.setHours(0, 0, 0, 0);

    const bookingsSnapshot = await adminDb
      .collection("bookings")
      .where("createdAt", ">=", Timestamp.fromDate(startDate))
      .where("createdAt", "<=", Timestamp.fromDate(endDate))
      .get();

    let total = 0;
    let confirmed = 0;
    let driverAssigned = 0;
    let started = 0;
    let completed = 0;

    bookingsSnapshot.docs.forEach((doc) => {
      const d = doc.data();
      if (service !== "all" && inferService(d) !== service) return;

      const s = String(d.status || "").trim();
      total++;

      if (s === "confirmed") confirmed++;
      if (s === "driver_assigned") driverAssigned++;
      if (s === "en_route" || s === "in_progress" || s === "started") started++;
      if (s === "completed") completed++;
    });

    // Cumulative funnel: each stage includes the subsequent ones
    const stages = [
      { stage: "Requested", count: total, color: "#0ea5e9" },
      {
        stage: "Confirmed",
        count: confirmed + driverAssigned + started + completed,
        color: "#06b6d4",
      },
      {
        stage: "Assigned",
        count: driverAssigned + started + completed,
        color: "#14b8a6",
      },
      { stage: "Started", count: started + completed, color: "#10b981" },
      { stage: "Completed", count: completed, color: "#22c55e" },
    ];

    // Calculate percentages
    const base = stages[0].count || 1; // Avoid division by zero
    const data = stages.map((stage) => ({
      ...stage,
      percentage: parseFloat(((stage.count / base) * 100).toFixed(1)),
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching trip lifecycle data:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip lifecycle data" },
      { status: 500 },
    );
  }
}
