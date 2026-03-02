import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import type {
  Conversation,
  ConversationContext,
  ParticipantProfile,
  ParticipantRole,
} from "@/types/messaging";

export const runtime = "nodejs";

// POST /api/messages/contact-support
// Body (optional): { source?: string; channel?: string; subject?: string }
// Creates a NEW support conversation for the authenticated user.
export async function POST(req: Request) {
  try {
    // Check if support chat is enabled via feature flag
    try {
      const flagsDoc = await adminDb
        .collection("config")
        .doc("feature_flags")
        .get();
      const flagsData = flagsDoc.exists ? flagsDoc.data() : {};
      const supportChatEnabled = flagsData?.supportChatEnabled !== false; // Default to true

      if (!supportChatEnabled) {
        return NextResponse.json(
          {
            error:
              "Support chat is currently unavailable. Please contact us via phone or email.",
            code: "SUPPORT_CHAT_DISABLED",
          },
          { status: 503 },
        );
      }
    } catch (flagError) {
      console.warn(
        "[contact-support] Failed to check feature flag, allowing by default",
        flagError,
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const role = decoded.role as string | undefined;

    // Parse optional body
    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const source =
      typeof body?.source === "string" ? body.source : "profile_support";
    const channel = typeof body?.channel === "string" ? body.channel : "in_app";

    // Fetch user profile for participant info
    const userRole: ParticipantRole = role === "driver" ? "driver" : "customer";
    let userProfile: ParticipantProfile = { role: userRole };
    try {
      const userSnap = await adminDb.collection("users").doc(uid).get();
      if (userSnap.exists) {
        const userData = userSnap.data() as Record<string, unknown>;
        const firstName =
          typeof userData?.firstName === "string" ? userData.firstName : "";
        const lastName =
          typeof userData?.lastName === "string" ? userData.lastName : "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

        // Rebuild profile without any undefined properties, as Firestore does not
        // allow undefined values in document data.
        userProfile = { role: userRole };
        if (fullName) {
          userProfile.name = fullName;
        }
        if (
          typeof userData?.profileImageUrl === "string" &&
          userData.profileImageUrl
        ) {
          userProfile.avatarUrl = userData.profileImageUrl as string;
        }
        if (typeof userData?.email === "string" && userData.email) {
          userProfile.email = userData.email as string;
        }
      }
    } catch (e) {
      console.warn("[contact-support] Failed to fetch user profile", e);
    }

    // Always create a NEW support conversation (no reuse for clean ticket tracking)
    const [a, b] = [uid, "support"].sort();
    const memberKey = `${a}|${b}-${Date.now()}`; // Unique per request

    const nowIso = new Date().toISOString();
    const convRef = adminDb.collection("conversations").doc();

    // Build context without undefined values
    const contextBase: Pick<ConversationContext, "channel" | "source"> = {
      channel: channel as ConversationContext["channel"],
      source: source as ConversationContext["source"],
    };
    const context: ConversationContext = {
      ...contextBase,
      ...(userRole === "customer" ? { customerId: uid } : {}),
      ...(userRole === "driver" ? { driverId: uid } : {}),
    };

    // Create conversation with expanded fields
    const conversationData: Omit<Conversation, "id"> = {
      type: "support",
      memberIds: [uid, "support"],
      memberKey,
      participantProfiles: {
        [uid]: userProfile,
        support: { name: "RideOn Support", role: "support" },
      },
      createdBy: uid,
      // Support/ticket semantics
      status: "open",
      priority: "normal",
      tags: [],
      // Context
      context,
      // Last activity
      lastMessage: "",
      lastMessageAt: nowIso,
      lastMessageSenderId: uid,
      unreadCounts: {
        [uid]: 0,
        support: 0,
      },
      // Timestamps
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await convRef.set(conversationData);

    return NextResponse.json(
      { id: convRef.id, created: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating support conversation:", error);
    return NextResponse.json(
      { error: "Failed to create support conversation." },
      { status: 500 },
    );
  }
}
