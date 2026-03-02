import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

type PartnerTeamRole = "admin" | "manager" | "viewer";

function getPartnerTeamClaim(
  decoded: unknown,
): { partnerId?: string; role?: string } | null {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const raw = (d?.partnerTeam ?? claims?.partnerTeam) as unknown;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    partnerId: typeof r.partnerId === "string" ? r.partnerId : undefined,
    role: typeof r.role === "string" ? r.role : undefined,
  };
}

function getPartnerTeamsClaim(
  decoded: unknown,
): Record<string, PartnerTeamRole> | null {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const raw = (d?.partnerTeams ?? claims?.partnerTeams) as unknown;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: Record<string, PartnerTeamRole> = {};
  for (const [k, v] of Object.entries(r)) {
    if (typeof k !== "string" || !k.trim()) continue;
    if (v === "admin" || v === "manager" || v === "viewer") {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ inviteId: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const partnerId =
      typeof body?.partnerId === "string" ? body.partnerId.trim() : "";

    if (!partnerId) {
      return NextResponse.json(
        { error: "Missing partnerId." },
        { status: 400 },
      );
    }

    const { inviteId } = await ctx.params;

    const user = await adminAuth.getUser(uid);
    const email = (user.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        {
          error: "Your account does not have an email. Please contact support.",
        },
        { status: 400 },
      );
    }

    const inviteRef = adminDb
      .collection("partner_applications")
      .doc(partnerId)
      .collection("teamInvites")
      .doc(inviteId);

    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    const invite = inviteSnap.data() as Record<string, unknown>;
    const inviteEmail =
      typeof invite.email === "string" ? invite.email.trim().toLowerCase() : "";
    const inviteRoleRaw =
      typeof invite.role === "string" ? invite.role : "viewer";
    const inviteRole: PartnerTeamRole =
      inviteRoleRaw === "admin" ||
      inviteRoleRaw === "manager" ||
      inviteRoleRaw === "viewer"
        ? inviteRoleRaw
        : "viewer";
    const status =
      typeof invite.status === "string" ? invite.status : "pending";

    if (status !== "pending") {
      return NextResponse.json(
        { error: `Invite is not pending (current: ${status}).` },
        { status: 400 },
      );
    }

    if (inviteEmail !== email) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address." },
        { status: 403 },
      );
    }

    const memberRef = adminDb
      .collection("partner_applications")
      .doc(partnerId)
      .collection("teamMembers")
      .doc(uid);

    await adminDb.runTransaction(async (tx) => {
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) {
        tx.set(memberRef, {
          uid,
          email,
          role: inviteRole,
          createdAt: FieldValue.serverTimestamp(),
          createdBy:
            typeof invite.createdBy === "string" ? invite.createdBy : null,
        });
      }

      tx.set(
        inviteRef,
        {
          status: "accepted",
          acceptedAt: FieldValue.serverTimestamp(),
          acceptedBy: uid,
        },
        { merge: true },
      );
    });

    const existingClaims = user.customClaims || {};
    const existingPartnerTeam = getPartnerTeamClaim({ claims: existingClaims });
    const existingPartnerTeams =
      getPartnerTeamsClaim({ claims: existingClaims }) || {};

    const nextPartnerTeams: Record<string, PartnerTeamRole> = {
      ...existingPartnerTeams,
      [partnerId]: inviteRole,
    };

    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      partnerTeams: nextPartnerTeams,
      partnerTeam: {
        partnerId,
        role: inviteRole,
        previousPartnerId: existingPartnerTeam?.partnerId || null,
      },
    });

    const res = NextResponse.json(
      { success: true, partnerId },
      { status: 200 },
    );
    res.cookies.set("rideon_partner_context", partnerId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("Error accepting team invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite." },
      { status: 500 },
    );
  }
}
