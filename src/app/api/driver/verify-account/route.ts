import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET: Verify bank account details using Paystack
export async function GET(req: NextRequest) {
  try {
    const authHeader =
      req.headers.get("authorization") ||
      req.headers.get("Authorization") ||
      "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    const isAdmin = Boolean((decoded as any)?.admin === true);
    if (!isAdmin && role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const accountNumber = searchParams.get("account_number");
    const bankCode = searchParams.get("bank_code");

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: "Missing account_number or bank_code" },
        { status: 400 },
      );
    }

    // Validate account number format
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Invalid account number format" },
        { status: 400 },
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 },
      );
    }

    // Call Paystack API to resolve account name
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Paystack verification failed:", errorData);
      return NextResponse.json(
        { error: "Unable to verify account details" },
        { status: 400 },
      );
    }

    const data = await response.json();

    if (!data.status || !data.data) {
      return NextResponse.json(
        { error: "Unable to verify account details" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        account_name: data.data.account_name,
        account_number: data.data.account_number,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error verifying account:", error);
    return NextResponse.json(
      { error: "Failed to verify account details" },
      { status: 500 },
    );
  }
}
