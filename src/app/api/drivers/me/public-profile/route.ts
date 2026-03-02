import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export const runtime = "nodejs";

function getRequestBaseUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    if (u.origin) return u.origin;
  } catch {}

  const origin = (req.headers.get("origin") || "").trim();
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {}
  }

  const forwardedHost = (req.headers.get("x-forwarded-host") || "")
    .split(",")[0]
    .trim();
  const host = (forwardedHost || req.headers.get("host") || "").trim();
  const forwardedProto = (req.headers.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim();
  const proto = forwardedProto || "https";

  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

function normalizeStringArray(val: any, maxLen = 30, maxItems = 12): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .slice(0, maxItems)
    .map((v) => (v.length > maxLen ? v.slice(0, maxLen) : v));
}

// GET /api/drivers/me/public-profile
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    const [userSnap, driverSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb.collection("drivers").doc(uid).get(),
    ]);

    if (!driverSnap.exists) {
      return NextResponse.json(
        { error: "Driver profile not found." },
        { status: 404 },
      );
    }

    const driverData = driverSnap.data() as any;
    const userData = userSnap.exists ? (userSnap.data() as any) : {};

    const rawTrack = userData?.driverTrack as string | undefined;
    const normalized = rawTrack === "placement_only" ? "placement" : rawTrack;
    const driverTrack =
      normalized === "fleet" ||
      normalized === "placement" ||
      normalized === "both"
        ? normalized
        : "fleet";

    const liveProfile =
      driverData?.recruitmentProfile &&
      typeof driverData.recruitmentProfile === "object"
        ? driverData.recruitmentProfile
        : driverData;

    const pendingProfile =
      driverData?.recruitmentProfilePending &&
      typeof driverData.recruitmentProfilePending === "object"
        ? driverData.recruitmentProfilePending
        : null;

    return NextResponse.json(
      {
        professionalSummary:
          (typeof (liveProfile as any)?.professionalSummary === "string"
            ? (liveProfile as any).professionalSummary
            : typeof (liveProfile as any)?.profileSummary === "string"
              ? (liveProfile as any).profileSummary
              : "") || "",
        experienceYears: liveProfile?.experienceYears || 0,
        languages: Array.isArray(liveProfile?.languages)
          ? liveProfile.languages
          : [],
        hobbies: Array.isArray(liveProfile?.hobbies) ? liveProfile.hobbies : [],
        vehicleExperience:
          liveProfile?.vehicleExperience &&
          typeof liveProfile.vehicleExperience === "object"
            ? {
                categories: Array.isArray(
                  (liveProfile.vehicleExperience as any).categories,
                )
                  ? (liveProfile.vehicleExperience as any).categories
                  : [],
                notes:
                  typeof (liveProfile.vehicleExperience as any).notes ===
                  "string"
                    ? (liveProfile.vehicleExperience as any).notes
                    : "",
              }
            : { categories: [], notes: "" },
        familyFitTags: Array.isArray(liveProfile?.familyFitTags)
          ? liveProfile.familyFitTags
          : [],
        familyFitNotes:
          typeof liveProfile?.familyFitNotes === "string"
            ? liveProfile.familyFitNotes
            : "",
        fullTimePreferences:
          liveProfile?.fullTimePreferences &&
          typeof liveProfile.fullTimePreferences === "object"
            ? {
                willingToTravel:
                  typeof (liveProfile.fullTimePreferences as any)
                    .willingToTravel === "boolean"
                    ? (liveProfile.fullTimePreferences as any).willingToTravel
                    : null,
                preferredClientType:
                  typeof (liveProfile.fullTimePreferences as any)
                    .preferredClientType === "string"
                    ? (liveProfile.fullTimePreferences as any)
                        .preferredClientType
                    : null,
              }
            : null,
        pending: pendingProfile
          ? {
              status:
                typeof pendingProfile.status === "string"
                  ? pendingProfile.status
                  : "pending",
              rejectionReason:
                typeof pendingProfile.rejectionReason === "string"
                  ? pendingProfile.rejectionReason
                  : null,
              submittedAt:
                pendingProfile.submittedAt?.toDate?.()?.toISOString?.() || null,
              professionalSummary:
                typeof pendingProfile.professionalSummary === "string"
                  ? pendingProfile.professionalSummary
                  : typeof pendingProfile.profileSummary === "string"
                    ? pendingProfile.profileSummary
                    : "",
              experienceYears:
                typeof pendingProfile.experienceYears === "number"
                  ? pendingProfile.experienceYears
                  : 0,
              languages: Array.isArray(pendingProfile.languages)
                ? pendingProfile.languages
                : [],
              hobbies: Array.isArray(pendingProfile.hobbies)
                ? pendingProfile.hobbies
                : [],
              vehicleExperience:
                pendingProfile.vehicleExperience &&
                typeof pendingProfile.vehicleExperience === "object"
                  ? {
                      categories: Array.isArray(
                        (pendingProfile.vehicleExperience as any).categories,
                      )
                        ? (pendingProfile.vehicleExperience as any).categories
                        : [],
                      notes:
                        typeof (pendingProfile.vehicleExperience as any)
                          .notes === "string"
                          ? (pendingProfile.vehicleExperience as any).notes
                          : "",
                    }
                  : { categories: [], notes: "" },
              familyFitTags: Array.isArray(pendingProfile.familyFitTags)
                ? pendingProfile.familyFitTags
                : [],
              familyFitNotes:
                typeof pendingProfile.familyFitNotes === "string"
                  ? pendingProfile.familyFitNotes
                  : "",
              fullTimePreferences:
                pendingProfile.fullTimePreferences &&
                typeof pendingProfile.fullTimePreferences === "object"
                  ? {
                      willingToTravel:
                        typeof (pendingProfile.fullTimePreferences as any)
                          .willingToTravel === "boolean"
                          ? (pendingProfile.fullTimePreferences as any)
                              .willingToTravel
                          : null,
                      preferredClientType:
                        typeof (pendingProfile.fullTimePreferences as any)
                          .preferredClientType === "string"
                          ? (pendingProfile.fullTimePreferences as any)
                              .preferredClientType
                          : null,
                    }
                  : null,
            }
          : null,
        placementOptIn: driverData?.placementOptIn === true,
        recruitmentPool: driverData?.recruitmentPool === true,
        driverTrack,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching driver public profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch public profile." },
      { status: 500 },
    );
  }
}

