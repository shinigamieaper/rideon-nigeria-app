import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// POST: Request a withdrawal/payout
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const role =
      (decodedToken as any)?.role ?? (decodedToken as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }
    const uid = decodedToken.uid;

    const body = await req.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Minimum withdrawal amount
    const MIN_WITHDRAWAL = 5000;
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        {
          error: `Minimum withdrawal amount is ₦${MIN_WITHDRAWAL.toLocaleString()}`,
        },
        { status: 400 },
      );
    }

    // Check driver's available balance
    const balanceDoc = await adminDb
      .collection("driver_balances")
      .doc(uid)
      .get();
    const availableBalance = balanceDoc.exists
      ? balanceDoc.data()?.availableBalance || 0
      : 0;

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 },
      );
    }

    // Check if driver has a verified bank account
    const bankAccountDoc = await adminDb
      .collection("driver_bank_accounts")
      .doc(uid)
      .get();
    if (!bankAccountDoc.exists) {
      return NextResponse.json(
        { error: "Please add a bank account first" },
        { status: 400 },
      );
    }

    const bankAccount = bankAccountDoc.data();
    if (!bankAccount?.accountNumber || !bankAccount?.bankCode) {
      return NextResponse.json(
        { error: "Bank account details are incomplete" },
        { status: 400 },
      );
    }

    // Create payout record
    const payoutRef = adminDb.collection("driver_payouts").doc();
    const now = new Date();

    await payoutRef.set({
      driverId: uid,
      amount,
      bankName: bankAccount.bankName,
      bankCode: bankAccount.bankCode,
      accountNumber: bankAccount.accountNumber,
      accountNumberLast4: bankAccount.accountNumber.slice(-4),
      accountName: bankAccount.accountName,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Deduct from available balance (move to pending)
    await adminDb
      .collection("driver_balances")
      .doc(uid)
      .set(
        {
          availableBalance: availableBalance - amount,
          pendingBalance: (balanceDoc.data()?.pendingBalance || 0) + amount,
          updatedAt: now,
        },
        { merge: true },
      );

    // TODO: Integrate with Paystack Transfer API
    // This would create a transfer recipient and initiate the transfer
    // For now, we'll mark it as pending for manual processing

    return NextResponse.json(
      {
        success: true,
        payoutId: payoutRef.id,
        message: "Withdrawal request submitted successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json(
      { error: "Failed to process withdrawal request" },
      { status: 500 },
    );
  }
}
