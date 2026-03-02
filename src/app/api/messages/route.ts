import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/messages
// Returns the authenticated user's conversation threads (inbox)
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Fetch conversations where the user is a member.
    const snap = await adminDb
      .collection("conversations")
      .where("memberIds", "array-contains", uid)
      .get();

    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      const otherId = Array.isArray(data.memberIds)
        ? (data.memberIds.find((x: string) => x !== uid) ?? null)
        : null;
      const profiles =
        (data.participantProfiles as Record<
          string,
          { name?: string; avatarUrl?: string }
        >) || {};
      const other = (otherId && profiles[otherId]) || null;

      return {
        id: d.id,
        type: data.type || "direct",
        memberKey: typeof data.memberKey === "string" ? data.memberKey : null,
        contextSource:
          typeof data?.context?.source === "string"
            ? data.context.source
            : null,
        name:
          other?.name ||
          data.title ||
          (otherId ? "Conversation" : "RideOn Support"),
        avatarUrl: other?.avatarUrl || null,
        lastMessage:
          typeof data.lastMessage === "string" ? data.lastMessage : "",
        lastMessageAt:
          typeof data.lastMessageAt === "string" ? data.lastMessageAt : null,
        unreadCount:
          data.unreadCounts && typeof data.unreadCounts[uid] === "number"
            ? data.unreadCounts[uid]
            : 0,
      };
    });

    // Sort by lastMessageAt desc (client-friendly ordering without requiring composite index)
    items.sort((a, b) => {
      const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return tb - ta;
    });

    return NextResponse.json({ conversations: items }, { status: 200 });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations." },
      { status: 500 },
    );
  }
}
