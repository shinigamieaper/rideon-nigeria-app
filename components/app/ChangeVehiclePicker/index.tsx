"use client";

import * as React from "react";

export interface ChangeVehiclePickerProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onSelect"> {
  open: boolean;
  onClose: () => void;
  onSelect: (p: {
    listingId: string;
    rentalUnit: "day" | "4h";
    city?: string;
  }) => void;
}

type Listing = {
  id: string;
  city?: string;
  category?: string;
  make?: string;
  model?: string;
  seats?: number | null;
  images?: string[];
  dayRateNgn?: number | null;
  block4hRateNgn?: number | null;
};

export default function ChangeVehiclePicker({
  open,
  onClose,
  onSelect,
  className,
  ...rest
}: ChangeVehiclePickerProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<Listing[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/catalog/listings", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !Array.isArray(j?.listings)) {
          throw new Error(j?.error || "Failed to load vehicles");
        }
        setItems(j.listings as Listing[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load vehicles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const nf = new Intl.NumberFormat("en-NG");

  return (
    <div
      className={["fixed inset-0 z-[80]", className || ""].join(" ")}
      {...rest}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/60">
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            Change vehicle
          </h3>
          <button
            onClick={onClose}
            className="text-sm text-slate-600 dark:text-slate-300 hover:underline"
          >
            Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse"
                />
              ))}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {!loading && !error && Array.isArray(items) && (
            <div className="space-y-3">
              {items.map((v) => {
                const title =
                  [v.make, v.model].filter(Boolean).join(" ") ||
                  v.category ||
                  "Vehicle";
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {v.category || ""}
                        {v.seats ? ` • ${v.seats} seats` : ""}
                        {v.city ? ` • ${v.city}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSelect({
                            listingId: v.id,
                            rentalUnit: "day",
                            city: v.city,
                          })
                        }
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-[12px] font-semibold text-white bg-[#00529B] hover:opacity-90"
                      >
                        Select Day
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onSelect({
                            listingId: v.id,
                            rentalUnit: "4h",
                            city: v.city,
                          })
                        }
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-[12px] font-semibold text-[#00529B] bg-white border border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800/60 hover:opacity-90"
                      >
                        Select 4h
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
