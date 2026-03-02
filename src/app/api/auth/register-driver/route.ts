import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { FleetRegistrationSchema } from "@/lib/validation/driver";
import { zodErrorToFieldMap } from "@/lib/validation/errors";
import { addDays, generateReferenceRequestToken } from "@/lib/referenceTokens";
import {
  sendApplicantReferenceConfirmationEmail,
  sendReferenceRequestEmails,
} from "@/lib/referenceEmails";

export const runtime = "nodejs";

// Explicit MongoDB collection types
interface UserDoc {
  _id: string; // Firebase UID as string
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

interface DriverDoc {
  userId: string; // references Firebase UID
  status: "pending_review" | "approved" | "rejected";
  placementStatus: "available" | "placed";
  experienceYears: number;
  documents: {
    driversLicense: string;
    governmentId: string;
    lasdriCard?: string;
  };
  references?: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
  }[];
  kycConsent?: boolean;
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
      throw new Error("Missing Authorization Bearer token");
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const authUser = await adminAuth.getUser(uid);

    const json = await req.json();
    const parsed = FleetRegistrationSchema.strict().safeParse(json);
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
      experienceYears,
      documents,
      servedCities,
      profileImageUrl,
      references,
      kycConsent,
    } = parsed.data;
    const authEmail = authUser.email || email;

    const documentsToStore: DriverDoc["documents"] = {
      driversLicense: documents.driversLicenseUrl,
      governmentId: documents.governmentIdUrl,
      ...(typeof documents.lasdriCardUrl === "string" && documents.lasdriCardUrl
        ? { lasdriCard: documents.lasdriCardUrl }
        : {}),
    };

    const referencesToStore: NonNullable<DriverDoc["references"]> =
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
      const driverRef = adminDb.collection("drivers").doc(uid);
      // All reads must occur before any writes
      const [userSnap, driverSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(driverRef),
      ]);
      const imageUrl =
        typeof profileImageUrl === "string" ? profileImageUrl : null;

      const baseUser = {
        role: "driver",
        driverTrack: "fleet",
        firstName,
        lastName,
        email: authEmail,
        phoneNumber,
        profileImageUrl: imageUrl || null,
        updatedAt: FieldValue.serverTimestamp(),
      } as Partial<UserDoc> & Record<string, unknown>;
      if (userSnap.exists) {
        tx.set(userRef, baseUser, { merge: true });
      } else {
        tx.set(
          userRef,
          { ...baseUser, _id: uid, createdAt: FieldValue.serverTimestamp() },
          { merge: false },
        );
      }
      const servedCitiesUpdate = Array.isArray(servedCities)
        ? servedCities
            .filter((c: any) => typeof c === "string" && c.trim())
            .map((c: string) => c.trim())
        : undefined;

      const baseDriver = {
        userId: uid,
        status: "pending_review" as const,
        placementStatus: "available" as const,
        placementOptIn: false,
        rideOnVerified: false,
        experienceYears,
        professionalSummary: "",
        documents: documentsToStore,
        references: referencesToStore,
        referenceRequestIds,
        referencesSummary: {
          required: referencesToStore.length,
          completed: 0,
        },
        kycConsent: kycConsent === true ? true : FieldValue.delete(),
        servedCities: servedCitiesUpdate || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      } as Partial<DriverDoc> & Record<string, unknown>;
      if (driverSnap.exists) {
        tx.set(driverRef, baseDriver, { merge: true });
      } else {
        const createDriver: Record<string, any> = {
          userId: uid,
          status: "pending_review",
          placementStatus: "available",
          placementOptIn: false,
          rideOnVerified: false,
          experienceYears,
          professionalSummary: "",
          documents: documentsToStore,
          references: baseDriver.references,
          kycConsent: baseDriver.kycConsent,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        };

        if (servedCitiesUpdate) {
          createDriver.servedCities = servedCitiesUpdate;
        }

        createDriver.referenceRequestIds = referenceRequestIds;
        createDriver.referencesSummary = {
          required: referencesToStore.length,
          completed: 0,
        };

        tx.set(driverRef, createDriver, { merge: false });
      }

      // Create per-reference request docs (tokenized public access)
      for (const rr of referenceRequests) {
        const rrRef = adminDb.collection("reference_requests").doc(rr.token);
        tx.set(
          rrRef,
          {
            applicantUid: uid,
            applicantName: `${firstName} ${lastName}`.trim(),
            flow: "on_demand",
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
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        req.headers.get("origin") ||
        "http://localhost:3000";

      await sendReferenceRequestEmails({
        flow: "on_demand",
        applicantName: `${firstName} ${lastName}`.trim(),
        items: referenceRequests,
        baseUrl,
      });

      await sendApplicantReferenceConfirmationEmail({
        to: authEmail,
        applicantName: `${firstName} ${lastName}`.trim(),
        referencesCount: referencesToStore.length,
        flow: "on_demand",
      });
    } catch (e) {
      console.error("[register-driver] Failed sending reference emails:", e);
    }

    // Set custom claim role=driver (merge with existing)
    const recordForClaims = await adminAuth.getUser(uid);
    const existingClaims = recordForClaims.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: "driver",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error in register-driver:", error);
    return NextResponse.json(
      { error: "Failed to register driver application." },
      { status: 500 },
    );
  }
}
