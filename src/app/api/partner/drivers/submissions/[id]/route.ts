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
      .collection("partner_driver_submissions")
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
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner driver submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver submission." },
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

    const ref = adminDb.collection("partner_driver_submissions").doc(docId);
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

    if (typeof body?.firstName === "string")
      update.firstName = body.firstName.trim();
    if (typeof body?.lastName === "string")
      update.lastName = body.lastName.trim();
    if (typeof body?.phone === "string") update.phone = body.phone.trim();
    if (typeof body?.email === "string") update.email = body.email.trim();
    if (typeof body?.city === "string") update.city = body.city.trim();
    if (typeof body?.photoUrl === "string")
      update.photoUrl = body.photoUrl.trim();
    if (Array.isArray(body?.documents)) update.documents = body.documents;
    if (typeof body?.notes === "string") update.notes = body.notes.trim();

    await ref.set(update, { merge: true });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating partner driver submission:", error);
    return NextResponse.json(
      { error: "Failed to update driver submission." },
      { status: 500 },
    );
  }
}
