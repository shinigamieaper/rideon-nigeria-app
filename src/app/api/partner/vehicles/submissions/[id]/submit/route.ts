import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";
import { PartnerVehicleSubmissionSchema } from "@/lib/validation/partnerVehicleSubmission";
import { zodErrorToFieldMap } from "@/lib/validation/errors";

export const runtime = "nodejs";

type PartnerSubmissionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

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

    const ref = adminDb.collection("partner_vehicle_submissions").doc(docId);
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
    const images = Array.isArray(d?.images) ? (d.images as any[]) : [];
    const docs = Array.isArray(d?.documents) ? (d.documents as any[]) : [];
    const hasDoc = (type: string) =>
      docs.some(
        (x) =>
          String(x?.type || "").trim() === type &&
          typeof x?.url === "string" &&
          x.url,
      );
    const missing: string[] = [];
    // Require at least 3 photos: front/back/plate (enforced by count)
    if (images.length < 3) missing.push("vehicle_photos(front/back/plate)");
    if (!hasDoc("vehicle_registration")) missing.push("vehicle_registration");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required uploads: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const parsed = PartnerVehicleSubmissionSchema.safeParse({
      partnerId: ctx.partnerId,
      city: d?.city,
      category: d?.category,
      make: d?.make,
      model: d?.model,
      seats: d?.seats,
      images: d?.images,
      documents: d?.documents,
      description: d?.description,
      specs: d?.specs,
      partnerBaseDayRateNgn: d?.partnerBaseDayRateNgn,
      partnerBaseBlock4hRateNgn: d?.partnerBaseBlock4hRateNgn,
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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error submitting partner vehicle submission:", error);
    return NextResponse.json(
      { error: "Failed to submit vehicle for review." },
      { status: 500 },
    );
  }
}
