export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

const DOC_ID = "placement_access_pricing";

interface AccessTier {
  durationDays: number;
  priceNgn: number;
  label: string;
}

interface PlacementAccessPricingConfig {
  enabled: boolean;
  accessTiers: AccessTier[];
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
}

const DEFAULT_CONFIG: PlacementAccessPricingConfig = {
  enabled: false,
  accessTiers: [
    { durationDays: 7, priceNgn: 0, label: "Starter" },
    { durationDays: 12, priceNgn: 0, label: "Standard" },
    { durationDays: 30, priceNgn: 0, label: "Extended" },
  ],
  updatedAt: null,
  updatedBy: null,
  updatedByEmail: null,
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

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeDays(n: unknown): number | null {
  const v = nf(n);
  if (v == null) return null;
  const days = Math.round(v);
  if (days < 1) return null;
  if (days > 365) return 365;
  return days;
}

function normalizeNgn(n: unknown): number {
  const v = nf(n);
  if (v == null) return 0;
  return Math.max(0, Math.round(v));
}

function normalizeLabel(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, 40);
}

function normalizeTiers(input: unknown): AccessTier[] {
  if (!Array.isArray(input)) return DEFAULT_CONFIG.accessTiers;

  const out: AccessTier[] = [];
  for (const t of input) {
    const durationDays = normalizeDays((t as any)?.durationDays);
    if (!durationDays) continue;

    const priceNgn = normalizeNgn((t as any)?.priceNgn);
    const label = normalizeLabel((t as any)?.label) || `${durationDays} days`;

    out.push({ durationDays, priceNgn, label });
  }

  if (out.length === 0) return DEFAULT_CONFIG.accessTiers;

  const map = new Map<number, AccessTier>();
  for (const tier of out) {
    map.set(tier.durationDays, tier);
  }

  return Array.from(map.values()).sort(
    (a, b) => a.durationDays - b.durationDays,
  );
}

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
      "product_admin",
    ]);
    if (response) return response;

    const snap = await withTimeout(
      adminDb.collection("config").doc(DOC_ID).get(),
      2_500,
      "[admin/placement/pricing] config doc",
    );

    if (!snap.exists) {
      return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
    }

    const data = snap.data() || {};

    const enabled =
      typeof (data as any)?.enabled === "boolean"
        ? (data as any).enabled
        : DEFAULT_CONFIG.enabled;
    const accessTiers = normalizeTiers((data as any)?.accessTiers);

    return NextResponse.json(
      {
        enabled,
        accessTiers,
        updatedAt:
          (data as any)?.updatedAt?.toDate?.()?.toISOString?.() || null,
        updatedBy: (data as any)?.updatedBy || null,
        updatedByEmail: (data as any)?.updatedByEmail || null,
      } satisfies PlacementAccessPricingConfig,
      { status: 200 },
    );
  } catch (error) {
    if (isFirestoreConnectivityError(error)) {
      console.warn(
        "[GET /api/admin/placement/pricing] Firestore unreachable; returning default config",
      );
      return NextResponse.json(
        { ...DEFAULT_CONFIG, degraded: true },
        { status: 200 },
      );
    }
    console.error("[GET /api/admin/placement/pricing] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch placement access pricing config." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "product_admin",
    ]);
    if (response) return response;

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);

    const enabled =
      typeof (body as any)?.enabled === "boolean"
        ? (body as any).enabled
        : DEFAULT_CONFIG.enabled;
    const accessTiers = normalizeTiers((body as any)?.accessTiers);

    const toWrite = {
      enabled,
      accessTiers,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller!.uid,
      updatedByEmail: caller!.email || null,
    } as Record<string, unknown>;

    await withTimeout(
      adminDb.collection("config").doc(DOC_ID).set(toWrite, { merge: true }),
      2_500,
      "[admin/placement/pricing] write config",
    );

    try {
      await withTimeout(
        createAuditLog({
          actionType: "config_updated",
          actorId: caller!.uid,
          actorEmail: caller!.email || "admin",
          targetId: DOC_ID,
          targetType: "config",
          details: "Updated placement access pricing configuration",
          metadata: { enabled, accessTiers },
        }),
        2_500,
        "[admin/placement/pricing] audit log",
      );
    } catch (e) {
      console.warn(
        "[PUT /api/admin/placement/pricing] audit log failed (non-blocking):",
        e,
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[PUT /api/admin/placement/pricing] Error:", error);
    return NextResponse.json(
      { error: "Failed to update placement access pricing config." },
      { status: 500 },
    );
  }
}
