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
      .collection("partner_driver_submissions")
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
        firstName: d?.firstName || "",
        lastName: d?.lastName || "",
        phone: d?.phone || "",
        email: d?.email || "",
        city: d?.city || "",
        photoUrl: d?.photoUrl || "",
        documents: Array.isArray(d?.documents) ? d.documents : [],
        notes: d?.notes || "",
        changesRequestedMessage: d?.changesRequestedMessage || null,
        rejectedReason: d?.rejectedReason || null,
        driverId: d?.driverId || null,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
        submittedAt: d?.submittedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching partner driver submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver submissions." },
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

    const ref = adminDb.collection("partner_driver_submissions").doc();
    const now = FieldValue.serverTimestamp();

    await ref.set(
      {
        partnerId: ctx.partnerId,
        status: "draft",

        firstName:
          typeof body?.firstName === "string" ? body.firstName.trim() : "",
        lastName:
          typeof body?.lastName === "string" ? body.lastName.trim() : "",
        phone: typeof body?.phone === "string" ? body.phone.trim() : "",
        email: typeof body?.email === "string" ? body.email.trim() : "",
        city: typeof body?.city === "string" ? body.city.trim() : "",
        photoUrl:
          typeof body?.photoUrl === "string" ? body.photoUrl.trim() : "",
        documents: Array.isArray(body?.documents) ? body.documents : [],
        notes: typeof body?.notes === "string" ? body.notes.trim() : "",

        createdAt: now,
        updatedAt: now,
      },
      { merge: false },
    );

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating partner driver submission:", error);
    return NextResponse.json(
      { error: "Failed to create driver submission." },
      { status: 500 },
    );
  }
}
