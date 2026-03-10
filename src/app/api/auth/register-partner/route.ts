import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { PartnerRegistrationSchema } from "@/lib/validation/partner";
import { zodErrorToFieldMap } from "@/lib/validation/errors";
import { sendNotificationToAdminUser } from "@/lib/fcmAdmin";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

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

function getRequestBaseUrl(req: Request): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "";
  const base = String(raw).trim();
  return base ? base.replace(/\/$/, "") : "http://localhost:3000";
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

    let createdNewApplication = false;
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
        createdNewApplication = true;
        tx.set(
          appRef,
          { ...baseApp, createdAt: FieldValue.serverTimestamp() },
          { merge: false },
        );
      }
    });

    if (createdNewApplication) {
      try {
        const baseUrl = getRequestBaseUrl(req);
        const adminLinkPath = "/admin/partners";
        const adminLink = `${baseUrl}${adminLinkPath}`;

        const adminsSnap = await adminDb
          .collection("users")
          .where("isAdmin", "==", true)
          .limit(200)
          .get();

        const adminUids: string[] = [];
        const adminEmails: string[] = [];

        adminsSnap.docs.forEach((d) => {
          if (d.id === uid) return;
          const v = d.data() as any;
          const role = String(v?.adminRole || "admin");
          if (
            !["super_admin", "admin", "ops_admin", "product_admin"].includes(
              role,
            )
          )
            return;
          adminUids.push(d.id);
          const em = typeof v?.email === "string" ? v.email.trim() : "";
          if (em) adminEmails.push(em);
        });

        const applicantName =
          data.partnerType === "business"
            ? String(data.businessName || "").trim() || "Partner"
            : `${String(data.firstName || "").trim()} ${String(data.lastName || "").trim()}`.trim() ||
              "Partner";

        const title = "New partner application";
        const message = `${applicantName} submitted a partner application.`;

        await Promise.allSettled(
          adminUids.map((adminUid) =>
            sendNotificationToAdminUser(adminUid, {
              title,
              body: message,
              data: {
                type: "partner_application_submitted",
                partnerId: uid,
              },
              clickAction: adminLinkPath,
            }),
          ),
        );

        try {
          const resend = getResendClient();
          const from = getEmailFrom();
          if (resend && from && adminEmails.length > 0) {
            const subject = `${title}: ${applicantName}`;
            const text = [message, "", "Review:", adminLink].join("\n");
            const html = `
              <p>${message}</p>
              <p>Review:</p>
              <p><a href="${adminLink}">${adminLink}</a></p>
            `;
            await resend.emails.send({
              from,
              to: adminEmails,
              subject,
              text,
              html,
            });
          }
        } catch (e) {
          console.error("[register-partner] Failed sending admin emails:", e);
        }
      } catch (e) {
        console.error("[register-partner] Failed notifying admins:", e);
      }
    }

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
