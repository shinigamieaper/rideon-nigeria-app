import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function isPlacementConversation(conv: any): boolean {
  const memberKey =
    typeof conv?.memberKey === "string" ? String(conv.memberKey) : "";
  if (memberKey.endsWith("|placement")) return true;
  const source =
    typeof conv?.context?.source === "string"
      ? String(conv.context.source)
      : "";
  if (source === "placement_portfolio") return true;
  return false;
}

function isAcceptedPlacementStatus(status: string): boolean {
  const s = String(status || "").trim();
  return s === "accepted" || s === "scheduled" || s === "admin_approved";
}

async function computePlacementAccepted(conversationId: string): Promise<{
  placementContactStatus?: "accepted";
  placementHireStatus?: "accepted";
}> {
  const [iSnap, hSnap] = await Promise.all([
    adminDb
      .collection("placement_interview_requests")
      .where("conversationId", "==", conversationId)
      .limit(20)
      .get()
      .catch(() => null as any),
    adminDb
      .collection("placement_hire_requests")
      .where("conversationId", "==", conversationId)
      .limit(20)
      .get()
      .catch(() => null as any),
  ]);

  const interviewAccepted = (iSnap?.docs || []).some((d: any) => {
    try {
      const v = d.data() as any;
      return isAcceptedPlacementStatus(String(v?.status || ""));
    } catch {
      return false;
    }
  });

  const hireAccepted = (hSnap?.docs || []).some((d: any) => {
    try {
      const v = d.data() as any;
      return isAcceptedPlacementStatus(String(v?.status || ""));
    } catch {
      return false;
    }
  });

  return {
    ...(interviewAccepted
      ? { placementContactStatus: "accepted" as const }
      : {}),
    ...(hireAccepted ? { placementHireStatus: "accepted" as const } : {}),
  };
}

// GET /api/driver/messages/[conversationId]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }
    const uid = decoded.uid;

    // Verify driver is a participant
    const conversationDoc = await adminDb
      .collection("conversations")
      .doc(conversationId)
      .get();
    if (!conversationDoc.exists) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const conversationData = conversationDoc.data();
    const memberIds: string[] = Array.isArray(conversationData?.memberIds)
      ? conversationData.memberIds
      : Array.isArray(conversationData?.participants)
        ? conversationData.participants
        : [];
    if (!memberIds.includes(uid)) {
      return NextResponse.json(
        { error: "Unauthorized access to conversation." },
        { status: 403 },
      );
    }

    // Fetch messages
    const messagesSnap = await adminDb
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(200)
      .get();

    const messages = messagesSnap.docs
      .map((doc) => {
        const data = doc.data() as any;

        // Hide internal notes from driver-facing API
        if (data?.meta?.internalNote) {
          return null;
        }

        // Normalize createdAt to ISO string
        let createdAtIso: string;
        const ca = data?.createdAt;
        if (typeof ca === "string") {
          createdAtIso = ca;
        } else if (ca?.toDate) {
          try {
            createdAtIso = ca.toDate().toISOString();
          } catch {
            createdAtIso = new Date().toISOString();
          }
        } else if (ca instanceof Date) {
          createdAtIso = ca.toISOString();
        } else {
          createdAtIso = new Date().toISOString();
        }

        // Support legacy 'text' and newer 'content' field names
        const text =
          typeof data?.text === "string"
            ? data.text
            : typeof data?.content === "string"
              ? data.content
              : "";

        return {
          id: doc.id,
          senderId: data.senderId,
          text,
          createdAt: createdAtIso,
        };
      })
      .filter(
        (
          m,
        ): m is {
          id: string;
          senderId: string;
          text: string;
          createdAt: string;
        } => m !== null,
      )
      .sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return ta - tb;
      });

    // Mark conversation as read by driver (best effort)
    await adminDb
      .collection("conversations")
      .doc(conversationId)
      .set(
        {
          unreadCounts: {
            [uid]: 0,
          },
        },
        { merge: true },
      );

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation." },
      { status: 500 },
    );
  }
}

// POST /api/driver/messages/[conversationId]
export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }
    const uid = decoded.uid;

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Message text is required." },
        { status: 400 },
      );
    }

    // Verify driver is a participant
    const conversationDoc = await adminDb
      .collection("conversations")
      .doc(conversationId)
      .get();
    if (!conversationDoc.exists) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const conversationData = conversationDoc.data();
    const memberIds: string[] = Array.isArray(conversationData?.memberIds)
      ? conversationData.memberIds
      : Array.isArray(conversationData?.participants)
        ? conversationData.participants
        : [];
    if (!memberIds.includes(uid)) {
      return NextResponse.json(
        { error: "Unauthorized access to conversation." },
        { status: 403 },
      );
    }

    if (isPlacementConversation(conversationData)) {
      const context =
        conversationData?.context &&
        typeof conversationData.context === "object"
          ? conversationData.context
          : {};
      const contactStatus =
        typeof context?.placementContactStatus === "string"
          ? String(context.placementContactStatus)
          : "";
      const hireStatus =
        typeof context?.placementHireStatus === "string"
          ? String(context.placementHireStatus)
          : "";
      let accepted =
        isAcceptedPlacementStatus(contactStatus) ||
        isAcceptedPlacementStatus(hireStatus);

      if (!accepted) {
        try {
          const derived = await computePlacementAccepted(conversationId);
          const nowIso = new Date().toISOString();
          if (derived.placementContactStatus || derived.placementHireStatus) {
            const updates: Record<string, unknown> = { updatedAt: nowIso };
            if (derived.placementContactStatus)
              updates["context.placementContactStatus"] =
                derived.placementContactStatus;
            if (derived.placementHireStatus)
              updates["context.placementHireStatus"] =
                derived.placementHireStatus;
            await adminDb
              .collection("conversations")
              .doc(conversationId)
              .update(updates);
            accepted = true;
          }
        } catch (e) {
          console.warn(
            "[driver/messages] failed to backfill placement acceptance status",
            e,
          );
        }
      }

      if (!accepted) {
        return NextResponse.json(
          { error: "You need to accept the request before sending messages." },
          { status: 403 },
        );
      }
    }

    const nowIso = new Date().toISOString();

    // Create message
    const messageRef = adminDb
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .doc();

    await messageRef.set({
      senderId: uid,
      text: text.trim(),
      createdAt: nowIso,
    });

    // Update conversation
    const otherParticipant = memberIds.find((p: string) => p !== uid) ?? null;
    const unreadCounts = {
      ...(conversationData?.unreadCounts || {}),
    } as Record<string, number>;
    if (otherParticipant) {
      unreadCounts[otherParticipant] =
        Math.max(0, Number(unreadCounts[otherParticipant] || 0)) + 1;
    }
    unreadCounts[uid] = 0;

    await adminDb.collection("conversations").doc(conversationId).set(
      {
        lastMessage: text.trim(),
        lastMessageAt: nowIso,
        unreadCounts,
      },
      { merge: true },
    );

    return NextResponse.json(
      { success: true, id: messageRef.id, createdAt: nowIso },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 },
    );
  }
}
