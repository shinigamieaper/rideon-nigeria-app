import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

/**
 * GET /api/admin/notifications
 * List recent notification logs with optional filters
 * Query params: targetType, status, type, limit
 */
export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    // Parse query params
    const url = new URL(req.url);
    const targetType = url.searchParams.get("targetType"); // 'customer' | 'driver'
    const status = url.searchParams.get("status"); // 'sent' | 'failed' | 'skipped' | 'no_tokens'
    const type = url.searchParams.get("type"); // notification type
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "50", 10), 200);

    // Build query
    const query: FirebaseFirestore.Query = adminDb
      .collection("notification_logs")
      .orderBy("createdAt", "desc")
      .limit(limit);

    // Note: Firestore requires composite indexes for multiple where clauses
    // We'll filter in memory for simplicity to avoid index requirements
    const snapshot = await query.get();

    const notifications = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || "unknown",
          targetType: data.targetType || "unknown",
          targetId: data.targetId || "",
          status: data.status || "unknown",
          sentCount: data.sentCount || 0,
          failedCount: data.failedCount || 0,
          skippedByPrefs: data.skippedByPrefs || false,
          payload: data.payload || { title: "", body: "" },
          metadata: data.metadata || {},
          error: data.error || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      })
      // Apply filters in memory
      .filter((n) => {
        if (targetType && n.targetType !== targetType) return false;
        if (status && n.status !== status) return false;
        if (type && n.type !== type) return false;
        return true;
      });

    return NextResponse.json({
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("[Admin Notifications] Error listing notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications." },
      { status: 500 },
    );
  }
}
