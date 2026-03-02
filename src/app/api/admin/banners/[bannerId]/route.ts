export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";
import {
  VALID_PORTALS,
  VALID_STATUSES,
  type BannerPortal,
  type BannerStatus,
} from "@/types/brandBanner";

const COLLECTION = "brand_banners";

interface RouteContext {
  params: Promise<{ bannerId: string }>;
}

// GET /api/admin/banners/[bannerId] - Get a single banner
export async function GET(req: Request, ctx: RouteContext) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const { bannerId } = await ctx.params;
    const doc = await adminDb.collection(COLLECTION).doc(bannerId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Banner not found." }, { status: 404 });
    }

    const d = doc.data()!;
    return NextResponse.json(
      {
        id: doc.id,
        title: d.title || "",
        message: d.message || "",
        ctaLabel: d.ctaLabel || "",
        ctaLink: d.ctaLink || "",
        portals: d.portals || [],
        status: d.status || "draft",
        priority: d.priority ?? 0,
        startAt: d.startAt?.toDate?.()?.toISOString() || null,
        endAt: d.endAt?.toDate?.()?.toISOString() || null,
        dismissible: d.dismissible ?? true,
        dismissForHours: d.dismissForHours ?? 24,
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        createdBy: d.createdBy || "",
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
        updatedBy: d.updatedBy || "",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching brand banner:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand banner." },
      { status: 500 },
    );
  }
}

// PUT /api/admin/banners/[bannerId] - Update a banner
export async function PUT(req: Request, ctx: RouteContext) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

    const { bannerId } = await ctx.params;
    const existing = await adminDb.collection(COLLECTION).doc(bannerId).get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Banner not found." }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      message,
      ctaLabel,
      ctaLink,
      portals,
      status,
      priority,
      startAt,
      endAt,
      dismissible,
      dismissForHours,
    } = body;

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return NextResponse.json(
        { error: "Title cannot be empty." },
        { status: 400 },
      );
    }

    if (portals !== undefined) {
      if (!Array.isArray(portals) || portals.length === 0) {
        return NextResponse.json(
          { error: "At least one portal must be selected." },
          { status: 400 },
        );
      }
      const invalidPortals = portals.filter(
        (p: string) => !VALID_PORTALS.includes(p as BannerPortal),
      );
      if (invalidPortals.length > 0) {
        return NextResponse.json(
          { error: `Invalid portals: ${invalidPortals.join(", ")}` },
          { status: 400 },
        );
      }
    }

    if (
      status !== undefined &&
      !VALID_STATUSES.includes(status as BannerStatus)
    ) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin!.uid,
    };

    if (title !== undefined) update.title = title.trim().slice(0, 100);
    if (message !== undefined) update.message = message.trim().slice(0, 500);
    if (ctaLabel !== undefined) update.ctaLabel = ctaLabel.trim().slice(0, 50);
    if (ctaLink !== undefined) update.ctaLink = ctaLink.trim().slice(0, 200);
    if (portals !== undefined) update.portals = portals as BannerPortal[];
    if (status !== undefined) update.status = status as BannerStatus;
    if (priority !== undefined)
      update.priority = Math.max(0, Math.min(Number(priority) || 0, 100));
    if (startAt !== undefined)
      update.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) update.endAt = endAt ? new Date(endAt) : null;
    if (dismissible !== undefined) update.dismissible = Boolean(dismissible);
    if (dismissForHours !== undefined)
      update.dismissForHours = Math.max(
        1,
        Math.min(Number(dismissForHours) || 24, 720),
      );

    await adminDb.collection(COLLECTION).doc(bannerId).update(update);

    await createAuditLog({
      actionType: "brand_banner_updated",
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: bannerId,
      targetType: "brand_banner",
      details: `Updated brand banner: ${update.title || existing.data()!.title}`,
      metadata: {
        bannerId,
        updatedFields: Object.keys(update).filter(
          (k) => k !== "updatedAt" && k !== "updatedBy",
        ),
      },
    });

    return NextResponse.json(
      { message: "Banner updated successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating brand banner:", error);
    return NextResponse.json(
      { error: "Failed to update brand banner." },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/banners/[bannerId] - Delete a banner
export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

    const { bannerId } = await ctx.params;
    const existing = await adminDb.collection(COLLECTION).doc(bannerId).get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Banner not found." }, { status: 404 });
    }

    await adminDb.collection(COLLECTION).doc(bannerId).delete();

    await createAuditLog({
      actionType: "brand_banner_deleted",
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: bannerId,
      targetType: "brand_banner",
      details: `Deleted brand banner: ${existing.data()!.title}`,
      metadata: { bannerId },
    });

    return NextResponse.json(
      { message: "Banner deleted successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting brand banner:", error);
    return NextResponse.json(
      { error: "Failed to delete brand banner." },
      { status: 500 },
    );
  }
}
