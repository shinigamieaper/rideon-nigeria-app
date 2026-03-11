export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog, AuditActionType } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";
import { v2 as cloudinary } from "cloudinary";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

function getRequestBaseUrl(req: NextRequest): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "";
  const base = String(raw).trim();
  if (base) return base.replace(/\/$/, "");
  try {
    const u = new URL(req.url);
    if (u.origin) return u.origin;
  } catch {}
  return "http://localhost:3000";
}

async function acquireEmailLock(lockId: string): Promise<boolean> {
  try {
    await adminDb.collection("email_locks").doc(lockId).create({
      status: "sending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (e: any) {
    const code = String(e?.code ?? "");
    const msg = String(e?.message ?? "").toLowerCase();
    if (
      code === "6" ||
      msg.includes("already exists") ||
      msg.includes("already-exists")
    ) {
      return false;
    }
    throw e;
  }
}

async function markEmailLock(
  lockId: string,
  args: { status: "sent" | "failed"; error?: string },
) {
  try {
    await adminDb
      .collection("email_locks")
      .doc(lockId)
      .set(
        {
          status: args.status,
          error: args.error || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (e) {
    console.warn(
      "[admin/full-time-driver-applications/[id]] Failed to update email lock",
      lockId,
      e,
    );
  }
}

async function resolveApplicantEmail(id: string, app: any): Promise<string> {
  const fromApp = typeof app?.email === "string" ? app.email.trim() : "";
  if (fromApp) return fromApp;

  try {
    const u = await adminAuth.getUser(id);
    const email = (u.email || "").trim();
    if (email) return email;
  } catch {}

  try {
    const snap = await adminDb.collection("users").doc(id).get();
    if (!snap.exists) return "";
    const data = snap.data() as any;
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    return email;
  } catch {
    return "";
  }
}

function normalizeCloudinaryDocUrl(url: any, ownerUid: string): any {
  if (typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed) return url;
  if (trimmed.startsWith("/api/files/")) return trimmed;

  if (
    trimmed.startsWith("https://res.cloudinary.com/") ||
    trimmed.startsWith("http://res.cloudinary.com/")
  ) {
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean);
      const resourceType = ["image", "raw", "video"].includes(parts[1])
        ? parts[1]
        : "raw";
      const uploadIdx = parts.findIndex(
        (p) => p === "upload" || p === "authenticated",
      );
      if (uploadIdx === -1 || uploadIdx + 1 >= parts.length) return url;

      const deliveryType =
        parts[uploadIdx] === "authenticated" ? "authenticated" : "upload";
      const versionAndRest = parts.slice(uploadIdx + 1);
      const versionIdx = versionAndRest.findIndex((p) => /^v\d+$/.test(p));
      const withoutVersion =
        versionIdx >= 0 ? versionAndRest.slice(versionIdx + 1) : versionAndRest;
      const publicIdWithExt = withoutVersion.join("/");
      if (!publicIdWithExt) return url;

      const lastDot = publicIdWithExt.lastIndexOf(".");
      const publicId =
        lastDot > 0 ? publicIdWithExt.slice(0, lastDot) : publicIdWithExt;
      const ext = lastDot > 0 ? publicIdWithExt.slice(lastDot + 1) : "";

      const descriptor = {
        provider: "cloudinary",
        ownerUid,
        publicId,
        resourceType,
        deliveryType,
        ...(ext ? { format: ext } : {}),
      };
      const encoded = Buffer.from(JSON.stringify(descriptor), "utf8").toString(
        "base64",
      );
      return `/api/files/${encodeURIComponent(encoded)}`;
    } catch {
      return url;
    }
  }

  return url;
}

function normalizeDocumentField(val: any, ownerUid: string): any {
  if (typeof val === "string") return normalizeCloudinaryDocUrl(val, ownerUid);
  if (!val || typeof val !== "object") return val;
  if (typeof (val as any).url === "string") {
    return {
      ...(val as any),
      url: normalizeCloudinaryDocUrl((val as any).url, ownerUid),
    };
  }
  return val;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "driver_admin",
    ]);
    if (response) return response;

    const { id } = await context.params;

    const appSnap = await adminDb
      .collection("full_time_driver_applications")
      .doc(id)
      .get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    const d = appSnap.data() as any;

    const kyc = (d?.kyc || {}) as Record<string, unknown>;
    const kycSummary = {
      overallStatus: String(kyc?.overallStatus || "pending"),
      nin: String(
        ((kyc?.nin as Record<string, unknown>) || {})?.status || "pending",
      ),
      bvn: String(
        ((kyc?.bvn as Record<string, unknown>) || {})?.status || "pending",
      ),
      lastRunAt: (kyc?.lastRunAt as any)?.toDate?.()?.toISOString?.() || null,
    };

    const application = {
      id,
      status: String(d?.status || "pending_review"),
      firstName: String(d?.firstName || ""),
      lastName: String(d?.lastName || ""),
      email: String(d?.email || ""),
      phoneNumber: String(d?.phoneNumber || ""),
      nin: String(d?.nin || ""),
      bvn: String(d?.bvn || ""),
      experienceYears: Number(d?.experienceYears || 0),
      profileImageUrl:
        typeof d?.profileImageUrl === "string" ? d.profileImageUrl : null,
      preferredCity: String(d?.preferredCity || ""),
      salaryExpectation: Number(d?.salaryExpectation || 0),
      salaryExpectationMinNgn:
        typeof d?.salaryExpectationMinNgn === "number"
          ? Number(d.salaryExpectationMinNgn)
          : Number(d?.salaryExpectation || 0),
      salaryExpectationMaxNgn:
        typeof d?.salaryExpectationMaxNgn === "number"
          ? Number(d.salaryExpectationMaxNgn)
          : Number(d?.salaryExpectation || 0),
      profileSummary: String(d?.profileSummary || ""),
      vehicleTypesHandled:
        typeof d?.vehicleTypesHandled === "string" ? d.vehicleTypesHandled : "",
      vehicleExperience:
        d?.vehicleExperience && typeof d.vehicleExperience === "object"
          ? {
              categories: Array.isArray((d.vehicleExperience as any).categories)
                ? (d.vehicleExperience as any).categories
                : [],
              notes:
                typeof (d.vehicleExperience as any).notes === "string"
                  ? (d.vehicleExperience as any).notes
                  : "",
            }
          : { categories: [], notes: "" },
      familyFitTags: Array.isArray(d?.familyFitTags) ? d.familyFitTags : [],
      familyFitNotes:
        typeof d?.familyFitNotes === "string" ? d.familyFitNotes : "",
      languages: Array.isArray(d?.languages) ? d.languages : [],
      hobbies: Array.isArray(d?.hobbies) ? d.hobbies : [],
      fullTimePreferences:
        d?.fullTimePreferences && typeof d.fullTimePreferences === "object"
          ? {
              willingToTravel:
                typeof (d.fullTimePreferences as any).willingToTravel ===
                "boolean"
                  ? (d.fullTimePreferences as any).willingToTravel
                  : null,
              preferredClientType:
                typeof (d.fullTimePreferences as any).preferredClientType ===
                "string"
                  ? (d.fullTimePreferences as any).preferredClientType
                  : null,
            }
          : null,
      backgroundConsent: Boolean(d?.backgroundConsent),
      kycConsent: Boolean(d?.kycConsent),
      kycSummary,
      documents:
        d?.documents && typeof d.documents === "object"
          ? Object.fromEntries(
              Object.entries(d.documents as Record<string, any>).map(
                ([k, v]) => [k, normalizeDocumentField(v, id)],
              ),
            )
          : {},
      references: Array.isArray(d?.references) ? d.references : [],
      referencesSummary:
        d?.referencesSummary && typeof d.referencesSummary === "object"
          ? {
              required: Number((d.referencesSummary as any)?.required) || 0,
              completed: Number((d.referencesSummary as any)?.completed) || 0,
            }
          : null,
      createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
      approvedAt: d?.approvedAt?.toDate?.()?.toISOString?.() || null,
      rejectedAt: d?.rejectedAt?.toDate?.()?.toISOString?.() || null,
      rejectionReason: d?.rejectionReason || null,
      needsMoreInfoReason:
        typeof d?.needsMoreInfoReason === "string"
          ? d.needsMoreInfoReason
          : null,
      needsMoreInfoAt: d?.needsMoreInfoAt?.toDate?.()?.toISOString?.() || null,
      needsMoreInfoBy:
        typeof d?.needsMoreInfoBy === "string" ? d.needsMoreInfoBy : null,
    };

    return NextResponse.json({ application }, { status: 200 });
  } catch (error) {
    console.error("Error fetching full-time driver application:", error);
    return NextResponse.json(
      { error: "Failed to fetch full-time driver application." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "driver_admin",
    ]);
    if (response) return response;

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (
      action !== "approve" &&
      action !== "reject" &&
      action !== "needs_more_info"
    ) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if ((action === "reject" || action === "needs_more_info") && !reason) {
      return NextResponse.json(
        {
          error:
            action === "reject"
              ? "Rejection reason is required"
              : "Reason is required",
        },
        { status: 400 },
      );
    }

    const appRef = adminDb.collection("full_time_driver_applications").doc(id);
    const userRef = adminDb.collection("users").doc(id);
    const driverRef = adminDb.collection("drivers").doc(id);

    let currentStatus: string = "pending_review";
    let applicantName = "Applicant";
    let documentUrls: string[] = [];
    let newStatus: "approved" | "rejected" | "needs_more_info" =
      action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : "needs_more_info";
    let actionType: AuditActionType =
      action === "approve"
        ? "full_time_driver_application_approved"
        : action === "reject"
          ? "full_time_driver_application_rejected"
          : "full_time_driver_application_needs_more_info";

    await adminDb.runTransaction(async (tx) => {
      const [appSnap, userSnap, driverSnap] = await Promise.all([
        tx.get(appRef),
        tx.get(userRef),
        tx.get(driverRef),
      ]);

      if (!appSnap.exists) {
        throw new Error("Application not found");
      }

      const current = appSnap.data() as any;
      currentStatus = String(current?.status || "pending_review");
      if (
        currentStatus !== "pending_review" &&
        currentStatus !== "needs_more_info"
      ) {
        throw new Error("Can only take action on pending applications");
      }

      const docs = current?.documents;
      if (docs && typeof docs === "object") {
        const vals = Object.values(docs);
        documentUrls = vals.filter(
          (v: any) => typeof v === "string",
        ) as string[];
      }

      const firstName = String(current?.firstName || "").trim();
      const lastName = String(current?.lastName || "").trim();
      applicantName =
        `${firstName} ${lastName}`.trim().replace(/\s+/g, " ") || "Applicant";

      const updateApp: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
        lastStatusChangeBy: admin!.uid,
        lastStatusChangeAt: FieldValue.serverTimestamp(),
      };

      if (action === "approve") {
        newStatus = "approved";
        updateApp.status = "approved";
        updateApp.approvedAt = FieldValue.serverTimestamp();
        updateApp.approvedBy = admin!.uid;
        updateApp.needsMoreInfoReason = FieldValue.delete();
        updateApp.needsMoreInfoAt = FieldValue.delete();
        updateApp.needsMoreInfoBy = FieldValue.delete();
        actionType = "full_time_driver_application_approved";

        const email = String(current?.email || "").trim();
        const phoneNumber = String(current?.phoneNumber || "").trim();
        const profileImageUrl =
          typeof current?.profileImageUrl === "string"
            ? current.profileImageUrl
            : null;
        const preferredCity = String(current?.preferredCity || "").trim();
        const experienceYears = Number(current?.experienceYears || 0);
        const salaryExpectation = Number(current?.salaryExpectation || 0);
        const salaryExpectationMinNgnRaw =
          typeof current?.salaryExpectationMinNgn === "number"
            ? Number(current.salaryExpectationMinNgn)
            : salaryExpectation;
        const salaryExpectationMaxNgnRaw =
          typeof current?.salaryExpectationMaxNgn === "number"
            ? Number(current.salaryExpectationMaxNgn)
            : salaryExpectation;

        const salaryExpectationMinNgn =
          Number.isFinite(salaryExpectationMinNgnRaw) &&
          salaryExpectationMinNgnRaw > 0
            ? Math.round(salaryExpectationMinNgnRaw)
            : 0;
        const salaryExpectationMaxNgn =
          Number.isFinite(salaryExpectationMaxNgnRaw) &&
          salaryExpectationMaxNgnRaw > 0
            ? Math.round(salaryExpectationMaxNgnRaw)
            : 0;

        const profileSummary =
          typeof current?.profileSummary === "string"
            ? current.profileSummary.trim()
            : "";
        const vehicleExperience =
          current?.vehicleExperience &&
          typeof current.vehicleExperience === "object"
            ? {
                categories: Array.isArray(
                  (current.vehicleExperience as any).categories,
                )
                  ? (current.vehicleExperience as any).categories
                  : [],
                notes:
                  typeof (current.vehicleExperience as any).notes === "string"
                    ? (current.vehicleExperience as any).notes
                    : "",
              }
            : undefined;
        const familyFitTags = Array.isArray(current?.familyFitTags)
          ? current.familyFitTags
          : [];
        const familyFitNotes =
          typeof current?.familyFitNotes === "string"
            ? current.familyFitNotes
            : "";
        const languages = Array.isArray(current?.languages)
          ? current.languages
          : [];
        const hobbies = Array.isArray(current?.hobbies) ? current.hobbies : [];
        const fullTimePreferences =
          current?.fullTimePreferences &&
          typeof current.fullTimePreferences === "object"
            ? {
                willingToTravel:
                  typeof (current.fullTimePreferences as any)
                    .willingToTravel === "boolean"
                    ? (current.fullTimePreferences as any).willingToTravel
                    : undefined,
                preferredClientType:
                  (current.fullTimePreferences as any).preferredClientType ===
                    "personal" ||
                  (current.fullTimePreferences as any).preferredClientType ===
                    "corporate" ||
                  (current.fullTimePreferences as any).preferredClientType ===
                    "any"
                    ? (current.fullTimePreferences as any).preferredClientType
                    : undefined,
              }
            : undefined;

        const baseUser: Record<string, any> = {
          _id: id,
          role: "driver",
          driverTrack: "placement",
          firstName,
          lastName,
          email,
          phoneNumber,
          profileImageUrl,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (userSnap.exists) {
          tx.set(userRef, baseUser, { merge: true });
        } else {
          tx.set(
            userRef,
            { ...baseUser, createdAt: FieldValue.serverTimestamp() },
            { merge: false },
          );
        }

        const recruitmentProfile: Record<string, any> = {
          preferredCity,
          experienceYears,
          salaryExpectation,
          ...(salaryExpectationMinNgn > 0 ? { salaryExpectationMinNgn } : {}),
          ...(salaryExpectationMaxNgn > 0 ? { salaryExpectationMaxNgn } : {}),
          profileSummary,
          ...(vehicleExperience ? { vehicleExperience } : {}),
          familyFitTags,
          familyFitNotes,
          languages,
          hobbies,
          ...(fullTimePreferences ? { fullTimePreferences } : {}),
        };

        const nowDriverBase: Record<string, any> = {
          userId: id,
          status: "approved",
          approvedAt: FieldValue.serverTimestamp(),
          approvedBy: admin!.uid,
          placementStatus: "available",
          recruitmentPool: true,
          recruitmentVisible: true,
          recruitmentProfile,
          professionalSummary: profileSummary,
          experienceYears,
          salaryExpectation,
          ...(salaryExpectationMinNgn > 0 ? { salaryExpectationMinNgn } : {}),
          ...(salaryExpectationMaxNgn > 0 ? { salaryExpectationMaxNgn } : {}),
          updatedAt: FieldValue.serverTimestamp(),
          recruitmentProfileUpdatedAt: FieldValue.serverTimestamp(),
          recruitmentProfileUpdatedBy: admin!.uid,
        };

        if (driverSnap.exists) {
          tx.set(driverRef, nowDriverBase, { merge: true });
        } else {
          tx.set(
            driverRef,
            {
              ...nowDriverBase,
              createdAt: FieldValue.serverTimestamp(),
            },
            { merge: false },
          );
        }
      } else {
        if (action === "reject") {
          newStatus = "rejected";
          updateApp.status = "rejected";
          updateApp.rejectedAt = FieldValue.serverTimestamp();
          updateApp.rejectedBy = admin!.uid;
          updateApp.rejectionReason = reason;
          updateApp.needsMoreInfoReason = FieldValue.delete();
          updateApp.needsMoreInfoAt = FieldValue.delete();
          updateApp.needsMoreInfoBy = FieldValue.delete();
          actionType = "full_time_driver_application_rejected";
        } else {
          newStatus = "needs_more_info";
          updateApp.status = "needs_more_info";
          updateApp.needsMoreInfoReason = reason;
          updateApp.needsMoreInfoAt = FieldValue.serverTimestamp();
          updateApp.needsMoreInfoBy = admin!.uid;
          updateApp.rejectionReason = FieldValue.delete();
          updateApp.rejectedAt = FieldValue.delete();
          updateApp.rejectedBy = FieldValue.delete();
          actionType = "full_time_driver_application_needs_more_info";
        }
      }

      tx.update(appRef, updateApp);
    });

    await createAuditLog({
      actionType,
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: id,
      targetType: "full_time_driver_application",
      details: `${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Requested more info for"} full-time driver application for ${applicantName}`,
      metadata: {
        previousStatus: currentStatus,
        newStatus,
        ...(action === "reject" || action === "needs_more_info"
          ? { reason }
          : {}),
      },
    });

    try {
      await adminDb
        .collection("users")
        .doc(id)
        .collection("notifications")
        .add({
          type:
            action === "approve"
              ? "full_time_driver_application_approved"
              : action === "reject"
                ? "full_time_driver_application_rejected"
                : "full_time_driver_application_needs_more_info",
          title:
            action === "approve"
              ? "Application approved"
              : action === "reject"
                ? "Application rejected"
                : "Action required: update your application",
          description:
            action === "approve"
              ? "Congratulations — your full-time driver application has been approved."
              : action === "reject"
                ? `Your full-time driver application was rejected.${reason ? ` Reason: ${reason}` : ""}`
                : `We need more information to continue reviewing your application.${reason ? ` Reason: ${reason}` : ""}`,
          message:
            action === "approve"
              ? "Congratulations — your full-time driver application has been approved."
              : action === "reject"
                ? `Your full-time driver application was rejected.${reason ? ` Reason: ${reason}` : ""}`
                : `We need more information to continue reviewing your application.${reason ? ` Reason: ${reason}` : ""}`,
          unread: true,
          createdAt: FieldValue.serverTimestamp(),
          link:
            action === "needs_more_info"
              ? "/full-time-driver/application/apply"
              : "/full-time-driver/application/status",
        });
    } catch (e) {
      console.error(
        "[admin/full-time-driver-applications/[id]] Failed to write user notification:",
        e,
      );
    }

    if (action === "approve") {
      try {
        const recordForClaims = await adminAuth.getUser(id);
        const existingClaims = recordForClaims.customClaims || {};
        await adminAuth.setCustomUserClaims(id, {
          ...existingClaims,
          role: "driver",
        });
      } catch (e) {
        console.error(
          "[admin/full-time-driver-applications/[id]] Failed to set custom claims for approved driver:",
          e,
        );
      }
    }

    if (
      action === "reject" &&
      process.env.CLOUDINARY_CLEANUP_ON_REJECT === "true"
    ) {
      try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const cloudKey = process.env.CLOUDINARY_API_KEY;
        const cloudSecret = process.env.CLOUDINARY_API_SECRET;
        if (cloudName && cloudKey && cloudSecret) {
          cloudinary.config({
            cloud_name: cloudName,
            api_key: cloudKey,
            api_secret: cloudSecret,
            secure: true,
            timeout: Number(process.env.CLOUDINARY_TIMEOUT_MS || 180000),
          });

          const toDescriptor = (url: string): any | null => {
            const prefix = "/api/files/";
            if (!url.startsWith(prefix)) return null;
            const encoded = url.slice(prefix.length);
            const idPart = decodeURIComponent(encoded);
            const decoded = Buffer.from(idPart, "base64").toString("utf8");
            const obj = JSON.parse(decoded);
            if (!obj || typeof obj !== "object") return null;
            if (obj.provider !== "cloudinary") return null;
            return obj;
          };

          const descriptors = documentUrls
            .map((u) => {
              try {
                return toDescriptor(u);
              } catch {
                return null;
              }
            })
            .filter(Boolean) as any[];

          await Promise.allSettled(
            descriptors.map((d) =>
              cloudinary.uploader.destroy(String(d.publicId), {
                resource_type: String(d.resourceType || "raw") as any,
                type: String(d.deliveryType || "authenticated") as any,
                invalidate: true,
              }),
            ),
          );
        }
      } catch (e) {
        console.error(
          "[admin/full-time-driver-applications/[id]] Cloudinary cleanup failed:",
          e,
        );
      }
    }

    try {
      const resend = getResendClient();
      const from = getEmailFrom();
      if (resend && from) {
        const appAfterSnap = await appRef.get();
        const appAfter = appAfterSnap.exists
          ? (appAfterSnap.data() as any)
          : null;
        const to = await resolveApplicantEmail(id, appAfter);
        if (to) {
          const baseUrl = getRequestBaseUrl(req).replace(/\/$/, "");
          const nextPath =
            action === "approve"
              ? "/driver/placement"
              : action === "needs_more_info"
                ? "/full-time-driver/application/apply"
                : "/full-time-driver/application/status";
          const link = `${baseUrl}/login?next=${encodeURIComponent(nextPath)}`;

          const eventAt =
            action === "approve"
              ? appAfter?.approvedAt
              : action === "reject"
                ? appAfter?.rejectedAt
                : appAfter?.needsMoreInfoAt;
          const eventKey =
            eventAt?.toDate?.()?.toISOString?.() ||
            appAfter?.updatedAt?.toDate?.()?.toISOString?.() ||
            new Date().toISOString();
          const lockId = `driver:${id}:full_time_application:${action}:${eventKey}`;
          const gotLock = await acquireEmailLock(lockId);
          if (gotLock) {
            const subject =
              action === "approve"
                ? "RideOn: Your full-time driver application is approved"
                : action === "reject"
                  ? "RideOn: Update needed for your full-time driver application"
                  : "RideOn: Action required for your full-time driver application";

            const reasonLine =
              (action === "reject" || action === "needs_more_info") && reason
                ? `Reason: ${reason}`
                : "";

            const headline =
              action === "approve"
                ? `Hi ${applicantName}, your full-time driver application has been approved.`
                : action === "reject"
                  ? `Hi ${applicantName}, your full-time driver application needs an update before it can be approved.`
                  : `Hi ${applicantName}, we need more information to continue reviewing your application.`;

            const nextLine =
              action === "approve"
                ? "You can now sign in and continue in the driver portal."
                : "Please sign in, update the requested details, and submit again.";

            const text = [headline, reasonLine, "", nextLine, "", "Open:", link]
              .filter(Boolean)
              .join("\n");

            const html = `
              <p><strong>${headline}</strong></p>
              ${reasonLine ? `<p>${reasonLine}</p>` : ""}
              <p>${nextLine}</p>
              <p><a href="${link}">Open RideOn</a></p>
            `;

            try {
              await resend.emails.send({ from, to, subject, text, html });
              await markEmailLock(lockId, { status: "sent" });
            } catch (e: any) {
              await markEmailLock(lockId, {
                status: "failed",
                error: e instanceof Error ? e.message : String(e),
              });
              console.error(
                "[admin/full-time-driver-applications/[id]] Failed sending applicant email",
                e,
              );
            }
          }
        }
      }
    } catch (e) {
      console.error(
        "[admin/full-time-driver-applications/[id]] Failed preparing applicant email",
        e,
      );
    }

    return NextResponse.json(
      { success: true, status: newStatus },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error updating full-time driver application:", error);
    if (message === "Application not found") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    if (message === "Can only take action on pending applications") {
      return NextResponse.json(
        { error: "Can only take action on pending applications" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update full-time driver application." },
      { status: 500 },
    );
  }
}
