export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { PartnerVehicleSubmissionSchema } from "@/lib/validation/partnerVehicleSubmission";
import { computeCustomerUnitRateNgn } from "@/lib/pricing";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";
import { sendPartnerSubmissionUpdateNotification } from "@/lib/fcmAdmin";
import { sendPartnerSubmissionUpdateEmail } from "@/lib/bookingEmails";

async function verifyAdmin(req: NextRequest) {
  return requireAdmin(req, ["super_admin", "admin", "product_admin"]);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = String(
      searchParams.get("status") || "pending_review",
    ).trim();

    let query: FirebaseFirestore.Query = adminDb.collection(
      "partner_vehicle_submissions",
    );
    if (status) {
      query = query.where("status", "==", status);
    }

    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await query.orderBy("createdAt", "desc").limit(200).get();
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "";

      const needsIndex =
        code === 9 || message.toLowerCase().includes("requires an index");
      if (!needsIndex) throw error;

      snap = await query.limit(500).get();
    }

    let submissions = snap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      const createdAt = (d as { createdAt?: { toDate?: () => Date } })
        .createdAt;
      const updatedAt = (d as { updatedAt?: { toDate?: () => Date } })
        .updatedAt;
      return {
        id: doc.id,
        ...d,
        createdAt: createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    submissions = submissions
      .sort((a, b) => {
        const taRaw =
          typeof a.createdAt === "string" ? Date.parse(a.createdAt) : 0;
        const tbRaw =
          typeof b.createdAt === "string" ? Date.parse(b.createdAt) : 0;
        const ta = Number.isFinite(taRaw) ? taRaw : 0;
        const tb = Number.isFinite(tbRaw) ? tbRaw : 0;
        return tb - ta;
      })
      .slice(0, 200);

    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching vehicle submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle submissions." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if (auth.response) return auth.response;
    const caller = auth.caller!;

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    if (
      action !== "approve" &&
      action !== "reject" &&
      action !== "request_changes"
    ) {
      return NextResponse.json(
        { error: "Invalid action. Use approve|reject|request_changes." },
        { status: 400 },
      );
    }

    if ((action === "reject" || action === "request_changes") && !reason) {
      return NextResponse.json(
        { error: "Reason is required." },
        { status: 400 },
      );
    }

    const submissionRef = adminDb
      .collection("partner_vehicle_submissions")
      .doc(id);
    const now = FieldValue.serverTimestamp();

    let partnerId: string | null = null;
    let vehicleLabel = "";

    let createdVehicleId: string | null = null;

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(submissionRef);
      if (!snap.exists) {
        throw new Error("Submission not found");
      }

      const data = snap.data() as Record<string, unknown>;
      partnerId = String((data as any)?.partnerId || "").trim() || null;
      const make = String((data as any)?.make || "").trim();
      const model = String((data as any)?.model || "").trim();
      vehicleLabel = `${make} ${model}`.trim();
      const status = String(data?.status || "pending_review");
      if (status !== "pending_review") {
        throw new Error("Submission is not pending review");
      }

      const parsed = PartnerVehicleSubmissionSchema.safeParse({
        partnerId: data?.partnerId,
        city: data?.city,
        category: data?.category,
        make: data?.make,
        model: data?.model,
        seats: data?.seats,
        images: data?.images,
        documents: data?.documents,
        description: data?.description,
        specs: data?.specs,
        partnerBaseDayRateNgn: data?.partnerBaseDayRateNgn,
        partnerBaseBlock4hRateNgn: data?.partnerBaseBlock4hRateNgn,
        status: data?.status,
      });

      if (!parsed.success) {
        throw new Error("Submission failed validation");
      }

      if (action === "request_changes") {
        tx.set(
          submissionRef,
          {
            status: "changes_requested",
            changesRequestedAt: now,
            changesRequestedBy: caller.uid,
            changesRequestedMessage: reason || "",
            updatedAt: now,
          },
          { merge: true },
        );
        return;
      }

      if (action === "reject") {
        tx.set(
          submissionRef,
          {
            status: "rejected",
            rejectedAt: now,
            rejectedBy: caller.uid,
            rejectedReason: reason || "",
            updatedAt: now,
          },
          { merge: true },
        );
        return;
      }

      const s = parsed.data;

      const docs = Array.isArray(s.documents) ? s.documents : [];
      const insured = docs.some(
        (x) => x.type === "insurance" && typeof x.url === "string" && x.url,
      );

      const markupFixedNgn = 0;

      const customerDayRateNgn = computeCustomerUnitRateNgn({
        baseRateNgn: Math.round(s.partnerBaseDayRateNgn),
        markupFixedNgn,
      });

      const baseBlock4h =
        typeof s.partnerBaseBlock4hRateNgn === "number" &&
        s.partnerBaseBlock4hRateNgn > 0
          ? Math.round(s.partnerBaseBlock4hRateNgn)
          : Math.round(s.partnerBaseDayRateNgn * 0.5);

      const customerBlock4hRateNgn = computeCustomerUnitRateNgn({
        baseRateNgn: baseBlock4h,
        markupFixedNgn,
      });

      const vehicleRef = adminDb.collection("vehicles").doc();
      createdVehicleId = vehicleRef.id;

      tx.set(vehicleRef, {
        partnerId: s.partnerId,
        city: s.city,
        category: s.category,
        make: s.make,
        model: s.model,
        seats: s.seats,
        images: Array.isArray(s.images) ? s.images : [],
        documents: docs,
        insured,
        description: s.description || "",
        specs: s.specs || {},

        partnerBaseDayRateNgn: Math.round(s.partnerBaseDayRateNgn),
        partnerBaseBlock4hRateNgn:
          typeof s.partnerBaseBlock4hRateNgn === "number" &&
          s.partnerBaseBlock4hRateNgn > 0
            ? Math.round(s.partnerBaseBlock4hRateNgn)
            : null,

        adminMarkupFixedNgn: markupFixedNgn,

        dayRateNgn: customerDayRateNgn,
        block4hRateNgn: customerBlock4hRateNgn,

        status: "unavailable",
        createdAt: now,
        updatedAt: now,
        createdBy: caller.uid,

        sourceSubmissionId: id,
      });

      tx.set(
        submissionRef,
        {
          status: "approved",
          approvedAt: now,
          approvedBy: caller.uid,
          vehicleId: createdVehicleId,
          updatedAt: now,
        },
        { merge: true },
      );
    });

    if (action === "approve" && createdVehicleId) {
      await createAuditLog({
        actionType: "partner_vehicle_submission_approved",
        actorId: caller.uid,
        actorEmail: caller.email || "admin",
        targetId: id,
        targetType: "partner_vehicle_submission",
        details:
          "Approved partner vehicle submission and created catalog vehicle.",
        metadata: { vehicleId: createdVehicleId },
      });
    }

    if (action === "reject") {
      await createAuditLog({
        actionType: "partner_vehicle_submission_rejected",
        actorId: caller.uid,
        actorEmail: caller.email || "admin",
        targetId: id,
        targetType: "partner_vehicle_submission",
        details: "Rejected partner vehicle submission.",
        metadata: { reason: reason || "" },
      });
    }

    if (action === "request_changes") {
      await createAuditLog({
        actionType: "partner_vehicle_submission_changes_requested",
        actorId: caller.uid,
        actorEmail: caller.email || "admin",
        targetId: id,
        targetType: "partner_vehicle_submission",
        details: "Requested changes on partner vehicle submission.",
        metadata: { message: reason || "" },
      });
    }

    if (partnerId) {
      try {
        const actionKey =
          action === "approve"
            ? "approved"
            : action === "reject"
              ? "rejected"
              : "changes_requested";
        const title =
          action === "approve"
            ? "Vehicle submission approved"
            : action === "reject"
              ? "Vehicle submission rejected"
              : "Changes requested on vehicle submission";

        const baseMsg = vehicleLabel
          ? `Your vehicle submission (${vehicleLabel})`
          : "Your vehicle submission";

        const message =
          action === "approve"
            ? `${baseMsg} has been approved.`
            : action === "reject"
              ? `${baseMsg} was rejected.${reason ? ` Reason: ${reason}` : ""}`
              : `${baseMsg} needs changes.${reason ? ` Message: ${reason}` : ""}`;

        const clickAction = `/partner/vehicles/submissions/${encodeURIComponent(id)}`;

        await Promise.allSettled([
          sendPartnerSubmissionUpdateNotification(partnerId, {
            submissionType: "vehicle",
            submissionId: id,
            action: actionKey,
            title,
            message,
            clickAction,
          }),
          sendPartnerSubmissionUpdateEmail({
            partnerId,
            submissionType: "vehicle",
            submissionId: id,
            action: actionKey,
            title,
            message,
          }),
        ]);
      } catch (e) {
        console.error(
          "[admin/vehicle-submissions] Failed notifying partner:",
          e,
        );
      }
    }

    return NextResponse.json(
      { success: true, vehicleId: createdVehicleId },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating vehicle submission:", error);
    const message = error instanceof Error ? error.message : null;
    if (typeof message === "string" && message) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update vehicle submission." },
      { status: 500 },
    );
  }
}
