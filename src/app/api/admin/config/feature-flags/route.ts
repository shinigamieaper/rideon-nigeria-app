import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

// Default feature flags
const DEFAULT_FLAGS = {
  maintenanceMode: false,
  newBookingFlow: true,
  driverRatings: true,
  promotionalBanners: true,
  pushNotifications: true,
  inAppMessaging: true,
  supportChatEnabled: true,
  advancedFilters: false,
  multiCitySupport: true,
  instantBooking: false,
  scheduledBookingOnly: true,
  driverTips: false,
  corporateAccounts: false,
};

/**
 * GET /api/admin/config/feature-flags
 * Fetch current feature flags
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const docRef = adminDb.collection("config").doc("feature_flags");
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ flags: DEFAULT_FLAGS }, { status: 200 });
    }

    const data = doc.data()!;
    const flags = {
      maintenanceMode: data.maintenanceMode ?? DEFAULT_FLAGS.maintenanceMode,
      newBookingFlow: data.newBookingFlow ?? DEFAULT_FLAGS.newBookingFlow,
      driverRatings: data.driverRatings ?? DEFAULT_FLAGS.driverRatings,
      promotionalBanners:
        data.promotionalBanners ?? DEFAULT_FLAGS.promotionalBanners,
      pushNotifications:
        data.pushNotifications ?? DEFAULT_FLAGS.pushNotifications,
      inAppMessaging: data.inAppMessaging ?? DEFAULT_FLAGS.inAppMessaging,
      supportChatEnabled:
        data.supportChatEnabled ?? DEFAULT_FLAGS.supportChatEnabled,
      advancedFilters: data.advancedFilters ?? DEFAULT_FLAGS.advancedFilters,
      multiCitySupport: data.multiCitySupport ?? DEFAULT_FLAGS.multiCitySupport,
      instantBooking: data.instantBooking ?? DEFAULT_FLAGS.instantBooking,
      scheduledBookingOnly:
        data.scheduledBookingOnly ?? DEFAULT_FLAGS.scheduledBookingOnly,
      driverTips: data.driverTips ?? DEFAULT_FLAGS.driverTips,
      corporateAccounts:
        data.corporateAccounts ?? DEFAULT_FLAGS.corporateAccounts,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      updatedBy: data.updatedByEmail || null,
    };

    return NextResponse.json({ flags }, { status: 200 });
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/config/feature-flags
 * Update feature flags
 */
export async function PUT(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller!.uid,
      updatedByEmail: caller!.email,
    };

    const changedFlags: Record<string, boolean> = {};

    const validFlags = Object.keys(DEFAULT_FLAGS);
    for (const key of validFlags) {
      if (
        Object.prototype.hasOwnProperty.call(body, key) &&
        typeof body[key] === "boolean"
      ) {
        const value = body[key] as boolean;
        updates[key] = value;
        changedFlags[key] = value;
      }
    }

    await adminDb
      .collection("config")
      .doc("feature_flags")
      .set(updates, { merge: true });

    if (Object.keys(changedFlags).length > 0) {
      const summary = Object.entries(changedFlags)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");

      await createAuditLog({
        actionType: "config_feature_flags_updated",
        actorId: caller!.uid,
        actorEmail: caller!.email || "admin",
        targetId: "feature_flags",
        targetType: "config",
        details: `Updated feature flags: ${summary}`,
        metadata: changedFlags,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating feature flags:", error);
    return NextResponse.json(
      { error: "Failed to update feature flags" },
      { status: 500 },
    );
  }
}
