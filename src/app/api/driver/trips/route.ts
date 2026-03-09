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

        const fareNgn = Number(d?.fareNgn || d?.fare || 0) || 0;
        const payoutNgn =
          Number(d?.driverPayoutNgn || d?.driverPayout || 0) || 0;
        const effectivePayoutNgn =
          payoutNgn > 0 ? payoutNgn : Math.max(0, Math.round(fareNgn * 0.8));

        const customerInfo = d?.customerInfo || null;
        const customerId = String(d?.customerId || d?.uid || "").trim();

        return {
          id: doc.id,
          pickupAddress: d?.pickupAddress || "",
          dropoffAddress: d?.dropoffAddress || undefined,
          scheduledPickupTime: sched,
          status,
          fareNgn: effectivePayoutNgn,
          customerInfo,
          customerId,
        };
      })
      .filter(Boolean);

    for (const t of trips as any[]) {
      if (t?.customerInfo?.name) continue;
      const cid = String(t?.customerId || "").trim();
      if (!cid) continue;
      try {
        const userSnap = await adminDb.collection("users").doc(cid).get();
        if (!userSnap.exists) continue;
        const u = userSnap.data() as any;
        const name =
          `${String(u?.firstName || "")} ${String(u?.lastName || "")}`.trim();
        if (name) {
          t.customerInfo = { ...(t.customerInfo || {}), name };
        }
      } catch {}
    }

    return NextResponse.json({ trips }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/driver/trips] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 },
    );
  }
}
