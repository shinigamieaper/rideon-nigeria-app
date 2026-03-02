"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import StepHeader from "@/components/app/booking/StepHeader";
import { waitForUser } from "@/lib/firebase";
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

type OptionsResponse = {
  service?: string;
  blockHours?: number[];
  cities?: string[];
  cityDurations?: Record<string, number[]>;
};

type Draft = {
  pickupAddress?: string;
  pickupCoords?: [number, number];
  city?: string;
  blockHours?: number;
  startDate?: string;
  startTime?: string;
  notes?: string;
};

const STORAGE_KEY = "rideon:driveMyCarDraft";

function toLocalDate(yyyy_mm_dd?: string, hh_mm?: string) {
  const [y, m, d] = (yyyy_mm_dd || "1970-01-01")
    .split("-")
    .map((n) => parseInt(n, 10));
  const [hh, mm] = (hh_mm || "00:00").split(":").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export default function Page() {
  const router = useRouter();

  const now = React.useMemo(() => new Date(), []);
  const todayStr = React.useMemo(
    () =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate())
        .toISOString()
        .slice(0, 10),
    [now],
  );

  const [bannerMsg, setBannerMsg] = React.useState<string | null>(null);
  const [loadingUI, setLoadingUI] = React.useState(true);

  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [options, setOptions] = React.useState<OptionsResponse | null>(null);

  const [pickupAddress, setPickupAddress] = React.useState<string>("");
  const [city, setCity] = React.useState<string>("");
  const [blockHours, setBlockHours] = React.useState<number | null>(null);
  const [startDate, setStartDate] = React.useState<string>("");
  const [startTime, setStartTime] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  React.useEffect(() => {
    const t = setTimeout(() => setLoadingUI(false), 250);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Draft;
      if (parsed.pickupAddress) setPickupAddress(parsed.pickupAddress);
      if (parsed.city) setCity(parsed.city);
      if (
        typeof parsed.blockHours === "number" &&
        Number.isFinite(parsed.blockHours)
      ) {
        setBlockHours(Math.round(parsed.blockHours));
      }
      if (parsed.startDate) setStartDate(parsed.startDate);
      if (parsed.startTime) setStartTime(parsed.startTime);
      if (parsed.notes) setNotes(parsed.notes);
    } catch {}
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setOptionsLoading(true);
        const user = await waitForUser();
        const token = await user.getIdToken();
        const res = await fetch("/api/drive-my-car/options", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to load options");
        if (!cancelled) setOptions(j as OptionsResponse);
      } catch {
        if (!cancelled) setOptions(null);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowedDurations = React.useMemo(() => {
    const list = Array.isArray(options?.blockHours) ? options!.blockHours! : [];
    const unique = Array.from(
      new Set(
        list
          .map((h) => Math.round(Number(h)))
          .filter((h) => Number.isFinite(h) && h > 0),
      ),
    );
    unique.sort((a, b) => a - b);
    return unique;
  }, [options]);

  const cityOptions = React.useMemo(() => {
    const cities = Array.isArray(options?.cities) ? options!.cities! : [];
    return cities;
  }, [options]);

  const durationsForCity = React.useMemo(() => {
    if (!city) return allowedDurations;
    const map = options?.cityDurations || {};
    const list = map?.[city];
    if (Array.isArray(list) && list.length) return list;
    return allowedDurations;
  }, [allowedDurations, city, options]);

  React.useEffect(() => {
    if (!blockHours) return;
    if (!durationsForCity.includes(blockHours)) {
      setBlockHours(null);
    }
  }, [blockHours, durationsForCity]);

  function validateSchedule(sd?: string, st?: string) {
    setBannerMsg(null);
    if (!sd || !st) return;
    const start = toLocalDate(sd, st);
    if (start.getTime() < Date.now()) {
      setBannerMsg("Start time cannot be in the past.");
      return;
    }
  }

  const canProceed = React.useMemo(() => {
    if (!pickupAddress.trim()) return false;
    if (!city.trim()) return false;
    if (!blockHours || !Number.isFinite(blockHours)) return false;
    if (!startDate || !startTime) return false;
    const start = toLocalDate(startDate, startTime);
    if (start.getTime() < Date.now()) return false;
    return true;
  }, [blockHours, city, pickupAddress, startDate, startTime]);

  function persistDraft(next: Draft) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function handleNext() {
    if (!canProceed) {
      setBannerMsg("Please complete all required fields.");
      return;
    }
    const next: Draft = {
      pickupAddress: pickupAddress.trim(),
      city: city.trim(),
      blockHours: blockHours || undefined,
      startDate,
      startTime,
      notes: notes.trim() || undefined,
    };
    persistDraft(next);
    router.push("/app/drive-my-car/review");
  }

  const showSkeleton = loadingUI || optionsLoading;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <motion.section
        className="mt-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="px-4 sm:px-6 mt-4 flex items-center justify-between"
          data-tour="drive-my-car-step-header"
        >
          <StepHeader step={1} total={2} title="Request" />
        </div>

        <div className="px-4 sm:px-6 mt-4 space-y-5 pb-6">
          {bannerMsg && (
            <StickyBanner className="z-50">
              <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
                {bannerMsg}
              </div>
            </StickyBanner>
          )}

          <motion.div
            data-tour="drive-my-car-how-it-works"
            className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
          >
            <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              How it works
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Tell us where and when you need a professional driver to drive
              your own vehicle. After payment, we confirm your reservation and
              assign a vetted driver.
            </p>
          </motion.div>

          {showSkeleton ? (
            <div className="space-y-3">
              <div className="h-20 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
              <div className="h-20 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
              <div className="h-20 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
            </div>
          ) : (
            <>
              <motion.div
                data-tour="drive-my-car-pickup"
                className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Pickup address
                </label>
                <Input
                  value={pickupAddress}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPickupAddress(v);
                    persistDraft({
                      pickupAddress: v,
                      city: city.trim() || undefined,
                      blockHours: blockHours ?? undefined,
                      startDate: startDate || undefined,
                      startTime: startTime || undefined,
                      notes: notes || undefined,
                    });
                  }}
                  placeholder="e.g. 12 Admiralty Way, Lekki"
                />
              </motion.div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div
                  data-tour="drive-my-car-city"
                  className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3"
                >
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    City
                  </label>
                  <Select
                    value={city}
                    onValueChange={(v) => {
                      setCity(v);
                      persistDraft({
                        pickupAddress: pickupAddress.trim() || undefined,
                        city: v.trim() || undefined,
                        blockHours: blockHours ?? undefined,
                        startDate: startDate || undefined,
                        startTime: startTime || undefined,
                        notes: notes || undefined,
                      });
                    }}
                  >
                    <SelectTrigger disabled={cityOptions.length === 0}>
                      <SelectValue
                        placeholder={
                          cityOptions.length === 0
                            ? "No cities"
                            : "Select a city"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div
                  data-tour="drive-my-car-duration"
                  className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3"
                >
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Duration
                  </label>
                  <Select
                    value={blockHours ? String(blockHours) : ""}
                    onValueChange={(v) => {
                      const n = Math.round(Number(v));
                      const next = Number.isFinite(n) ? n : null;
                      setBlockHours(next);
                      persistDraft({
                        pickupAddress: pickupAddress.trim() || undefined,
                        city: city.trim() || undefined,
                        blockHours: next ?? undefined,
                        startDate: startDate || undefined,
                        startTime: startTime || undefined,
                        notes: notes || undefined,
                      });
                    }}
                  >
                    <SelectTrigger disabled={durationsForCity.length === 0}>
                      <SelectValue
                        placeholder={
                          durationsForCity.length === 0
                            ? "No durations"
                            : "Select"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {durationsForCity.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {h} hours
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div
                  data-tour="drive-my-car-start-date"
                  className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3"
                >
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Start date
                  </label>
                  <Input
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      validateSchedule(v, startTime);
                      persistDraft({
                        pickupAddress: pickupAddress.trim() || undefined,
                        city: city.trim() || undefined,
                        blockHours: blockHours ?? undefined,
                        startDate: v || undefined,
                        startTime: startTime || undefined,
                        notes: notes || undefined,
                      });
                    }}
                  />
                </div>

                <div
                  data-tour="drive-my-car-start-time"
                  className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3"
                >
                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Start time
                  </label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartTime(v);
                      validateSchedule(startDate, v);
                      persistDraft({
                        pickupAddress: pickupAddress.trim() || undefined,
                        city: city.trim() || undefined,
                        blockHours: blockHours ?? undefined,
                        startDate: startDate || undefined,
                        startTime: v || undefined,
                        notes: notes || undefined,
                      });
                    }}
                  />
                </div>
              </motion.div>

              <motion.div
                data-tour="drive-my-car-notes"
                className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Notes (optional)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNotes(v);
                    persistDraft({
                      pickupAddress: pickupAddress.trim() || undefined,
                      city: city.trim() || undefined,
                      blockHours: blockHours ?? undefined,
                      startDate: startDate || undefined,
                      startTime: startTime || undefined,
                      notes: v || undefined,
                    });
                  }}
                  placeholder="Any special instructions"
                />
              </motion.div>

              <motion.div
                className="flex items-center gap-3 pt-1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => router.push("/app/drive-my-car")}
                  className="h-11 w-1/3"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="h-11 flex-1"
                  data-tour="drive-my-car-continue"
                >
                  Continue
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </motion.section>
    </div>
  );
}
