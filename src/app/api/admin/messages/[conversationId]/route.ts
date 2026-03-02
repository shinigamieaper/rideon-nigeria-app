export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";
import type {
  ConversationType,
  ConversationStatus,
  ConversationPriority,
  MessageSenderRole,
  AdminConversationDetailResponse,
  AdminUpdateConversationRequest,
} from "@/types/messaging";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * GET /api/admin/messages/[conversationId]
 *
 * Returns conversation detail including messages.
 * Admins bypass membership check - they can view any conversation.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { response: authResponse } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (authResponse) return authResponse;

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    // Fetch conversation (admin bypasses membership check)
    const convRef = adminDb.collection("conversations").doc(conversationId);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const data = convSnap.data() as Record<string, unknown>;

    // Build participants list with additional info
    const memberIds: string[] = Array.isArray(data.memberIds)
      ? (data.memberIds as string[])
      : [];
    const profiles = (data.participantProfiles || {}) as Record<string, any>;

    // Best-effort: enrich profiles from primary users collection when name/email are missing
    const memberIdsNeedingLookup = memberIds
      .filter((id) => id !== "support")
      .filter((id) => {
        const p = profiles[id] || {};
        const hasName =
          typeof p.name === "string" && p.name.trim() && p.name !== "Unknown";
        const hasEmail = typeof p.email === "string" && p.email.trim();
        return !hasName || !hasEmail;
      });

    const userProfileFallbacks: Record<string, any> = {};
    if (memberIdsNeedingLookup.length > 0) {
      await Promise.all(
        memberIdsNeedingLookup.map(async (id) => {
          try {
            const snap = await adminDb.collection("users").doc(id).get();
            if (!snap.exists) return;
            const u = snap.data() as any;
            const firstName =
              typeof u?.firstName === "string" ? u.firstName : "";
            const lastName = typeof u?.lastName === "string" ? u.lastName : "";
            const fullName = [firstName, lastName]
              .filter(Boolean)
              .join(" ")
              .trim();

            userProfileFallbacks[id] = {
              name: fullName || undefined,
              email: typeof u?.email === "string" ? u.email : undefined,
              avatarUrl:
                typeof u?.profileImageUrl === "string"
                  ? u.profileImageUrl
                  : undefined,
              role: typeof u?.role === "string" ? u.role : undefined,
              phone: typeof u?.phone === "string" ? u.phone : undefined,
            };
          } catch (e) {
            console.warn(
              "[admin/messages] Failed to fetch user profile for participant",
              id,
              e,
            );
          }
        }),
      );
    }

    const participants = memberIds.map((id) => {
      const profile = profiles[id] || {};
      const fallback = userProfileFallbacks[id] || {};
      const isSupport = id === "support";

      const rawName = profile.name as string | undefined;
      const fallbackName = fallback.name as string | undefined;
      const emailFromProfile =
        typeof profile.email === "string" && profile.email.trim()
          ? profile.email
          : undefined;
      const emailFromFallback =
        typeof fallback.email === "string" && fallback.email.trim()
          ? fallback.email
          : undefined;

      const name = isSupport
        ? "RideOn Support"
        : rawName && rawName.trim() && rawName !== "Unknown"
          ? rawName
          : fallbackName || emailFromProfile || emailFromFallback || "Unknown";

      return {
        id,
        name,
        role: isSupport ? "support" : profile.role || fallback.role || null,
        avatarUrl: profile.avatarUrl || fallback.avatarUrl || null,
        email: emailFromProfile || emailFromFallback || null,
        phone: profile.phone || fallback.phone || null,
      };
    });

    // Normalize timestamps
    const normalizeTimestamp = (ts: unknown): string | undefined => {
      if (typeof ts === "string") return ts;
      if (ts && typeof (ts as any).toDate === "function") {
        return (ts as any).toDate().toISOString();
      }
      return undefined;
    };

    // Fetch messages
    const messagesSnap = await convRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(500)
      .get();

    const messages = messagesSnap.docs.map((doc) => {
      const m = doc.data();
      const content =
        typeof m.content === "string"
          ? m.content
          : typeof m.text === "string"
            ? m.text
            : "";

      // Determine sender role
      let senderRole: MessageSenderRole = "customer";
      if (m.senderId === "support") {
        senderRole = "support";
      } else if (m.senderRole) {
        senderRole = m.senderRole;
      } else {
        // Infer from participant profiles
        const profile = profiles[m.senderId];
        if (profile?.role) {
          senderRole = profile.role;
        }
      }

      return {
        id: doc.id,
        senderId: m.senderId,
        senderRole,
        content,
        createdAt: normalizeTimestamp(m.createdAt) || new Date().toISOString(),
        meta: m.meta || undefined,
      };
    });

    // Mark as read for support side (best effort)
    try {
      await convRef.update({ "unreadCounts.support": 0 });
    } catch (e) {
      console.warn(
        "[admin/messages] Failed to mark conversation read for support",
        e,
      );
    }

    const response: AdminConversationDetailResponse = {
      conversation: {
        id: convSnap.id,
        type: (data.type || "support") as ConversationType,
        status: (data.status || "open") as ConversationStatus,
        priority: (data.priority || "normal") as ConversationPriority,
        assignedAgentId: data.assignedAgentId as string | undefined,
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        context: data.context as any,
        participants,
        createdAt:
          normalizeTimestamp(data.createdAt) || new Date().toISOString(),
        firstResponseAt: normalizeTimestamp(data.firstResponseAt),
        resolvedAt: normalizeTimestamp(data.resolvedAt),
      },
      messages,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin conversation detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/messages/[conversationId]
 *
 * Update conversation properties (status, priority, assignment, tags).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { caller, response } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    const adminUid = caller!.uid;
    const adminEmail = caller!.email || "admin";
    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    const body = await request
      .json()
      .catch(() => ({}) as AdminUpdateConversationRequest);
    const { status, priority, assignedAgentId, tags } = body;

    // Validate inputs
    const validStatuses = ["open", "pending", "resolved", "closed"];
    const validPriorities = ["low", "normal", "high", "urgent"];

    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    if (priority !== undefined && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }

    // Fetch conversation
    const convRef = adminDb.collection("conversations").doc(conversationId);
    const convSnap = await convRef.get();

    if (!convSnap.exists) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: nowIso };

    if (status !== undefined) {
      updates.status = status;
      // Track resolution/close timestamps
      if (status === "resolved" && !convSnap.data()?.resolvedAt) {
        updates.resolvedAt = nowIso;
      }
      if (status === "closed" && !convSnap.data()?.closedAt) {
        updates.closedAt = nowIso;
      }
    }

    if (priority !== undefined) {
      updates.priority = priority;
    }

    if (assignedAgentId !== undefined) {
      updates.assignedAgentId =
        assignedAgentId === null ? null : assignedAgentId;
    }

    if (tags !== undefined && Array.isArray(tags)) {
      updates.tags = tags.filter((t) => typeof t === "string").slice(0, 10);
    }

    await convRef.update(updates);

    const changedFields = Object.keys(updates).filter(
      (key) => key !== "updatedAt",
    );

    await createAuditLog({
      actionType: "conversation_updated",
      actorId: adminUid,
      actorEmail: adminEmail,
      targetId: conversationId,
      targetType: "conversation",
      details:
        changedFields.length > 0
          ? `Updated conversation ${conversationId}: ${changedFields.join(", ")}`
          : `Updated conversation ${conversationId}`,
      metadata: { updates },
    });

    return NextResponse.json({ ok: true, updatedAt: nowIso }, { status: 200 });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation." },
      { status: 500 },
    );
  }
}
