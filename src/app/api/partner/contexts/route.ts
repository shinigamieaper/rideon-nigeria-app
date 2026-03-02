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

function toTeamRole(raw: unknown): PartnerTeamRole | null {
  return raw === "admin" || raw === "manager" || raw === "viewer"
    ? (raw as PartnerTeamRole)
    : null;
}

type PartnerContextListItem = {
  partnerId: string;
  kind: "owner" | "team";
  teamRole: PartnerTeamRole | null;
  businessName: string;
  email: string;
  label: string;
};

export async function GET(req: Request) {
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

    const contextsByPartnerId = new Map<
      string,
      { kind: "owner" | "team"; teamRole: PartnerTeamRole | null }
    >();

    if (role === "partner" || role === "partner_applicant") {
      contextsByPartnerId.set(uid, { kind: "owner", teamRole: null });
    }

    const memberSnaps = await adminDb
      .collectionGroup("teamMembers")
      .where("uid", "==", uid)
      .get();

    for (const doc of memberSnaps.docs) {
      const partnerId = doc.ref.parent.parent?.id;
      if (!partnerId) continue;

      if (contextsByPartnerId.get(partnerId)?.kind === "owner") continue;

      const md = doc.data() as Record<string, unknown>;
      if (md?.status === "removed") continue;

      const teamRole = toTeamRole(md?.role);
      if (!teamRole) continue;

      contextsByPartnerId.set(partnerId, { kind: "team", teamRole });
    }

    const partnerIds = Array.from(contextsByPartnerId.keys());
    if (partnerIds.length === 0) {
      return NextResponse.json({ contexts: [] }, { status: 200 });
    }

    const refs = partnerIds.map((partnerId) =>
      adminDb.collection("partner_applications").doc(partnerId),
    );
    const appSnaps = await adminDb.getAll(...refs);

    const appById = new Map<string, { businessName: string; email: string }>();

    for (const snap of appSnaps) {
      if (!snap.exists) continue;
      const d = snap.data() as Record<string, unknown>;
      const businessName =
        typeof d?.businessName === "string" ? d.businessName : "";
      const email = typeof d?.email === "string" ? d.email : "";
      appById.set(snap.id, { businessName, email });
    }

    const contexts: PartnerContextListItem[] = partnerIds
      .map((partnerId) => {
        const meta = contextsByPartnerId.get(partnerId);
        const app = appById.get(partnerId);

        const businessName = app?.businessName || "";
        const email = app?.email || "";
        const label = businessName.trim() || email.trim() || partnerId;

        const kind: PartnerContextListItem["kind"] =
          meta?.kind === "owner" ? "owner" : "team";

        return {
          partnerId,
          kind,
          teamRole: meta?.teamRole ?? null,
          businessName,
          email,
          label,
        };
      })
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "owner" ? -1 : 1;
        return a.label.localeCompare(b.label);
      });

    return NextResponse.json({ contexts }, { status: 200 });
  } catch (error) {
    console.error("Error listing partner contexts:", error);
    return NextResponse.json(
      { error: "Failed to list partner contexts." },
      { status: 500 },
    );
  }
}
