import { adminDb } from "@/lib/firebaseAdmin";
import {
  computeVatAmountNgn,
  GLOBAL_VAT_ENABLED,
  GLOBAL_VAT_RATE_BPS,
} from "@/lib/pricing";

export type ServicePricingConfig = {
  chauffeur: {
    roadFactor: number;
    vatEnabled: boolean;
    vatRateBps: number;
    baseFeeNgn: number;
    minimumFareNgn: number;
    defaultPerKmRatesNgn: Record<string, number>;
    cityPerKmRatesNgn: Record<string, Record<string, number>>;
  };
  driveMyCar: {
    blockHours: number[];
    cityBlockRatesNgn: Record<string, Record<string, number>>;
  };
  fullTimeAccess: {
    tiers: { days: number; priceNgn: number; enabled: boolean }[];
  };
};

const DOC_ID = "service_pricing";

const DEFAULT_PRICING: ServicePricingConfig = {
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
    },
    cityPerKmRatesNgn: {},
  },
  driveMyCar: {
    blockHours: [2, 4, 8],
    cityBlockRatesNgn: {},
  },
  fullTimeAccess: {
    tiers: [
      { days: 7, priceNgn: 0, enabled: true },
      { days: 14, priceNgn: 0, enabled: true },
      { days: 21, priceNgn: 0, enabled: true },
    ],
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
  fallback: Record<string, number>,
): Record<string, Record<string, number>> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, Record<string, number>> = {};
  for (const [city, rates] of Object.entries(
    input as Record<string, unknown>,
  )) {
    if (typeof city !== "string" || city.trim().length === 0) continue;
    out[city] = normalizeRatesMap(rates, fallback);
  }
  return out;
}

export async function getServicePricingConfig(): Promise<ServicePricingConfig> {
  const docRef = adminDb.collection("config").doc(DOC_ID);
  const snap = await docRef.get();

  const data = snap.exists ? snap.data() || {} : {};

  const defaultPerKmRatesNgn = normalizeRatesMap(
    (data as any)?.chauffeur?.defaultPerKmRatesNgn,
    DEFAULT_PRICING.chauffeur.defaultPerKmRatesNgn,
  );

  return {
    chauffeur: {
      roadFactor: normalizeRoadFactor((data as any)?.chauffeur?.roadFactor),
      vatEnabled: Boolean(
        (data as any)?.chauffeur?.vatEnabled ??
          DEFAULT_PRICING.chauffeur.vatEnabled,
      ),
      vatRateBps: normalizeBps(
        (data as any)?.chauffeur?.vatRateBps ??
          DEFAULT_PRICING.chauffeur.vatRateBps,
      ),
      baseFeeNgn: normalizeNgn(
        (data as any)?.chauffeur?.baseFeeNgn ??
          DEFAULT_PRICING.chauffeur.baseFeeNgn,
      ),
      minimumFareNgn: normalizeNgn(
        (data as any)?.chauffeur?.minimumFareNgn ??
          DEFAULT_PRICING.chauffeur.minimumFareNgn,
      ),
      defaultPerKmRatesNgn,
      cityPerKmRatesNgn: normalizeCityRates(
        (data as any)?.chauffeur?.cityPerKmRatesNgn,
        defaultPerKmRatesNgn,
      ),
    },
    driveMyCar: {
      blockHours: Array.isArray((data as any)?.driveMyCar?.blockHours)
        ? Array.from(
            new Set(
              ((data as any)?.driveMyCar?.blockHours as any[])
                .map((h) => nf(h))
                .filter((h): h is number => h != null)
                .map((h) => Math.max(1, Math.round(h)))
                .filter((h) => h <= 24),
            ),
          ).sort((a, b) => a - b)
        : DEFAULT_PRICING.driveMyCar.blockHours,
      cityBlockRatesNgn:
        (data as any)?.driveMyCar?.cityBlockRatesNgn &&
        typeof (data as any)?.driveMyCar?.cityBlockRatesNgn === "object"
          ? ((data as any)?.driveMyCar?.cityBlockRatesNgn as Record<
              string,
              Record<string, number>
            >)
          : DEFAULT_PRICING.driveMyCar.cityBlockRatesNgn,
    },
    fullTimeAccess: {
      tiers: Array.isArray((data as any)?.fullTimeAccess?.tiers)
        ? ((data as any)?.fullTimeAccess?.tiers as any[]).map((t) => ({
            days: Math.max(1, Math.round(nf(t?.days) || 0)),
            priceNgn: normalizeNgn(t?.priceNgn),
            enabled: typeof t?.enabled === "boolean" ? t.enabled : true,
          }))
        : DEFAULT_PRICING.fullTimeAccess.tiers,
    },
  };
}

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function computeInclusiveDays(params: {
  startDate?: string | null;
  endDate?: string | null;
}): number {
  const startDate = (params.startDate || "").trim();
  const endDate = (params.endDate || "").trim();
  if (!startDate || !endDate) return 1;
  const s = Date.parse(startDate);
  const e = Date.parse(endDate);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return 1;
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

export async function computeChauffeurQuote(params: {
  pickupCoords: [number, number];
  dropoffCoords: [number, number];
  vehicleClass: string;
  city?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<{
  distanceKm: number;
  days: number;
  perKmRateNgn: number;
  baseFeeNgn: number;
  subtotalNgn: number;
  vat: { enabled: boolean; rateBps: number; amountNgn: number };
  totalNgn: number;
}> {
  const pricing = await getServicePricingConfig();

  const city = (params.city || "").trim();
  const vehicleClass = (params.vehicleClass || "").trim();
  const rateMap =
    city && pricing.chauffeur.cityPerKmRatesNgn[city]
      ? pricing.chauffeur.cityPerKmRatesNgn[city]
      : pricing.chauffeur.defaultPerKmRatesNgn;

  const perKmRateNgn = normalizeNgn(rateMap[vehicleClass]);
  if (!perKmRateNgn) {
    throw new Error("Unsupported vehicle class.");
  }

  let distanceKm = haversineKm(params.pickupCoords, params.dropoffCoords);
  distanceKm = Math.max(
    0,
    Math.round(distanceKm * pricing.chauffeur.roadFactor * 10) / 10,
  );

  const days = computeInclusiveDays({
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const baseFeeNgn = normalizeNgn(pricing.chauffeur.baseFeeNgn);
  const rawSubtotalNgn = Math.round(
    baseFeeNgn + distanceKm * perKmRateNgn * days,
  );
  const minimumFareNgn = normalizeNgn(pricing.chauffeur.minimumFareNgn);
  const subtotalNgn =
    minimumFareNgn > 0
      ? Math.max(minimumFareNgn, rawSubtotalNgn)
      : rawSubtotalNgn;

  const vatAmountNgn = computeVatAmountNgn({
    subtotalNgn,
    vatEnabled: GLOBAL_VAT_ENABLED,
    vatRateBps: GLOBAL_VAT_RATE_BPS,
  });

  const totalNgn = subtotalNgn + vatAmountNgn;

  return {
    distanceKm,
    days,
    perKmRateNgn,
    baseFeeNgn,
    subtotalNgn,
    vat: {
      enabled: GLOBAL_VAT_ENABLED,
      rateBps: GLOBAL_VAT_RATE_BPS,
      amountNgn: vatAmountNgn,
    },
    totalNgn,
  };
}
