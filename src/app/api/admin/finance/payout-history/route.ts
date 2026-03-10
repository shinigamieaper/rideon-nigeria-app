import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

/**
 * GET /api/admin/finance/payout-history
 * Fetch payout history with optional driver filter
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "finance_admin",
    ]);
    if (response) return response;

    const searchParams = req.nextUrl.searchParams;
    const driverId = searchParams.get("driverId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    let query = adminDb
      .collection("driver_payouts")
      .orderBy("paidAt", "desc")
      .limit(limit);

    if (driverId) {
      query = adminDb
        .collection("driver_payouts")
        .where("driverId", "==", driverId)
        .orderBy("paidAt", "desc")
        .limit(limit);
    }

    const snapshot = await query.get();

    // Get driver names for each unique driver
    const driverIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.driverId) driverIds.add(data.driverId);
    });

    const driverNames: Record<string, string> = {};
    for (const id of driverIds) {
      const driverDoc = await adminDb.collection("users").doc(id).get();
      if (driverDoc.exists) {
        const data = driverDoc.data()!;
        driverNames[id] =
          `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unknown";
      }
    }

    const history = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        driverId: data.driverId,
        driverName: driverNames[data.driverId] || "Unknown",
        amount: data.amount || 0,
        bookingCount: data.bookingCount || 0,
        method: data.method || "manual",
        paidByEmail: data.paidByEmail || "",
        paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
        bankName: data.bankName || "",
        accountName: data.accountName || "",
        accountNumberLast4: data.accountNumberLast4 || "",
        notes: data.notes || "",
      };
    });

    // Calculate totals
    const totals = {
      totalPaid: history.reduce((sum, h) => sum + h.amount, 0),
      payoutCount: history.length,
    };

    return NextResponse.json({ history, totals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching payout history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payout history" },
      { status: 500 },
    );
  }
}
