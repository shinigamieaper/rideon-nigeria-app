import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PlacementApplicationSchema } from "@/lib/validation/driver";
import { zodErrorToFieldMap } from "@/lib/validation/errors";
import { addDays, generateReferenceRequestToken } from "@/lib/referenceTokens";
import {
  sendApplicantReferenceConfirmationEmail,
  sendReferenceRequestEmails,
} from "@/lib/referenceEmails";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export const runtime = "nodejs";

function getRequestBaseUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    if (u.origin) return u.origin;
  } catch {
    // ignore
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

interface UserDoc {
  _id: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

interface FullTimeDriverApplicationDoc {
  userId: string;
  status: "pending_review" | "approved" | "rejected";
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nin: string;
  bvn?: string;
  experienceYears: number;
  profileImageUrl?: string | null;
  preferredCity: string;
  salaryExpectation: number;
  salaryExpectationMinNgn?: number;
  salaryExpectationMaxNgn?: number;
  profileSummary?: string;
  vehicleTypesHandled?: string;
  vehicleExperience?: { categories?: string[]; notes?: string };
  familyFitTags?: string[];
  familyFitNotes?: string;
  languages?: string[];
  hobbies?: string[];
  fullTimePreferences?: {
    willingToTravel?: boolean;
    preferredClientType?: "personal" | "corporate" | "any";
  };
  availabilityFullTime?: boolean;
  additionalNotes?: string;
  backgroundConsent: true;
  documents: {
    driversLicense: string;
    governmentId: string;
    lasdriCard?: string;
    policeReport?: string;
    medicalReport?: string;
    eyeTest?: string;
  };
  references: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
  }[];
  referenceRequestIds?: string[];
  referencesSummary?: { required: number; completed: number };
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
    const parsed = PlacementApplicationSchema.strict().safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request.",
          details: zodErrorToFieldMap(parsed.error),
        },
        { status: 400 },
      );
    }

    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      nin,
      bvn,
      experienceYears,
      profileImageUrl,
      preferredCity,
      salaryExpectation,
      salaryExpectationMinNgn,
      salaryExpectationMaxNgn,
      vehicleTypesHandled,
      vehicleExperience,
      familyFitTags,
      familyFitNotes,
      languages,
      hobbies,
      fullTimePreferences,
      availabilityFullTime,
      additionalNotes,
      profileSummary,
      backgroundConsent,
      documents,
      references,
      kycConsent,
    } = parsed.data;

    const legacySalary =
      typeof salaryExpectation === "number" &&
      Number.isFinite(salaryExpectation) &&
      salaryExpectation > 0
        ? Math.round(salaryExpectation)
        : 0;
    let minNgn =
      typeof salaryExpectationMinNgn === "number" &&
      Number.isFinite(salaryExpectationMinNgn) &&
      salaryExpectationMinNgn > 0
        ? Math.round(salaryExpectationMinNgn)
        : 0;
    let maxNgn =
      typeof salaryExpectationMaxNgn === "number" &&
      Number.isFinite(salaryExpectationMaxNgn) &&
      salaryExpectationMaxNgn > 0
        ? Math.round(salaryExpectationMaxNgn)
        : 0;

    if (minNgn > 0 && maxNgn <= 0) maxNgn = minNgn;
    if (maxNgn > 0 && minNgn <= 0) minNgn = maxNgn;
    if (minNgn <= 0 && maxNgn <= 0 && legacySalary > 0) {
      minNgn = legacySalary;
      maxNgn = legacySalary;
    }
    if (minNgn > 0 && maxNgn > 0 && maxNgn < minNgn) {
      const t = minNgn;
      minNgn = maxNgn;
      maxNgn = t;
    }

    const authEmail = authUser.email || email;

    const documentsToStore: FullTimeDriverApplicationDoc["documents"] = {
      driversLicense: documents.driversLicenseUrl,
      governmentId: documents.governmentIdUrl,
      ...(typeof documents.lasdriCardUrl === "string" && documents.lasdriCardUrl
        ? { lasdriCard: documents.lasdriCardUrl }
        : {}),
      ...(typeof (documents as any).policeReportUrl === "string" &&
      (documents as any).policeReportUrl
        ? { policeReport: (documents as any).policeReportUrl }
        : {}),
      ...(typeof (documents as any).medicalReportUrl === "string" &&
      (documents as any).medicalReportUrl
        ? { medicalReport: (documents as any).medicalReportUrl }
        : {}),
      ...(typeof (documents as any).eyeTestUrl === "string" &&
      (documents as any).eyeTestUrl
        ? { eyeTest: (documents as any).eyeTestUrl }
        : {}),
    };

    const referencesToStore: FullTimeDriverApplicationDoc["references"] =
      references.map((r: any) => ({
        name: String(r?.name || "").trim(),
        email: String(r?.email || "")
          .trim()
          .toLowerCase(),
        phone: String(r?.phone || "").trim(),
        relationship: String(r?.relationship || "").trim(),
      }));

    const referenceRequests = referencesToStore.map((ref) => ({
      token: generateReferenceRequestToken(),
      reference: ref,
    }));
    const referenceRequestIds = referenceRequests.map((r) => r.token);
    const referenceExpiresAt = Timestamp.fromDate(addDays(new Date(), 7));

    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection("users").doc(uid);
      const appRef = adminDb
        .collection("full_time_driver_applications")
        .doc(uid);

      const [userSnap, appSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(appRef),
      ]);

      if (appSnap.exists) {
        const existingStatus = String(
          (appSnap.data() as any)?.status || "pending_review",
        );
        if (existingStatus === "pending_review") {
          throw new Error("Application already submitted");
        }
        if (existingStatus === "approved") {
          throw new Error("Application already approved");
        }
      }

      const existingUserRole = userSnap.exists
        ? String((userSnap.data() as any)?.role || "").trim()
        : "";

      const baseUser = {
        _id: uid,
        firstName,
        lastName,
        email: authEmail,
        phoneNumber,
        profileImageUrl:
          typeof profileImageUrl === "string" ? profileImageUrl : null,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<UserDoc> & Record<string, unknown>;

      if (
        !existingUserRole ||
        existingUserRole === "full_time_driver_applicant"
      ) {
        (baseUser as any).role = "full_time_driver_applicant";
      }

      if (userSnap.exists) {
        tx.set(userRef, baseUser, { merge: true });
      } else {
        tx.set(
          userRef,
          { ...baseUser, createdAt: FieldValue.serverTimestamp() },
          { merge: false },
        );
      }

      const baseApp: Record<string, any> = {
        userId: uid,
        status: "pending_review" as const,
        firstName,
        lastName,
        email: authEmail,
        phoneNumber,
        nin,
        ...(typeof bvn === "string" && bvn.trim() ? { bvn: bvn.trim() } : {}),
        experienceYears,
        profileImageUrl:
          typeof profileImageUrl === "string" ? profileImageUrl : null,
        preferredCity,
        salaryExpectation:
          legacySalary > 0 ? legacySalary : Math.max(0, maxNgn || minNgn || 0),
        ...(minNgn > 0 ? { salaryExpectationMinNgn: minNgn } : {}),
        ...(maxNgn > 0 ? { salaryExpectationMaxNgn: maxNgn } : {}),
        vehicleTypesHandled:
          typeof vehicleTypesHandled === "string"
            ? vehicleTypesHandled.trim()
            : "",
        vehicleExperience:
          vehicleExperience && typeof vehicleExperience === "object"
            ? {
                categories: Array.isArray((vehicleExperience as any).categories)
                  ? (vehicleExperience as any).categories
                  : [],
                notes:
                  typeof (vehicleExperience as any).notes === "string"
                    ? (vehicleExperience as any).notes
                    : "",
              }
            : undefined,
        familyFitTags: Array.isArray(familyFitTags) ? familyFitTags : [],
        familyFitNotes:
          typeof familyFitNotes === "string" ? familyFitNotes.trim() : "",
        languages: Array.isArray(languages) ? languages : [],
        hobbies: Array.isArray(hobbies) ? hobbies : [],
        fullTimePreferences:
          fullTimePreferences && typeof fullTimePreferences === "object"
            ? {
                willingToTravel:
                  typeof (fullTimePreferences as any).willingToTravel ===
                  "boolean"
                    ? (fullTimePreferences as any).willingToTravel
                    : undefined,
                preferredClientType:
                  (fullTimePreferences as any).preferredClientType ===
                    "personal" ||
                  (fullTimePreferences as any).preferredClientType ===
                    "corporate" ||
                  (fullTimePreferences as any).preferredClientType === "any"
                    ? (fullTimePreferences as any).preferredClientType
                    : undefined,
              }
            : undefined,
        availabilityFullTime:
          typeof availabilityFullTime === "boolean"
            ? availabilityFullTime
            : undefined,
        additionalNotes:
          typeof additionalNotes === "string" ? additionalNotes.trim() : "",
        profileSummary:
          typeof profileSummary === "string" && profileSummary.trim()
            ? profileSummary.trim()
            : typeof additionalNotes === "string"
              ? additionalNotes.trim()
              : "",
        backgroundConsent,
        documents: documentsToStore,
        references: referencesToStore,
        referenceRequestIds,
        referencesSummary: {
          required: referencesToStore.length,
          completed: 0,
        },
        kycConsent,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<FullTimeDriverApplicationDoc> &
        Record<string, unknown>;

      if (appSnap.exists) {
        tx.set(
          appRef,
          {
            ...baseApp,
            needsMoreInfoReason: FieldValue.delete(),
            needsMoreInfoAt: FieldValue.delete(),
            needsMoreInfoBy: FieldValue.delete(),
            rejectionReason: FieldValue.delete(),
            rejectedAt: FieldValue.delete(),
            rejectedBy: FieldValue.delete(),
          },
          { merge: true },
        );
      } else {
        tx.set(
          appRef,
          { ...baseApp, createdAt: FieldValue.serverTimestamp() },
          { merge: false },
        );
      }

      // Create per-reference request docs (tokenized public access)
      for (const rr of referenceRequests) {
        const rrRef = adminDb.collection("reference_requests").doc(rr.token);
        tx.set(
          rrRef,
          {
            applicantUid: uid,
            applicantName: `${firstName} ${lastName}`.trim(),
            flow: "full_time",
            status: "pending",
            reference: rr.reference,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            expiresAt: referenceExpiresAt,
          },
          { merge: false },
        );
      }
    });

    try {
      const adminsSnap = await adminDb
        .collection("users")
        .where("isAdmin", "==", true)
        .limit(200)
        .get();
      const adminUids: string[] = [];
      const adminEmails: string[] = [];

      adminsSnap.docs.forEach((d) => {
        if (d.id === uid) return;
        adminUids.push(d.id);
        const data = d.data() as any;
        const em = typeof data?.email === "string" ? data.email.trim() : "";
        if (em) adminEmails.push(em);
      });

      await Promise.allSettled(
        adminUids.map((adminUid) =>
          adminDb
            .collection("users")
            .doc(adminUid)
            .collection("notifications")
            .add({
              type: "full_time_driver_application_submitted",
              title: "New full-time driver application",
              description: `${`${firstName} ${lastName}`.trim() || "An applicant"} submitted a full-time driver application.`,
              message: `${`${firstName} ${lastName}`.trim() || "An applicant"} submitted a full-time driver application.`,
              unread: true,
              createdAt: FieldValue.serverTimestamp(),
              link: `/admin/full-time-driver-applications/${uid}`,
            }),
        ),
      );

      await adminDb
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .add({
          type: "full_time_driver_application_submitted",
          title: "Application submitted",
          description:
            "Your full-time driver application has been submitted and is under review.",
          message:
            "Your full-time driver application has been submitted and is under review.",
          unread: true,
          createdAt: FieldValue.serverTimestamp(),
          link: "/full-time-driver/application/status",
        });

      const resend = getResendClient();
      const from = getEmailFrom();
      if (resend && from && adminEmails.length > 0) {
        const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
        const adminLink = `${baseUrl}/admin/full-time-driver-applications/${encodeURIComponent(uid)}`;

        const subject = `New full-time driver application: ${`${firstName} ${lastName}`.trim() || "Applicant"}`;
        const text = [
          `${`${firstName} ${lastName}`.trim() || "An applicant"} submitted a full-time driver application.`,
          "",
          "Review:",
          adminLink,
        ].join("\n");

        const html = `
          <p><strong>${`${firstName} ${lastName}`.trim() || "An applicant"}</strong> submitted a full-time driver application.</p>
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
      console.error(
        "[apply-full-time-driver] Failed sending admin notifications:",
        e,
      );
    }

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        req.headers.get("origin") ||
        "http://localhost:3000";

      await sendReferenceRequestEmails({
        flow: "full_time",
        applicantName: `${firstName} ${lastName}`.trim(),
        items: referenceRequests,
        baseUrl,
      });

      await sendApplicantReferenceConfirmationEmail({
        to: authEmail,
        applicantName: `${firstName} ${lastName}`.trim(),
        referencesCount: referencesToStore.length,
        flow: "full_time",
      });
    } catch (e) {
      console.error(
        "[apply-full-time-driver] Failed sending reference emails:",
        e,
      );
    }

    const recordForClaims = await adminAuth.getUser(uid);
    const existingClaims = recordForClaims.customClaims || {};

    const existingRoleClaim = (existingClaims as any)?.role as
      | string
      | undefined;
    if (
      !existingRoleClaim ||
      existingRoleClaim === "full_time_driver_applicant"
    ) {
      await adminAuth.setCustomUserClaims(uid, {
        ...existingClaims,
        role: "full_time_driver_applicant",
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in apply-full-time-driver:", error);
    if (
      message === "Application already submitted" ||
      message === "Application already approved"
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to submit full-time driver application." },
      { status: 500 },
    );
  }
}