// PUT /api/drivers/me/public-profile
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const {
      professionalSummary,
      experienceYears,
      languages,
      hobbies,
      vehicleExperience,
      familyFitTags,
      familyFitNotes,
      fullTimePreferences,
    } = body as any;

    if (
      typeof experienceYears !== "number" ||
      experienceYears < 0 ||
      experienceYears > 80
    ) {
      return NextResponse.json(
        { error: "Experience years must be a number between 0 and 80." },
        { status: 400 },
      );
    }

    const langs: string[] = normalizeStringArray(languages, 30, 12);
    const hobbiesArr: string[] = normalizeStringArray(hobbies, 30, 12);
    const familyFitTagsArr: string[] = normalizeStringArray(
      familyFitTags,
      50,
      12,
    );
    const vehicleCategories: string[] = normalizeStringArray(
      vehicleExperience?.categories,
      40,
      12,
    );
    const vehicleNotes: string =
      typeof vehicleExperience?.notes === "string"
        ? vehicleExperience.notes.trim().slice(0, 300)
        : "";
    const familyNotes: string =
      typeof familyFitNotes === "string"
        ? familyFitNotes.trim().slice(0, 300)
        : "";
    const summary: string =
      typeof professionalSummary === "string"
        ? professionalSummary.trim().slice(0, 2000)
        : "";

    const prefWillingToTravel =
      typeof fullTimePreferences?.willingToTravel === "boolean"
        ? fullTimePreferences.willingToTravel
        : undefined;
    const prefClientTypeRaw = fullTimePreferences?.preferredClientType;
    const prefClientType =
      prefClientTypeRaw === "personal" ||
      prefClientTypeRaw === "corporate" ||
      prefClientTypeRaw === "any"
        ? prefClientTypeRaw
        : undefined;

    // Access control: Check if driver has permission to edit public profile
    const [userSnap, driverSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb.collection("drivers").doc(uid).get(),
    ]);

    if (!driverSnap.exists) {
      return NextResponse.json(
        { error: "Driver profile not found." },
        { status: 404 },
      );
    }

    const driverData = driverSnap.data() as any;
    const canEdit =
      driverData?.recruitmentPool === true ||
      driverData?.placementOptIn === true;
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const driverRef = adminDb.collection("drivers").doc(uid);
    await driverRef.set(
      {
        recruitmentProfilePending: {
          status: "pending",
          rejectionReason: null,
          submittedAt: FieldValue.serverTimestamp(),
          submittedBy: uid,
          professionalSummary: summary,
          experienceYears: Number(experienceYears),
          languages: langs,
          hobbies: hobbiesArr,
          vehicleExperience: {
            categories: vehicleCategories,
            notes: vehicleNotes,
          },
          familyFitTags: familyFitTagsArr,
          familyFitNotes: familyNotes,
          fullTimePreferences: {
            ...(typeof prefWillingToTravel === "boolean"
              ? { willingToTravel: prefWillingToTravel }
              : {}),
            ...(prefClientType ? { preferredClientType: prefClientType } : {}),
          },
        },
        recruitmentProfilePendingUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const [uSnap, adminsSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb.collection("users").where("isAdmin", "==", true).limit(200).get(),
    ]);

    const u = uSnap.exists ? (uSnap.data() as any) : {};
    const applicantName =
      `${String(u?.firstName || "").trim()} ${String(u?.lastName || "").trim()}`.trim() ||
      "Driver";
    const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
    const adminLink = `${baseUrl}/admin/drivers/${encodeURIComponent(uid)}`;

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
            type: "recruitment_profile_pending",
            title: "Driver profile update pending approval",
            description: `${applicantName} submitted a public profile update for review.`,
            message: `${applicantName} submitted a public profile update for review.`,
            unread: true,
            createdAt: FieldValue.serverTimestamp(),
            link: `/admin/drivers/${uid}`,
          }),
      ),
    );

    await adminDb.collection("users").doc(uid).collection("notifications").add({
      type: "recruitment_profile_pending",
      title: "Profile update submitted",
      description:
        "Your public profile changes were submitted for admin review.",
      message: "Your public profile changes were submitted for admin review.",
      unread: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    try {
      const resend = getResendClient();
      const from = getEmailFrom();
      if (resend && from && adminEmails.length > 0) {
        const subject = `Driver profile update pending approval: ${applicantName}`;
        const text = [
          `${applicantName} submitted a driver public profile update for review.`,
          "",
          `Review here:`,
          adminLink,
        ].join("\n");
        const html = `
          <p><strong>${applicantName}</strong> submitted a driver public profile update for review.</p>
          <p>Review here:</p>
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
        "[drivers/me/public-profile] Failed sending admin emails:",
        e,
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating driver public profile:", error);
    return NextResponse.json(
      { error: "Failed to update public profile." },
      { status: 500 },
    );
  }
}
