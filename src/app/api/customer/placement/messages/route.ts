export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";

async function getCustomerUid(req: Request): Promise<string | null> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  if (session) {
    const decoded = await verifyRideOnSessionCookie(session);
    if (decoded?.uid) return decoded.uid;
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

function isPlacementConversation(data: any): boolean {
  const memberKey = typeof data?.memberKey === "string" ? data.memberKey : "";
  if (memberKey.endsWith("|placement")) return true;
  const source =
    typeof data?.context?.source === "string"
      ? String(data.context.source)
      : "";
  if (source === "placement_portfolio") return true;
  return false;
}

function toIsoOrNull(input: any): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input?.toDate) {
    try {
      return input.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (input instanceof Date) {
    try {
      return input.toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const uid = await getCustomerUid(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snap = await adminDb
      .collection("conversations")
      .where("memberIds", "array-contains", uid)
      .get();

    const items = snap.docs
      .map((d) => {
        const data = d.data() as any;
        if (!isPlacementConversation(data)) return null;

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
          name:
            other?.name ||
            data.title ||
            (otherId ? "Conversation" : "RideOn Support"),
          avatarUrl: other?.avatarUrl || null,
          lastMessage:
            typeof data.lastMessage === "string" ? data.lastMessage : "",
          lastMessageAt: toIsoOrNull(data.lastMessageAt),
          unreadCount:
            data.unreadCounts && typeof data.unreadCounts[uid] === "number"
              ? data.unreadCounts[uid]
              : 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    items.sort((a, b) => {
      const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return tb - ta;
    });

    return NextResponse.json({ conversations: items }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/customer/placement/messages] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch placement conversations." },
      { status: 500 },
    );
  }
}
