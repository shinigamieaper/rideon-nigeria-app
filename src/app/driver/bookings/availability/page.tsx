"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Power, Clock, MapPin, Info } from "lucide-react";

interface AvailabilityData {
  online: boolean;
  workingHours?: {
    start: string; // e.g. "08:00"
    end: string; // e.g. "18:00"
  };
  workingDays?: string[]; // e.g. ["mon", "tue", "wed", "thu", "fri"]
  maxPickupRadiusKm?: number;
  servedCities?: string[];
}

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];
const DEFAULT_SERVICE_CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan"];

export default function AvailabilityPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<AvailabilityData>({
    online: false,
    workingHours: { start: "08:00", end: "18:00" },
    workingDays: ["mon", "tue", "wed", "thu", "fri"],
    maxPickupRadiusKm: 25,
    servedCities: ["Lagos"],
  });
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [serviceCities, setServiceCities] = React.useState<string[]>(
    DEFAULT_SERVICE_CITIES,
  );

  // Fetch current availability data
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login?next=/driver/bookings/availability");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/drivers/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setData({
            online: d.onlineStatus ?? d.online ?? false,
            workingHours: d.workingHours ?? { start: "08:00", end: "18:00" },
            workingDays: d.workingDays ?? ["mon", "tue", "wed", "thu", "fri"],
            maxPickupRadiusKm: d.maxPickupRadiusKm ?? 25,
            servedCities: d.servedCities ?? ["Lagos"],
          });
        }
      } catch (e) {
        console.error("[Availability] Failed to fetch driver data", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

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
          setServiceCities(cities);
        }
      } catch (e) {
        console.error("[Availability] Failed to load service cities config", e);
      }
    }
    loadServiceCities();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleOnline = async () => {
    const newStatus = !data.online;
    setData((prev) => ({ ...prev, online: newStatus }));
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const res = await fetch("/api/driver/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ online: newStatus }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update status");
      }
      setMessage({
        type: "success",
        text: newStatus
          ? "You are now online and can receive requests"
          : "You are now offline",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      // Revert on error
      setData((prev) => ({ ...prev, online: !newStatus }));
      setMessage({
        type: "error",
        text: e?.message || "Failed to update status",
      });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const res = await fetch("/api/driver/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workingHours: data.workingHours,
          workingDays: data.workingDays,
          maxPickupRadiusKm: data.maxPickupRadiusKm,
          servedCities: data.servedCities,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to save preferences");
      }
      setMessage({ type: "success", text: "Preferences saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e?.message || "Failed to save preferences",
      });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setData((prev) => {
      const days = prev.workingDays ?? [];
      if (days.includes(day)) {
        return { ...prev, workingDays: days.filter((d) => d !== day) };
      }
      return { ...prev, workingDays: [...days, day] };
    });
  };

  const toggleCity = (city: string) => {
    setData((prev) => {
      const cities = prev.servedCities ?? [];
      if (cities.includes(city)) {
        return { ...prev, servedCities: cities.filter((c) => c !== city) };
      }
      return { ...prev, servedCities: [...cities, city] };
    });
  };

  if (loading) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Availability
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manage your online status and schedule preferences
          </p>
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
          <div className="h-48 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          Availability
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage your online status and schedule preferences
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50/80 dark:bg-green-900/20 border-green-200/80 dark:border-green-800/60 text-green-800 dark:text-green-100"
              : "bg-red-50/80 dark:bg-red-900/20 border-red-200/80 dark:border-red-800/60 text-red-800 dark:text-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Online toggle card */}
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`h-14 w-14 rounded-full flex items-center justify-center transition-colors ${
                  data.online
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : "bg-slate-200/60 dark:bg-slate-700/40 text-slate-500"
                }`}
              >
                <Power className="h-7 w-7" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {data.online ? "You're Online" : "You're Offline"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {data.online
                    ? "You can receive new booking requests"
                    : "You won't receive new booking requests"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleOnline}
              disabled={saving}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00529B] focus-visible:ring-offset-2 disabled:opacity-50 ${
                data.online ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
              role="switch"
              aria-checked={data.online}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  data.online ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Schedule preferences */}
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 space-y-5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Clock className="h-5 w-5 text-[#00529B]" />
            <h2 className="text-lg font-semibold">Schedule Preferences</h2>
          </div>

          {/* Working hours */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Working Hours
            </label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={data.workingHours?.start ?? "08:00"}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    workingHours: {
                      ...prev.workingHours!,
                      start: e.target.value,
                    },
                  }))
                }
                className="flex-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00529B]"
              />
              <span className="text-slate-500">to</span>
              <input
                type="time"
                value={data.workingHours?.end ?? "18:00"}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    workingHours: {
                      ...prev.workingHours!,
                      end: e.target.value,
                    },
                  }))
                }
                className="flex-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00529B]"
              />
            </div>
          </div>

          {/* Working days */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Working Days
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = data.workingDays?.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#00529B] text-white"
                        : "bg-slate-100/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/40"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Served cities */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-[#00529B]" />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Cities You Serve
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {serviceCities.map((city) => {
                const active = data.servedCities?.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#00529B] text-white"
                        : "bg-slate-100/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/40"
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pickup radius */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Max Pickup Radius:{" "}
              <span className="font-semibold">{data.maxPickupRadiusKm} km</span>
            </label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={data.maxPickupRadiusKm ?? 25}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  maxPickupRadiusKm: Number(e.target.value),
                }))
              }
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00529B]"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/30 rounded-lg p-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              These preferences help our system match you with suitable
              bookings. You can still accept or decline individual requests.
            </p>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={savePreferences}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#0077E6] to-[#00529B] shadow-lg hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </>
  );
}
