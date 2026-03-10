import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

/**
 * GET /api/admin/finance/payouts/export
 * Export pending payouts as CSV for bank transfers
 */
export async function GET(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "finance_admin",
    ]);
    if (response) return response;

    // Get all completed unpaid bookings
    const bookingsSnapshot = await adminDb
      .collection("bookings")
      .where("status", "==", "completed")
      .get();

    // Group by driver
    const driverPayouts: Record<
      string,
      {
        driverId: string;
        driverName: string;
        driverEmail: string;
        phoneNumber: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
        pendingAmount: number;
        tripCount: number;
      }
    > = {};

    for (const doc of bookingsSnapshot.docs) {
      const data = doc.data();
      const driverId = data.driverId;

      if (!driverId || data.driverPaid) continue;

      const driverPayout = data.driverPayoutNgn || data.driverPayout || 0;

      if (!driverPayouts[driverId]) {
        // Fetch driver info including bank details
        const driverDoc = await adminDb.collection("users").doc(driverId).get();
        const driverData = driverDoc.exists ? driverDoc.data() : null;

        const bankSnap = await adminDb
          .collection("driver_bank_accounts")
          .doc(driverId)
          .get();

        const bankData = bankSnap.exists ? bankSnap.data() : null;

        driverPayouts[driverId] = {
          driverId,
          driverName: driverData
            ? `${driverData.firstName || ""} ${driverData.lastName || ""}`.trim() ||
              "Unknown"
            : "Unknown",
          driverEmail: driverData?.email || "",
          phoneNumber: driverData?.phoneNumber || "",
          bankName: bankData?.bankName || driverData?.bankName || "",
          accountNumber:
            bankData?.accountNumber || driverData?.accountNumber || "",
          accountName: bankData?.accountName || driverData?.accountName || "",
          pendingAmount: 0,
          tripCount: 0,
        };
      }

      driverPayouts[driverId].pendingAmount += driverPayout;
      driverPayouts[driverId].tripCount += 1;
    }

    // Filter only those with pending amounts and convert to array
    const payoutsList = Object.values(driverPayouts)
      .filter((p) => p.pendingAmount > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount);

    // Generate CSV
    const headers = [
      "Driver ID",
      "Driver Name",
      "Email",
      "Phone",
      "Bank Name",
      "Account Number",
      "Account Name",
      "Amount (NGN)",
      "Trip Count",
    ];

    const rows = payoutsList.map((p) => [
      p.driverId,
      p.driverName,
      p.driverEmail,
      p.phoneNumber,
      p.bankName,
      p.accountNumber,
      p.accountName,
      p.pendingAmount.toString(),
      p.tripCount.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Return as downloadable CSV
    const date = new Date().toISOString().split("T")[0];
    const totalPending = payoutsList.reduce(
      (sum, p) => sum + p.pendingAmount,
      0,
    );

    await createAuditLog({
      actionType: "finance_payouts_exported",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: "payouts_csv",
      targetType: "export",
      details: `Exported payouts CSV for ${payoutsList.length} drivers (totalPending=${totalPending})`,
      metadata: {
        driverCount: payoutsList.length,
        totalPending,
        date,
      },
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="driver-payouts-${date}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting payouts:", error);
    return NextResponse.json(
      { error: "Failed to export payouts" },
      { status: 500 },
    );
  }
}
