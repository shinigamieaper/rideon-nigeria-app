export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

interface Transaction {
  id: string;
  type: "booking" | "refund" | "payout";
  bookingId: string;
  customerName: string;
  driverName: string | null;
  amount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
}

/**
 * GET /api/admin/finance/transactions
 * Fetch recent transactions (bookings with payment info)
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "finance_admin",
    ]);
    if (response) return response;

    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20", 10),
      100,
    );
    const status = url.searchParams.get("status"); // completed, cancelled, pending

    // Build query
    let query = adminDb.collection("bookings").orderBy("createdAt", "desc");

    if (status) {
      if (status === "completed") {
        query = adminDb
          .collection("bookings")
          .where("status", "==", "completed")
          .orderBy("createdAt", "desc");
      } else if (status === "cancelled") {
        query = adminDb
          .collection("bookings")
          .where("status", "in", [
            "cancelled",
            "cancelled_by_customer",
            "cancelled_by_driver",
            "cancelled_by_admin",
          ])
          .orderBy("createdAt", "desc");
      } else if (status === "pending") {
        query = adminDb
          .collection("bookings")
          .where("status", "in", [
            "requested",
            "confirmed",
            "driver_assigned",
            "in_progress",
          ])
          .orderBy("createdAt", "desc");
      }
    }

    const snapshot = await query.limit(limit).get();

    const transactions: Transaction[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Get customer name
      let customerName = "Unknown Customer";
      if (data.customerInfo?.fullName) {
        customerName = data.customerInfo.fullName;
      } else if (data.customerId) {
        try {
          const userDoc = await adminDb
            .collection("users")
            .doc(data.customerId)
            .get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            customerName =
              `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
              "Unknown";
          }
        } catch {}
      }

      // Get driver name
      let driverName: string | null = null;
      if (data.driverInfo?.name) {
        driverName = data.driverInfo.name;
      } else if (data.driverId) {
        try {
          const userDoc = await adminDb
            .collection("users")
            .doc(data.driverId)
            .get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            driverName =
              `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
              null;
          }
        } catch {}
      }

      // Determine transaction type
      let type: "booking" | "refund" | "payout" = "booking";
      const s = String(data.status || "");
      const isCancelled =
        s === "cancelled" ||
        s === "cancelled_by_customer" ||
        s === "cancelled_by_driver" ||
        s === "cancelled_by_admin";
      const isRefunded =
        Boolean(data?.payment?.refunded) || Boolean(data?.refunded);
      if (isCancelled && isRefunded) {
        type = "refund";
      }

      transactions.push({
        id: doc.id,
        type,
        bookingId: doc.id,
        customerName,
        driverName,
        amount: data.totalAmount || data.amount || 0,
        status: data.status || "unknown",
        paymentMethod: data.paymentMethod || null,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    }

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions." },
      { status: 500 },
    );
  }
}
