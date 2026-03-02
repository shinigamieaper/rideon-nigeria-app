"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { waitForUser } from "@/lib/firebase";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StickyBanner,
} from "@/components";

type Tier = {
  durationDays: number;
  priceNgn: number;
  label: string;
};

type PricingResponse = {
  enabled?: boolean;
  accessTiers?: Tier[];
};

type CitiesResponse = {
  enabledCities?: string[];
};

type CountResponse = {
  count?: number;
  city?: string;
};

type AccessStatusResponse = {
  hasAccess?: boolean;
  accessExpiresAt?: string | null;
};

type PurchaseResponse = {
  authorization_url?: string;
  reference?: string;
  purchaseId?: string;
  accessExpiresAt?: string;
};

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function formatNgn(amount: number) {
  return `₦${new Intl.NumberFormat("en-NG").format(amount)}`;
}

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();

  const [bannerMsg, setBannerMsg] = React.useState<string | null>(null);

  const [citiesLoading, setCitiesLoading] = React.useState(true);
  const [cities, setCities] = React.useState<string[]>([]);
  const [city, setCity] = React.useState<string>("");

  const [countLoading, setCountLoading] = React.useState(false);
  const [driverCount, setDriverCount] = React.useState<number | null>(null);

  const [pricingLoading, setPricingLoading] = React.useState(true);
  const [pricingErr, setPricingErr] = React.useState<string | null>(null);
  const [enabled, setEnabled] = React.useState<boolean>(false);
  const [tiers, setTiers] = React.useState<Tier[]>([]);

  const [accessLoading, setAccessLoading] = React.useState(false);
  const [access, setAccess] = React.useState<AccessStatusResponse | null>(null);

  const [selectedDays, setSelectedDays] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const p = (params.get("placementAccess") || "").trim();
    if (p === "cancelled")
      setBannerMsg("Payment was cancelled. You can try again.");
    else if (p === "failed")
      setBannerMsg("We couldn't confirm your payment. Please try again.");
  }, [params]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCities() {
      try {
        setCitiesLoading(true);
        const res = await fetch("/api/config/service-cities", {
          cache: "no-store",
        });
        const j = (await res.json().catch(() => ({}))) as CitiesResponse;
        const enabledCities = Array.isArray(j?.enabledCities)
          ? j.enabledCities.filter((c) => typeof c === "string" && c.trim())
          : [];

        const fromQuery = String(params.get("city") || "").trim();
        if (!cancelled) {
          setCities(enabledCities);
          if (fromQuery && enabledCities.includes(fromQuery))
            setCity(fromQuery);
          else if (!city && enabledCities.length > 0) setCity(enabledCities[0]);
        }
      } catch {
        if (!cancelled) {
          setCities([]);
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }
    loadCities();
    return () => {
      cancelled = true;
    };
  }, [city, params]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadPricing() {
      try {
        setPricingLoading(true);
        setPricingErr(null);
        const res = await fetch("/api/customer/placement/pricing", {
          cache: "no-store",
        });
        const j = (await res.json().catch(() => ({}))) as PricingResponse;
        if (!res.ok) throw new Error("Failed to load pricing");

        const isEnabled = j?.enabled === true;
        const rawTiers = Array.isArray(j?.accessTiers) ? j.accessTiers : [];
        const normalized = rawTiers
          .map((t) => ({
            durationDays: Math.max(
              1,
              Math.min(365, Math.round(Number(t?.durationDays || 0))),
            ),
            priceNgn: Math.max(0, Math.round(Number(t?.priceNgn || 0))),
            label: typeof t?.label === "string" ? t.label : "",
          }))
          .filter((t) => t.durationDays > 0);

        if (!cancelled) {
          setEnabled(isEnabled);
          setTiers(normalized);
          if (!selectedDays && normalized.length > 0) {
            setSelectedDays(String(normalized[0].durationDays));
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setEnabled(false);
          setTiers([]);
          setPricingErr(e?.message || "We couldn't load pricing right now.");
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }
    loadPricing();
    return () => {
      cancelled = true;
    };
  }, [selectedDays]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      try {
        setCountLoading(true);
        if (!city) {
          if (!cancelled) setDriverCount(null);
          return;
        }
        const res = await fetch(
          `/api/customer/placement/drivers/count?city=${encodeURIComponent(city)}`,
          {
            cache: "no-store",
          },
        );
        const j = (await res.json().catch(() => ({}))) as CountResponse;
        if (!res.ok) throw new Error("Failed to load driver count");
        if (!cancelled)
          setDriverCount(typeof j?.count === "number" ? j.count : 0);
      } catch {
        if (!cancelled) setDriverCount(null);
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    }
    loadCount();
    return () => {
      cancelled = true;
    };
  }, [city]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadAccess() {
      try {
        setAccessLoading(true);
        const user = await waitForUser();
        const token = await user.getIdToken();
        const res = await fetch("/api/customer/placement/access-status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = (await res.json().catch(() => ({}))) as AccessStatusResponse;
        if (!res.ok) throw new Error("Failed to load access status");
        if (!cancelled) setAccess(j);
      } catch {
        if (!cancelled) setAccess(null);
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    }
    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTier = React.useMemo(() => {
    const days = Math.round(Number(selectedDays || 0));
    if (!days) return null;
    return tiers.find((t) => t.durationDays === days) || null;
  }, [selectedDays, tiers]);

  const hasAccess = Boolean(access?.hasAccess);
  const accessExpiresAt =
    typeof access?.accessExpiresAt === "string" ? access.accessExpiresAt : null;

  const canPay =
    enabled && Boolean(selectedTier) && !pricingLoading && !submitting;
  const inventoryOk = typeof driverCount === "number" ? driverCount > 0 : true;
  const isDev = process.env.NODE_ENV !== "production";

  async function handlePay() {
    try {
      setSubmitErr(null);
      if (!selectedTier) {
        setSubmitErr("Please select an access tier.");
        return;
      }
      if (!enabled) {
        setSubmitErr("This service is currently unavailable.");
        return;
      }
      if (!inventoryOk) {
        setSubmitErr("No drivers are available in this city yet.");
        return;
      }

      setSubmitting(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("rideon:customerAppMode", "fulltime");
        }
      } catch {}

      const res = await fetch("/api/customer/placement/purchase-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ durationDays: selectedTier.durationDays }),
      });
      const j = (await res.json().catch(() => ({}))) as PurchaseResponse;
      if (!res.ok)
        throw new Error((j as any)?.error || "Failed to initialize payment.");

      const authorization_url = String(j?.authorization_url || "");
      if (!authorization_url)
        throw new Error(
          "Payment initialization did not return a redirect URL.",
        );

      window.location.href = authorization_url;
    } catch (e: any) {
      setSubmitErr(e?.message || "We couldn't start payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDevSimulatePayment() {
    try {
      setSubmitErr(null);
      if (!selectedTier) {
        setSubmitErr("Please select an access tier.");
        return;
      }
      if (!enabled) {
        setSubmitErr("This service is currently unavailable.");
        return;
      }
      if (!inventoryOk) {
        setSubmitErr("No drivers are available in this city yet.");
        return;
      }

      setSubmitting(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch("/api/dev/fake-placement-access-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ durationDays: selectedTier.durationDays }),
      });
      const j = await res.json().catch(() => ({}) as any);
      if (!res.ok) throw new Error(j?.error || "Failed to simulate payment.");

      const redirectUrl = String(j?.redirectUrl || "");
      if (!redirectUrl)
        throw new Error("Simulated payment did not return a redirect URL.");

      window.location.href = redirectUrl;
    } catch (e: any) {
      setSubmitErr(e?.message || "We couldn't start dev payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      {bannerMsg && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {bannerMsg}
          </div>
        </StickyBanner>
      )}

      <header className="mb-6">
        <h1 className="text-[22px] sm:text-[26px] tracking-tight font-semibold text-slate-900 dark:text-slate-100">
          {hasAccess ? "Extend Access" : "Get Access"}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Secure payment via Paystack. Your access unlocks contact and
          engagement features.
        </p>
      </header>

      {submitErr && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {submitErr}
          </div>
        </StickyBanner>
      )}

      <div className="space-y-4">
        <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
          <h2 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
            City
          </h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Select value={city} onValueChange={(v) => setCity(v)}>
                <SelectTrigger disabled={citiesLoading || cities.length === 0}>
                  <SelectValue
                    placeholder={citiesLoading ? "Loading…" : "Select a city"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Drivers available
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {countLoading ? "…" : driverCount == null ? "—" : driverCount}
                </p>
              </div>
            </div>
          </div>

          {typeof driverCount === "number" && driverCount === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/20 px-4 py-3">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                No drivers are available in this city yet.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
          <h2 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
            Choose a tier
          </h2>

          {pricingErr && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {pricingErr}
            </p>
          )}

          {pricingLoading ? (
            <div className="mt-3 h-12 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
          ) : !enabled ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This service is currently unavailable.
            </p>
          ) : tiers.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              No access tiers are available yet.
            </p>
          ) : (
            <div className="mt-3">
              <Select
                value={selectedDays}
                onValueChange={(v) => setSelectedDays(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an access tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem
                      key={t.durationDays}
                      value={String(t.durationDays)}
                    >
                      {t.label || `${t.durationDays} days`} ·{" "}
                      {formatNgn(t.priceNgn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTier && (
                <div className="mt-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {hasAccess
                      ? "Your new expiry will be extended from your current access."
                      : "Your access will start immediately after payment."}
                  </p>
                  {accessLoading ? null : accessExpiresAt ? (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Current expiry:{" "}
                      {new Date(accessExpiresAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Link href="/app/dashboard">
              <Button variant="secondary" className="h-11 w-1/3">
                Back
              </Button>
            </Link>
            <Button
              className="h-11 flex-1"
              onClick={handlePay}
              disabled={!canPay || !inventoryOk}
            >
              {submitting
                ? "Redirecting…"
                : selectedTier
                  ? `Proceed to Pay • ${formatNgn(nf(selectedTier.priceNgn) ?? 0)}`
                  : "Proceed to Pay"}
            </Button>
          </div>

          {isDev && (
            <div className="mt-3">
              <Button
                variant="secondary"
                className="h-11 w-full"
                onClick={handleDevSimulatePayment}
                disabled={!canPay || !inventoryOk}
              >
                {submitting ? "Redirecting…" : "Simulate Payment (Dev)"}
              </Button>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
            Need help? You can contact support from your profile.
          </p>
        </section>
      </div>
    </div>
  );
}
