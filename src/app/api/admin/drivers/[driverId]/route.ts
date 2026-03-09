export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog, AuditActionType } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

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

// GET /api/admin/drivers/[driverId] - Get single driver details
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ driverId: string }> },
) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
      "driver_admin",
    ]);
    if (response) return response;

    const { driverId } = await context.params;

    const driverDoc = await adminDb.collection("drivers").doc(driverId).get();
    if (!driverDoc.exists) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const d = driverDoc.data()!;

    // Get user info
    let firstName = "";
    let lastName = "";
    let email = "";
    let phoneNumber = "";
    let profileImageUrl = "";

    let bankAccount: {
      accountNumber: string;
      accountName: string;
      bankName: string;
      bankCode: string;
    } | null = null;

    try {
      const userDoc = await adminDb.collection("users").doc(driverId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        firstName = userData?.firstName || "";
        lastName = userData?.lastName || "";
        email = userData?.email || "";
        phoneNumber = userData?.phoneNumber || "";
        profileImageUrl = userData?.profileImageUrl || "";
      }
    } catch {}

    try {
      const bankDoc = await adminDb
        .collection("driver_bank_accounts")
        .doc(driverId)
        .get();
      if (bankDoc.exists) {
        const b = bankDoc.data() as any;
        bankAccount = {
          accountNumber:
            typeof b?.accountNumber === "string" ? b.accountNumber : "",
          accountName: typeof b?.accountName === "string" ? b.accountName : "",
          bankName: typeof b?.bankName === "string" ? b.bankName : "",
          bankCode: typeof b?.bankCode === "string" ? b.bankCode : "",
        };
      }
    } catch {}

    // Calculate earnings from bookings
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let completedTrips = 0;
    let cancelledTrips = 0;
    let acceptanceRate = 100;

    try {
      const bookingsSnap = await adminDb
        .collection("bookings")
        .where("driverId", "==", driverId)
        .get();

      let totalOffered = 0;
      let totalAccepted = 0;

      bookingsSnap.forEach((doc) => {
        const data = doc.data();
        const driverPayout = data.driverPayoutNgn || data.driverPayout || 0;

        if (data.status === "completed") {
          completedTrips++;
          totalEarnings += driverPayout;
          if (!data.driverPaid) {
            pendingEarnings += driverPayout;
          }
          totalAccepted++;
        } else if (data.status === "cancelled_by_driver") {
          cancelledTrips++;
        }

        totalOffered++;
      });

      if (totalOffered > 0) {
        acceptanceRate = Math.round((totalAccepted / totalOffered) * 100);
      }
    } catch (err) {
      console.warn("Failed to calculate earnings:", err);
    }

    const driver = {
      id: driverId,
      firstName,
      lastName,
      email,
      phoneNumber,
      profileImageUrl,
      status: d.status || "pending_review",
      onlineStatus: d.onlineStatus || false,
      experienceYears: d.experienceYears || 0,
      bankAccount,
      references: Array.isArray((d as any).references)
        ? (d as any).references
            .map((r: any) => ({
              name: typeof r?.name === "string" ? r.name : "",
              email: typeof r?.email === "string" ? r.email : "",
              phone: typeof r?.phone === "string" ? r.phone : "",
              relationship:
                typeof r?.relationship === "string" ? r.relationship : "",
            }))
            .filter((r: any) =>
              [r.name, r.email, r.phone, r.relationship].some(
                (v: any) => typeof v === "string" && v.trim().length > 0,
              ),
            )
        : [],
      documents:
        d.documents && typeof d.documents === "object"
          ? Object.fromEntries(
              Object.entries(d.documents as Record<string, any>).map(
                ([k, v]) => [k, normalizeDocumentField(v, driverId)],
              ),
            )
          : {},
      servedCities: Array.isArray(d.servedCities) ? d.servedCities : [],
      placementStatus: d.placementStatus || "available",
      recruitmentPool: d.recruitmentPool === true,
      recruitmentVisible: d.recruitmentVisible === true,
      rideOnVerified: d.rideOnVerified || false,
      professionalSummary: d.professionalSummary || "",
      recruitmentProfilePending:
        d?.recruitmentProfilePending &&
        typeof d.recruitmentProfilePending === "object"
          ? {
              status:
                typeof (d.recruitmentProfilePending as any).status === "string"
                  ? (d.recruitmentProfilePending as any).status
                  : "pending",
              rejectionReason:
                typeof (d.recruitmentProfilePending as any).rejectionReason ===
                "string"
                  ? (d.recruitmentProfilePending as any).rejectionReason
                  : null,
              submittedAt:
                (d.recruitmentProfilePending as any).submittedAt
                  ?.toDate?.()
                  ?.toISOString?.() || null,
              rejectedAt:
                (d.recruitmentProfilePending as any).rejectedAt
                  ?.toDate?.()
                  ?.toISOString?.() || null,
              professionalSummary:
                typeof (d.recruitmentProfilePending as any)
                  .professionalSummary === "string"
                  ? (d.recruitmentProfilePending as any).professionalSummary
                  : "",
              experienceYears:
                typeof (d.recruitmentProfilePending as any).experienceYears ===
                "number"
                  ? (d.recruitmentProfilePending as any).experienceYears
                  : 0,
              languages: Array.isArray(
                (d.recruitmentProfilePending as any).languages,
              )
                ? (d.recruitmentProfilePending as any).languages
                : [],
              hobbies: Array.isArray(
                (d.recruitmentProfilePending as any).hobbies,
              )
                ? (d.recruitmentProfilePending as any).hobbies
                : [],
              vehicleExperience:
                (d.recruitmentProfilePending as any).vehicleExperience &&
                typeof (d.recruitmentProfilePending as any)
                  .vehicleExperience === "object"
                  ? {
                      categories: Array.isArray(
                        (
                          (d.recruitmentProfilePending as any)
                            .vehicleExperience as any
                        ).categories,
                      )
                        ? (
                            (d.recruitmentProfilePending as any)
                              .vehicleExperience as any
                          ).categories
                        : [],
                      notes:
                        typeof (
                          (d.recruitmentProfilePending as any)
                            .vehicleExperience as any
                        ).notes === "string"
                          ? (
                              (d.recruitmentProfilePending as any)
                                .vehicleExperience as any
                            ).notes
                          : "",
                    }
                  : { categories: [], notes: "" },
              familyFitTags: Array.isArray(
                (d.recruitmentProfilePending as any).familyFitTags,
              )
                ? (d.recruitmentProfilePending as any).familyFitTags
                : [],
              familyFitNotes:
                typeof (d.recruitmentProfilePending as any).familyFitNotes ===
                "string"
                  ? (d.recruitmentProfilePending as any).familyFitNotes
                  : "",
              fullTimePreferences:
                (d.recruitmentProfilePending as any).fullTimePreferences &&
                typeof (d.recruitmentProfilePending as any)
                  .fullTimePreferences === "object"
                  ? {
                      willingToTravel:
                        typeof (
                          (d.recruitmentProfilePending as any)
                            .fullTimePreferences as any
                        ).willingToTravel === "boolean"
                          ? (
                              (d.recruitmentProfilePending as any)
                                .fullTimePreferences as any
                            ).willingToTravel
                          : null,
                      preferredClientType:
                        typeof (
                          (d.recruitmentProfilePending as any)
                            .fullTimePreferences as any
                        ).preferredClientType === "string"
                          ? (
                              (d.recruitmentProfilePending as any)
                                .fullTimePreferences as any
                            ).preferredClientType
                          : null,
                    }
                  : null,
            }
          : null,
      createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
      approvedAt: d.approvedAt?.toDate?.()?.toISOString() || null,
      suspendedAt: d.suspendedAt?.toDate?.()?.toISOString() || null,
      suspensionReason: d.suspensionReason || null,
      rating: d.rating || null,
      totalTrips: d.totalTrips || completedTrips,
      // Earnings data
      totalEarnings,
      pendingEarnings,
      completedTrips,
      cancelledTrips,
      acceptanceRate,
    };

    return NextResponse.json({ driver }, { status: 200 });
  } catch (error) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver." },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/drivers/[driverId] - Update driver status
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
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const recruitmentVisible =
      typeof body?.recruitmentVisible === "boolean"
        ? body.recruitmentVisible
        : null;

    const driverRef = adminDb.collection("drivers").doc(driverId);
    const driverDoc = await driverRef.get();

    if (!driverDoc.exists) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const currentData = driverDoc.data() as any;
    const currentStatus = currentData?.status;
    let newStatus: string;
    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
      lastStatusChangeBy: admin!.uid,
      lastStatusChangeAt: FieldValue.serverTimestamp(),
    };

    switch (action) {
      case "approve":
        if (currentStatus !== "pending_review") {
          return NextResponse.json(
            { error: "Can only approve pending drivers" },
            { status: 400 },
          );
        }
        newStatus = "approved";
        updateData.status = "approved";
        updateData.approvedAt = FieldValue.serverTimestamp();
        updateData.approvedBy = admin!.uid;
        break;

      case "set_recruitment_visibility":
        if (recruitmentVisible === null) {
          return NextResponse.json(
            { error: "recruitmentVisible must be a boolean" },
            { status: 400 },
          );
        }
        if (currentData?.recruitmentPool !== true) {
          return NextResponse.json(
            { error: "Driver is not in the recruitment pool" },
            { status: 400 },
          );
        }
        updateData.recruitmentVisible = recruitmentVisible;
        updateData.recruitmentVisibilityUpdatedAt =
          FieldValue.serverTimestamp();
        updateData.recruitmentVisibilityUpdatedBy = admin!.uid;
        if (reason) {
          updateData.recruitmentVisibilityReason = reason;
        }
        // preserve current status
        newStatus = String(currentStatus || "pending_review");
        break;

      case "suspend":
        if (currentStatus !== "approved") {
          return NextResponse.json(
            { error: "Can only suspend approved drivers" },
            { status: 400 },
          );
        }
        newStatus = "suspended";
        updateData.status = "suspended";
        updateData.suspendedAt = FieldValue.serverTimestamp();
        updateData.suspendedBy = admin!.uid;
        updateData.suspensionReason = reason || "No reason provided";
        updateData.onlineStatus = false; // Force offline
        break;

      case "reinstate":
        if (currentStatus !== "suspended") {
          return NextResponse.json(
            { error: "Can only reinstate suspended drivers" },
            { status: 400 },
          );
        }
        newStatus = "approved";
        updateData.status = "approved";
        updateData.reinstatedAt = FieldValue.serverTimestamp();
        updateData.reinstatedBy = admin!.uid;
        break;

      case "reject":
        if (currentStatus !== "pending_review") {
          return NextResponse.json(
            { error: "Can only reject pending drivers" },
            { status: 400 },
          );
        }
        newStatus = "rejected";
        updateData.status = "rejected";
        updateData.rejectedAt = FieldValue.serverTimestamp();
        updateData.rejectedBy = admin!.uid;
        updateData.rejectionReason = reason || "Application rejected";
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await driverRef.update(updateData);

    // Get driver name for audit log
    let driverName = "Driver";
    try {
      const userDoc = await adminDb.collection("users").doc(driverId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        driverName =
          `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
          "Driver";
      }
    } catch {}

    // Create audit log entry
    const actionTypeMap: Record<string, AuditActionType> = {
      approve: "driver_approved",
      suspend: "driver_suspended",
      reinstate: "driver_reinstated",
      reject: "driver_rejected",
      set_recruitment_visibility: "driver_recruitment_visibility_updated",
    };

    const auditDetails =
      action === "set_recruitment_visibility"
        ? `${recruitmentVisible === true ? "Listed" : "Unlisted"} recruitment profile for driver ${driverName}`
        : `${action === "approve" ? "Approved" : action === "suspend" ? "Suspended" : action === "reinstate" ? "Reinstated" : "Rejected"} driver ${driverName}`;

    await createAuditLog({
      actionType: actionTypeMap[action],
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: driverId,
      targetType: "driver",
      details: auditDetails,
      metadata:
        action === "set_recruitment_visibility"
          ? { recruitmentVisible, ...(reason ? { reason } : {}) }
          : reason
            ? { reason }
            : undefined,
    });

    // Create notification for driver
    const shouldSendStatusChangeNotification =
      action !== "set_recruitment_visibility";
    try {
      if (action === "set_recruitment_visibility") {
        await adminDb
          .collection("users")
          .doc(driverId)
          .collection("notifications")
          .add({
            type: "driver_recruitment_visibility",
            title: "Recruitment Profile Updated",
            message:
              recruitmentVisible === true
                ? "Your recruitment profile is now visible to clients."
                : "Your recruitment profile has been hidden from clients.",
            unread: true,
            createdAt: FieldValue.serverTimestamp(),
          });
      }

      if (shouldSendStatusChangeNotification) {
        await adminDb
          .collection("users")
          .doc(driverId)
          .collection("notifications")
          .add({
            type: "driver_status_change",
            title:
              action === "approve"
                ? "Application Approved!"
                : action === "suspend"
                  ? "Account Suspended"
                  : action === "reinstate"
                    ? "Account Reinstated"
                    : "Application Update",
            message:
              action === "approve"
                ? "Congratulations! Your driver application has been approved. You can now start accepting trips."
                : action === "suspend"
                  ? `Your account has been suspended. ${reason || ""}`
                  : action === "reinstate"
                    ? "Your account has been reinstated. You can now go online and accept trips."
                    : `Your application status has been updated to: ${newStatus}`,
            unread: true,
            createdAt: FieldValue.serverTimestamp(),
          });
      }
    } catch (err) {
      console.warn("Failed to create notification:", err);
    }

    return NextResponse.json(
      {
        success: true,
        driver: {
          id: driverId,
          status: newStatus,
          ...(action === "set_recruitment_visibility"
            ? { recruitmentVisible }
            : {}),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating driver:", error);
    return NextResponse.json(
      { error: "Failed to update driver." },
      { status: 500 },
    );
  }
}
