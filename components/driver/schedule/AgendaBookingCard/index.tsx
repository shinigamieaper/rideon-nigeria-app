"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Clock, MapPin, Calendar } from "lucide-react";

export interface AgendaBooking {
  id: string;
  pickupAddress: string;
  dropoffAddress?: string | null;
  scheduledPickupTime?: string | Date | null;
  status?: string;
  // Rental-specific fields
  rentalUnit?: "4h" | "day" | string | null;
  city?: string | null;
  blocks?: number | null;
  fareNgn?: number | null;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
}

export interface AgendaBookingCardProps
  extends React.ComponentPropsWithoutRef<"article"> {
  booking: AgendaBooking;
  index?: number;
}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function formatDateTime(dt?: string | Date | null) {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRentalLabel(unit?: string | null, blocks?: number | null) {
  if (!unit) return null;
  const count = blocks ?? 1;
  if (unit === "4h") return `${count}× 4-hour block${count > 1 ? "s" : ""}`;
  if (unit === "day") return `${count} day${count > 1 ? "s" : ""}`;
  return `${count}× ${unit}`;
}

function formatCurrency(n?: number | null) {
  if (typeof n !== "number") return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AgendaBookingCard({
  booking,
  index = 0,
  className,
}: AgendaBookingCardProps) {
  const when = formatDateTime(booking.scheduledPickupTime);
  const rentalLabel = getRentalLabel(booking.rentalUnit, booking.blocks);
  const payout = formatCurrency(booking.fareNgn);

  return (
    <Link href={`/driver/trips/${booking.id}`}>
      <motion.article
        className={cx(
          "relative overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-4 md:p-5 cursor-pointer",
          className,
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{
          y: -3,
          boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.12)",
        }}
      >
        {/* Animated background decoration */}
        <motion.div
          className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/8 to-emerald-500/8 pointer-events-none"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Time */}
            <motion.div
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
            >
              <Clock className="w-3.5 h-3.5" />
              {when}
            </motion.div>

            {/* Pickup */}
            <motion.div
              className="mt-2 flex items-start gap-1.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.15 }}
            >
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                {booking.pickupAddress}
              </span>
            </motion.div>

            {/* Dropoff (optional for rentals) */}
            {booking.dropoffAddress && (
              <motion.div
                className="mt-1 flex items-start gap-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.2 }}
              >
                <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                  {booking.dropoffAddress}
                </span>
              </motion.div>
            )}
          </div>

          {/* Rental Badge & Payout */}
          <motion.div
            className="flex flex-col items-end gap-1.5"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 + 0.1 }}
          >
            {rentalLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                <Calendar className="w-3 h-3" />
                {rentalLabel}
              </span>
            )}
            {booking.city && (
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {booking.city}
              </span>
            )}
            {payout && (
              <motion.span
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  delay: index * 0.05 + 0.15,
                }}
              >
                {payout}
              </motion.span>
            )}
          </motion.div>
        </div>

        {/* Status */}
        {booking.status && (
          <motion.div
            className="relative z-10 mt-3 inline-flex items-center rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-2.5 h-6 text-[10px] font-medium text-slate-800 dark:text-slate-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 + 0.2 }}
          >
            {booking.status
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </motion.div>
        )}
      </motion.article>
    </Link>
  );
}
