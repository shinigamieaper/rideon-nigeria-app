export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * POST /api/admin/messages/[conversationId]/join
 *
 * Allows an admin to join a trip conversation as Support.
 * This adds 'support' to memberIds if not already present and sets context.supportInvolved.
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
    const adminEmail = caller!.email || "admin";
    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const convRef = adminDb.collection("conversations").doc(conversationId);

    await adminDb.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      if (!convSnap.exists) {
        throw new Error("Conversation not found");
      }

      const conv = convSnap.data() as Record<string, unknown>;
      const memberIds: string[] = Array.isArray(conv.memberIds)
        ? (conv.memberIds as string[])
        : [];
      const participantProfiles = (conv.participantProfiles || {}) as Record<
        string,
        unknown
      >;
      const context = (conv.context || {}) as Record<string, unknown>;
      const source =
        typeof context?.source === "string" ? String(context.source) : "";
      const memberKey =
        typeof conv.memberKey === "string" ? String(conv.memberKey) : "";
      const isPlacement =
        source === "placement_portfolio" || memberKey.endsWith("|placement");

      if (isPlacement) {
        throw new Error("PLACEMENT_VIEW_ONLY");
      }

      // Check if support is already a member
      if (memberIds.includes("support")) {
        // Support already in the conversation
        return;
      }

      // Add support to memberIds
      const newMemberIds = [...memberIds, "support"];

      // Add support to participant profiles
      const newProfiles = {
        ...participantProfiles,
        support: { name: "RideOn Support", role: "support" },
      };

      // Update context to mark support involvement
      const newContext = {
        ...context,
        supportInvolved: true,
        supportJoinedAt: nowIso,
        supportJoinedBy: adminUid,
      };

      // Initialize unread count for support
      const unreadCounts = (conv.unreadCounts || {}) as Record<string, number>;
      const newUnreadCounts = {
        ...unreadCounts,
        support: 0,
      };

      tx.update(convRef, {
        memberIds: newMemberIds,
        participantProfiles: newProfiles,
        context: newContext,
        unreadCounts: newUnreadCounts,
        updatedAt: nowIso,
      });
    });

    await createAuditLog({
      actionType: "support_joined_conversation",
      actorId: adminUid,
      actorEmail: adminEmail,
      targetId: conversationId,
      targetType: "conversation",
      details: `Support joined conversation ${conversationId}`,
      metadata: {
        supportJoinedBy: adminUid,
        supportJoinedAt: nowIso,
      },
    });

    return NextResponse.json({ ok: true, joinedAt: nowIso }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Failed to join conversation.";
    console.error("Error joining conversation as support:", error);

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
            "Placement conversations are view-only and cannot be joined as support.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Failed to join conversation." },
      { status: 500 },
    );
  }
}
