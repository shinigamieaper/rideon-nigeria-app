import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET: Fetch driver's bank account details
export async function GET(req: NextRequest) {
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

    // Fetch driver's bank account from Firestore
    const bankAccountDoc = await adminDb
      .collection("driver_bank_accounts")
      .doc(uid)
      .get();

    if (!bankAccountDoc.exists) {
      return NextResponse.json({ bankAccount: null }, { status: 200 });
    }

    const data = bankAccountDoc.data();
    return NextResponse.json(
      {
        bankAccount: {
          accountNumber: data?.accountNumber || "",
          accountName: data?.accountName || "",
          bankName: data?.bankName || "",
          bankCode: data?.bankCode || "",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching payout settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch payout settings" },
      { status: 500 },
    );
  }
}

// POST: Save or update driver's bank account details
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
    const { accountNumber, bankCode, bankName, accountName } = body;

    if (!accountNumber || !bankCode || !bankName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate account number (10 digits for Nigerian banks)
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Invalid account number format" },
        { status: 400 },
      );
    }

    // Store in Firestore
    await adminDb
      .collection("driver_bank_accounts")
      .doc(uid)
      .set(
        {
          accountNumber,
          accountName: accountName || "",
          bankName,
          bankCode,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      );

    // Optionally create/update Paystack subaccount
    // This would require PAYSTACK_SECRET_KEY and the paystack package
    // For now, we'll just store the bank details

    return NextResponse.json(
      {
        success: true,
        message: "Bank account saved successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error saving payout settings:", error);
    return NextResponse.json(
      { error: "Failed to save payout settings" },
      { status: 500 },
    );
  }
}
