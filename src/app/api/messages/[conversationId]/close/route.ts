import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

/**
 * POST /api/messages/[conversationId]/close
 *
 * Allows a conversation member (customer/driver) to mark a conversation as resolved.
 * This is typically used by customers to close their support tickets.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice("Bearer ".length);
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    // Parse optional body for status choice
    const body = await request.json().catch(() => ({}));
    const requestedStatus = body?.status;

    // User can only set to 'resolved' or 'closed' (not reopen)
    const validStatuses = ["resolved", "closed"];
    const newStatus = validStatuses.includes(requestedStatus)
      ? requestedStatus
      : "resolved";

    const nowIso = new Date().toISOString();
    const convRef = adminDb.collection("conversations").doc(conversationId);

    // Transaction to ensure atomic read + write
    const result = await adminDb.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      if (!convSnap.exists) {
        return { error: "Conversation not found.", status: 404 };
      }

      const conv = convSnap.data() as Record<string, unknown>;
      const memberIds = Array.isArray(conv.memberIds)
        ? (conv.memberIds as string[])
        : [];

      // Check if user is a member of this conversation
      if (!memberIds.includes(uid)) {
        return {
          error: "Forbidden: You are not a member of this conversation.",
          status: 403,
        };
      }

      const currentStatus = conv.status as string;

      // Don't allow reopening via this endpoint
      if (currentStatus === "closed") {
        return { error: "Conversation is already closed.", status: 400 };
      }

      // Build update object
      const updates: Record<string, unknown> = {
        status: newStatus,
        updatedAt: nowIso,
      };

      // Set timestamp fields based on new status
      if (newStatus === "resolved" && !conv.resolvedAt) {
        updates.resolvedAt = nowIso;
      }
      if (newStatus === "closed" && !conv.closedAt) {
        updates.closedAt = nowIso;
        // Also set resolvedAt if not already set
        if (!conv.resolvedAt) {
          updates.resolvedAt = nowIso;
        }
      }

      tx.update(convRef, updates);

      return {
        ok: true,
        previousStatus: currentStatus,
        newStatus,
        resolvedAt: updates.resolvedAt || conv.resolvedAt,
        closedAt: updates.closedAt || conv.closedAt,
      };
    });

    // Handle transaction result
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error closing conversation:", error);
    return NextResponse.json(
      { error: "Failed to close conversation." },
      { status: 500 },
    );
  }
}
