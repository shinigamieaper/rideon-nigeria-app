export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";
import { createAuditLog } from "@/lib/auditLog";

const DOC_ID = "on_demand_driver_pricing";

const DEFAULT_CONFIG = {
  enabled: true,
  blockHours: [2, 4, 8] as number[],
  cityBlockRatesNgn: {} as Record<string, Record<string, number>>,
  cityBlockDriverPayoutNgn: {} as Record<string, Record<string, number>>,
};

function nf(n: any): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeNgn(n: any): number {
  const v = nf(n);
  if (v == null) return 0;
  return Math.max(0, Math.round(v));
}

function normalizeBlockHours(input: any): number[] {
  if (!Array.isArray(input)) return DEFAULT_CONFIG.blockHours;
  const out = input
    .map((h) => nf(h))
    .filter((h): h is number => h != null)
    .map((h) => Math.max(1, Math.round(h)))
    .filter((h) => h <= 24);
  return out.length > 0
    ? Array.from(new Set(out)).sort((a, b) => a - b)
    : DEFAULT_CONFIG.blockHours;
}

function normalizeCityBlockRates(
  input: any,
): Record<string, Record<string, number>> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, Record<string, number>> = {};
  for (const [city, rateMap] of Object.entries(
    input as Record<string, unknown>,
  )) {
    if (typeof city !== "string" || city.trim().length === 0) continue;
    const mapOut: Record<string, number> = {};
    if (rateMap && typeof rateMap === "object") {
      for (const [k, v] of Object.entries(rateMap as Record<string, unknown>)) {
        const hours = Math.max(1, Math.round(Number(k)));
        if (!Number.isFinite(hours) || hours > 24) continue;
        const rate = normalizeNgn(v);
        if (rate > 0) mapOut[String(hours)] = rate;
      }
    }
    if (Object.keys(mapOut).length > 0) out[city.trim()] = mapOut;
  }
  return out;
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

    const docRef = adminDb.collection("config").doc(DOC_ID);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        {
          config: DEFAULT_CONFIG,
          updatedAt: null,
          updatedBy: null,
          updatedByEmail: null,
        },
        { status: 200 },
      );
    }

    const data = snap.data() || {};

    const enabled =
      typeof (data as any)?.enabled === "boolean"
        ? (data as any).enabled
        : DEFAULT_CONFIG.enabled;
    const blockHours = normalizeBlockHours((data as any)?.blockHours);
    const cityBlockRatesNgn = normalizeCityBlockRates(
      (data as any)?.cityBlockRatesNgn,
    );
    const cityBlockDriverPayoutNgn = normalizeCityBlockRates(
      (data as any)?.cityBlockDriverPayoutNgn,
    );

    return NextResponse.json(
      {
        config: {
          enabled,
          blockHours,
          cityBlockRatesNgn,
          cityBlockDriverPayoutNgn,
        },
        updatedAt:
          (data as any)?.updatedAt?.toDate?.()?.toISOString?.() || null,
        updatedBy: (data as any)?.updatedBy || null,
        updatedByEmail: (data as any)?.updatedByEmail || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching on-demand driver pricing config:", error);
    return NextResponse.json(
      { error: "Failed to fetch on-demand driver pricing config." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
      "product_admin",
    ]);
    if (response) return response;

    const body = await req.json().catch(() => ({}) as any);

    const enabled =
      typeof body?.enabled === "boolean"
        ? body.enabled
        : DEFAULT_CONFIG.enabled;
    const blockHours = normalizeBlockHours(body?.blockHours);
    const cityBlockRatesNgn = normalizeCityBlockRates(body?.cityBlockRatesNgn);
    const cityBlockDriverPayoutNgn = normalizeCityBlockRates(
      body?.cityBlockDriverPayoutNgn,
    );

    const nextConfig = {
      enabled,
      blockHours,
      cityBlockRatesNgn,
      cityBlockDriverPayoutNgn,
    };

    const toWrite = {
      ...nextConfig,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller!.uid,
      updatedByEmail: caller!.email || null,
    };

    await adminDb
      .collection("config")
      .doc(DOC_ID)
      .set(toWrite, { merge: true });

    await createAuditLog({
      actionType: "config_updated",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: DOC_ID,
      targetType: "config",
      details: "Updated on-demand driver pricing configuration",
      metadata: nextConfig,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating on-demand driver pricing config:", error);
    return NextResponse.json(
      { error: "Failed to update on-demand driver pricing config." },
      { status: 500 },
    );
  }
}
