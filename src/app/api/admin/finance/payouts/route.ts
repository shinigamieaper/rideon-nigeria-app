import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

/**
 * GET /api/admin/finance/payouts
 * Fetch pending payouts grouped by driver
 */
export async function GET(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "finance_admin",
    ]);
    if (response) return response;

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "pending"; // pending | paid | all

    // Get all completed bookings
    const bookingsRef = adminDb.collection("bookings");
    const bookingsQuery = bookingsRef.where("status", "==", "completed");

    const bookingsSnapshot = await bookingsQuery.get();

    // Group by driver and calculate pending payouts
    const driverPayouts: Record<
      string,
      {
        driverId: string;
        driverName: string;
        driverEmail: string;
        bankName: string;
        bankCode: string;
        accountName: string;
        accountNumber: string;
        totalEarnings: number;
        paidAmount: number;
        pendingAmount: number;
        completedTrips: number;
        bookingIds: string[];
        lastTripDate: string | null;
      }
    > = {};

    for (const doc of bookingsSnapshot.docs) {
      const data = doc.data();
      const driverId = data.driverId;

      if (!driverId) continue;

      const driverPayout = data.driverPayoutNgn || data.driverPayout || 0;
      const isPaid = data.driverPaid === true;
      const tripDate =
        data.completedAt?.toDate?.()?.toISOString() ||
        data.endTime ||
        data.createdAt?.toDate?.()?.toISOString();

      if (!driverPayouts[driverId]) {
        // Fetch driver info
        const driverDoc = await adminDb.collection("users").doc(driverId).get();
        const driverData = driverDoc.exists ? driverDoc.data() : null;

        // Fetch bank info
        let bankName = "";
        let bankCode = "";
        let accountName = "";
        let accountNumber = "";
        try {
          const bankDoc = await adminDb
            .collection("driver_bank_accounts")
            .doc(driverId)
            .get();
          if (bankDoc.exists) {
            const b = bankDoc.data() as any;
            bankName = typeof b?.bankName === "string" ? b.bankName : "";
            bankCode = typeof b?.bankCode === "string" ? b.bankCode : "";
            accountName =
              typeof b?.accountName === "string" ? b.accountName : "";
            accountNumber =
              typeof b?.accountNumber === "string" ? b.accountNumber : "";
          }
        } catch {}

        driverPayouts[driverId] = {
          driverId,
          driverName: driverData
            ? `${driverData.firstName || ""} ${driverData.lastName || ""}`.trim() ||
              "Unknown Driver"
            : "Unknown Driver",
          driverEmail: driverData?.email || "",
          bankName,
          bankCode,
          accountName,
          accountNumber,
          totalEarnings: 0,
          paidAmount: 0,
          pendingAmount: 0,
          completedTrips: 0,
          bookingIds: [],
          lastTripDate: null,
        };
      }

      driverPayouts[driverId].totalEarnings += driverPayout;
      driverPayouts[driverId].completedTrips += 1;
      driverPayouts[driverId].bookingIds.push(doc.id);

      if (isPaid) {
        driverPayouts[driverId].paidAmount += driverPayout;
      } else {
        driverPayouts[driverId].pendingAmount += driverPayout;
      }

      if (
        tripDate &&
        (!driverPayouts[driverId].lastTripDate ||
          tripDate > driverPayouts[driverId].lastTripDate)
      ) {
        driverPayouts[driverId].lastTripDate = tripDate;
      }
    }

    // Convert to array and filter by status
    let payoutsList = Object.values(driverPayouts);

    if (status === "pending") {
      payoutsList = payoutsList.filter((p) => p.pendingAmount > 0);
    } else if (status === "paid") {
      payoutsList = payoutsList.filter(
        (p) => p.paidAmount > 0 && p.pendingAmount === 0,
      );
    }

    // Sort by pending amount (highest first)
    payoutsList.sort((a, b) => b.pendingAmount - a.pendingAmount);

    // Calculate totals
    const totals = {
      totalPending: payoutsList.reduce((sum, p) => sum + p.pendingAmount, 0),
      totalPaid: payoutsList.reduce((sum, p) => sum + p.paidAmount, 0),
      driversWithPending: payoutsList.filter((p) => p.pendingAmount > 0).length,
    };

    return NextResponse.json({ payouts: payoutsList, totals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch payouts" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/finance/payouts
 * Mark driver payouts as paid
 * Body: { driverId: string, bookingIds?: string[], markAll?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "finance_admin",
    ]);
    if (response) return response;

    const body = await req.json().catch(() => ({}));
    const { driverId, bookingIds, markAll } = body as {
      driverId?: string;
      bookingIds?: string[];
      markAll?: boolean;
    };

    if (!driverId) {
      return NextResponse.json(
        { error: "Driver ID is required" },
        { status: 400 },
      );
    }

    // Get bookings to mark as paid
    let bookingsToUpdate: string[] = [];

    if (markAll) {
      // Get all unpaid completed bookings for this driver
      const snapshot = await adminDb
        .collection("bookings")
        .where("driverId", "==", driverId)
        .where("status", "==", "completed")
        .get();

      bookingsToUpdate = snapshot.docs
        .filter((doc) => !doc.data().driverPaid)
        .map((doc) => doc.id);
    } else if (bookingIds && bookingIds.length > 0) {
      bookingsToUpdate = bookingIds;
    } else {
      return NextResponse.json(
        { error: "No bookings specified" },
        { status: 400 },
      );
    }

    if (bookingsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "No unpaid bookings found" },
        { status: 400 },
      );
    }

    // Calculate total amount being paid
    let totalPaid = 0;
    const batch = adminDb.batch();

    // Snapshot bank details for audit/history
    let bankName = "";
    let bankCode = "";
    let accountName = "";
    let accountNumberLast4 = "";
    try {
      const bankDoc = await adminDb
        .collection("driver_bank_accounts")
        .doc(driverId)
        .get();
      if (bankDoc.exists) {
        const b = bankDoc.data() as any;
        bankName = typeof b?.bankName === "string" ? b.bankName : "";
        bankCode = typeof b?.bankCode === "string" ? b.bankCode : "";
        accountName = typeof b?.accountName === "string" ? b.accountName : "";
        const acct =
          typeof b?.accountNumber === "string" ? b.accountNumber : "";
        accountNumberLast4 = acct ? String(acct).slice(-4) : "";
      }
    } catch {}

    const updatedBookingIds: string[] = [];

    for (const bookingId of bookingsToUpdate) {
      const bookingRef = adminDb.collection("bookings").doc(bookingId);
      const bookingDoc = await bookingRef.get();

      if (!bookingDoc.exists) continue;

      const data = bookingDoc.data()!;
      if (data.driverPaid === true) continue;

      updatedBookingIds.push(bookingId);
      totalPaid += data.driverPayoutNgn || data.driverPayout || 0;

      batch.update(bookingRef, {
        driverPaid: true,
        driverPaidAt: FieldValue.serverTimestamp(),
        driverPaidBy: caller!.uid,
      });
    }

    if (updatedBookingIds.length === 0) {
      return NextResponse.json(
        { error: "All specified bookings are already marked as paid" },
        { status: 400 },
      );
    }

    await batch.commit();

    // Record payout in driver_payouts collection for history
    await adminDb.collection("driver_payouts").add({
      driverId,
      amount: totalPaid,
      bookingIds: updatedBookingIds,
      bookingCount: updatedBookingIds.length,
      paidBy: caller!.uid,
      paidByEmail: caller!.email,
      paidAt: FieldValue.serverTimestamp(),
      method: "manual",
      bankName,
      bankCode,
      accountName,
      accountNumberLast4,
      notes: `Marked ${updatedBookingIds.length} booking(s) as paid`,
    });

    await createAuditLog({
      actionType: "finance_payout_marked_paid",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: driverId,
      targetType: "driver",
      details: `Marked ${updatedBookingIds.length} booking(s) as paid for driver ${driverId}`,
      metadata: {
        driverId,
        bookingIds: updatedBookingIds,
        totalPaid,
      },
    });

    return NextResponse.json(
      {
        success: true,
        paidCount: updatedBookingIds.length,
        totalPaid,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing payout:", error);
    return NextResponse.json(
      { error: "Failed to process payout" },
      { status: 500 },
    );
  }
}
