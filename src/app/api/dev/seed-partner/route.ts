import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" && body.email
        ? body.email
        : "dev-partner@example.com";
    const password =
      typeof body?.password === "string" && body.password
        ? body.password
        : "DevPartner#12345";
    const firstName =
      typeof body?.firstName === "string" && body.firstName
        ? body.firstName
        : "Dev";
    const lastName =
      typeof body?.lastName === "string" && body.lastName
        ? body.lastName
        : "Partner";
    const phoneNumber =
      typeof body?.phoneNumber === "string" && body.phoneNumber
        ? body.phoneNumber
        : "+2348000000002";
    const businessName =
      typeof body?.businessName === "string" && body.businessName
        ? body.businessName
        : "Dev Partner Fleet";
    const approved = body?.approved !== false;

    let userRecord: import("firebase-admin/auth").UserRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, { password });
    } catch {
      userRecord = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        disabled: false,
      });
    }

    const uid = userRecord.uid;

    const existingClaims = (await adminAuth.getUser(uid)).customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: approved ? "partner" : "partner_applicant",
    });

    const now = FieldValue.serverTimestamp();

    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection("users").doc(uid);
      const appRef = adminDb.collection("partner_applications").doc(uid);
      const partnerRef = adminDb.collection("partners").doc(uid);

      const baseUser: Record<string, unknown> = {
        _id: uid,
        role: approved ? "partner" : "partner_applicant",
        firstName,
        lastName,
        email: String(email || "")
          .trim()
          .toLowerCase(),
        phoneNumber,
        updatedAt: now,
      };

      tx.set(userRef, { ...baseUser, createdAt: now }, { merge: true });

      tx.set(
        appRef,
        {
          userId: uid,
          status: approved ? "approved" : "pending_review",
          partnerType: "business",
          firstName,
          lastName,
          email: String(email || "")
            .trim()
            .toLowerCase(),
          phoneNumber,
          businessName,
          cacNumber: "RC-DEV-0000",
          payout: {
            bankName: "Dev Bank",
            accountNumber: "0000000000",
            accountName: businessName,
          },
          kyc: {
            provider: "dojah",
            overallStatus: approved ? "passed" : "pending",
            cac: { status: approved ? "passed" : "pending" },
            director: { status: approved ? "passed" : "pending" },
            lastRunAt: now,
          },
          kycConsent: true,
          updatedAt: now,
          ...(approved ? { approvedAt: now } : {}),
          createdAt: now,
        },
        { merge: true },
      );

      tx.set(
        partnerRef,
        {
          userId: uid,
          status: approved ? "approved" : "pending_review",
          partnerType: "business",
          businessName,
          email: String(email || "")
            .trim()
            .toLowerCase(),
          phoneNumber,
          live: false,
          approvedVehicles: 0,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
    });

    return NextResponse.json(
      { uid, email, password, approved },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in dev/seed-partner:", error);
    return NextResponse.json(
      { error: "Failed to seed partner." },
      { status: 500 },
    );
  }
}
