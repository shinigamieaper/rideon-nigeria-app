export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

// GET /api/admin/drivers - List all drivers with filters
export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
      "driver_admin",
    ]);
    if (response) return response;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const city = url.searchParams.get("city") || "";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "100", 10),
      200,
    );

    let query: FirebaseFirestore.Query = adminDb.collection("drivers");

    // Filter by status if provided
    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    // Order by createdAt and limit
    query = query.orderBy("createdAt", "desc").limit(limit);

    const snap = await query.get();
    const drivers: any[] = [];

    for (const doc of snap.docs) {
      const d = doc.data();
      const createdAt = d.createdAt?.toDate?.() || null;

      // Get user info for name and email
      let firstName = "";
      let lastName = "";
      let email = "";
      let phoneNumber = "";
      let profileImageUrl = "";
      let driverTrack: "fleet" | "placement" | "both" = "fleet";

      try {
        const userDoc = await adminDb.collection("users").doc(doc.id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          firstName = userData?.firstName || "";
          lastName = userData?.lastName || "";
          email = userData?.email || "";
          phoneNumber = userData?.phoneNumber || "";
          profileImageUrl = userData?.profileImageUrl || "";

          const rawTrack = userData?.driverTrack as string | undefined;
          const normalized =
            rawTrack === "placement_only" ? "placement" : rawTrack;
          if (
            normalized === "fleet" ||
            normalized === "placement" ||
            normalized === "both"
          ) {
            driverTrack = normalized;
          }
        }
      } catch {}

      // Filter by city if provided (client-side filter)
      const servedCities = Array.isArray(d.servedCities) ? d.servedCities : [];
      if (city && !servedCities.includes(city)) continue;

      drivers.push({
        id: doc.id,
        firstName,
        lastName,
        email,
        phoneNumber,
        profileImageUrl,
        driverTrack,
        status: d.status || "pending_review",
        onlineStatus: d.onlineStatus || false,
        experienceYears: d.experienceYears || 0,
        documents: d.documents || {},
        servedCities,
        recruitmentPool: d.recruitmentPool === true,
        recruitmentVisible: d.recruitmentVisible === true,
        placementStatus: d.placementStatus || "available",
        rideOnVerified: d.rideOnVerified || false,
        createdAt: createdAt?.toISOString() || null,
        rating: d.rating || null,
        totalTrips: d.totalTrips || 0,
      });
    }

    // Get counts for status tabs
    const statusCounts: Record<string, number> = {
      all: 0,
      pending_review: 0,
      approved: 0,
      suspended: 0,
    };

    try {
      const allSnap = await adminDb.collection("drivers").limit(500).get();
      statusCounts.all = allSnap.size;
      allSnap.forEach((doc) => {
        const s = doc.data().status as string;
        if (s === "pending_review") statusCounts.pending_review++;
        else if (s === "approved") statusCounts.approved++;
        else if (s === "suspended" || s === "rejected")
          statusCounts.suspended++;
      });
    } catch {}

    return NextResponse.json(
      {
        drivers,
        counts: statusCounts,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching admin drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers." },
      { status: 500 },
    );
  }
}
