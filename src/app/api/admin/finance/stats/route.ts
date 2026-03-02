export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

/**
 * GET /api/admin/finance/stats
 * Fetch financial statistics from bookings
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "finance_admin",
    ]);
    if (response) return response;

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month"; // day, week, month, all

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        prevEndDate = startDate;
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEndDate = startDate;
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEndDate = startDate;
        break;
    }

    // Fetch completed bookings for current period
    const completedBookingsQuery = await adminDb
      .collection("bookings")
      .where("status", "in", [
        "completed",
        "driver_assigned",
        "confirmed",
        "in_progress",
      ])
      .where("createdAt", ">=", startDate)
      .get();

    // Fetch completed bookings for previous period (for comparison)
    const prevBookingsQuery = await adminDb
      .collection("bookings")
      .where("status", "in", [
        "completed",
        "driver_assigned",
        "confirmed",
        "in_progress",
      ])
      .where("createdAt", ">=", prevStartDate)
      .where("createdAt", "<", prevEndDate)
      .get();

    // Fetch cancelled/refunded bookings for current period
    const refundedQuery = await adminDb
      .collection("bookings")
      .where("status", "in", [
        "cancelled",
        "cancelled_by_customer",
        "cancelled_by_driver",
        "cancelled_by_admin",
      ])
      .where("createdAt", ">=", startDate)
      .get();

    // Calculate GMV (Gross Merchandise Value)
    let currentGMV = 0;
    let prevGMV = 0;
    let driverPayouts = 0;

    completedBookingsQuery.docs.forEach((doc) => {
      const data = doc.data();
      const amount = data.totalAmount || data.amount || 0;
      currentGMV += amount;

      // Calculate driver payout (e.g., 80% of amount goes to driver)
      const driverRate = data.driverPayoutRate || 0.8;
      if (data.status === "completed" && !data.driverPaid) {
        driverPayouts += amount * driverRate;
      }
    });

    prevBookingsQuery.docs.forEach((doc) => {
      const data = doc.data();
      prevGMV += data.totalAmount || data.amount || 0;
    });

    // Calculate refunds
    let refundAmount = 0;
    refundedQuery.docs.forEach((doc) => {
      const data = doc.data();
      const refunded =
        Boolean((data as any)?.payment?.refunded) ||
        Boolean((data as any)?.refunded);
      if (refunded) {
        refundAmount +=
          data.refundAmount || data.totalAmount || data.amount || 0;
      }
    });

    // Platform fee (e.g., 20% of GMV)
    const platformFeeRate = 0.2;
    const netRevenue = currentGMV * platformFeeRate;
    const prevNetRevenue = prevGMV * platformFeeRate;

    // Calculate percentage changes
    const gmvChange =
      prevGMV > 0 ? ((currentGMV - prevGMV) / prevGMV) * 100 : 0;
    const revenueChange =
      prevNetRevenue > 0
        ? ((netRevenue - prevNetRevenue) / prevNetRevenue) * 100
        : 0;

    // Format currency
    const formatNaira = (amount: number) => {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    return NextResponse.json(
      {
        stats: {
          gmv: {
            value: formatNaira(currentGMV),
            rawValue: currentGMV,
            change: gmvChange.toFixed(1),
            positive: gmvChange >= 0,
          },
          netRevenue: {
            value: formatNaira(netRevenue),
            rawValue: netRevenue,
            change: revenueChange.toFixed(1),
            positive: revenueChange >= 0,
          },
          pendingPayouts: {
            value: formatNaira(driverPayouts),
            rawValue: driverPayouts,
            count: completedBookingsQuery.docs.filter(
              (d) => d.data().status === "completed" && !d.data().driverPaid,
            ).length,
          },
          refunds: {
            value: formatNaira(refundAmount),
            rawValue: refundAmount,
            count: refundedQuery.size,
          },
        },
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching finance stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance stats." },
      { status: 500 },
    );
  }
}
