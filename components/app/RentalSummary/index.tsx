"use client";

import * as React from "react";
import { useRental } from "@/components/app/RentalProvider";

export interface RentalSummaryProps
  extends React.ComponentPropsWithoutRef<"div"> {
  quoteTotalNgn?: number | null;
}

export default function RentalSummary({
  quoteTotalNgn,
  className,
  ...rest
}: RentalSummaryProps) {
  const { state } = useRental();
  const nf = React.useMemo(() => new Intl.NumberFormat("en-NG"), []);
  const [vehicleTitle, setVehicleTitle] = React.useState<string | null>(null);

  const schedule = React.useMemo(() => {
    const left = [state.startDate, state.startTime].filter(Boolean).join(" ");
    const right = [state.endDate, state.endTime].filter(Boolean).join(" ");
    return right ? `${left} → ${right}` : left || "—";
  }, [state.startDate, state.startTime, state.endDate, state.endTime]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setVehicleTitle(null);
        if (!state.listingId) return;
        const res = await fetch(
          `/api/catalog/listings/${encodeURIComponent(state.listingId)}`,
          { cache: "no-store" },
        );
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          const title =
            [j?.make, j?.model].filter(Boolean).join(" ") ||
            j?.category ||
            null;
          setVehicleTitle(title);
        }
      } catch {
        if (!cancelled) setVehicleTitle(null);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [state.listingId]);

  return (
    <div
      className={[
        "rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4",
        className || "",
      ].join(" ")}
      {...rest}
    >
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Rental Summary
      </h2>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Vehicle</p>
          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
            {vehicleTitle ||
              (state.listingId
                ? `Listing #${state.listingId}`
                : "Not selected")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unit: {state.rentalUnit || "—"}
          </p>
        </div>
        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Schedule</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {schedule}
          </p>
        </div>
        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pickup Address
          </p>
          <p className="font-medium text-slate-900 dark:text-slate-100 break-words">
            {state.pickupAddress || "—"}
          </p>
        </div>
        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Passengers
          </p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {state.passengers ?? 1}
          </p>
        </div>
      </div>
      {typeof quoteTotalNgn === "number" && (
        <div className="mt-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 p-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Total
          </p>
          <p className="text-sm font-semibold text-[#00529B]">
            ₦{nf.format(quoteTotalNgn)}
          </p>
        </div>
      )}
      {state.notes && (
        <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
          <p className="text-xs text-slate-500 dark:text-slate-400">Notes</p>
          <p className="mt-1 whitespace-pre-line">{state.notes}</p>
        </div>
      )}
    </div>
  );
}
