import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/admin/dashboard/quick-stats
 * Returns quick stats for dashboard welcome header
 */
export async function GET() {
  try {
    // Get active drivers count
    let totalDrivers = 0;
    try {
      const driversSnapshot = await adminDb
        .collection("drivers")
        .where("status", "==", "approved")
        .count()
        .get();
      totalDrivers = driversSnapshot.data().count;
    } catch (err) {
      console.error("Error fetching drivers count:", err);
    }

    // Get completion rate (last 50 bookings)
    let completionRate = 0;
    try {
      const recentBookingsSnapshot = await adminDb
        .collection("bookings")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const completed = recentBookingsSnapshot.docs.filter(
        (doc) => doc.data().status === "completed",
      ).length;

      const total = recentBookingsSnapshot.docs.length;
      completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    } catch (err) {
      console.error("Error calculating completion rate:", err);
    }

    // Get active bookings count
    let activeBookings = 0;
    try {
      const activeSnapshot = await adminDb
        .collection("bookings")
        .where("status", "in", ["assigned", "accepted", "in_progress"])
        .count()
        .get();
      activeBookings = activeSnapshot.data().count;
    } catch (err) {
      console.error("Error fetching active bookings:", err);
    }

    // Calculate average response time (simplified - time from request to assignment)
    let avgResponseTime = 0;
    try {
      const recentAssignedBookings = await adminDb
        .collection("bookings")
        .where("status", "!=", "pending")
        .orderBy("status")
        .orderBy("createdAt", "desc")
        .limit(30)
        .get();

      let totalResponseTime = 0;
      let count = 0;

      recentAssignedBookings.docs.forEach((doc) => {
        const booking = doc.data();
        const createdAt = booking.createdAt?.toDate();
        const assignedAt = booking.assignedAt?.toDate();

        if (createdAt && assignedAt) {
          const responseTime =
            (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60); // Convert to minutes
          totalResponseTime += responseTime;
          count++;
        }
      });

      avgResponseTime = count > 0 ? Math.round(totalResponseTime / count) : 0;
    } catch (err) {
      console.error("Error calculating avg response time:", err);
    }

    return NextResponse.json(
      {
        totalDrivers,
        completionRate,
        activeBookings,
        avgResponseTime,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching quick stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch quick stats" },
      { status: 500 },
    );
  }
}
