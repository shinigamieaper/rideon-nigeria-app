import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function parseAccessExpiresAt(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof (raw as any)?.toDate === "function") {
    try {
      return (raw as any).toDate();
    } catch {
      return null;
    }
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function isPlacementConversation(conv: any): boolean {
  const memberKey = typeof conv?.memberKey === "string" ? conv.memberKey : "";
  if (memberKey.endsWith("|placement")) return true;
  const source =
    typeof conv?.context?.source === "string"
      ? String(conv.context.source)
      : "";
  if (source === "placement_portfolio") return true;
  return false;
}

function pickPlacementStatus(
  values: string[],
): "accepted" | "requested" | "declined" | undefined {
  const v = values.map((x) => String(x || "").trim()).filter(Boolean);
  if (
    v.includes("accepted") ||
    v.includes("scheduled") ||
    v.includes("admin_approved")
  )
    return "accepted";
  if (v.includes("requested")) return "requested";
  if (v.includes("declined")) return "declined";
  return undefined;
}

async function computePlacementStatuses(conversationId: string): Promise<{
  placementContactStatus?: "accepted" | "requested" | "declined";
  placementHireStatus?: "accepted" | "requested" | "declined";
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

  const interviewStatuses: string[] = (iSnap?.docs || []).map((d: any) => {
    try {
      const v = d.data() as any;
      return String(v?.status || "");
    } catch {
      return "";
    }
  });
  const hireStatuses: string[] = (hSnap?.docs || []).map((d: any) => {
    try {
      const v = d.data() as any;
      return String(v?.status || "");
    } catch {
      return "";
    }
  });

  return {
    placementContactStatus: pickPlacementStatus(interviewStatuses),
    placementHireStatus: pickPlacementStatus(hireStatuses),
  };
}

async function persistDerivedPlacementStatuses(args: {
  conversationId: string;
  derived: { placementContactStatus?: string; placementHireStatus?: string };
  nowIso: string;
}) {
  const { conversationId, derived, nowIso } = args;
  const updates: Record<string, unknown> = { updatedAt: nowIso };
  if (derived.placementContactStatus)
    updates["context.placementContactStatus"] = derived.placementContactStatus;
  if (derived.placementHireStatus)
    updates["context.placementHireStatus"] = derived.placementHireStatus;
  const keys = Object.keys(updates);
  if (keys.length <= 1) return;
  await adminDb.collection("conversations").doc(conversationId).update(updates);
}

// GET /api/messages/[conversationId]
// Returns message history for a conversation (auth user must be a member)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    const convRef = adminDb.collection("conversations").doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const convData = convSnap.data() as any;
    const members: string[] = Array.isArray(convData.memberIds)
      ? convData.memberIds
      : [];
    if (!members.includes(uid)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const otherId = members.find((m) => m !== uid) || null;
    const profiles =
      (convData.participantProfiles as Record<
        string,
        { name?: string; avatarUrl?: string }
      >) || {};
    const other = otherId
      ? profiles[otherId] || { name: "Conversation", avatarUrl: null }
      : { name: "RideOn Support", avatarUrl: null };

    let context =
      convData.context && typeof convData.context === "object"
        ? convData.context
        : {};
    const placementContactStatus =
      typeof context?.placementContactStatus === "string"
        ? String(context.placementContactStatus)
        : "";
    const placementHireStatus =
      typeof context?.placementHireStatus === "string"
        ? String(context.placementHireStatus)
        : "";
    const needsBackfill =
      isPlacementConversation(convData) &&
      !placementContactStatus &&
      !placementHireStatus;

    if (needsBackfill) {
      try {
        const derived = await computePlacementStatuses(conversationId);
        const nowIso = new Date().toISOString();
        await persistDerivedPlacementStatuses({
          conversationId,
          derived,
          nowIso,
        });
        context = { ...context, ...derived };
      } catch (e) {
        console.warn(
          "[messages] failed to backfill placement context status",
          e,
        );
      }
    }

    // Mark as read for this user (best-effort; do not block response)
    try {
      await convRef.update({ [`unreadCounts.${uid}`]: 0 });
    } catch (e) {
      console.warn("[messages] failed to mark conversation read", e);
    }

    // Read last 200 messages ordered ascending by createdAt (ISO string)
    const msgCol = convRef.collection("messages");
    const msgsSnap = await msgCol.orderBy("createdAt", "asc").limit(200).get();
    const messages = msgsSnap.docs
      .map((d) => {
        const m = d.data() as any;

        // Hide internal notes from end users; these are only for admins.
        if (m?.meta?.internalNote) {
          return null;
        }

        // Normalize createdAt to ISO string
        let createdAtIso: string | null = null;
        const ca = m?.createdAt;
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
        }

        return {
          id: d.id,
          senderId: m.senderId,
          content:
            typeof m.content === "string"
              ? m.content
              : typeof m.text === "string"
                ? m.text
                : "",
          createdAt: createdAtIso,
          status: m.status || "sent",
        };
      })
      .filter(
        (
          m,
        ): m is {
          id: string;
          senderId: string;
          content: string;
          createdAt: string | null;
          status: string;
        } => m !== null,
      );

    return NextResponse.json(
      {
        id: convSnap.id,
        type: convData.type || "direct",
        status: convData.status || "open",
        context,
        other: {
          id: otherId,
          name: other?.name || "Conversation",
          avatarUrl: other?.avatarUrl || null,
        },
        messages,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation messages." },
      { status: 500 },
    );
  }
}

