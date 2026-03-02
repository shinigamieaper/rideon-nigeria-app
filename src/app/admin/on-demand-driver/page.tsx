"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  Car,
  Check,
  Loader2,
  Save,
  AlertCircle,
  MapPin,
  Users,
} from "lucide-react";

type PricingConfig = {
  enabled: boolean;
  blockHours: number[];
  cityBlockRatesNgn: Record<string, Record<string, number>>;
};

type ServiceCity = {
  name: string;
  enabled: boolean;
  activeDrivers: number;
  onlineDrivers: number;
};

const DEFAULT_CONFIG: PricingConfig = {
  enabled: true,
  blockHours: [2, 4, 8],
  cityBlockRatesNgn: {},
};

function normalizeHours(input: any): number[] {
  if (!Array.isArray(input)) return DEFAULT_CONFIG.blockHours;
  const out = input
    .map((h) => Number(h))
    .filter((h) => Number.isFinite(h) && h > 0)
    .map((h) => Math.max(1, Math.round(h)))
    .filter((h) => h <= 24);
  return out.length > 0
    ? Array.from(new Set(out)).sort((a, b) => a - b)
    : DEFAULT_CONFIG.blockHours;
}

export default function OnDemandDriverAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<PricingConfig>(DEFAULT_CONFIG);
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByEmail, setUpdatedByEmail] = useState<string | null>(null);

  const [newDuration, setNewDuration] = useState<string>("");

  const sortedDurations = useMemo(
    () => normalizeHours(config.blockHours),
    [config.blockHours],
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const [pricingRes, citiesRes] = await Promise.all([
        fetch("/api/admin/on-demand-driver/pricing", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/admin/operations/cities", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (!pricingRes.ok) {
        const data = await pricingRes.json().catch(() => ({}));
        throw new Error(
          data?.error || "Failed to load on-demand driver config",
        );
      }

      const pricingJson = await pricingRes.json().catch(() => ({}));
      const nextConfig = (pricingJson?.config ||
        DEFAULT_CONFIG) as PricingConfig;

      setConfig({
        enabled: Boolean(nextConfig?.enabled),
        blockHours: normalizeHours(nextConfig?.blockHours),
        cityBlockRatesNgn:
          nextConfig?.cityBlockRatesNgn &&
          typeof nextConfig.cityBlockRatesNgn === "object"
            ? nextConfig.cityBlockRatesNgn
            : {},
      });

      setUpdatedAt(
        typeof pricingJson?.updatedAt === "string"
          ? pricingJson.updatedAt
          : null,
      );
      setUpdatedByEmail(
        typeof pricingJson?.updatedByEmail === "string"
          ? pricingJson.updatedByEmail
          : null,
      );

      if (citiesRes.ok) {
        const citiesJson = await citiesRes.json().catch(() => ({}));
        setCities(Array.isArray(citiesJson?.cities) ? citiesJson.cities : []);
      } else {
        setCities([]);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to load on-demand driver config";
      setError(msg);
    } finally {
      setLoading(false);
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) fetchAll();
    });
    return () => unsub();
  }, [fetchAll]);

  const setRate = useCallback((city: string, hours: number, value: string) => {
    setConfig((prev) => {
      const next = { ...prev };
      const currentCity =
        next.cityBlockRatesNgn?.[city] &&
        typeof next.cityBlockRatesNgn[city] === "object"
          ? { ...next.cityBlockRatesNgn[city] }
          : {};

      const asNumber = Math.max(0, Math.round(Number(value)));
      if (!Number.isFinite(Number(value)) || asNumber <= 0) {
        delete currentCity[String(hours)];
      } else {
        currentCity[String(hours)] = asNumber;
      }

      const nextMap = { ...(next.cityBlockRatesNgn || {}) };
      if (Object.keys(currentCity).length === 0) {
        delete nextMap[city];
      } else {
        nextMap[city] = currentCity;
      }

      next.cityBlockRatesNgn = nextMap;
      return next;
    });
  }, []);

  const handleAddDuration = useCallback(() => {
    const n = Math.round(Number(newDuration));
    if (!Number.isFinite(n) || n <= 0 || n > 24) return;
    setConfig((prev) => ({
      ...prev,
      blockHours: Array.from(new Set([...(prev.blockHours || []), n])).sort(
        (a, b) => a - b,
      ),
    }));
    setNewDuration("");
  }, [newDuration]);

  const handleRemoveDuration = useCallback((hours: number) => {
    setConfig((prev) => {
      const nextHours = (prev.blockHours || []).filter(
        (h) => Math.round(Number(h)) !== hours,
      );
      const nextRates: PricingConfig["cityBlockRatesNgn"] = {};

      for (const [city, rates] of Object.entries(
        prev.cityBlockRatesNgn || {},
      )) {
        const copy: Record<string, number> = { ...(rates || {}) };
        delete copy[String(hours)];
        if (Object.keys(copy).length > 0) nextRates[city] = copy;
      }

      return { ...prev, blockHours: nextHours, cityBlockRatesNgn: nextRates };
    });
  }, []);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setError(null);

      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      const res = await fetch("/api/admin/on-demand-driver/pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: Boolean(config.enabled),
          blockHours: normalizeHours(config.blockHours),
          cityBlockRatesNgn: config.cityBlockRatesNgn || {},
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data?.error || "Failed to save on-demand driver config",
        );
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchAll();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to save on-demand driver config";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [config, fetchAll]);

  const rows = useMemo(() => {
    const base = Array.isArray(cities) ? cities : [];
    const configuredCityNames = Object.keys(config.cityBlockRatesNgn || {});

    const extras: ServiceCity[] = configuredCityNames
      .filter(
        (name) =>
          !base.some((c) => c.name.toLowerCase() === name.toLowerCase()),
      )
      .map((name) => ({
        name,
        enabled: true,
        activeDrivers: 0,
        onlineDrivers: 0,
      }));

    const merged = [...base, ...extras];
    merged.sort((a, b) => a.name.localeCompare(b.name));
    return merged;
  }, [cities, config.cityBlockRatesNgn]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mt-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                On-Demand Driver
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Configure customer-facing pricing for Hire a Driver (per duration,
              per city).
            </p>
          </div>

          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? "Saved!" : "Save"}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Service Enabled
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Disable to hide the flow from customers.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((p) => ({ ...p, enabled: !p.enabled }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled
                    ? "bg-green-500"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    config.enabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Durations (hours)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  These are the selectable durations in the customer flow.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-28 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  type="button"
                  onClick={handleAddDuration}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {sortedDurations.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleRemoveDuration(h)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {h}h<span className="text-slate-400">×</span>
                </button>
              ))}
              {sortedDurations.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add at least one duration.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                City Pricing
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Users className="h-4 w-4" />
              <span>Driver counts come from Operations → Cities</span>
            </div>
          </div>

          {citiesLoading || loading ? (
            <div className="mt-6 flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300 p-3 border-b border-slate-200/70 dark:border-slate-800/60">
                      City
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300 p-3 border-b border-slate-200/70 dark:border-slate-800/60">
                      Status
                    </th>
                    {sortedDurations.map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300 p-3 border-b border-slate-200/70 dark:border-slate-800/60"
                      >
                        {h}h (NGN)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const cityName = c.name;
                    return (
                      <tr key={cityName}>
                        <td className="p-3 border-b border-slate-200/60 dark:border-slate-800/60">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {cityName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Active: {c.activeDrivers} • Online:{" "}
                            {c.onlineDrivers}
                          </div>
                        </td>
                        <td className="p-3 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                              c.enabled
                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40"
                                : "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/50"
                            }`}
                          >
                            {c.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        {sortedDurations.map((h) => {
                          const v =
                            config.cityBlockRatesNgn?.[cityName]?.[String(h)];
                          return (
                            <td
                              key={h}
                              className="p-3 border-b border-slate-200/60 dark:border-slate-800/60"
                            >
                              <input
                                type="number"
                                min={0}
                                value={
                                  typeof v === "number" && Number.isFinite(v)
                                    ? v
                                    : ""
                                }
                                onChange={(e) =>
                                  setRate(cityName, h, e.target.value)
                                }
                                className="w-40 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={2 + sortedDurations.length}
                        className="p-6 text-sm text-slate-600 dark:text-slate-400"
                      >
                        No cities configured. Add cities in Operations → Cities.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(updatedAt || updatedByEmail) && (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-right">
            Last updated:{" "}
            {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
            {updatedByEmail ? ` by ${updatedByEmail}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
