export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

interface Agent {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  openCount: number;
  pendingCount: number;
  totalAssigned: number;
  lastActive?: string;
}

/**
 * GET /api/admin/messages/agents
 *
 * Returns a list of admin/support agents with their current workload.
 * Used for agent assignment dropdown.
 */
export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    // Get all users with admin role
    const adminsSnapshot = await adminDb
      .collection("users")
      .where("role", "==", "admin")
      .limit(50)
      .get();

    const adminUsers: {
      id: string;
      email: string;
      name?: string;
      avatarUrl?: string;
    }[] = [];

    for (const doc of adminsSnapshot.docs) {
      const data = doc.data();
      const firstName =
        typeof data.firstName === "string" ? data.firstName : "";
      const lastName = typeof data.lastName === "string" ? data.lastName : "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim();

      adminUsers.push({
        id: doc.id,
        email: typeof data.email === "string" ? data.email : doc.id,
        name: name || undefined,
        avatarUrl:
          typeof data.profileImageUrl === "string"
            ? data.profileImageUrl
            : undefined,
      });
    }

    // Get workload for each agent (conversations assigned to them)
    const conversationsSnapshot = await adminDb
      .collection("conversations")
      .where("status", "in", ["open", "pending"])
      .limit(500)
      .get();

    // Build workload map
    const workloadMap: Map<
      string,
      { openCount: number; pendingCount: number; totalAssigned: number }
    > = new Map();

    for (const doc of conversationsSnapshot.docs) {
      const data = doc.data();
      const agentId = data.assignedAgentId;
      if (agentId && typeof agentId === "string") {
        const existing = workloadMap.get(agentId) || {
          openCount: 0,
          pendingCount: 0,
          totalAssigned: 0,
        };
        existing.totalAssigned++;
        if (data.status === "open") existing.openCount++;
        if (data.status === "pending") existing.pendingCount++;
        workloadMap.set(agentId, existing);
      }
    }

    // Build agents list with workload
    const agents: Agent[] = adminUsers.map((user) => {
      const workload = workloadMap.get(user.id) || {
        openCount: 0,
        pendingCount: 0,
        totalAssigned: 0,
      };
      return {
        ...user,
        ...workload,
      };
    });

    // Sort by workload (least loaded first for balanced assignment)
    agents.sort((a, b) => a.totalAssigned - b.totalAssigned);

    return NextResponse.json({ agents }, { status: 200 });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents." },
      { status: 500 },
    );
  }
}
