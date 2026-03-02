export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";
import type { AdminReplyRequest, MessageMeta } from "@/types/messaging";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * POST /api/admin/messages/[conversationId]/reply
 *
 * Send a message as "Support" from an admin/agent.
 *
 * Body:
 *   - content: string (required)
 *   - internalNote: boolean (optional) - if true, message is internal and not visible to user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caller, response } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    const adminUid = caller!.uid;
    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}) as AdminReplyRequest);
    const raw = typeof body?.content === "string" ? body.content : "";
    const content = raw.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 },
      );
    }
    const safeContent = content.slice(0, 2000);
    const isInternalNote = body?.internalNote === true;

    const nowIso = new Date().toISOString();

    const convRef = adminDb.collection("conversations").doc(conversationId);
    const msgRef = convRef.collection("messages").doc();

    await adminDb.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      if (!convSnap.exists) throw new Error("Conversation not found");

      const conv = convSnap.data() as Record<string, unknown>;
      const memberIds: string[] = Array.isArray(conv.memberIds)
        ? (conv.memberIds as string[])
        : [];
      const context = (conv.context || {}) as Record<string, unknown>;
      const source =
        typeof context?.source === "string" ? String(context.source) : "";
      const memberKey =
        typeof conv.memberKey === "string" ? String(conv.memberKey) : "";
      const isPlacement =
        source === "placement_portfolio" || memberKey.endsWith("|placement");

      if (isPlacement && !isInternalNote) {
        throw new Error("PLACEMENT_VIEW_ONLY");
      }

      // Build message metadata
      const meta: MessageMeta = {
        agentId: adminUid, // Track which admin sent the message
      };
      if (isInternalNote) {
        meta.internalNote = true;
      }

      // Create message with sender as 'support'
      tx.set(msgRef, {
        senderId: "support",
        senderRole: "support",
        content: safeContent,
        createdAt: nowIso,
        status: "sent",
        meta,
      });

      // Update conversation summary and unread counts
      // Only update unread counts for non-internal notes
      const unread = {
        ...((conv.unreadCounts as Record<string, number>) || {}),
      };

      if (!isInternalNote) {
        // Increment unread for all non-support members
        for (const memberId of memberIds) {
          if (memberId !== "support") {
            unread[memberId] = Math.max(0, Number(unread[memberId] || 0)) + 1;
          }
        }
        // Reset support unread
        unread.support = 0;
      }

      // Prepare conversation updates
      const convUpdates: Record<string, unknown> = {
        updatedAt: nowIso,
        unreadCounts: unread,
      };

      // Only update lastMessage for non-internal notes
      if (!isInternalNote) {
        convUpdates.lastMessage = safeContent.slice(0, 160);
        convUpdates.lastMessageAt = nowIso;
        convUpdates.lastMessageSenderId = "support";
      }

      // Track first response time for support conversations
      if (!conv.firstResponseAt && conv.type === "support") {
        convUpdates.firstResponseAt = nowIso;
      }

      // If conversation was pending/resolved and support replies, set to open
      if (!isInternalNote && conv.status === "pending") {
        convUpdates.status = "open";
      }

      // Auto-assign to this agent if unassigned
      if (!conv.assignedAgentId) {
        convUpdates.assignedAgentId = adminUid;
      }

      tx.set(convRef, convUpdates, { merge: true });
    });

    return NextResponse.json(
      {
        ok: true,
        id: msgRef.id,
        createdAt: nowIso,
        internalNote: isInternalNote,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Failed to send message.";
    console.error("Error sending admin reply:", error);

    if (msg === "Conversation not found") {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }
    if (msg === "PLACEMENT_VIEW_ONLY") {
      return NextResponse.json(
        {
          error:
            "Placement conversations are view-only. Use an internal note instead.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 },
    );
  }
}
