"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRental } from "@/components/app/RentalProvider";
import StepHeader from "@/components/app/booking/StepHeader";
import Input from "@/components/ui/Input";
import { StickyBanner } from "@/components";
import ChangeVehiclePicker from "@/components/app/ChangeVehiclePicker";

export default function Page() {
  const router = useRouter();
  const {
    state: rental,
    setSchedule: setRentalSchedule,
    setNotes: setRentalNotes,
    setPassengers: setRentalPassengers,
    setPickupAddress: setRentalPickupAddress,
    setListing,
    setRentalUnit,
    setCity,
    setReturnAddress,
    setBlocks: setRentalBlocks,
  } = useRental();
  const [bannerMsg, setBannerMsg] = React.useState<string | null>(null);
  const [loadingUI, setLoadingUI] = React.useState(true);
  const searchParams = useSearchParams();
  const hydratedFromParamsRef = React.useRef(false);
  const now = React.useMemo(() => new Date(), []);
  const todayStr = React.useMemo(
    () =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate())
        .toISOString()
        .slice(0, 10),
    [now],
  );
  const [changeVehicleOpen, setChangeVehicleOpen] = React.useState(false);
  const isFourHour = React.useMemo(
    () => rental?.rentalUnit === "4h",
    [rental?.rentalUnit],
  );
  const canProceed = React.useMemo(() => {
    if (!rental?.startDate || !rental?.startTime) return false;
    const start = toLocalDate(rental.startDate, rental.startTime);
    if (start.getTime() < Date.now()) return false;
    if (rental.endDate) {
      const end = toLocalDate(
        rental.endDate,
        rental.endTime || rental.startTime,
      );
      if (end.getTime() < start.getTime()) return false;
    }
    const hasPickup = rental?.pickupAddress && rental.pickupAddress.trim();
    return Boolean(hasPickup);
  }, [
    rental?.startDate,
    rental?.startTime,
    rental?.endDate,
    rental?.endTime,
    rental?.pickupAddress,
  ]);
  React.useEffect(() => {
    const t = setTimeout(() => setLoadingUI(false), 250);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (hydratedFromParamsRef.current) return;
    const listingId = searchParams?.get("listingId") || undefined;
    const unit = (searchParams?.get("rentalUnit") || undefined) as any;
    const city = searchParams?.get("city") || undefined;
    let changed = false;
    if (listingId) {
      setListing(listingId);
      changed = true;
    }
    if (unit === "day" || unit === "4h") {
      setRentalUnit(unit);
      changed = true;
    }
    if (city) {
      setCity(city);
      changed = true;
    }
    if (changed) hydratedFromParamsRef.current = true;
  }, [searchParams, setListing, setRentalUnit, setCity]);

  // Prefill schedule from localStorage if provided by public widget
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (rental?.startDate && rental?.startTime) return; // don't override user selections
    try {
      const raw = localStorage.getItem("rideon:prefillSchedule");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        startDate?: string;
        startTime?: string;
      };
      const updates: { startDate?: string; startTime?: string } = {};
      if (parsed.startDate) updates.startDate = parsed.startDate;
      if (parsed.startTime) updates.startTime = parsed.startTime;
      if (updates.startDate || updates.startTime) setRentalSchedule(updates);
      // one-time
      localStorage.removeItem("rideon:prefillSchedule");
    } catch {
      // ignore
    }
  }, [rental?.startDate, rental?.startTime, setRentalSchedule]);

  function toLocalDate(yyyy_mm_dd?: string, hh_mm?: string) {
    const [y, m, d] = (yyyy_mm_dd || "1970-01-01")
      .split("-")
      .map((n) => parseInt(n, 10));
    const [hh, mm] = (hh_mm || "00:00").split(":").map((n) => parseInt(n, 10));
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  }
  function toHHMM(date: Date) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  function addBlocksToTime(startHHMM: string, blocks: number) {
    const [hh, mm] = (startHHMM || "00:00")
      .split(":")
      .map((n) => parseInt(n, 10));
    const base = new Date(1970, 0, 1, hh || 0, mm || 0, 0, 0);
    const hrs = Math.max(1, Math.min(2, Math.floor(blocks || 1))) * 4;
    const end = new Date(base.getTime() + hrs * 60 * 60 * 1000);
    return toHHMM(end);
  }
  function validateAndBanner(
    startDate?: string,
    endDate?: string,
    startTime?: string,
    endTime?: string,
  ) {
    setBannerMsg(null);
    if (!startDate || !startTime) return;
    const start = toLocalDate(startDate, startTime);
    if (start.getTime() < Date.now()) {
      setBannerMsg("Start time cannot be in the past.");
      return;
    }
    if (endDate) {
      const end = toLocalDate(endDate, endTime || startTime);
      if (end.getTime() < start.getTime()) {
        setBannerMsg("End date/time cannot be before the start date/time.");
        return;
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="mt-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg transition-all duration-300 overflow-hidden">
        {/* Inline step header */}
        <div className="px-4 sm:px-6 mt-2 flex items-center justify-between">
          <StepHeader step={3} total={4} title="Schedule" />
          <button
            type="button"
            onClick={() => setChangeVehicleOpen(true)}
            className="ml-3 inline-flex h-9 items-center justify-center rounded-md border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/90"
          >
            Change vehicle
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 mt-4 space-y-5 pb-6">
          {bannerMsg && (
            <StickyBanner className="z-50">
              <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
                {bannerMsg}
              </div>
            </StickyBanner>
          )}
          {loadingUI ? (
            <div className="space-y-4">
              <div className="h-24 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
              <div className="h-24 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
              <div className="h-28 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Pickup Address
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3">
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Where should your chauffeur pick you up?
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter pickup address"
                      value={rental?.pickupAddress ?? ""}
                      onChange={(e) => {
                        setRentalPickupAddress(e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Return / Dropoff (optional)
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3">
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Where would you like to end the rental?
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter return/dropoff address (optional)"
                      value={rental?.returnAddress ?? ""}
                      onChange={(e) => {
                        setReturnAddress(e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Select Date(s)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3">
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      min={todayStr}
                      value={rental?.startDate ?? ""}
                      onChange={(e) => {
                        setRentalSchedule({ startDate: e.target.value });
                        validateAndBanner(
                          e.target.value,
                          rental?.endDate,
                          rental?.startTime,
                          rental?.endTime,
                        );
                      }}
                    />
                  </div>
                  {!isFourHour && (
                    <div className="rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3">
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                        End Date (optional)
                      </label>
                      <Input
                        type="date"
                        min={rental?.startDate || todayStr}
                        value={rental?.endDate ?? ""}
                        onChange={(e) => {
                          setRentalSchedule({ endDate: e.target.value });
                          validateAndBanner(
                            rental?.startDate,
                            e.target.value,
                            rental?.startTime,
                            rental?.endTime,
                          );
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Pickup Time
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                  Choose when your chauffeur should arrive.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3">
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Pickup time
                    </label>
                    <Input
                      type="time"
                      min={
                        rental?.startDate === todayStr
                          ? toHHMM(new Date())
                          : undefined
                      }
                      value={rental?.startTime ?? ""}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        if (isFourHour) {
                          const currentBlocks =
                            rental?.blocks && rental.blocks > 0
                              ? rental.blocks
                              : 1;
                          const derivedEnd = newStart
                            ? addBlocksToTime(newStart, currentBlocks)
                            : undefined;
                          setRentalSchedule({
                            startTime: newStart,
                            endTime: derivedEnd,
                          });
                          validateAndBanner(
                            rental?.startDate,
                            rental?.startDate,
                            newStart,
                            derivedEnd,
                          );
                        } else {
                          setRentalSchedule({ startTime: newStart });
                          validateAndBanner(
                            rental?.startDate,
                            rental?.endDate,
                            newStart,
                            rental?.endTime,
                          );
                        }
                      }}
                    />
                  </div>
                  {isFourHour && (
                    <div className="rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3">
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Duration
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {([1, 2] as const).map((b) => {
                          const currentBlocks =
                            rental?.blocks && rental.blocks > 0
                              ? rental.blocks
                              : 1;
                          const active = currentBlocks === b;
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => {
                                setRentalBlocks(b);
                                if (rental?.startTime) {
                                  const derivedEnd = addBlocksToTime(
                                    rental.startTime,
                                    b,
                                  );
                                  setRentalSchedule({ endTime: derivedEnd });
                                  validateAndBanner(
                                    rental?.startDate,
                                    rental?.startDate,
                                    rental.startTime,
                                    derivedEnd,
                                  );
                                }
                              }}
                              className={[
                                "inline-flex h-9 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                                active
                                  ? "bg-[#00529B] text-white shadow"
                                  : "bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-white/90",
                              ].join(" ")}
                            >
                              {b * 4} hours
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Passengers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-3">
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Number of Passengers
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={
                        typeof rental?.passengers === "number"
                          ? rental.passengers
                          : 1
                      }
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setRentalPassengers(Number.isFinite(n) ? n : 1);
                      }}
                    />
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Max capacity depends on selected vehicle class.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Notes for Driver (optional)
                </h3>
                <textarea
                  rows={3}
                  placeholder="e.g., 'Use the second gate' or 'Call upon arrival'"
                  value={rental?.notes ?? ""}
                  onChange={(e) => {
                    setRentalNotes(e.target.value);
                  }}
                  className="w-full rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4 text-[14px] placeholder-slate-500 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#00529B] resize-none"
                />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push("/app/catalog")}
              className="inline-flex h-11 w-1/3 items-center justify-center rounded-md border border-white/10 bg-white/60 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => router.push("/app/book/step-4")}
              disabled={!canProceed}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next: Confirm & Pay
            </button>
          </div>
        </div>
      </section>
      <ChangeVehiclePicker
        open={changeVehicleOpen}
        onClose={() => setChangeVehicleOpen(false)}
        onSelect={({ listingId, rentalUnit, city }) => {
          setListing(listingId);
          setRentalUnit(rentalUnit as any);
          setCity(city);
          setChangeVehicleOpen(false);
        }}
      />
    </div>
  );
}
