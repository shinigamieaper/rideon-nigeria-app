import { adminDb } from "@/lib/firebaseAdmin";
import { getServicePricingConfig } from "@/lib/servicePricing";

export type OnDemandDriverPricingConfig = {
  enabled: boolean;
  blockHours: number[];
  cityBlockRatesNgn: Record<string, Record<string, number>>;
  cityBlockDriverPayoutNgn: Record<string, Record<string, number>>;
};

const DOC_ID = "on_demand_driver_pricing";

const DEFAULT_CONFIG: OnDemandDriverPricingConfig = {
  enabled: true,
  blockHours: [2, 4, 8],
  cityBlockRatesNgn: {},
  cityBlockDriverPayoutNgn: {},
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

export async function getOnDemandDriverPricingConfig(): Promise<OnDemandDriverPricingConfig> {
  const docRef = adminDb.collection("config").doc(DOC_ID);
  const snap = await docRef.get();

  if (snap.exists) {
    const data = snap.data() || {};
    return {
      enabled: Boolean((data as any)?.enabled ?? DEFAULT_CONFIG.enabled),
      blockHours: normalizeBlockHours((data as any)?.blockHours),
      cityBlockRatesNgn: normalizeCityBlockRates(
        (data as any)?.cityBlockRatesNgn,
      ),
      cityBlockDriverPayoutNgn: normalizeCityBlockRates(
        (data as any)?.cityBlockDriverPayoutNgn,
      ),
    };
  }

  const legacy = await getServicePricingConfig();
  return {
    enabled: true,
    blockHours:
      Array.isArray(legacy?.driveMyCar?.blockHours) &&
      legacy.driveMyCar.blockHours.length > 0
        ? legacy.driveMyCar.blockHours
        : DEFAULT_CONFIG.blockHours,
    cityBlockRatesNgn:
      legacy?.driveMyCar?.cityBlockRatesNgn &&
      typeof legacy.driveMyCar.cityBlockRatesNgn === "object"
        ? legacy.driveMyCar.cityBlockRatesNgn
        : DEFAULT_CONFIG.cityBlockRatesNgn,
    cityBlockDriverPayoutNgn: DEFAULT_CONFIG.cityBlockDriverPayoutNgn,
  };
}
