"use client";

import Link from "next/link";
import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { waitForUser } from "@/lib/firebase";
import { Heart, MapPin, Briefcase, Wallet } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StickyBanner,
} from "@/components";

type DriverListItem = {
  id: string;
  firstName: string;
  lastNameInitial: string | null;
  profileImageUrl: string | null;
  preferredCity: string | null;
  experienceYears: number;
  salaryExpectationNgn: number | null;
  salaryExpectationMinNgn: number | null;
  salaryExpectationMaxNgn: number | null;
  placementStatus: string;
};

type ListResponse = {
  city?: string | null;
  hasAccess?: boolean;
  accessExpiresAt?: string | null;
  savedDriverIds?: string[];
  drivers?: DriverListItem[];
};

type CitiesResponse = {
  enabledCities?: string[];
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

export default function Page() {
  const [tab, setTab] = React.useState<"all" | "saved">("all");

  const [cities, setCities] = React.useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = React.useState(true);
  const [city, setCity] = React.useState<string>("");

  const [minExperienceYears, setMinExperienceYears] =
    React.useState<string>("any");
  const [minSalaryExpectationNgn, setMinSalaryExpectationNgn] =
    React.useState<string>("");
  const [maxSalaryExpectationNgn, setMaxSalaryExpectationNgn] =
    React.useState<string>("");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [drivers, setDrivers] = React.useState<DriverListItem[]>([]);
  const [savedDriverIds, setSavedDriverIds] = React.useState<string[]>([]);
  const [hasAccess, setHasAccess] = React.useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = React.useState<string | null>(
    null,
  );
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function loadCities() {
      try {
        setCitiesLoading(true);
        const res = await fetch("/api/config/service-cities", {
          cache: "no-store",
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
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }
    loadCities();
    return () => {
      cancelled = true;
    };
  }, [city]);

  const fetchDrivers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await waitForUser();
      const token = await user.getIdToken();

      const sp = new URLSearchParams();
      if (city.trim()) sp.set("city", city.trim());
      if (minExperienceYears.trim() && minExperienceYears.trim() !== "any")
        sp.set("minExperienceYears", minExperienceYears.trim());
      if (minSalaryExpectationNgn.trim())
        sp.set("minSalaryExpectationNgn", minSalaryExpectationNgn.trim());
      if (maxSalaryExpectationNgn.trim())
        sp.set("maxSalaryExpectationNgn", maxSalaryExpectationNgn.trim());
      sp.set("savedOnly", tab === "saved" ? "true" : "false");
      sp.set("limit", "120");

      const res = await fetchWithTimeout(
        `/api/customer/placement/drivers?${sp.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: 9000,
        },
      );
      const j = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok)
        throw new Error((j as any)?.error || "Failed to load drivers.");

      setDrivers(Array.isArray(j?.drivers) ? j.drivers : []);
      setSavedDriverIds(
        Array.isArray(j?.savedDriverIds) ? j.savedDriverIds : [],
      );
      setHasAccess(j?.hasAccess === true);
      setAccessExpiresAt(
        typeof j?.accessExpiresAt === "string" ? j.accessExpiresAt : null,
      );
    } catch (e: any) {
      setDrivers([]);
      setSavedDriverIds([]);
      setHasAccess(false);
      setAccessExpiresAt(null);
      setError(e?.message || "We couldn't load drivers right now.");
    } finally {
      setLoading(false);
    }
  }, [
    city,
    maxSalaryExpectationNgn,
    minExperienceYears,
    minSalaryExpectationNgn,
    tab,
  ]);

  React.useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  async function toggleShortlist(driverId: string) {
    if (!driverId) return;
    try {
      setTogglingId(driverId);
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch("/api/customer/placement/drivers/shortlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverId, action: "toggle" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to update shortlist.");
      const saved = Boolean(j?.saved);
      setSavedDriverIds((cur) => {
        const s = new Set(cur);
        if (saved) s.add(driverId);
        else s.delete(driverId);
        return Array.from(s);
      });
      if (tab === "saved" && !saved) {
        setDrivers((cur) => cur.filter((d) => d.id !== driverId));
      }
    } catch (e: any) {
      setError(e?.message || "Failed to update shortlist.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setTogglingId(null);
    }
  }

  const savedSet = React.useMemo(
    () => new Set(savedDriverIds),
    [savedDriverIds],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      <motion.header
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[28px] md:text-[32px] tracking-tight font-medium text-slate-900 dark:text-slate-100">
          Browse Drivers
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Find and shortlist professional drivers for hire
        </p>
      </motion.header>

      <motion.div
        className="mb-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
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

          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Min experience (years)
            </label>
            <Select
              value={minExperienceYears}
              onValueChange={(v) => setMinExperienceYears(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={"any"}>Any</SelectItem>
                {[0, 1, 2, 3, 5, 7, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Min salary expectation (₦/month)
            </label>
            <Input
              inputMode="numeric"
              placeholder="e.g. 150000"
              value={minSalaryExpectationNgn}
              onChange={(e) => setMinSalaryExpectationNgn(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Max salary expectation (₦/month)
            </label>
            <Input
              inputMode="numeric"
              placeholder="e.g. 300000"
              value={maxSalaryExpectationNgn}
              onChange={(e) => setMaxSalaryExpectationNgn(e.target.value)}
            />
          </div>

          <div className="flex items-end sm:col-span-2">
            <Button className="h-11 w-full" onClick={fetchDrivers}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800/60">
          <motion.button
            onClick={() => setTab("all")}
            whileTap={{ scale: 0.95 }}
            className={[
              "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              tab === "all"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
            type="button"
          >
            All Drivers
          </motion.button>
          <motion.button
            onClick={() => setTab("saved")}
            whileTap={{ scale: 0.95 }}
            className={[
              "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              tab === "saved"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
            type="button"
          >
            Shortlisted
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      {!hasAccess && (
        <motion.div
          className="mb-4 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/20 px-4 py-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-sm text-amber-900 dark:text-amber-200">
            You can browse and shortlist drivers, but you’ll need access to view
            contact details and start engagements.
          </p>
          <div className="mt-3">
            <Link href="/app/hire-a-driver/access">
              <Button className="h-11">Get Access</Button>
            </Link>
          </div>
        </motion.div>
      )}

      {accessExpiresAt && (
        <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
          Access expires: {new Date(accessExpiresAt).toLocaleString()}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <motion.section
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {tab === "saved"
              ? "No shortlisted drivers yet."
              : "No drivers match your filters."}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link href="/app/dashboard">
              <Button variant="secondary" className="h-11">
                Back
              </Button>
            </Link>
          </div>
        </motion.section>
      ) : (
        <motion.div
          className="space-y-3"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          initial="hidden"
          animate="show"
        >
          {drivers.map((d) => {
            const saved = savedSet.has(d.id);
            const displayName = `${d.firstName}${d.lastNameInitial ? ` ${d.lastNameInitial}.` : ""}`;
            const cityLabel = d.preferredCity || city || null;
            const salaryMin =
              typeof d.salaryExpectationMinNgn === "number"
                ? d.salaryExpectationMinNgn
                : null;
            const salaryMax =
              typeof d.salaryExpectationMaxNgn === "number"
                ? d.salaryExpectationMaxNgn
                : d.salaryExpectationNgn;
            const salaryLabel =
              typeof salaryMin === "number" && typeof salaryMax === "number"
                ? salaryMin === salaryMax
                  ? `₦${new Intl.NumberFormat("en-NG").format(salaryMax)}`
                  : `₦${new Intl.NumberFormat("en-NG").format(salaryMin)} – ₦${new Intl.NumberFormat("en-NG").format(salaryMax)}`
                : typeof salaryMax === "number"
                  ? `₦${new Intl.NumberFormat("en-NG").format(salaryMax)}`
                  : null;

            return (
              <motion.div
                key={d.id}
                className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
                whileHover={{
                  y: -2,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 overflow-hidden flex items-center justify-center">
                    {d.profileImageUrl ? (
                      <Image
                        src={d.profileImageUrl}
                        alt={displayName}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {d.firstName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {displayName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {cityLabel && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {cityLabel}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {d.experienceYears} yrs
                          </span>
                          {salaryLabel != null && (
                            <span className="inline-flex items-center gap-1">
                              <Wallet className="h-3.5 w-3.5" />
                              {salaryLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <motion.button
                        type="button"
                        disabled={togglingId === d.id}
                        onClick={() => toggleShortlist(d.id)}
                        whileHover={{ scale: 1.1, rotate: saved ? 0 : -10 }}
                        whileTap={{ scale: 0.9 }}
                        className={[
                          "h-10 w-10 rounded-xl border flex items-center justify-center transition",
                          saved
                            ? "bg-rose-50/70 dark:bg-rose-900/20 border-rose-200/80 dark:border-rose-800/40 text-rose-600"
                            : "bg-white/40 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60 text-slate-600 dark:text-slate-300",
                          togglingId === d.id ? "opacity-60" : "hover:shadow",
                        ].join(" ")}
                        aria-label={
                          saved ? "Remove from shortlist" : "Add to shortlist"
                        }
                      >
                        <Heart
                          className={saved ? "h-5 w-5 fill-current" : "h-5 w-5"}
                        />
                      </motion.button>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Link
                        href={`/app/hire-a-driver/driver/${encodeURIComponent(d.id)}`}
                        className="flex-1"
                      >
                        <Button className="h-11 w-full">View Profile</Button>
                      </Link>
                      {!hasAccess && (
                        <Link
                          href="/app/hire-a-driver/access"
                          className="hidden sm:block"
                        >
                          <Button variant="secondary" className="h-11">
                            Get Access
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
