export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { PartnerDriverSubmissionSchema } from "@/lib/validation/partnerDriverSubmission";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

async function verifyAdmin(req: NextRequest) {
  return requireAdmin(req, [
    "super_admin",
    "admin",
    "ops_admin",
    "driver_admin",
  ]);
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
      "partner_driver_submissions",
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
      const d = doc.data() as any;
      return {
        id: doc.id,
        ...d,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
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
    console.error("Error fetching partner driver submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner driver submissions." },
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
      .collection("partner_driver_submissions")
      .doc(id);
    const now = FieldValue.serverTimestamp();

    let createdPartnerDriverId: string | null = null;

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(submissionRef);
      if (!snap.exists) {
        throw new Error("Submission not found");
      }

      const data = snap.data() as any;
      const status = String(data?.status || "pending_review");
      if (status !== "pending_review") {
        throw new Error("Submission is not pending review");
      }

      const parsed = PartnerDriverSubmissionSchema.safeParse({
        partnerId: data?.partnerId,
        firstName: data?.firstName,
        lastName: data?.lastName,
        phone: data?.phone,
        email: data?.email,
        city: data?.city,
        documents: data?.documents,
        notes: data?.notes,
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

      const driverRef = adminDb.collection("partner_drivers").doc();
      createdPartnerDriverId = driverRef.id;

      tx.set(driverRef, {
        partnerId: s.partnerId,
        firstName: s.firstName,
        lastName: s.lastName,
        phone: s.phone,
        email: s.email || "",
        city: s.city,
        documents: Array.isArray(s.documents) ? s.documents : [],
        notes: s.notes || "",

        status: "approved",
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
          driverId: createdPartnerDriverId,
          updatedAt: now,
        },
        { merge: true },
      );
    });

    if (action === "approve" && createdPartnerDriverId) {
      await createAuditLog({
        actionType: "partner_driver_submission_approved",
        actorId: caller.uid,
        actorEmail: caller.email || "admin",
        targetId: id,
        targetType: "partner_driver_submission",
        details:
          "Approved partner driver submission and created partner driver.",
        metadata: { partnerDriverId: createdPartnerDriverId },
      });
    }

    if (action === "reject") {
      await createAuditLog({
        actionType: "partner_driver_submission_rejected",
        actorId: caller.uid,
        actorEmail: caller.email || "admin",
        targetId: id,
        targetType: "partner_driver_submission",
        details: "Rejected partner driver submission.",
        metadata: { reason: reason || "" },
      });
    }

    if (action === "request_changes") {
      await createAuditLog({
        actionType: "partner_driver_submission_changes_requested",
        actorId: caller.uid,
        actorEmail: caller.email || "admin",
        targetId: id,
        targetType: "partner_driver_submission",
        details: "Requested changes on partner driver submission.",
        metadata: { message: reason || "" },
      });
    }

    return NextResponse.json(
      { success: true, partnerDriverId: createdPartnerDriverId },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating partner driver submission:", error);
    const message = (error as any)?.message;
    if (typeof message === "string" && message) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update partner driver submission." },
      { status: 500 },
    );
  }
}
