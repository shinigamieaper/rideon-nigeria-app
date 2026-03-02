export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";
import type {
  ConversationType,
  ConversationStatus,
  ConversationPriority,
  AdminConversationListItem,
  AdminMessagesListResponse,
} from "@/types/messaging";

/**
 * GET /api/admin/messages
 *
 * Query params:
 *   - type: 'support' | 'trip' | 'all' (default: 'all')
 *   - status: 'open' | 'pending' | 'resolved' | 'closed' | 'all' (default: 'all')
 *   - priority: 'low' | 'normal' | 'high' | 'urgent' | 'all' (default: 'all')
 *   - assignedTo: 'me' | 'unassigned' | specific uid | 'all' (default: 'all')
 *   - q: search query (optional)
 *   - page: number (default: 1)
 *   - limit: number (default: 25, max: 100)
 *
 * Returns a list of conversations for admin support inbox.
 */
export async function GET(request: NextRequest) {
  try {
    const { caller, response: authResponse } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (authResponse) return authResponse;

    const adminUid = caller!.uid;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type") || "all";
    const statusParam = searchParams.get("status") || "all";
    const priorityParam = searchParams.get("priority") || "all";
    const assignedToParam = searchParams.get("assignedTo") || "all";
    const searchQuery = searchParams.get("q") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "25", 10)),
    );

    // Build Firestore query
    // Note: Firestore has limitations on compound queries, so we fetch and filter in memory
    let query: FirebaseFirestore.Query = adminDb.collection("conversations");

    // Filter by type if specified
    if (
      typeParam !== "all" &&
      ["support", "trip", "general", "system"].includes(typeParam)
    ) {
      query = query.where("type", "==", typeParam);
    }

    // Filter by status if specified
    if (
      statusParam !== "all" &&
      ["open", "pending", "resolved", "closed"].includes(statusParam)
    ) {
      query = query.where("status", "==", statusParam);
    }

    // Fetch conversations (limited to avoid huge reads)
    const snapshot = await query
      .orderBy("lastMessageAt", "desc")
      .limit(500)
      .get();

    // Process and filter in memory
    let conversations: AdminConversationListItem[] = snapshot.docs.map(
      (doc) => {
        const data = doc.data();

        // Build participants list
        const memberIds: string[] = Array.isArray(data.memberIds)
          ? data.memberIds
          : [];
        const profiles = (data.participantProfiles || {}) as Record<
          string,
          any
        >;

        const participants = memberIds.map((id) => {
          const profile = profiles[id] || {};
          return {
            id,
            name:
              id === "support" ? "RideOn Support" : profile.name || "Unknown",
            role: id === "support" ? "support" : profile.role,
            avatarUrl: profile.avatarUrl || null,
          };
        });

        // Calculate unread count for support side
        const unreadCounts = (data.unreadCounts || {}) as Record<
          string,
          number
        >;
        const supportUnread =
          typeof unreadCounts.support === "number" ? unreadCounts.support : 0;

        // Normalize lastMessageAt
        let lastMessageAt: string;
        const lma = data.lastMessageAt;
        if (typeof lma === "string") {
          lastMessageAt = lma;
        } else if (lma?.toDate) {
          lastMessageAt = lma.toDate().toISOString();
        } else {
          lastMessageAt = new Date().toISOString();
        }

        // Normalize createdAt
        let createdAt: string;
        const ca = data.createdAt;
        if (typeof ca === "string") {
          createdAt = ca;
        } else if (ca?.toDate) {
          createdAt = ca.toDate().toISOString();
        } else {
          createdAt = new Date().toISOString();
        }

        // Normalize firstResponseAt
        let firstResponseAt: string | undefined;
        const fra = data.firstResponseAt;
        if (typeof fra === "string") {
          firstResponseAt = fra;
        } else if (fra?.toDate) {
          firstResponseAt = fra.toDate().toISOString();
        }

        return {
          id: doc.id,
          type: (data.type || "support") as ConversationType,
          status: (data.status || "open") as ConversationStatus,
          priority: (data.priority || "normal") as ConversationPriority,
          assignedAgentId: data.assignedAgentId || undefined,
          participants,
          lastMessage:
            typeof data.lastMessage === "string" ? data.lastMessage : "",
          lastMessageAt,
          unreadCount: supportUnread,
          tags: Array.isArray(data.tags) ? data.tags : [],
          context: data.context || undefined,
          createdAt,
          firstResponseAt,
        };
      },
    );

    // Apply additional in-memory filters

    // Filter by priority
    if (
      priorityParam !== "all" &&
      ["low", "normal", "high", "urgent"].includes(priorityParam)
    ) {
      conversations = conversations.filter((c) => c.priority === priorityParam);
    }

    // Filter by assignment
    if (assignedToParam === "me") {
      conversations = conversations.filter(
        (c) => c.assignedAgentId === adminUid,
      );
    } else if (assignedToParam === "unassigned") {
      conversations = conversations.filter((c) => !c.assignedAgentId);
    } else if (assignedToParam !== "all" && assignedToParam) {
      conversations = conversations.filter(
        (c) => c.assignedAgentId === assignedToParam,
      );
    }

    // Search filter (simple substring match on lastMessage, participant names, context fields)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      conversations = conversations.filter((c) => {
        // Match lastMessage
        if (c.lastMessage.toLowerCase().includes(q)) return true;
        // Match participant names
        if (c.participants.some((p) => p.name.toLowerCase().includes(q)))
          return true;
        // Match context fields
        if (c.context?.reservationId?.toLowerCase().includes(q)) return true;
        if (c.context?.customerId?.toLowerCase().includes(q)) return true;
        if (c.context?.driverId?.toLowerCase().includes(q)) return true;
        // Match tags
        if (c.tags?.some((tag) => tag.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // Pagination
    const total = conversations.length;
    const offset = (page - 1) * limit;
    const paginatedConversations = conversations.slice(offset, offset + limit);

    const response: AdminMessagesListResponse = {
      conversations: paginatedConversations,
      total,
      page,
      limit,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages." },
      { status: 500 },
    );
  }
}
