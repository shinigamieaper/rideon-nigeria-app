export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

const DOC_ID = "service_pricing";

const DEFAULT_PRICING = {
  chauffeur: {
    roadFactor: 1.3,
    vatEnabled: false,
    vatRateBps: 0,
    baseFeeNgn: 0,
    minimumFareNgn: 0,
    defaultPerKmRatesNgn: {
      "Rider Economy": 450,
      "Rider General": 550,
      "Rider Coffee": 600,
      "Rider Dogon": 700,
      "Executive SUV": 950,
      "Group Van": 1100,
    } as Record<string, number>,
    cityPerKmRatesNgn: {} as Record<string, Record<string, number>>,
  },
  driveMyCar: {
    blockHours: [2, 4, 8] as number[],
    cityBlockRatesNgn: {} as Record<string, Record<string, number>>,
  },
  fullTimeAccess: {
    tiers: [
      { days: 7, priceNgn: 0, enabled: true },
      { days: 14, priceNgn: 0, enabled: true },
      { days: 21, priceNgn: 0, enabled: true },
    ] as { days: number; priceNgn: number; enabled: boolean }[],
  },
};

function nf(n: any): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeNgn(n: any): number {
  const v = nf(n);
  if (v == null) return 0;
  return Math.max(0, Math.round(v));
}

function normalizeBps(n: any): number {
  const v = nf(n);
  if (v == null) return 0;
  const rounded = Math.round(v);
  if (rounded < 0) return 0;
  if (rounded > 10000) return 10000;
  return rounded;
}

function normalizeRoadFactor(n: any): number {
  const v = nf(n);
  if (v == null) return DEFAULT_PRICING.chauffeur.roadFactor;
  if (v < 1) return 1;
  if (v > 3) return 3;
  return Math.round(v * 100) / 100;
}

function normalizeRatesMap(
  input: any,
  fallback: Record<string, number>,
): Record<string, number> {
  if (!input || typeof input !== "object") return fallback;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k !== "string" || k.trim().length === 0) continue;
    const rate = normalizeNgn(v);
    if (rate > 0) out[k] = rate;
  }
  return Object.keys(out).length > 0 ? out : fallback;
}

function normalizeCityRates(
  input: any,
): Record<string, Record<string, number>> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, Record<string, number>> = {};
  for (const [city, rates] of Object.entries(
    input as Record<string, unknown>,
  )) {
    if (typeof city !== "string" || city.trim().length === 0) continue;
    const normalizedRates = normalizeRatesMap(
      rates,
      DEFAULT_PRICING.chauffeur.defaultPerKmRatesNgn,
    );
    out[city] = normalizedRates;
  }
  return out;
}

function normalizeBlockHours(input: any): number[] {
  if (!Array.isArray(input)) return DEFAULT_PRICING.driveMyCar.blockHours;
  const out = input
    .map((h) => nf(h))
    .filter((h): h is number => h != null)
    .map((h) => Math.max(1, Math.round(h)))
    .filter((h) => h <= 24);
  return out.length > 0
    ? Array.from(new Set(out)).sort((a, b) => a - b)
    : DEFAULT_PRICING.driveMyCar.blockHours;
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
    if (Object.keys(mapOut).length > 0) out[city] = mapOut;
  }
  return out;
}

function normalizeTiers(
  input: any,
): { days: number; priceNgn: number; enabled: boolean }[] {
  if (!Array.isArray(input)) return DEFAULT_PRICING.fullTimeAccess.tiers;
  const out: { days: number; priceNgn: number; enabled: boolean }[] = [];
  for (const t of input) {
    const days = Math.max(1, Math.round(nf((t as any)?.days) || 0));
    const priceNgn = normalizeNgn((t as any)?.priceNgn);
    const enabled =
      typeof (t as any)?.enabled === "boolean" ? (t as any).enabled : true;
    if (days > 0) out.push({ days, priceNgn, enabled });
  }
  return out.length > 0 ? out : DEFAULT_PRICING.fullTimeAccess.tiers;
}

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "product_admin",
    ]);
    if (response) return response;

    const docRef = adminDb.collection("config").doc(DOC_ID);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { pricing: DEFAULT_PRICING, updatedAt: null },
        { status: 200 },
      );
    }

    const data = snap.data() || {};

    return NextResponse.json(
      {
        pricing: {
          chauffeur: {
            ...DEFAULT_PRICING.chauffeur,
            ...(data as any).chauffeur,
          },
          driveMyCar: {
            ...DEFAULT_PRICING.driveMyCar,
            ...(data as any).driveMyCar,
          },
          fullTimeAccess: {
            ...DEFAULT_PRICING.fullTimeAccess,
            ...(data as any).fullTimeAccess,
          },
        },
        updatedAt:
          (data as any)?.updatedAt?.toDate?.()?.toISOString?.() || null,
        updatedBy: (data as any)?.updatedBy || null,
        updatedByEmail: (data as any)?.updatedByEmail || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching service pricing config:", error);
    return NextResponse.json(
      { error: "Failed to fetch service pricing config." },
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

    const body = await req.json().catch(() => ({}) as any);

    const chauffeur = body?.chauffeur || {};
    const driveMyCar = body?.driveMyCar || {};
    const fullTimeAccess = body?.fullTimeAccess || {};

    const defaultPerKmRatesNgn = normalizeRatesMap(
      chauffeur?.defaultPerKmRatesNgn,
      DEFAULT_PRICING.chauffeur.defaultPerKmRatesNgn,
    );

    const nextPricing = {
      chauffeur: {
        roadFactor: normalizeRoadFactor(chauffeur?.roadFactor),
        vatEnabled: Boolean(chauffeur?.vatEnabled),
        vatRateBps: normalizeBps(chauffeur?.vatRateBps),
        baseFeeNgn: normalizeNgn(chauffeur?.baseFeeNgn),
        minimumFareNgn: normalizeNgn(chauffeur?.minimumFareNgn),
        defaultPerKmRatesNgn,
        cityPerKmRatesNgn: normalizeCityRates(chauffeur?.cityPerKmRatesNgn),
      },
      driveMyCar: {
        blockHours: normalizeBlockHours(driveMyCar?.blockHours),
        cityBlockRatesNgn: normalizeCityBlockRates(
          driveMyCar?.cityBlockRatesNgn,
        ),
      },
      fullTimeAccess: {
        tiers: normalizeTiers(fullTimeAccess?.tiers),
      },
    };

    const toWrite = {
      ...nextPricing,
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
      details: "Updated service pricing configuration",
      metadata: nextPricing,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating service pricing config:", error);
    return NextResponse.json(
      { error: "Failed to update service pricing config." },
      { status: 500 },
    );
  }
}
