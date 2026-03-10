import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";
import { PartnerDriverSubmissionSchema } from "@/lib/validation/partnerDriverSubmission";
import { zodErrorToFieldMap } from "@/lib/validation/errors";
import { sendNotificationToAdminUser } from "@/lib/fcmAdmin";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export const runtime = "nodejs";

type PartnerSubmissionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

function getRequestBaseUrl(req: Request): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "";
  const base = String(raw).trim();
  return base ? base.replace(/\/$/, "") : "http://localhost:3000";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;
    if (!canWrite(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await context.params;
    const docId = (id || "").trim();
    if (!docId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const ref = adminDb.collection("partner_driver_submissions").doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const d = snap.data() as any;
    if (d?.partnerId !== ctx.partnerId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const currentStatus = String(
      d?.status || "draft",
    ) as PartnerSubmissionStatus;
    if (currentStatus === "pending_review") {
      return NextResponse.json(
        { error: "Already submitted for review." },
        { status: 400 },
      );
    }
    if (currentStatus === "approved") {
      return NextResponse.json(
        { error: "This submission has already been approved." },
        { status: 400 },
      );
    }
    if (currentStatus === "rejected") {
      return NextResponse.json(
        {
          error:
            "This submission was rejected. Please create a new submission to start over.",
        },
        { status: 400 },
      );
    }

    // Require key uploads before submission
    const photoUrl = typeof d?.photoUrl === "string" ? d.photoUrl.trim() : "";
    const docs = Array.isArray(d?.documents) ? (d.documents as any[]) : [];
    const hasDoc = (type: string) =>
      docs.some(
        (x) =>
          String(x?.type || "").trim() === type &&
          typeof x?.url === "string" &&
          x.url,
      );
    const missing: string[] = [];
    if (!photoUrl) missing.push("photo");
    if (!hasDoc("drivers_license")) missing.push("drivers_license");
    if (!hasDoc("government_id")) missing.push("government_id");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required uploads: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const parsed = PartnerDriverSubmissionSchema.safeParse({
      partnerId: ctx.partnerId,
      firstName: d?.firstName,
      lastName: d?.lastName,
      phone: d?.phone,
      email: d?.email,
      city: d?.city,
      photoUrl: d?.photoUrl,
      documents: d?.documents,
      notes: d?.notes,
      status: "pending_review",
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Submission failed validation.",
          details: zodErrorToFieldMap(parsed.error),
        },
        { status: 400 },
      );
    }

    const now = FieldValue.serverTimestamp();

    await ref.set(
      {
        ...parsed.data,
        partnerId: ctx.partnerId,
        status: "pending_review",
        submittedAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    try {
      const adminsSnap = await adminDb
        .collection("users")
        .where("isAdmin", "==", true)
        .limit(200)
        .get();

      const adminUids: string[] = [];
      const adminEmails: string[] = [];
      adminsSnap.docs.forEach((doc) => {
        if (doc.id === ctx.partnerId) return;
        const data = doc.data() as any;
        const role = String(data?.adminRole || "admin");
        if (
          !["super_admin", "admin", "ops_admin", "driver_admin"].includes(role)
        )
          return;
        adminUids.push(doc.id);
        const em = typeof data?.email === "string" ? data.email.trim() : "";
        if (em) adminEmails.push(em);
      });

      const adminLinkPath = "/admin/partner-driver-submissions";
      const title = "New partner driver submission";
      const body = "A partner submitted a driver for review.";

      await Promise.allSettled(
        adminUids.map((adminUid) =>
          sendNotificationToAdminUser(adminUid, {
            title,
            body,
            data: {
              type: "partner_driver_submission_pending",
              submissionId: docId,
              partnerId: ctx.partnerId,
            },
            clickAction: adminLinkPath,
          }),
        ),
      );

      try {
        const resend = getResendClient();
        const from = getEmailFrom();
        if (resend && from && adminEmails.length > 0) {
          const baseUrl = getRequestBaseUrl(req);
          const link = `${baseUrl}${adminLinkPath}`;
          const subject = "RideOn Admin: New partner driver submission";
          const text = [
            "A partner submitted a driver for review.",
            "",
            "Review:",
            link,
          ].join("\n");
          const html = `
            <p>A partner submitted a driver for review.</p>
            <p><a href="${link}">Open Admin Portal</a></p>
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
          "[partner/drivers/submissions/[id]/submit] Failed sending admin emails:",
          e,
        );
      }
    } catch (e) {
      console.error(
        "[partner/drivers/submissions/[id]/submit] Failed notifying admins:",
        e,
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error submitting partner driver submission:", error);
    return NextResponse.json(
      { error: "Failed to submit driver for review." },
      { status: 500 },
    );
  }
}
