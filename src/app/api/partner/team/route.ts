import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  canManageTeam,
  resolvePartnerPortalContext,
} from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

function toIso(input: unknown): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "object" && input && "toDate" in input) {
    const maybe = input as { toDate?: () => Date };
    try {
      return maybe.toDate?.()?.toISOString?.() || null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req);
    if (ctx instanceof NextResponse) return ctx;

    const appSnap = await adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId)
      .get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const membersSnap = await adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId)
      .collection("teamMembers")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const invitesSnap = await adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId)
      .collection("teamInvites")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const members = membersSnap.docs
      .map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          uid: doc.id,
          email: typeof d.email === "string" ? d.email : "",
          role: typeof d.role === "string" ? d.role : "viewer",
          addedAt: toIso(d.createdAt),
          addedBy: typeof d.createdBy === "string" ? d.createdBy : null,
          status: typeof d.status === "string" ? d.status : "active",
        };
      })
      .filter((m) => m.status !== "removed");

    const invites = invitesSnap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        email: typeof d.email === "string" ? d.email : "",
        role: typeof d.role === "string" ? d.role : "viewer",
        status: typeof d.status === "string" ? d.status : "pending",
        createdAt: toIso(d.createdAt),
      };
    });

    const canManage = canManageTeam(ctx);

    return NextResponse.json(
      {
        partnerId: ctx.partnerId,
        actor: {
          uid: ctx.actorUid,
          kind: ctx.kind,
          teamRole: ctx.kind === "team" ? ctx.teamRole : null,
        },
        canManage,
        members,
        invites,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner team:", error);
    return NextResponse.json(
      { error: "Failed to fetch team data." },
      { status: 500 },
    );
  }
}