// POST /api/messages/[conversationId]
// Body: { content: string }
// Sends a new message in the conversation and updates unread counts / last message metadata
export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}) as any);
    const raw = typeof body?.content === "string" ? body.content : "";
    const content = raw.trim();
    if (!content) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 },
      );
    }
    const safeContent = content.slice(0, 2000);

    const nowIso = new Date().toISOString();

    const convRef = adminDb.collection("conversations").doc(conversationId);
    const msgRef = convRef.collection("messages").doc();

    const preConvSnap = await convRef.get();
    if (!preConvSnap.exists) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const preConv = preConvSnap.data() as any;
    const preMembers: string[] = Array.isArray(preConv?.memberIds)
      ? preConv.memberIds
      : [];
    if (!preMembers.includes(uid)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (isPlacementConversation(preConv)) {
      let context =
        preConv.context && typeof preConv.context === "object"
          ? preConv.context
          : {};
      let placementContactStatus =
        typeof context?.placementContactStatus === "string"
          ? String(context.placementContactStatus)
          : "";
      let placementHireStatus =
        typeof context?.placementHireStatus === "string"
          ? String(context.placementHireStatus)
          : "";

      if (!placementContactStatus && !placementHireStatus) {
        try {
          const derived = await computePlacementStatuses(conversationId);
          await persistDerivedPlacementStatuses({
            conversationId,
            derived,
            nowIso,
          });
          context = { ...context, ...derived };
          placementContactStatus =
            typeof derived.placementContactStatus === "string"
              ? derived.placementContactStatus
              : "";
          placementHireStatus =
            typeof derived.placementHireStatus === "string"
              ? derived.placementHireStatus
              : "";
        } catch (e) {
          console.warn(
            "[messages] failed to backfill placement context status",
            e,
          );
        }
      }

      const accepted =
        placementContactStatus === "accepted" ||
        placementHireStatus === "accepted";
      if (!accepted) {
        return NextResponse.json(
          { error: "Waiting for the driver to accept your request." },
          { status: 403 },
        );
      }

      const customerId =
        typeof context?.customerId === "string"
          ? String(context.customerId)
          : "";
      if (customerId && customerId === uid) {
        const userSnap = await adminDb.collection("users").doc(uid).get();
        const userData = userSnap.exists ? (userSnap.data() as any) : {};
        const placementAccess =
          userData?.placementAccess &&
          typeof userData.placementAccess === "object"
            ? userData.placementAccess
            : {};
        const expiresAt = parseAccessExpiresAt(
          placementAccess?.accessExpiresAt,
        );
        const hasAccess = Boolean(
          expiresAt && expiresAt.getTime() > Date.now(),
        );
        if (!hasAccess) {
          return NextResponse.json(
            {
              error: "Your access has expired. Renew access to send messages.",
            },
            { status: 403 },
          );
        }
      }
    }

    await adminDb.runTransaction(async (tx) => {
      const convSnap = await tx.get(convRef);
      if (!convSnap.exists) throw new Error("Conversation not found");
      const conv = convSnap.data() as any;
      const members: string[] = Array.isArray(conv.memberIds)
        ? conv.memberIds
        : [];
      if (!members.includes(uid)) throw new Error("Forbidden");
      const otherId = members.find((m) => m !== uid) || null;

      // Create message
      tx.set(msgRef, {
        senderId: uid,
        content: safeContent,
        createdAt: nowIso,
        status: "sent",
      });

      // Update conversation summary and unread counts
      const unread = { ...(conv.unreadCounts || {}) } as Record<string, number>;
      if (otherId) {
        unread[otherId] = Math.max(0, Number(unread[otherId] || 0)) + 1;
      }
      // Sender's unread count stays as-is (commonly 0 for their own thread)

      tx.set(
        convRef,
        {
          lastMessage: safeContent.slice(0, 160),
          lastMessageAt: nowIso,
          unreadCounts: unread,
        },
        { merge: true },
      );
    });

    return NextResponse.json(
      { ok: true, id: msgRef.id, createdAt: nowIso },
      { status: 201 },
    );
  } catch (error: any) {
    const msg =
      typeof error?.message === "string"
        ? error.message
        : "Failed to send message.";
    console.error("Error sending message:", error);
    if (msg === "Conversation not found") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (msg === "Forbidden") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 },
    );
  }
}
