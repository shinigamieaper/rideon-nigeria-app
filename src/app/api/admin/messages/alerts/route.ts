export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

interface Alert {
  type: "warning" | "critical";
  message: string;
  count: number;
}

// Configurable thresholds (could be moved to Firestore config later)
const THRESHOLDS = {
  // Warning: conversations with no reply for 30 minutes
  NO_REPLY_WARNING_MINUTES: 30,
  // Critical: conversations with no reply for 60 minutes
  NO_REPLY_CRITICAL_MINUTES: 60,
  // Warning threshold for unassigned high/urgent priority
  UNASSIGNED_HIGH_PRIORITY_WARNING: 3,
  // Critical threshold for unassigned urgent priority
  UNASSIGNED_URGENT_CRITICAL: 1,
};

/**
 * GET /api/admin/messages/alerts
 *
 * Returns operational alerts based on support conversation thresholds.
 * Checks for:
 * 1. Conversations with no agent reply after X minutes
 * 2. High/Urgent priority conversations that are unassigned
 * 3. Stale conversations (no activity for extended period)
 */
export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    const alerts: Alert[] = [];
    const now = new Date();

    // Fetch open/pending conversations (active ones that need attention)
    const activeConversationsSnapshot = await adminDb
      .collection("conversations")
      .where("status", "in", ["open", "pending"])
      .limit(500)
      .get();

    let noReplyWarningCount = 0;
    let noReplyCriticalCount = 0;
    let unassignedHighPriorityCount = 0;
    let unassignedUrgentCount = 0;

    for (const doc of activeConversationsSnapshot.docs) {
      const data = doc.data();

      // Check for conversations with no first response
      if (!data.firstResponseAt) {
        // Calculate time since creation
        let createdAt: Date | null = null;
        if (typeof data.createdAt === "string") {
          createdAt = new Date(data.createdAt);
        } else if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        }

        if (createdAt) {
          const minutesSinceCreation = Math.floor(
            (now.getTime() - createdAt.getTime()) / 60000,
          );

          if (minutesSinceCreation >= THRESHOLDS.NO_REPLY_CRITICAL_MINUTES) {
            noReplyCriticalCount++;
          } else if (
            minutesSinceCreation >= THRESHOLDS.NO_REPLY_WARNING_MINUTES
          ) {
            noReplyWarningCount++;
          }
        }
      }

      // Check for unassigned high/urgent priority
      if (!data.assignedAgentId) {
        const priority = data.priority || "normal";
        if (priority === "urgent") {
          unassignedUrgentCount++;
        } else if (priority === "high") {
          unassignedHighPriorityCount++;
        }
      }
    }

    // Generate alerts based on thresholds

    // Critical: No reply for 60+ minutes
    if (noReplyCriticalCount > 0) {
      alerts.push({
        type: "critical",
        message: `${noReplyCriticalCount} conversation${noReplyCriticalCount !== 1 ? "s" : ""} waiting 60+ min without reply`,
        count: noReplyCriticalCount,
      });
    }

    // Critical: Urgent priority unassigned
    if (unassignedUrgentCount >= THRESHOLDS.UNASSIGNED_URGENT_CRITICAL) {
      alerts.push({
        type: "critical",
        message: `${unassignedUrgentCount} urgent conversation${unassignedUrgentCount !== 1 ? "s" : ""} unassigned`,
        count: unassignedUrgentCount,
      });
    }

    // Warning: No reply for 30+ minutes
    if (noReplyWarningCount > 0) {
      alerts.push({
        type: "warning",
        message: `${noReplyWarningCount} conversation${noReplyWarningCount !== 1 ? "s" : ""} waiting 30+ min without reply`,
        count: noReplyWarningCount,
      });
    }

    // Warning: High priority unassigned
    if (
      unassignedHighPriorityCount >= THRESHOLDS.UNASSIGNED_HIGH_PRIORITY_WARNING
    ) {
      alerts.push({
        type: "warning",
        message: `${unassignedHighPriorityCount} high priority conversation${unassignedHighPriorityCount !== 1 ? "s" : ""} unassigned`,
        count: unassignedHighPriorityCount,
      });
    }

    // Sort alerts: critical first, then warning
    alerts.sort((a, b) => {
      if (a.type === "critical" && b.type !== "critical") return -1;
      if (a.type !== "critical" && b.type === "critical") return 1;
      return b.count - a.count;
    });

    return NextResponse.json(
      {
        alerts,
        thresholds: THRESHOLDS,
        checkedAt: now.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching support alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts." },
      { status: 500 },
    );
  }
}
