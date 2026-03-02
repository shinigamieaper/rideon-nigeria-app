import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

function getRole(decoded: unknown): string | undefined {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const role = (d?.role ?? claims?.role) as string | undefined;
  return typeof role === "string" ? role : undefined;
}

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req);
    if (ctx instanceof NextResponse) return ctx;

    const partnerId = ctx.partnerId;

    const appSnap = await adminDb
      .collection("partner_applications")
      .doc(partnerId)
      .get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const d = appSnap.data() as Record<string, unknown>;
    const payout = (d?.payout || {}) as Record<string, unknown>;

    return NextResponse.json(
      {
        payout: {
          bankName: typeof payout.bankName === "string" ? payout.bankName : "",
          bankCode: typeof payout.bankCode === "string" ? payout.bankCode : "",
          accountNumber:
            typeof payout.accountNumber === "string"
              ? payout.accountNumber
              : "",
          accountName:
            typeof payout.accountName === "string" ? payout.accountName : "",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner payout settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch payout settings." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = getRole(decoded);
    if (role !== "partner" && role !== "partner_applicant") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const uid = decoded.uid;

    const body = await req.json().catch(() => null);
    const b = (body || {}) as Record<string, unknown>;

    const accountNumber =
      typeof b.accountNumber === "string" ? b.accountNumber.trim() : "";
    const bankCode = typeof b.bankCode === "string" ? b.bankCode.trim() : "";
    const bankName = typeof b.bankName === "string" ? b.bankName.trim() : "";
    const accountName =
      typeof b.accountName === "string" ? b.accountName.trim() : "";

    if (!accountNumber || !bankCode || !bankName || !accountName) {
      return NextResponse.json(
        { error: "Missing required payout fields." },
        { status: 400 },
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Invalid account number format." },
        { status: 400 },
      );
    }

    const appRef = adminDb.collection("partner_applications").doc(uid);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    await appRef.update({
      payout: {
        bankName,
        bankCode,
        accountNumber,
        accountName,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating partner payout settings:", error);
    return NextResponse.json(
      { error: "Failed to update payout settings." },
      { status: 500 },
    );
  }
}
