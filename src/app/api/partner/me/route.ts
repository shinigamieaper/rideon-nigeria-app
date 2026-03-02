import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

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

const UPDATABLE_FIELDS = ["phoneNumber", "businessName"] as const;

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

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req);
    if (ctx instanceof NextResponse) return ctx;

    const partnerId = ctx.partnerId;

    const appSnap = await withTimeout(
      adminDb.collection("partner_applications").doc(partnerId).get(),
      3_000,
      "[partner/me] application doc",
    );
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const d = appSnap.data() as Record<string, unknown>;

    const kyc = (d?.kyc || {}) as Record<string, unknown>;
    const kycSummary = {
      overallStatus: String(kyc?.overallStatus || "pending"),
      cac: String((kyc?.cac as Record<string, unknown>)?.status || "pending"),
      individualId: String(
        (kyc?.individualId as Record<string, unknown>)?.status || "pending",
      ),
      director: String(
        (kyc?.director as Record<string, unknown>)?.status || "pending",
      ),
      lastRunAt:
        (kyc?.lastRunAt as { toDate?: () => Date })
          ?.toDate?.()
          ?.toISOString?.() || null,
    };

    let approvedVehicles = 0;
    try {
      const vSnap = await withTimeout(
        adminDb
          .collection("vehicles")
          .where("partnerId", "==", partnerId)
          .where("status", "==", "available")
          .select("status")
          .get(),
        3_000,
        "[partner/me] vehicles query",
      );
      approvedVehicles = vSnap.size;
    } catch (e) {
      console.warn("[partner/me] Failed to count approved vehicles", e);
      approvedVehicles = 0;
    }

    const status = (d?.status as string) || "pending_review";
    const live = status === "approved" && approvedVehicles >= 1;

    return NextResponse.json(
      {
        kind: ctx.kind,
        teamRole: ctx.kind === "team" ? ctx.teamRole : null,
        partnerId,
        status,
        partnerType: d?.partnerType || "individual",
        firstName: d?.firstName || "",
        lastName: d?.lastName || "",
        email: d?.email || "",
        phoneNumber: d?.phoneNumber || "",
        businessName: d?.businessName || "",
        live,
        approvedVehicles,
        kycSummary,
        createdAt:
          (d?.createdAt as { toDate?: () => Date })
            ?.toDate?.()
            ?.toISOString?.() || null,
        updatedAt:
          (d?.updatedAt as { toDate?: () => Date })
            ?.toDate?.()
            ?.toISOString?.() || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner application:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner application." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[partner/me] verifyIdToken",
    );
    const role = ((decoded as Record<string, unknown>)?.role ??
      ((decoded as Record<string, unknown>)?.claims as Record<string, unknown>)
        ?.role) as string | undefined;
    if (role !== "partner" && role !== "partner_applicant") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const uid = decoded.uid;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const updates: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (field in body && typeof body[field] === "string") {
        updates[field] = body[field].trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    await withTimeout(
      adminDb.collection("partner_applications").doc(uid).update(updates),
      3_000,
      "[partner/me] update application",
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating partner application:", error);
    return NextResponse.json(
      { error: "Failed to update partner application." },
      { status: 500 },
    );
  }
}
