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

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "").trim();

    let query: FirebaseFirestore.Query = adminDb
      .collection("partner_vehicle_submissions")
      .where("partnerId", "==", ctx.partnerId);

    if (status) {
      query = query.where("status", "==", status);
    }

    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await query.orderBy("updatedAt", "desc").limit(200).get();
    } catch {
      snap = await query.limit(200).get();
    }

    const submissions = snap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        status: (d?.status as PartnerSubmissionStatus) || "draft",
        city: d?.city || "",
        category: d?.category || "",
        make: d?.make || "",
        model: d?.model || "",
        seats: typeof d?.seats === "number" ? d.seats : null,
        images: Array.isArray(d?.images) ? d.images : [],
        documents: Array.isArray(d?.documents) ? d.documents : [],
        description: d?.description || "",
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
      };
    });

    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching partner vehicle submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle submissions." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;
    if (!canWrite(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const ref = adminDb.collection("partner_vehicle_submissions").doc();
    const now = FieldValue.serverTimestamp();

    await ref.set(
      {
        partnerId: ctx.partnerId,
        status: "draft",

        city: typeof body?.city === "string" ? body.city.trim() : "",
        category:
          typeof body?.category === "string" ? body.category.trim() : "",
        make: typeof body?.make === "string" ? body.make.trim() : "",
        model: typeof body?.model === "string" ? body.model.trim() : "",
        seats: typeof body?.seats === "number" ? body.seats : null,
        images: Array.isArray(body?.images) ? body.images : [],
        documents: Array.isArray(body?.documents) ? body.documents : [],
        description:
          typeof body?.description === "string" ? body.description.trim() : "",
        specs: typeof body?.specs === "object" && body.specs ? body.specs : {},

        partnerBaseDayRateNgn:
          typeof body?.partnerBaseDayRateNgn === "number"
            ? body.partnerBaseDayRateNgn
            : null,
        partnerBaseBlock4hRateNgn:
          typeof body?.partnerBaseBlock4hRateNgn === "number"
            ? body.partnerBaseBlock4hRateNgn
            : null,

        createdAt: now,
        updatedAt: now,
      },
      { merge: false },
    );

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating partner vehicle submission:", error);
    return NextResponse.json(
      { error: "Failed to create vehicle submission." },
      { status: 500 },
    );
  }
}
