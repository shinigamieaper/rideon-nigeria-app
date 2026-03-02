import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { PartnerRegistrationSchema } from "@/lib/validation/partner";
import { zodErrorToFieldMap } from "@/lib/validation/errors";

export const runtime = "nodejs";

interface PartnerApplicationDoc {
  userId: string;
  status: "pending_review" | "approved" | "rejected";
  partnerType: "individual" | "business";
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  businessName: string;
  cacNumber: string;
  bvnOrNin?: string;
  directorName?: string;
  directorEmail?: string;
  directorPhone?: string;
  payout: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  kycConsent: true;
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
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
    const uid = decoded.uid;
    const authUser = await adminAuth.getUser(uid);

    const json = await req.json();
    const parsed = PartnerRegistrationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request.",
          details: zodErrorToFieldMap(parsed.error),
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const email = (authUser.email || data.email).trim().toLowerCase();

    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection("users").doc(uid);
      const appRef = adminDb.collection("partner_applications").doc(uid);

      const [userSnap, appSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(appRef),
      ]);

      const baseUser = {
        _id: uid,
        role: "partner_applicant",
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        phoneNumber: data.phoneNumber,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Record<string, unknown>;

      if (userSnap.exists) {
        tx.set(userRef, baseUser, { merge: true });
      } else {
        tx.set(
          userRef,
          { ...baseUser, createdAt: FieldValue.serverTimestamp() },
          { merge: false },
        );
      }

      const baseApp: Partial<PartnerApplicationDoc> & Record<string, unknown> =
        {
          userId: uid,
          status: "pending_review",
          partnerType: data.partnerType,
          firstName: data.firstName,
          lastName: data.lastName,
          email,
          phoneNumber: data.phoneNumber,
          businessName: data.businessName,
          cacNumber: data.cacNumber,
          payout: {
            bankName: data.payout.bankName,
            accountNumber: data.payout.accountNumber,
            accountName: data.payout.accountName,
          },
          kyc: {
            provider: "dojah",
            overallStatus: "pending",
          },
          kycConsent: true,
          updatedAt: FieldValue.serverTimestamp(),
        };

      if (data.partnerType === "individual") {
        baseApp.bvnOrNin = data.bvnOrNin;
      } else {
        baseApp.directorName = data.directorName;
        baseApp.directorEmail = data.directorEmail;
        baseApp.directorPhone = data.directorPhone;
      }

      if (appSnap.exists) {
        tx.set(appRef, baseApp, { merge: true });
      } else {
        tx.set(
          appRef,
          { ...baseApp, createdAt: FieldValue.serverTimestamp() },
          { merge: false },
        );
      }
    });

    const recordForClaims = await adminAuth.getUser(uid);
    const existingClaims = recordForClaims.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: "partner_applicant",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error in register-partner:", error);
    return NextResponse.json(
      { error: "Failed to submit partner application." },
      { status: 500 },
    );
  }
}
