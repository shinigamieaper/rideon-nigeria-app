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
  ctx: { params: Promise<{ memberUid: string }> },
) {
  try {
    const auth = await resolvePartnerPortalContext(req);
    if (auth instanceof NextResponse) return auth;
    if (!canManageTeam(auth)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { memberUid } = await ctx.params;

    if (memberUid === auth.partnerId) {
      return NextResponse.json(
        { error: "Cannot remove partner owner." },
        { status: 400 },
      );
    }

    const memberRef = adminDb
      .collection("partner_applications")
      .doc(auth.partnerId)
      .collection("teamMembers")
      .doc(memberUid);

    const snap = await memberRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    await memberRef.set(
      {
        removedAt: FieldValue.serverTimestamp(),
        removedBy: auth.actorUid,
        status: "removed",
      },
      { merge: true },
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove member." },
      { status: 500 },
    );
  }
}
