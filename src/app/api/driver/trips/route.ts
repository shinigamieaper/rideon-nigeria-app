export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/driver/trips
 * Fetch all trips for the authenticated driver (upcoming and past)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify driver auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const driverId = decoded.uid;
    const role = decoded?.role ?? decoded?.claims?.role;

    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }

    // Fetch accepted trips for this driver (drive_my_car only)
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let qs: any;
    try {
      qs = await adminDb
        .collection("bookings")
        .where("driverId", "==", driverId)
        .where("service", "==", "drive_my_car")
        .where("scheduledPickupTime", ">=", since) // Last 30 days
        .orderBy("scheduledPickupTime", "desc")
        .limit(50)
        .get();
    } catch (e) {
      console.warn(
        "[GET /api/driver/trips] trip query failed; falling back to driverId-only query:",
        e,
      );
      qs = await adminDb
        .collection("bookings")
        .where("driverId", "==", driverId)
        .where("scheduledPickupTime", ">=", since)
        .orderBy("scheduledPickupTime", "desc")
        .limit(75)
        .get();
    }

    const trips = qs.docs
      .map((doc: any) => {
        const d = doc.data() as any;
        const status = d?.status || "requested";

        const isDriveMyCar =
          String(d?.service || "") === "drive_my_car" || !!d?.driveMyCar;
        if (!isDriveMyCar) return null;

        // Filter out trips that are still unclaimed in 'confirmed' state
        if (status === "requested" || status === "confirmed") return null;

        const sched = d?.scheduledPickupTime?.toDate
          ? d.scheduledPickupTime.toDate().toISOString()
          : d?.scheduledPickupTime;

        return {
          id: doc.id,
          pickupAddress: d?.pickupAddress || "",
          dropoffAddress: d?.dropoffAddress || undefined,
          scheduledPickupTime: sched,
          status,
          fareNgn: d?.fareNgn || d?.fare || 0,
          customerInfo: d?.customerInfo || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ trips }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/driver/trips] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 },
    );
  }
}
