"use client";

import * as React from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { StickyBanner } from "@/components";
import { MapPin, CheckCircle2, Save } from "lucide-react";

const DEFAULT_SERVICE_CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan"];

async function getUserOrWait(timeoutMs = 4000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    const t = window.setTimeout(() => {
      unsub();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      window.clearTimeout(t);
      unsub();
      resolve(u);
    });
  });
}

export default function DriverSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [servedCities, setServedCities] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<string>("pending");
  const [availableCities, setAvailableCities] = React.useState<string[]>(
    DEFAULT_SERVICE_CITIES,
  );

  React.useEffect(() => {
    async function load() {
      try {
        const user = await getUserOrWait();
        const token = await user.getIdToken();
        const res = await fetch("/api/drivers/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Failed to load settings");

        setServedCities(j.servedCities || []);
        setStatus(j.status || "pending");
      } catch (e: any) {
        setError(e?.message || "Unable to load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadServiceCities() {
      try {
        const res = await fetch("/api/config/service-cities");
        if (!res.ok) return;
        const j = await res.json();
        const fromEnabled = Array.isArray(j.enabledCities)
          ? j.enabledCities
          : [];
        const fromFull = Array.isArray(j.cities)
          ? j.cities
              .map((c: any) => (typeof c?.name === "string" ? c.name : ""))
              .filter((name: string) => name.trim().length > 0)
          : [];
        const cities: string[] =
          fromEnabled.length > 0 ? fromEnabled : fromFull;
        if (!cancelled && cities.length > 0) {
          setAvailableCities(cities);
        }
      } catch (e) {
        console.error(
          "[DriverSettings] Failed to load service cities config",
          e,
        );
      }
    }
    loadServiceCities();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (saving) return;
    if (servedCities.length === 0) {
      setError("Please select at least one service city.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const user = await getUserOrWait();
      const token = await user.getIdToken();

      const res = await fetch("/api/drivers/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          servedCities,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to save settings");

      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Unable to save settings.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  function toggleCity(city: string) {
    setServedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <div className="h-6 w-48 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        <div className="mt-1 h-4 w-96 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />

        <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 space-y-5 animate-pulse">
          <div className="h-16 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-32 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Service Settings
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Manage your service cities and availability.
      </p>

      {(error || success) && (
        <StickyBanner className="z-50 mt-4">
          <div
            className={[
              "rounded-xl px-3 py-2 text-[13px] shadow border",
              success
                ? "bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200",
            ].join(" ")}
          >
            {success || error}
          </div>
        </StickyBanner>
      )}

      <div className="mt-5 space-y-5">
        {/* Status Badge */}
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Account Status
          </h2>
          <div className="flex items-center gap-3">
            <div
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5",
                status === "approved"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : status === "pending"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
              ].join(" ")}
            >
              {status === "approved" && (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {status === "approved"
                ? "Approved - Ready for Assignments"
                : status === "pending"
                  ? "Pending Review"
                  : status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
          </div>
        </div>

        {/* Service Cities */}
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Service Cities
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Select the cities where you&apos;re available to accept
                chauffeur rental assignments. You&apos;ll only receive offers in
                these locations.
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableCities.map((city) => {
                  const selected = servedCities.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleCity(city)}
                      className={[
                        "px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                        selected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600",
                      ].join(" ")}
                    >
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                      )}
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
