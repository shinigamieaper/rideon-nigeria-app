import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";

export interface PastTripBookingSummary {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  completedAt?: string | Date | { toDate?: () => Date } | null;
  fareNgn?: number | null;
}

export interface PastTripCardProps
  extends React.ComponentPropsWithoutRef<"div"> {
  booking: PastTripBookingSummary;
}

function coerceDate(
  input?: string | Date | { toDate?: () => Date } | null,
): Date | null {
  if (!input) return null;
  if (
    typeof input === "object" &&
    typeof (input as any)?.toDate === "function"
  ) {
    try {
      return (input as any).toDate();
    } catch {}
  }
  try {
    const d: Date =
      typeof input === "string" ? new Date(input) : (input as Date);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatDate(d?: string | Date | { toDate?: () => Date } | null) {
  const dt = coerceDate(d);
  if (!dt) return "";
  return dt.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PastTripCard({
  booking,
  className,
  ...rest
}: PastTripCardProps) {
  const dateLabel = formatDate(booking.completedAt);
  const fare =
    typeof booking.fareNgn === "number"
      ? `₦${new Intl.NumberFormat("en-NG").format(booking.fareNgn)}`
      : undefined;
  return (
    <div className={className} {...rest}>
      <Link
        href={`/app/reservations/${booking.id}`}
        className="block p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white/40 dark:from-slate-900/60 dark:to-slate-900/40 backdrop-blur-lg border border-emerald-200/60 dark:border-emerald-900/40 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              {dateLabel || "Past Reservation"}
            </p>
          </div>
          {fare && (
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {fare}
            </p>
          )}
        </div>
        <div className="my-3 border-t border-slate-200/80 dark:border-slate-800/60" />
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 w-5 h-5 flex items-center justify-center rounded-full bg-[#00529B]/10 text-[#00529B] shrink-0">
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pickup
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {booking.pickupAddress}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
              <ArrowDown className="w-3.5 h-3.5" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drop-off
              </p>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {booking.dropoffAddress}
              </p>
            </div>
          </div>
        </div>
      </Link>
      {/* Actions */}
      <div className="mt-3 flex items-center justify-end">
        <Link
          href={`/app/catalog?rebook=1`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#00529B] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 hover:shadow-blue-500/30"
        >
          Book Again
        </Link>
      </div>
    </div>
  );
}
