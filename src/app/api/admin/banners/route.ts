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

// GET /api/admin/banners - List all brand banners
export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy("priority", "desc")
      .orderBy("updatedAt", "desc")
      .get();

    const banners = snap.docs.map((doc) => {
      const d = doc.data();
      return {
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
      };
    });

    return NextResponse.json({ banners }, { status: 200 });
  } catch (error) {
    console.error("Error listing brand banners:", error);
    return NextResponse.json(
      { error: "Failed to list brand banners." },
      { status: 500 },
    );
  }
}

// POST /api/admin/banners - Create a new brand banner
export async function POST(req: Request) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

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

    // Validation
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 },
      );
    }

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

    const bannerStatus: BannerStatus = VALID_STATUSES.includes(
      status as BannerStatus,
    )
      ? status
      : "draft";

    const doc: Record<string, unknown> = {
      title: title.trim().slice(0, 100),
      message: (message || "").trim().slice(0, 500),
      ctaLabel: (ctaLabel || "").trim().slice(0, 50),
      ctaLink: (ctaLink || "").trim().slice(0, 200),
      portals: portals as BannerPortal[],
      status: bannerStatus,
      priority:
        typeof priority === "number" ? Math.max(0, Math.min(priority, 100)) : 0,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      dismissible: typeof dismissible === "boolean" ? dismissible : true,
      dismissForHours:
        typeof dismissForHours === "number"
          ? Math.max(1, Math.min(dismissForHours, 720))
          : 24,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: admin!.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin!.uid,
    };

    const ref = await adminDb.collection(COLLECTION).add(doc);

    await createAuditLog({
      actionType: "brand_banner_created",
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: ref.id,
      targetType: "brand_banner",
      details: `Created brand banner: ${doc.title}`,
      metadata: {
        bannerId: ref.id,
        portals: doc.portals,
        status: doc.status,
        priority: doc.priority,
      },
    });

    return NextResponse.json(
      { id: ref.id, message: "Banner created successfully." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating brand banner:", error);
    return NextResponse.json(
      { error: "Failed to create brand banner." },
      { status: 500 },
    );
  }
}
