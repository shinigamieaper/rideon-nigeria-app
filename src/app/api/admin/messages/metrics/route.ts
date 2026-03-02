export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/adminRbac";

interface SupportMetrics {
  // Volume metrics
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  closedConversations: number;

  // Performance metrics
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;

  // Priority breakdown
  byPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };

  // Type breakdown
  byType: {
    support: number;
    trip: number;
    general: number;
    system: number;
  };

  // Source breakdown
  bySource: Record<string, number>;

  // Tag breakdown
  byTag: Record<string, number>;

  // Agent workload
  agentWorkload: {
    agentId: string;
    agentEmail?: string;
    openCount: number;
    pendingCount: number;
    totalAssigned: number;
  }[];

  // Unassigned count
  unassignedCount: number;

  // Time range used
  timeRange: string;
}

/**
 * GET /api/admin/messages/metrics
 *
 * Query params:
 *   - range: '24h' | '7d' | '30d' | 'all' (default: '7d')
 *
 * Returns support metrics and statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";

    // Calculate date range
    let startDate: Date | null = null;
    const now = new Date();
    switch (range) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = null;
    }

    // Build query
    let query: FirebaseFirestore.Query = adminDb.collection("conversations");

    // Filter by date if specified
    if (startDate) {
      query = query.where("createdAt", ">=", startDate.toISOString());
    }

    // Limit to avoid huge reads
    const snapshot = await query.limit(1000).get();

    // Initialize metrics
    const metrics: SupportMetrics = {
      totalConversations: 0,
      openConversations: 0,
      pendingConversations: 0,
      resolvedConversations: 0,
      closedConversations: 0,
      avgFirstResponseMinutes: null,
      avgResolutionMinutes: null,
      byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
      byType: { support: 0, trip: 0, general: 0, system: 0 },
      bySource: {},
      byTag: {},
      agentWorkload: [],
      unassignedCount: 0,
      timeRange: range,
    };

    // Agent workload map
    const agentMap: Map<
      string,
      { openCount: number; pendingCount: number; totalAssigned: number }
    > = new Map();

    // Calculate metrics
    let totalFirstResponseMs = 0;
    let firstResponseCount = 0;
    let totalResolutionMs = 0;
    let resolutionCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      metrics.totalConversations++;

      // Status
      const status = data.status || "open";
      switch (status) {
        case "open":
          metrics.openConversations++;
          break;
        case "pending":
          metrics.pendingConversations++;
          break;
        case "resolved":
          metrics.resolvedConversations++;
          break;
        case "closed":
          metrics.closedConversations++;
          break;
      }

      // Priority
      const priority = data.priority || "normal";
      if (priority in metrics.byPriority) {
        metrics.byPriority[priority as keyof typeof metrics.byPriority]++;
      }

      // Type
      const type = data.type || "support";
      if (type in metrics.byType) {
        metrics.byType[type as keyof typeof metrics.byType]++;
      }

      // Source
      const source = data.context?.source || "unknown";
      metrics.bySource[source] = (metrics.bySource[source] || 0) + 1;

      // Tags
      const tags = Array.isArray(data.tags) ? data.tags : [];
      for (const tag of tags) {
        if (typeof tag === "string") {
          metrics.byTag[tag] = (metrics.byTag[tag] || 0) + 1;
        }
      }

      // Agent assignment
      const agentId = data.assignedAgentId;
      if (agentId) {
        const existing = agentMap.get(agentId) || {
          openCount: 0,
          pendingCount: 0,
          totalAssigned: 0,
        };
        existing.totalAssigned++;
        if (status === "open") existing.openCount++;
        if (status === "pending") existing.pendingCount++;
        agentMap.set(agentId, existing);
      } else {
        if (status === "open" || status === "pending") {
          metrics.unassignedCount++;
        }
      }

      // First response time
      if (data.createdAt && data.firstResponseAt) {
        const createdAt = parseTimestamp(data.createdAt);
        const firstResponseAt = parseTimestamp(data.firstResponseAt);
        if (createdAt && firstResponseAt) {
          const diffMs = firstResponseAt.getTime() - createdAt.getTime();
          if (diffMs > 0) {
            totalFirstResponseMs += diffMs;
            firstResponseCount++;
          }
        }
      }

      // Resolution time
      if (data.createdAt && data.resolvedAt) {
        const createdAt = parseTimestamp(data.createdAt);
        const resolvedAt = parseTimestamp(data.resolvedAt);
        if (createdAt && resolvedAt) {
          const diffMs = resolvedAt.getTime() - createdAt.getTime();
          if (diffMs > 0) {
            totalResolutionMs += diffMs;
            resolutionCount++;
          }
        }
      }
    }

    // Calculate averages
    if (firstResponseCount > 0) {
      metrics.avgFirstResponseMinutes = Math.round(
        totalFirstResponseMs / firstResponseCount / 60000,
      );
    }
    if (resolutionCount > 0) {
      metrics.avgResolutionMinutes = Math.round(
        totalResolutionMs / resolutionCount / 60000,
      );
    }

    // Build agent workload array
    for (const [agentId, stats] of agentMap.entries()) {
      metrics.agentWorkload.push({
        agentId,
        ...stats,
      });
    }

    // Sort by total assigned descending
    metrics.agentWorkload.sort((a, b) => b.totalAssigned - a.totalAssigned);

    // Fetch agent emails for display (best effort, limited to top 10)
    try {
      const topAgents = metrics.agentWorkload.slice(0, 10);
      for (const agent of topAgents) {
        try {
          const userDoc = await adminDb
            .collection("users")
            .doc(agent.agentId)
            .get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            agent.agentEmail = userData?.email as string;
          }
        } catch {
          // Ignore individual fetch errors
        }
      }
    } catch (e) {
      console.warn("[metrics] Failed to fetch agent emails", e);
    }

    return NextResponse.json({ metrics }, { status: 200 });
  } catch (error) {
    console.error("Error fetching support metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics." },
      { status: 500 },
    );
  }
}

function parseTimestamp(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof Date) return value;
  if (typeof (value as any).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}
