import { NextResponse } from "next/server";
import { getServicePricingConfig } from "@/lib/servicePricing";
import {
  computeVatAmountNgn,
  GLOBAL_VAT_ENABLED,
  GLOBAL_VAT_RATE_BPS,
} from "@/lib/pricing";

export const runtime = "nodejs";

// Haversine distance (km)
function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371; // km
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

// POST /api/fares/calculate
// body: { pickup: [lon,lat], dropoff: [lon,lat], startDate?: string, endDate?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const pickup = body?.pickup as [number, number] | undefined;
    const dropoff = body?.dropoff as [number, number] | undefined;
    const startDate = (body?.startDate as string | undefined)?.trim();
    const endDate = (body?.endDate as string | undefined)?.trim();
    const city = (body?.city as string | undefined)?.trim();

    if (!pickup || !dropoff || pickup.length !== 2 || dropoff.length !== 2) {
      return NextResponse.json(
        { error: "pickup and dropoff coordinates are required" },
        { status: 400 },
      );
    }

    const pricing = await getServicePricingConfig();

    let distanceKm = haversineKm(pickup, dropoff);
    // Apply a conservative road factor to approximate driving distance
    distanceKm = Math.max(
      0,
      Math.round(distanceKm * pricing.chauffeur.roadFactor * 10) / 10,
    ); // 1 decimal km

    let days = 1;
    if (startDate && endDate) {
      const s = Date.parse(startDate);
      const e = Date.parse(endDate);
      if (!Number.isNaN(s) && !Number.isNaN(e) && e >= s) {
        // inclusive day-span
        days = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
      }
    }

    const rateMap =
      city && pricing.chauffeur.cityPerKmRatesNgn?.[city]
        ? pricing.chauffeur.cityPerKmRatesNgn[city]
        : pricing.chauffeur.defaultPerKmRatesNgn;

    const prices: Record<string, number> = {};
    for (const [cls, rateRaw] of Object.entries(rateMap)) {
      const rate =
        typeof rateRaw === "number" && Number.isFinite(rateRaw)
          ? Math.max(0, Math.round(rateRaw))
          : 0;
      if (!rate) continue;
      const baseFeeNgn = Math.max(0, Math.round(pricing.chauffeur.baseFeeNgn));
      const rawSubtotalNgn = Math.round(baseFeeNgn + distanceKm * rate * days);
      const minimumFareNgn = Math.max(
        0,
        Math.round(pricing.chauffeur.minimumFareNgn),
      );
      const subtotalNgn =
        minimumFareNgn > 0
          ? Math.max(minimumFareNgn, rawSubtotalNgn)
          : rawSubtotalNgn;
      const vatAmountNgn = computeVatAmountNgn({
        subtotalNgn,
        vatEnabled: GLOBAL_VAT_ENABLED,
        vatRateBps: GLOBAL_VAT_RATE_BPS,
      });
      prices[cls] = subtotalNgn + vatAmountNgn;
    }

    return NextResponse.json({ distanceKm, days, prices }, { status: 200 });
  } catch (error) {
    console.error("Error calculating fares:", error);
    return NextResponse.json(
      { error: "Failed to calculate fares." },
      { status: 500 },
    );
  }
}
