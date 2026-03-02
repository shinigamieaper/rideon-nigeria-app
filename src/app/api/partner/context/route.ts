import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import type { PartnerTeamRole } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

function getRole(decoded: unknown): string | undefined {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const role = (d?.role ?? claims?.role) as string | undefined;
  return typeof role === "string" ? role : undefined;
}

export async function POST(req: Request) {
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
    const role = getRole(decoded);

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const partnerIdRaw =
      typeof body?.partnerId === "string" ? body.partnerId : "";
    const partnerId = partnerIdRaw.trim();

    if (!partnerId) {
      const res = NextResponse.json(
        { success: true, partnerId: null },
        { status: 200 },
      );
      res.cookies.set("rideon_partner_context", "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    if (role === "partner" || role === "partner_applicant") {
      if (partnerId !== uid) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const res = NextResponse.json(
        { success: true, partnerId, kind: "owner" },
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
    }

    const memberSnap = await adminDb
      .collection("partner_applications")
      .doc(partnerId)
      .collection("teamMembers")
      .doc(uid)
      .get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const md = memberSnap.data() as Record<string, unknown>;
    if (md?.status === "removed") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const roleRaw = md?.role;
    const teamRole: PartnerTeamRole | null =
      roleRaw === "admin" || roleRaw === "manager" || roleRaw === "viewer"
        ? (roleRaw as PartnerTeamRole)
        : null;

    const res = NextResponse.json(
      { success: true, partnerId, kind: "team", teamRole },
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
    console.error("Error setting partner context:", error);
    return NextResponse.json(
      { error: "Failed to set partner context." },
      { status: 500 },
    );
  }
}
