export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

// Verify admin auth from request
async function verifyAdmin(req: Request) {
  return requireAdmin(req, [
    "super_admin",
    "admin",
    "ops_admin",
    "finance_admin",
  ]);
}

// GET /api/admin/reservations - List all reservations with filters
export async function GET(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if (auth.response) return auth.response;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const service = url.searchParams.get("service") || "";
    const dateRange = url.searchParams.get("dateRange") || "30d";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10),
      100,
    );

    // Calculate date filter
    const now = new Date();
    let startDate = new Date();
    switch (dateRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    let query: FirebaseFirestore.Query = adminDb.collection("bookings");

    const normalizedServiceRaw = String(service || "").trim();
    const normalizedService =
      normalizedServiceRaw === "rental" ? "chauffeur" : normalizedServiceRaw;
    const wantsService = normalizedService && normalizedService !== "all";
    let usedServiceFallback = false;

    const inferService = (d: any): string => {
      const direct = String(d?.service || "").trim();
      if (direct) return direct === "rental" ? "chauffeur" : direct;
      if (d?.driveMyCar) return "drive_my_car";
      const unit = String(d?.rentalUnit || "").trim();
      if (d?.listingId && (unit === "day" || unit === "4h")) return "chauffeur";
      if (d?.pickupAddress && d?.dropoffAddress) return "chauffeur";
      return "unknown";
    };

    const normalizedStatus = String(status || "").trim();
    const wantsCancelled = normalizedStatus === "cancelled";
    const wantsInProgress = normalizedStatus === "in_progress";
    const specialStatuses = wantsCancelled
      ? [
          "cancelled",
          "cancelled_by_customer",
          "cancelled_by_driver",
          "cancelled_by_admin",
        ]
      : wantsInProgress
        ? ["in_progress", "en_route"]
        : null;
    let usedStatusFallback = false;

    // We intentionally do NOT apply a Firestore `where('service'...)` filter here.
    // Reason: older bookings may not have `service` populated, but we still want them
    // to appear under the correct service filter via inference.
    if (wantsService) usedServiceFallback = true;

    // Filter by status if provided
    if (normalizedStatus && normalizedStatus !== "all") {
      if (specialStatuses) {
        try {
          query = query.where("status", "in", specialStatuses);
        } catch (e: any) {
          const msg = String(e?.message || "");
          const code = (e && (e.code ?? e.status)) as unknown;
          if (msg.includes("requires an index") || code === 9) {
            usedStatusFallback = true;
          } else {
            throw e;
          }
        }
      } else {
        query = query.where("status", "==", normalizedStatus);
      }
    }

    // Order by createdAt and limit
    query = query.orderBy("createdAt", "desc").limit(limit);

    const snap = await query.get();
    const reservations: any[] = [];

    for (const doc of snap.docs) {
      const d = doc.data();
      const createdAt = d.createdAt?.toDate?.() || null;

      // Client-side date filter (to avoid complex compound indexes)
      if (createdAt && createdAt < startDate) continue;

      const inferredService = inferService(d);
      if (
        wantsService &&
        usedServiceFallback &&
        inferredService !== normalizedService
      )
        continue;

      if (specialStatuses && usedStatusFallback) {
        const s = String((d as any)?.status || "");
        if (!specialStatuses.includes(s)) continue;
      }

      // Get customer info
      let customerName = "Unknown Customer";
      let customerEmail = "";
      if (d.customerId) {
        try {
          const customerDoc = await adminDb
            .collection("users")
            .doc(d.customerId)
            .get();
          if (customerDoc.exists) {
            const customerData = customerDoc.data();
            customerName =
              `${customerData?.firstName || ""} ${customerData?.lastName || ""}`.trim() ||
              "Customer";
            customerEmail = customerData?.email || "";
          }
        } catch {}
      }

      // Get driver info if assigned
      let driverName = null;
      if (d.driverId) {
        // Prefer denormalized name from booking.driverInfo (set by assignment service)
        if (d.driverInfo?.name) {
          driverName = d.driverInfo.name;
        } else {
          try {
            const userDoc = await adminDb
              .collection("users")
              .doc(d.driverId)
              .get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              driverName =
                `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
                "Driver";
            }
          } catch {}
        }
      }

      reservations.push({
        id: doc.id,
        service: inferredService,
        customerId: d.customerId || "",
        customerName,
        customerEmail,
        driverId: d.driverId || null,
        driverName,
        pickupAddress: d.pickupAddress || "",
        dropoffAddress: d.dropoffAddress || "",
        vehicleClass: d.vehicleClass || "",
        city: d.city || null,
        rentalUnit: d.rentalUnit || null,
        listingId: d.listingId || null,
        status: d.status || "requested",
        fareNgn: d.fareNgn || 0,
        startDate: d.startDate || null,
        endDate: d.endDate || null,
        startTime: d.startTime || null,
        scheduledPickupTime:
          d.scheduledPickupTime?.toDate?.()?.toISOString() || null,
        createdAt: createdAt?.toISOString() || null,
        paymentStatus: d.payment?.status || "pending",
      });
    }

    // Get counts for status tabs
    const statusCounts: Record<string, number> = {
      all: 0,
      requested: 0,
      confirmed: 0,
      needs_reassignment: 0,
      driver_assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    // Simple count query (without date filter for tabs)
    try {
      const allSnap = await adminDb.collection("bookings").limit(500).get();
      const eligibleDocs = wantsService
        ? allSnap.docs.filter(
            (doc) => inferService(doc.data()) === normalizedService,
          )
        : allSnap.docs;

      statusCounts.all = eligibleDocs.length;
      eligibleDocs.forEach((doc) => {
        const s = doc.data().status as string;
        if (s === "requested") statusCounts.requested++;
        else if (s === "confirmed") statusCounts.confirmed++;
        else if (s === "needs_reassignment") statusCounts.needs_reassignment++;
        else if (s === "driver_assigned") statusCounts.driver_assigned++;
        else if (s === "in_progress" || s === "en_route")
          statusCounts.in_progress++;
        else if (s === "completed") statusCounts.completed++;
        else if (s?.startsWith("cancelled")) statusCounts.cancelled++;
      });
    } catch {}

    return NextResponse.json(
      {
        reservations,
        counts: statusCounts,
        pagination: {
          page,
          limit,
          total: reservations.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching admin reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations." },
      { status: 500 },
    );
  }
}
