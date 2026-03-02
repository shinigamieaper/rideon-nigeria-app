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

// GET /api/driver/messages
// Returns list of all conversations for the authenticated driver
export async function GET(req: Request) {
  try {
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

    // Fetch conversations where driver is a participant
    // Try indexed query first; if index is missing, fall back to no-order query and sort in-memory.
    let conversationsSnap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    try {
      conversationsSnap = await adminDb
        .collection("conversations")
        .where("memberIds", "array-contains", uid)
        .orderBy("lastMessageAt", "desc")
        .limit(50)
        .get();
    } catch (e) {
      console.warn(
        "[api/driver/messages] Indexed query failed, falling back to no-order query. Ensure composite index exists for memberIds CONTAINS + lastMessageAt DESC.",
        e,
      );
      conversationsSnap = await adminDb
        .collection("conversations")
        .where("memberIds", "array-contains", uid)
        .limit(50)
        .get();
    }

    const conversations = await Promise.all(
      conversationsSnap.docs.map(async (doc) => {
        const data = doc.data() as any;

        if (isPlacementConversation(data)) {
          return null;
        }

        // Get other participant info
        const memberIds = Array.isArray(data.memberIds) ? data.memberIds : [];
        const otherParticipantId = memberIds.find((p: string) => p !== uid);
        let otherParticipantName = "Unknown";
        let otherParticipantAvatar: string | null = null;

        if (otherParticipantId === "support") {
          otherParticipantName = "RideOn Support";
          otherParticipantAvatar = "/logo-icon.png";
        } else if (otherParticipantId) {
          try {
            const userDoc = await adminDb
              .collection("users")
              .doc(otherParticipantId)
              .get();
            if (userDoc.exists) {
              const userData = userDoc.data() as any;
              otherParticipantName =
                `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() ||
                "User";
              otherParticipantAvatar =
                typeof userData?.profileImageUrl === "string"
                  ? userData.profileImageUrl
                  : null;
            }
          } catch (e) {
            console.warn("Failed to fetch participant info", e);
          }
        }

        // Compute unreadCount from map if present; fallback to legacy array field
        let unreadCount = 0;
        if (data?.unreadCounts && typeof data.unreadCounts[uid] === "number") {
          unreadCount = data.unreadCounts[uid];
        } else if (
          Array.isArray(data?.unreadBy) &&
          data.unreadBy.includes(uid)
        ) {
          unreadCount = 1;
        }

        // Normalize lastMessageAt to ISO string
        let lastMessageAtIso: string;
        const lma = data?.lastMessageAt;
        if (typeof lma === "string") {
          lastMessageAtIso = lma;
        } else if (lma?.toDate) {
          // Firestore Timestamp
          try {
            lastMessageAtIso = lma.toDate().toISOString();
          } catch {
            lastMessageAtIso = new Date(0).toISOString();
          }
        } else if (lma instanceof Date) {
          lastMessageAtIso = lma.toISOString();
        } else {
          lastMessageAtIso = new Date(0).toISOString();
        }

        return {
          id: doc.id,
          otherParticipantId,
          otherParticipantName,
          otherParticipantAvatar,
          lastMessage:
            typeof data?.lastMessage === "string" ? data.lastMessage : "",
          lastMessageAt: lastMessageAtIso,
          unreadCount,
        };
      }),
    );

    const filteredConversations = conversations.filter(
      (c): c is NonNullable<typeof c> => Boolean(c),
    );

    // If we used the fallback (no orderBy), enforce descending order here for a consistent client experience
    filteredConversations.sort((a, b) => {
      const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return tb - ta;
    });

    return NextResponse.json(
      { conversations: filteredConversations },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching driver messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages." },
      { status: 500 },
    );
  }
}
