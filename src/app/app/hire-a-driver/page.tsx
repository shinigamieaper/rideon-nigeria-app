"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

type AccessStatusResponse = {
  hasAccess?: boolean;
  accessExpiresAt?: string | null;
  purchaseId?: string | null;
  savedDriverIds?: string[];
};

type CitiesResponse = {
  enabledCities?: string[];
};

type CountResponse = {
  count?: number;
  city?: string;
};

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
) {
  const timeoutMs = init?.timeoutMs ?? 8000;
  const { timeoutMs: _timeoutMs, ...rest } = init || {};

  if ((rest as any).signal) {
    return await fetch(input, rest);
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function formatDaysLeft(
  expiresAtIso: string | null | undefined,
): string | null {
  if (!expiresAtIso) return null;
  const d = new Date(expiresAtIso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Expired";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export default function Page() {
  const params = useSearchParams();

  const [bannerMsg, setBannerMsg] = React.useState<string | null>(null);

  const [citiesLoading, setCitiesLoading] = React.useState(true);
  const [cities, setCities] = React.useState<string[]>([]);
  const [city, setCity] = React.useState<string>("");

  const [countLoading, setCountLoading] = React.useState(false);
  const [countErr, setCountErr] = React.useState<string | null>(null);
  const [driverCount, setDriverCount] = React.useState<number | null>(null);

  const [accessLoading, setAccessLoading] = React.useState(false);
  const [accessErr, setAccessErr] = React.useState<string | null>(null);
  const [access, setAccess] = React.useState<AccessStatusResponse | null>(null);

  React.useEffect(() => {
    const p = (params.get("placementAccess") || "").trim();
    if (p === "success")
      setBannerMsg("Payment received. Your placement access is now active.");
    else if (p === "failed")
      setBannerMsg("We couldn't confirm your payment. Please try again.");
    else if (p === "cancelled")
      setBannerMsg("Payment was cancelled. You can try again anytime.");
  }, [params]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCities() {
      try {
        setCitiesLoading(true);
        const res = await fetchWithTimeout("/api/config/service-cities", {
          cache: "no-store",
          timeoutMs: 6000,
        });
        const j = (await res.json().catch(() => ({}))) as CitiesResponse;
        const enabled = Array.isArray(j?.enabledCities)
          ? j.enabledCities.filter((c) => typeof c === "string" && c.trim())
          : [];
        if (!cancelled) {
          setCities(enabled);
          if (!city && enabled.length > 0) setCity(enabled[0]);
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
  }, [city]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      try {
        setCountErr(null);
        setCountLoading(true);
        if (!city) {
          if (!cancelled) setDriverCount(null);
          return;
        }
        const res = await fetchWithTimeout(
          `/api/customer/placement/drivers/count?city=${encodeURIComponent(city)}`,
          {
            cache: "no-store",
            timeoutMs: 6000,
          },
        );
        const j = (await res.json().catch(() => ({}))) as CountResponse;
        if (!res.ok) throw new Error("Failed to load driver count");
        if (!cancelled)
          setDriverCount(typeof j?.count === "number" ? j.count : 0);
      } catch {
        if (!cancelled) {
          setDriverCount(null);
          setCountErr("We couldn't load availability right now.");
        }
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
        setAccessErr(null);
        setAccessLoading(true);
        const user = await waitForUser();
        const token = await user.getIdToken();
        const res = await fetchWithTimeout(
          "/api/customer/placement/access-status",
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            timeoutMs: 6000,
          },
        );
        const j = (await res.json().catch(() => ({}))) as AccessStatusResponse;
        if (!res.ok)
          throw new Error(
            j?.hasAccess === false
              ? "Access status unavailable"
              : "Failed to load access status",
          );
        if (!cancelled) setAccess(j);
      } catch (e: any) {
        if (!cancelled) {
          setAccess(null);
          setAccessErr(e?.message || "We couldn't load your access status.");
        }
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    }
    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAccess = Boolean(access?.hasAccess);
  const daysLeftLabel = formatDaysLeft(access?.accessExpiresAt);
  const canPay = typeof driverCount === "number" ? driverCount > 0 : true;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      {bannerMsg && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {bannerMsg}
          </div>
        </StickyBanner>
      )}

      <header className="mb-6" data-tour="hire-a-driver-header">
        <h1 className="text-[28px] md:text-[32px] tracking-tight font-medium text-slate-900 dark:text-slate-100">
          Hire a Full-Time Driver
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Browse vetted drivers and start conversations when you have active
          access.
        </p>
      </header>

      <div className="space-y-4">
        <section
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5"
          data-tour="hire-a-driver-availability"
        >
          <h2 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
            Availability
          </h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div data-tour="hire-a-driver-city">
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                City
              </label>
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
              {countErr && (
                <p className="text-xs text-slate-600 dark:text-slate-400 text-right max-w-[12rem]">
                  {countErr}
                </p>
              )}
            </div>
          </div>

          {typeof driverCount === "number" && driverCount === 0 && (
            <div className="mt-4 rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/20 px-4 py-3">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                We don’t have available full-time drivers in this city yet.
              </p>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5"
          data-tour="hire-a-driver-access"
        >
          <h2 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
            Your access
          </h2>
          {accessErr && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {accessErr}
            </p>
          )}
          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {accessLoading
                  ? "Checking your access…"
                  : hasAccess
                    ? "Access is active."
                    : "Access is not active yet."}
              </p>
              {hasAccess && daysLeftLabel && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {daysLeftLabel}
                </p>
              )}
            </div>

            {hasAccess ? (
              <Link
                href="/app/hire-a-driver/browse"
                data-tour="hire-a-driver-cta"
              >
                <Button className="h-11">Browse Drivers</Button>
              </Link>
            ) : (
              <Link
                href={`/app/hire-a-driver/access${city ? `?city=${encodeURIComponent(city)}` : ""}`}
                data-tour="hire-a-driver-cta"
              >
                <Button className="h-11" disabled={!canPay}>
                  {canPay ? "Get Access" : "Unavailable"}
                </Button>
              </Link>
            )}
          </div>

          {!hasAccess && (
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              You can shortlist drivers anytime, but you’ll need access to
              contact them.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
