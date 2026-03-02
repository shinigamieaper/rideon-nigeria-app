export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import {
  computeCustomerUnitRateNgn,
  resolveVehiclePricingSnapshot,
} from "@/lib/pricing";
import { requireAdmin } from "@/lib/adminRbac";

// GET /api/admin/catalog/[id] - Get single listing with all fields
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing listing ID." },
        { status: 400 },
      );
    }

    const doc = await adminDb.collection("vehicles").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    const d = doc.data()!;
    const pricing = resolveVehiclePricingSnapshot(d);
    const listing = {
      id: doc.id,
      city: d.city || "",
      category: d.category || "",
      make: d.make || "",
      model: d.model || "",
      partnerId: d.partnerId || null,
      adminActive: d.adminActive === false ? false : true,
      seats: d.seats || null,
      images: Array.isArray(d.images) ? d.images : [],
      // Customer pricing
      dayRateNgn: pricing.dayRateNgn || 0,
      block4hRateNgn: pricing.block4hRateNgn || 0,
      // Partner base + platform add-on config
      partnerBaseDayRateNgn: pricing.baseDayRateNgn || 0,
      partnerBaseBlock4hRateNgn: pricing.baseBlock4hRateNgn || 0,
      adminMarkupFixedNgn: pricing.markupFixedNgn || 0,
      description: d.description || "",
      specs: typeof d.specs === "object" && d.specs ? d.specs : {},
      status: d.status || "available",
      createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json(listing, { status: 200 });
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing." },
      { status: 500 },
    );
  }
}

// PUT /api/admin/catalog/[id] - Update listing
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing listing ID." },
        { status: 400 },
      );
    }

    const docRef = adminDb.collection("vehicles").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    // Allowed fields to update
    const allowedFields = [
      "city",
      "category",
      "make",
      "model",
      "seats",
      "images",
      "dayRateNgn",
      "block4hRateNgn",
      "partnerBaseDayRateNgn",
      "partnerBaseBlock4hRateNgn",
      "adminMarkupFixedNgn",
      "adminActive",
      "description",
      "specs",
      "status",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field.includes("Ngn") && typeof body[field] === "number") {
          updates[field] = Math.round(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    if (
      updates.adminActive !== undefined &&
      typeof updates.adminActive !== "boolean"
    ) {
      return NextResponse.json(
        { error: "adminActive must be a boolean." },
        { status: 400 },
      );
    }

    if (
      typeof updates.partnerBaseDayRateNgn === "number" &&
      updates.partnerBaseDayRateNgn <= 0
    ) {
      updates.partnerBaseDayRateNgn = null;
    }
    if (
      typeof updates.partnerBaseBlock4hRateNgn === "number" &&
      updates.partnerBaseBlock4hRateNgn <= 0
    ) {
      updates.partnerBaseBlock4hRateNgn = null;
    }

    // If partner base rates exist (either in body updates or existing doc), derive customer rates from base + markup
    const nextPartnerBaseDay =
      updates.partnerBaseDayRateNgn !== undefined
        ? typeof updates.partnerBaseDayRateNgn === "number" &&
          updates.partnerBaseDayRateNgn > 0
          ? updates.partnerBaseDayRateNgn
          : null
        : typeof doc.data()?.partnerBaseDayRateNgn === "number" &&
            doc.data()?.partnerBaseDayRateNgn > 0
          ? doc.data()?.partnerBaseDayRateNgn
          : null;

    const nextPartnerBaseBlock =
      updates.partnerBaseBlock4hRateNgn !== undefined
        ? typeof updates.partnerBaseBlock4hRateNgn === "number" &&
          updates.partnerBaseBlock4hRateNgn > 0
          ? updates.partnerBaseBlock4hRateNgn
          : null
        : typeof doc.data()?.partnerBaseBlock4hRateNgn === "number" &&
            doc.data()?.partnerBaseBlock4hRateNgn > 0
          ? doc.data()?.partnerBaseBlock4hRateNgn
          : null;

    const hasPartnerBase =
      nextPartnerBaseDay != null || nextPartnerBaseBlock != null;

    const nextMarkupFixed =
      updates.adminMarkupFixedNgn !== undefined
        ? typeof updates.adminMarkupFixedNgn === "number"
          ? Math.round(updates.adminMarkupFixedNgn)
          : 0
        : typeof doc.data()?.adminMarkupFixedNgn === "number"
          ? Math.round(doc.data()?.adminMarkupFixedNgn)
          : 0;

    if (hasPartnerBase && nextPartnerBaseDay != null) {
      updates.dayRateNgn = computeCustomerUnitRateNgn({
        baseRateNgn: nextPartnerBaseDay,
        markupFixedNgn: nextMarkupFixed,
      });

      const baseBlock =
        nextPartnerBaseBlock != null
          ? nextPartnerBaseBlock
          : Math.round(nextPartnerBaseDay * 0.5);
      updates.block4hRateNgn = computeCustomerUnitRateNgn({
        baseRateNgn: baseBlock,
        markupFixedNgn: nextMarkupFixed,
      });
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    updates.updatedBy = admin!.uid;

    await docRef.update(updates);

    const changedKeys = Object.keys(updates).filter(
      (key) => !["updatedAt", "updatedBy"].includes(key),
    );

    if (changedKeys.length > 0) {
      await createAuditLog({
        actionType: "catalog_listing_updated",
        actorId: admin!.uid,
        actorEmail: admin!.email || "admin",
        targetId: id,
        targetType: "listing",
        details: `Updated listing ${id}: ${changedKeys.join(", ")}`,
        metadata: updates,
      });
    }

    return NextResponse.json(
      { message: "Listing updated successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json(
      { error: "Failed to update listing." },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/catalog/[id] - Delete listing (soft delete by setting status)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Missing listing ID." },
        { status: 400 },
      );
    }

    const docRef = adminDb.collection("vehicles").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    // Soft delete - set status to 'deleted'
    await docRef.update({
      status: "deleted",
      updatedAt: FieldValue.serverTimestamp(),
      deletedBy: admin!.uid,
    });

    await createAuditLog({
      actionType: "catalog_listing_deleted",
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: id,
      targetType: "listing",
      details: `Soft-deleted listing ${id}`,
      metadata: { status: "deleted" },
    });

    return NextResponse.json(
      { message: "Listing deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting listing:", error);
    return NextResponse.json(
      { error: "Failed to delete listing." },
      { status: 500 },
    );
  }
}
