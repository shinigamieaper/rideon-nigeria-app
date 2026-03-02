import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  canManageTeam,
  resolvePartnerPortalContext,
} from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ inviteId: string }> },
) {
  try {
    const auth = await resolvePartnerPortalContext(req);
    if (auth instanceof NextResponse) return auth;
    if (!canManageTeam(auth)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { inviteId } = await ctx.params;

    const inviteRef = adminDb
      .collection("partner_applications")
      .doc(auth.partnerId)
      .collection("teamInvites")
      .doc(inviteId);

    const snap = await inviteRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    await inviteRef.set(
      {
        status: "revoked",
        revokedAt: FieldValue.serverTimestamp(),
        revokedBy: auth.actorUid,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error revoking invite:", error);
    return NextResponse.json(
      { error: "Failed to revoke invite." },
      { status: 500 },
    );
  }
}
