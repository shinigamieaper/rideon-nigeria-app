import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

type PartnerSubmissionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;

    const { id } = await context.params;
    const docId = (id || "").trim();
    if (!docId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const snap = await adminDb
      .collection("partner_vehicle_submissions")
      .doc(docId)
      .get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const d = snap.data() as any;
    if (d?.partnerId !== ctx.partnerId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json(
      {
        id: snap.id,
        status: (d?.status as PartnerSubmissionStatus) || "draft",
        partnerId: d?.partnerId,
        city: d?.city || "",
        category: d?.category || "",
        make: d?.make || "",
        model: d?.model || "",
        seats: typeof d?.seats === "number" ? d.seats : null,
        images: Array.isArray(d?.images) ? d.images : [],
        documents: Array.isArray(d?.documents) ? d.documents : [],
        description: d?.description || "",
        specs: typeof d?.specs === "object" && d.specs ? d.specs : {},
        partnerBaseDayRateNgn:
          typeof d?.partnerBaseDayRateNgn === "number"
            ? d.partnerBaseDayRateNgn
            : null,
        partnerBaseBlock4hRateNgn:
          typeof d?.partnerBaseBlock4hRateNgn === "number"
            ? d.partnerBaseBlock4hRateNgn
            : null,
        changesRequestedMessage: d?.changesRequestedMessage || null,
        rejectedReason: d?.rejectedReason || null,
        vehicleId: d?.vehicleId || null,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
        submittedAt: d?.submittedAt?.toDate?.()?.toISOString?.() || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner vehicle submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle submission." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const existing = snap.data() as any;
    if (existing?.partnerId !== ctx.partnerId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const status = String(
      existing?.status || "draft",
    ) as PartnerSubmissionStatus;
    if (
      status === "pending_review" ||
      status === "approved" ||
      status === "rejected"
    ) {
      return NextResponse.json(
        { error: "This submission cannot be edited right now." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const now = FieldValue.serverTimestamp();

    const update: Record<string, unknown> = {
      updatedAt: now,
    };

    if (typeof body?.city === "string") update.city = body.city.trim();
    if (typeof body?.category === "string")
      update.category = body.category.trim();
    if (typeof body?.make === "string") update.make = body.make.trim();
    if (typeof body?.model === "string") update.model = body.model.trim();
    if (typeof body?.seats === "number") update.seats = body.seats;
    if (Array.isArray(body?.images)) update.images = body.images;
    if (Array.isArray(body?.documents)) update.documents = body.documents;
    if (typeof body?.description === "string")
      update.description = body.description.trim();
    if (typeof body?.specs === "object" && body.specs)
      update.specs = body.specs;
    if (typeof body?.partnerBaseDayRateNgn === "number")
      update.partnerBaseDayRateNgn = body.partnerBaseDayRateNgn;
    if (typeof body?.partnerBaseBlock4hRateNgn === "number")
      update.partnerBaseBlock4hRateNgn = body.partnerBaseBlock4hRateNgn;

    await ref.set(update, { merge: true });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating partner vehicle submission:", error);
    return NextResponse.json(
      { error: "Failed to update vehicle submission." },
      { status: 500 },
    );
  }
}
