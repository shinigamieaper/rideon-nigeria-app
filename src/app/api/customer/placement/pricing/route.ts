export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

interface AccessTier {
  durationDays: number;
  priceNgn: number;
  label: string;
}

const DEFAULT = {
  enabled: false,
  accessTiers: [
    { durationDays: 7, priceNgn: 0, label: "Starter" },
    { durationDays: 12, priceNgn: 0, label: "Standard" },
    { durationDays: 30, priceNgn: 0, label: "Extended" },
  ] as AccessTier[],
};

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeTiers(input: unknown): AccessTier[] {
  if (!Array.isArray(input)) return DEFAULT.accessTiers;

  const out: AccessTier[] = [];

  for (const t of input) {
    const durationDaysRaw = nf((t as any)?.durationDays);
    const durationDays =
      durationDaysRaw == null
        ? null
        : Math.max(1, Math.min(365, Math.round(durationDaysRaw)));
    if (!durationDays) continue;

    const priceNgnRaw = nf((t as any)?.priceNgn);
    const priceNgn =
      priceNgnRaw == null ? 0 : Math.max(0, Math.round(priceNgnRaw));
    const label =
      typeof (t as any)?.label === "string"
        ? (t as any).label.trim().slice(0, 40)
        : "";

    out.push({
      durationDays,
      priceNgn,
      label: label || `${durationDays} days`,
    });
  }

  if (out.length === 0) return DEFAULT.accessTiers;

  const dedup = new Map<number, AccessTier>();
  for (const tier of out) dedup.set(tier.durationDays, tier);

  return Array.from(dedup.values()).sort(
    (a, b) => a.durationDays - b.durationDays,
  );
}

export async function GET() {
  try {
    const snap = await adminDb
      .collection("config")
      .doc("placement_access_pricing")
      .get();

    if (!snap.exists) {
      return NextResponse.json(DEFAULT, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      });
    }

    const data = snap.data() || {};

    const enabled =
      typeof (data as any)?.enabled === "boolean"
        ? (data as any).enabled
        : DEFAULT.enabled;
    const accessTiers = normalizeTiers((data as any)?.accessTiers);

    return NextResponse.json(
      { enabled, accessTiers },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/customer/placement/pricing] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch placement pricing." },
      { status: 500 },
    );
  }
}
