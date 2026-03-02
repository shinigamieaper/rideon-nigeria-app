import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export type PartnerTeamRole = "admin" | "manager" | "viewer";

export type PartnerPortalContext =
  | {
      kind: "owner";
      actorUid: string;
      partnerId: string;
    }
  | {
      kind: "team";
      actorUid: string;
      partnerId: string;
      teamRole: PartnerTeamRole;
    };

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

function isFirestoreConnectivityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (msg.includes("EHOSTUNREACH")) return true;
  if (msg.includes("ECONNREFUSED")) return true;
  if (msg.includes("ETIMEDOUT")) return true;
  if (msg.toLowerCase().includes("unavailable")) return true;
  if (msg.includes("RST_STREAM")) return true;
  return false;
}

function getRole(decoded: unknown): string | undefined {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const role = (d?.role ?? claims?.role) as string | undefined;
  return typeof role === "string" ? role : undefined;
}

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

function getCookieValue(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  if (!raw) return null;
  const parts = raw.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (!k) continue;
    if (k.trim() !== name) continue;
    const v = rest.join("=");
    if (!v) return "";
    try {
      return decodeURIComponent(v.trim());
    } catch {
      return v.trim();
    }
  }
  return null;
}

async function ensurePartnerApproved(
  partnerId: string,
): Promise<true | NextResponse> {
  try {
    const appSnap = await withTimeout(
      adminDb.collection("partner_applications").doc(partnerId).get(),
      3_000,
      "[partnerPortalAuth] ensurePartnerApproved",
    );
    const status = (appSnap.data() as Record<string, unknown> | undefined)
      ?.status as string | undefined;
    if (status !== "approved") {
      return NextResponse.json(
        { error: "Partner is not approved." },
        { status: 403 },
      );
    }
    return true;
  } catch (e) {
    if (isFirestoreConnectivityError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503 },
      );
    }
    throw e;
  }
}

export async function resolvePartnerPortalContext(
  req: Request,
  opts: { requireApproved?: boolean } = {},
): Promise<PartnerPortalContext | NextResponse> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring("Bearer ".length)
    : "";

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[partnerPortalAuth] verifyIdToken",
    );
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = decoded.uid;

  const role = getRole(decoded);
  if (role === "partner" || role === "partner_applicant") {
    if (opts.requireApproved) {
      const ok = await ensurePartnerApproved(uid);
      if (ok instanceof NextResponse) return ok;
    }
    return { kind: "owner", actorUid: uid, partnerId: uid };
  }

  const team = getPartnerTeamClaim(decoded);
  const teams = getPartnerTeamsClaim(decoded);

  const requestedPartnerId =
    (
      req.headers.get("x-rideon-partner-id") ||
      req.headers.get("x-partner-id") ||
      ""
    ).trim() || (getCookieValue(req, "rideon_partner_context") || "").trim();

  const candidates: string[] = [];
  const pushCandidate = (v: string | undefined) => {
    const id = (v || "").trim();
    if (!id) return;
    if (candidates.includes(id)) return;
    candidates.push(id);
  };

  pushCandidate(requestedPartnerId);
  pushCandidate(team?.partnerId);
  if (teams) {
    for (const id of Object.keys(teams).sort()) pushCandidate(id);
  }

  if (candidates.length === 0) {
    try {
      const memberSnaps = await withTimeout(
        adminDb.collectionGroup("teamMembers").where("uid", "==", uid).get(),
        3_000,
        "[partnerPortalAuth] discover team memberships",
      );

      const discovered: Array<{
        partnerId: string;
        teamRole: PartnerTeamRole;
      }> = [];
      for (const doc of memberSnaps.docs) {
        const partnerId = doc.ref.parent.parent?.id;
        if (!partnerId) continue;

        const md = doc.data() as Record<string, unknown>;
        if (md?.status === "removed") continue;

        const roleRaw = md?.role;
        const teamRole: PartnerTeamRole | null =
          roleRaw === "admin" || roleRaw === "manager" || roleRaw === "viewer"
            ? (roleRaw as PartnerTeamRole)
            : null;

        if (!teamRole) continue;
        discovered.push({ partnerId, teamRole });
      }

      discovered.sort((a, b) => a.partnerId.localeCompare(b.partnerId));
      const picked = discovered[0];
      if (picked?.partnerId && picked?.teamRole) {
        if (opts.requireApproved) {
          const ok = await ensurePartnerApproved(picked.partnerId);
          if (ok instanceof NextResponse) return ok;
        }
        return {
          kind: "team",
          actorUid: uid,
          partnerId: picked.partnerId,
          teamRole: picked.teamRole,
        };
      }
    } catch (e) {
      if (!isFirestoreConnectivityError(e)) {
        // ignore
      }
    }
  }

  let selectedPartnerId = "";
  let selectedTeamRole: PartnerTeamRole | null = null;

  for (const candidateId of candidates) {
    const roleFromTeams = (
      teams && candidateId ? teams[candidateId] : null
    ) as PartnerTeamRole | null;
    const roleFromActiveClaim =
      team?.partnerId === candidateId ? team?.role : null;
    const candidateRole =
      roleFromTeams ||
      (roleFromActiveClaim === "admin" ||
      roleFromActiveClaim === "manager" ||
      roleFromActiveClaim === "viewer"
        ? (roleFromActiveClaim as PartnerTeamRole)
        : null);

    let memberSnap: any;
    try {
      memberSnap = await withTimeout(
        adminDb
          .collection("partner_applications")
          .doc(candidateId)
          .collection("teamMembers")
          .doc(uid)
          .get(),
        3_000,
        "[partnerPortalAuth] team member doc",
      );
    } catch (e) {
      if (isFirestoreConnectivityError(e)) {
        return NextResponse.json(
          { error: "Service temporarily unavailable." },
          { status: 503 },
        );
      }
      continue;
    }

    if (!memberSnap.exists) continue;

    const md = memberSnap.data() as Record<string, unknown>;
    if (md?.status === "removed") continue;

    const roleRaw = md?.role;
    const roleFromDoc =
      roleRaw === "admin" || roleRaw === "manager" || roleRaw === "viewer"
        ? (roleRaw as PartnerTeamRole)
        : null;

    const effectiveRole = roleFromDoc || candidateRole;
    if (!effectiveRole) continue;

    selectedPartnerId = candidateId;
    selectedTeamRole = effectiveRole;
    break;
  }

  if (!selectedPartnerId || !selectedTeamRole) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (opts.requireApproved) {
    const ok = await ensurePartnerApproved(selectedPartnerId);
    if (ok instanceof NextResponse) return ok;
  }

  return {
    kind: "team",
    actorUid: uid,
    partnerId: selectedPartnerId,
    teamRole: selectedTeamRole,
  };
}

export function canWrite(ctx: PartnerPortalContext): boolean {
  return (
    ctx.kind === "owner" || (ctx.kind === "team" && ctx.teamRole !== "viewer")
  );
}

export function canManageTeam(ctx: PartnerPortalContext): boolean {
  return (
    ctx.kind === "owner" || (ctx.kind === "team" && ctx.teamRole === "admin")
  );
}
