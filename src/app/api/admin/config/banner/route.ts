export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

const BANNER_DOC_ID = "brand_banner";

// GET /api/admin/config/banner - Get current banner config
export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const doc = await adminDb.collection("config").doc(BANNER_DOC_ID).get();

    if (!doc.exists) {
      // Return default config
      return NextResponse.json(
        {
          enabled: {
            public: false,
            customer: false,
            driver: false,
          },
          title: "",
          message: "",
          ctaLabel: "",
          ctaLink: "",
          updatedAt: null,
        },
        { status: 200 },
      );
    }

    const data = doc.data()!;
    return NextResponse.json(
      {
        enabled: data.enabled || {
          public: false,
          customer: false,
          driver: false,
        },
        title: data.title || "",
        message: data.message || "",
        ctaLabel: data.ctaLabel || "",
        ctaLink: data.ctaLink || "",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching banner config:", error);
    return NextResponse.json(
      { error: "Failed to fetch banner config." },
      { status: 500 },
    );
  }
}

// PUT /api/admin/config/banner - Update banner config
export async function PUT(req: Request) {
  try {
    const { caller: admin, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

    const body = await req.json();
    const { enabled, title, message, ctaLabel, ctaLink } = body;

    // Validation
    if (typeof enabled !== "object") {
      return NextResponse.json(
        { error: "Invalid enabled object." },
        { status: 400 },
      );
    }

    const bannerConfig = {
      enabled: {
        public: Boolean(enabled.public),
        customer: Boolean(enabled.customer),
        driver: Boolean(enabled.driver),
      },
      title: (title || "").trim().slice(0, 100),
      message: (message || "").trim().slice(0, 500),
      ctaLabel: (ctaLabel || "").trim().slice(0, 50),
      ctaLink: (ctaLink || "").trim().slice(0, 200),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin!.uid,
    };

    await adminDb
      .collection("config")
      .doc(BANNER_DOC_ID)
      .set(bannerConfig, { merge: true });

    await createAuditLog({
      actionType: "config_banner_updated",
      actorId: admin!.uid,
      actorEmail: admin!.email || "admin",
      targetId: BANNER_DOC_ID,
      targetType: "config",
      details: "Updated brand banner configuration",
      metadata: bannerConfig,
    });

    return NextResponse.json(
      { message: "Banner config updated successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating banner config:", error);
    return NextResponse.json(
      { error: "Failed to update banner config." },
      { status: 500 },
    );
  }
}
