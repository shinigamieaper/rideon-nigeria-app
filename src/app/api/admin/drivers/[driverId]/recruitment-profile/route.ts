export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";
import { createAuditLog } from "@/lib/auditLog";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

function getRequestBaseUrl(req: NextRequest): string {
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

type Action = "approve" | "reject";

type PendingProfile = {
  status?: string;
  professionalSummary?: string;
  experienceYears?: number;
  languages?: string[];
  hobbies?: string[];
  vehicleExperience?: { categories?: string[]; notes?: string };
  familyFitTags?: string[];
  familyFitNotes?: string;
  fullTimePreferences?: {
    willingToTravel?: boolean;
    preferredClientType?: "personal" | "corporate" | "any";
  };
  rejectionReason?: string | null;
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ driverId: string }> },
) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "driver_admin",
    ]);
    if (response) return response;

    const { driverId } = await context.params;
    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = body?.action as Action | undefined;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 },
      );
    }

    const driverRef = adminDb.collection("drivers").doc(driverId);
    const userRef = adminDb.collection("users").doc(driverId);

    let driverName = "Driver";

    await adminDb.runTransaction(async (tx) => {
      const [driverSnap, userSnap] = await Promise.all([
        tx.get(driverRef),
        tx.get(userRef),
      ]);

      if (!driverSnap.exists) {
        throw new Error("Driver not found");
      }

      const d = driverSnap.data() as any;
      const pending: PendingProfile | null =
        d?.recruitmentProfilePending &&
        typeof d.recruitmentProfilePending === "object"
          ? (d.recruitmentProfilePending as PendingProfile)
          : null;

      const pendingStatus = pending?.status ? String(pending.status) : "";
      if (!pending || pendingStatus !== "pending") {
        throw new Error(
          "No pending recruitment profile update for this driver",
        );
      }

      if (userSnap.exists) {
        const u = userSnap.data() as any;
        const fn = String(u?.firstName || "").trim();
        const ln = String(u?.lastName || "").trim();
        driverName = `${fn} ${ln}`.trim() || driverName;
      }

      const update: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
        lastStatusChangeBy: admin!.uid,
        lastStatusChangeAt: FieldValue.serverTimestamp(),
      };

      if (action === "approve") {
        const profileSummary =
          typeof pending.professionalSummary === "string"
            ? pending.professionalSummary.trim()
            : "";
        const experienceYears =
          typeof pending.experienceYears === "number"
            ? pending.experienceYears
            : 0;
        const languages = Array.isArray(pending.languages)
          ? pending.languages
          : [];
        const hobbies = Array.isArray(pending.hobbies) ? pending.hobbies : [];
        const vehicleExperience =
          pending.vehicleExperience &&
          typeof pending.vehicleExperience === "object"
            ? {
                categories: Array.isArray(
                  (pending.vehicleExperience as any).categories,
                )
                  ? (pending.vehicleExperience as any).categories
                  : [],
                notes:
                  typeof (pending.vehicleExperience as any).notes === "string"
                    ? (pending.vehicleExperience as any).notes
                    : "",
              }
            : undefined;
        const familyFitTags = Array.isArray(pending.familyFitTags)
          ? pending.familyFitTags
          : [];
        const familyFitNotes =
          typeof pending.familyFitNotes === "string"
            ? pending.familyFitNotes
            : "";
        const fullTimePreferences =
          pending.fullTimePreferences &&
          typeof pending.fullTimePreferences === "object"
            ? {
                willingToTravel:
                  typeof (pending.fullTimePreferences as any)
                    .willingToTravel === "boolean"
                    ? (pending.fullTimePreferences as any).willingToTravel
                    : undefined,
                preferredClientType:
                  (pending.fullTimePreferences as any).preferredClientType ===
                    "personal" ||
                  (pending.fullTimePreferences as any).preferredClientType ===
                    "corporate" ||
                  (pending.fullTimePreferences as any).preferredClientType ===
                    "any"
                    ? (pending.fullTimePreferences as any).preferredClientType
                    : undefined,
              }
            : undefined;

        update.recruitmentProfile = {
          ...(d?.recruitmentProfile && typeof d.recruitmentProfile === "object"
            ? d.recruitmentProfile
            : {}),
          profileSummary,
          experienceYears,
          languages,
          hobbies,
          ...(vehicleExperience ? { vehicleExperience } : {}),
          familyFitTags,
          familyFitNotes,
          ...(fullTimePreferences ? { fullTimePreferences } : {}),
        };
        update.recruitmentProfileUpdatedAt = FieldValue.serverTimestamp();
        update.recruitmentProfileUpdatedBy = admin!.uid;

        update.professionalSummary = profileSummary;
        update.experienceYears = experienceYears;
        update.languages = languages;
        update.hobbies = hobbies;
        if (vehicleExperience) update.vehicleExperience = vehicleExperience;
        update.familyFitTags = familyFitTags;
        update.familyFitNotes = familyFitNotes;
        if (fullTimePreferences)
          update.fullTimePreferences = fullTimePreferences;

        update.recruitmentProfilePending = FieldValue.delete();
        update.recruitmentProfilePendingUpdatedAt =
          FieldValue.serverTimestamp();
      } else {
        update.recruitmentProfilePending = {
          ...(pending as any),
          status: "rejected",
          rejectionReason: reason,
          rejectedAt: FieldValue.serverTimestamp(),
          rejectedBy: admin!.uid,
        };
        update.recruitmentProfilePendingUpdatedAt =
          FieldValue.serverTimestamp();
      }

      tx.update(driverRef, update);
    });

    const adminsSnap = await adminDb
      .collection("users")
      .where("isAdmin", "==", true)
      .limit(200)
      .get();
    const adminUids: string[] = [];
    const adminEmails: string[] = [];

    adminsSnap.docs.forEach((d) => {
      if (d.id === admin!.uid) return;
      adminUids.push(d.id);
      const data = d.data() as any;
      const em = typeof data?.email === "string" ? data.email.trim() : "";
      if (em) adminEmails.push(em);
    });

    const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
    const adminLink = `${baseUrl}/admin/drivers/${encodeURIComponent(driverId)}`;

    await createAuditLog({
      actionType:
        action === "approve"
          ? "driver_recruitment_profile_update_approved"
          : "driver_recruitment_profile_update_rejected",
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: driverId,
      targetType: "driver",
      details:
        action === "approve"
          ? `Approved recruitment profile update for driver ${driverName}`
          : `Rejected recruitment profile update for driver ${driverName}`,
      metadata: action === "reject" ? { reason } : {},
    });

    await adminDb
      .collection("users")
      .doc(driverId)
      .collection("notifications")
      .add({
        type:
          action === "approve"
            ? "recruitment_profile_update_approved"
            : "recruitment_profile_update_rejected",
        title:
          action === "approve"
            ? "Profile update approved"
            : "Profile update rejected",
        description:
          action === "approve"
            ? "Your public profile update has been approved and is now live."
            : reason
              ? `Reason: ${reason}`
              : "Your public profile update was rejected.",
        message:
          action === "approve"
            ? "Your public profile update has been approved and is now live."
            : reason
              ? `Reason: ${reason}`
              : "Your public profile update was rejected.",
        unread: true,
        createdAt: FieldValue.serverTimestamp(),
      });

    const adminNotifTitle =
      action === "approve"
        ? "Recruitment profile update approved"
        : "Recruitment profile update rejected";
    const adminNotifText =
      action === "approve"
        ? `${driverName} profile update was approved.`
        : `${driverName} profile update was rejected.`;

    await Promise.allSettled(
      adminUids.map((adminUid) =>
        adminDb
          .collection("users")
          .doc(adminUid)
          .collection("notifications")
          .add({
            type:
              action === "approve"
                ? "recruitment_profile_update_approved"
                : "recruitment_profile_update_rejected",
            title: adminNotifTitle,
            description:
              action === "reject" && reason
                ? `${adminNotifText} Reason: ${reason}`
                : adminNotifText,
            message:
              action === "reject" && reason
                ? `${adminNotifText} Reason: ${reason}`
                : adminNotifText,
            unread: true,
            createdAt: FieldValue.serverTimestamp(),
            link: `/admin/drivers/${driverId}`,
          }),
      ),
    );

    try {
      const resend = getResendClient();
      const from = getEmailFrom();
      if (resend && from && adminEmails.length > 0) {
        const subject = `${adminNotifTitle}: ${driverName}`;
        const text = [
          adminNotifText,
          action === "reject" && reason ? `Reason: ${reason}` : "",
          "",
          "Review:",
          adminLink,
        ]
          .filter(Boolean)
          .join("\n");
        const html = `
          <p>${adminNotifText}</p>
          ${action === "reject" && reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
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
        "[admin/drivers/recruitment-profile] email notify failed:",
        e,
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating recruitment profile:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Failed to update recruitment profile.";
    const status =
      typeof msg === "string" &&
      (msg.includes("Driver not found") ||
        msg.includes("No pending recruitment profile update"))
        ? 400
        : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}
