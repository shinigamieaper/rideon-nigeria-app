export type VehiclePricingSnapshot = {
  baseDayRateNgn: number | null;
  baseBlock4hRateNgn: number | null;
  markupFixedNgn: number;
  markupPercent: number;
  dayRateNgn: number | null;
  block4hRateNgn: number | null;
  vatEnabled: boolean;
  vatRateBps: number;
};

export const GLOBAL_VAT_ENABLED = true;
export const GLOBAL_VAT_RATE_BPS = 750;

function nf(n: any): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function normalizePercent(p: any): number {
  const v = nf(p);
  if (v == null) return 0;
  if (v < 0) return 0;
  if (v > 1000) return 1000;
  return v;
}

export function normalizeNgn(n: any): number {
  const v = nf(n);
  if (v == null) return 0;
  return Math.round(v);
}

export function normalizeVatRateBps(input: any): number {
  const bps = nf(input);
  if (bps == null) return 0;
  const rounded = Math.round(bps);
  if (rounded < 0) return 0;
  if (rounded > 10000) return 10000;
  return rounded;
}

export function percentToBps(percent: any): number {
  const p = nf(percent);
  if (p == null) return 0;
  return normalizeVatRateBps(Math.round(p * 100));
}

export function computeCustomerUnitRateNgn(params: {
  baseRateNgn: number;
  markupFixedNgn?: number;
  markupPercent?: number;
}): number {
  const base = Math.max(0, Math.round(params.baseRateNgn));
  const fixed = normalizeNgn(params.markupFixedNgn);
  const pct = normalizePercent(params.markupPercent);
  const pctAmt = Math.round(base * (pct / 100));
  return Math.max(0, base + fixed + pctAmt);
}

export function computeVatAmountNgn(params: {
  subtotalNgn: number;
  vatEnabled: boolean;
  vatRateBps: number;
}): number {
  if (!params.vatEnabled) return 0;
  const subtotal = Math.max(0, Math.round(params.subtotalNgn));
  const bps = normalizeVatRateBps(params.vatRateBps);
  return Math.round((subtotal * bps) / 10000);
}

export function resolveVehiclePricingSnapshot(
  vehicle: any,
): VehiclePricingSnapshot {
  const markupFixedNgn = normalizeNgn(vehicle?.adminMarkupFixedNgn);
  const markupPercent = 0;

  const vatEnabled = GLOBAL_VAT_ENABLED;
  const vatRateBps = GLOBAL_VAT_RATE_BPS;

  const partnerBaseDay =
    typeof vehicle?.partnerBaseDayRateNgn === "number" &&
    Number.isFinite(vehicle.partnerBaseDayRateNgn) &&
    vehicle.partnerBaseDayRateNgn > 0
      ? vehicle.partnerBaseDayRateNgn
      : null;
  const partnerBaseBlock4h =
    typeof vehicle?.partnerBaseBlock4hRateNgn === "number" &&
    Number.isFinite(vehicle.partnerBaseBlock4hRateNgn) &&
    vehicle.partnerBaseBlock4hRateNgn > 0
      ? vehicle.partnerBaseBlock4hRateNgn
      : null;
  const hasPartnerBase = partnerBaseDay != null || partnerBaseBlock4h != null;

  const legacyDay = nf(vehicle?.dayRateNgn);
  const legacyBlock4h = nf(vehicle?.block4hRateNgn);

  const baseDayRateForCompute = hasPartnerBase
    ? (partnerBaseDay ?? legacyDay)
    : null;
  const baseBlock4hForCompute = hasPartnerBase
    ? (partnerBaseBlock4h ??
      legacyBlock4h ??
      (baseDayRateForCompute != null
        ? Math.round(baseDayRateForCompute * 0.5)
        : null))
    : null;

  const dayRateNgn =
    hasPartnerBase && baseDayRateForCompute != null
      ? computeCustomerUnitRateNgn({
          baseRateNgn: baseDayRateForCompute,
          markupFixedNgn,
        })
      : legacyDay != null
        ? Math.round(legacyDay)
        : null;

  const block4hRateNgn =
    hasPartnerBase && baseBlock4hForCompute != null
      ? computeCustomerUnitRateNgn({
          baseRateNgn: baseBlock4hForCompute,
          markupFixedNgn,
        })
      : legacyBlock4h != null
        ? Math.round(legacyBlock4h)
        : legacyDay != null
          ? Math.round(legacyDay * 0.5)
          : null;

  return {
    baseDayRateNgn: partnerBaseDay != null ? Math.round(partnerBaseDay) : null,
    baseBlock4hRateNgn:
      partnerBaseBlock4h != null ? Math.round(partnerBaseBlock4h) : null,
    markupFixedNgn,
    markupPercent,
    dayRateNgn,
    block4hRateNgn,
    vatEnabled,
    vatRateBps,
  };
}
