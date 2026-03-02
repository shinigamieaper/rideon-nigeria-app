"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Clock,
  MapPin,
  Banknote,
  Navigation,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export interface PendingBooking {
  id: string;
  pickupAddress: string;
  dropoffAddress?: string; // Optional for rentals without fixed return
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  scheduledPickupTime: string;
  fareNgn: number;
  distanceKm?: number | null;
  customerInfo?: { name?: string } | null;
  notes?: string;
  assignedAt?: string | null;
  // Rental-specific fields
  rentalUnit?: "day" | "4h";
  city?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface PendingBookingCardProps
  extends React.ComponentPropsWithoutRef<"div"> {
  booking: PendingBooking;
  onAccept: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
  isLoading?: boolean;
  index?: number;
}

function formatDateTime(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default function PendingBookingCard({
  booking,
  onAccept,
  onReject,
  isLoading = false,
  index = 0,
  className,
}: PendingBookingCardProps) {
  const wrapperClass = [
    "relative overflow-hidden",
    "bg-white/50 dark:bg-slate-900/50",
    "backdrop-blur-lg",
    "border border-slate-200/80 dark:border-slate-800/60",
    "shadow-lg",
    "rounded-2xl",
    "p-5 sm:p-6",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const pickupTime = formatDateTime(booking.scheduledPickupTime);
  const payoutNGN = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(booking.fareNgn || 0);

  // Build Google Maps navigation URL to pickup location
  const googleMapsUrl = booking.pickupCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${booking.pickupCoords[1]},${booking.pickupCoords[0]}&travelmode=driving`
    : null;

  return (
    <motion.div
      className={wrapperClass}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -3, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
    >
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/10 to-green-500/10"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      {/* Rental Badge & Payout Header */}
      <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
        {booking.rentalUnit && (
          <motion.span
            className={[
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium mb-2",
              booking.rentalUnit === "4h"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
            ].join(" ")}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 + 0.1 }}
          >
            <Sparkles className="w-3 h-3" />
            {booking.rentalUnit === "4h" ? "4-Hour Rental" : "Day Rental"}
          </motion.span>
        )}
      </div>
      <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 + 0.1 }}
        >
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>Pickup Time</span>
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {pickupTime}
          </div>
        </motion.div>
        <motion.div
          className="text-right"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 + 0.15 }}
        >
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1 justify-end">
            <Banknote className="w-4 h-4" />
            <span>Payout</span>
          </div>
          <motion.div
            className="text-xl font-bold text-[#34A853]"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              delay: index * 0.1 + 0.2,
            }}
          >
            {payoutNGN}
          </motion.div>
        </motion.div>
      </div>

      {/* Location Details */}
      <div className="space-y-3 mb-4">
        {booking.city && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Service City
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                {booking.city}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-4 h-4 rounded-full bg-[#00529B] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pickup Location
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
              {booking.pickupAddress || "To be confirmed"}
            </div>
          </div>
        </div>
        {booking.dropoffAddress && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-4 h-4 rounded-full bg-[#34A853] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Return Location
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                {booking.dropoffAddress}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer & Distance Info */}
      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4 pb-4 border-b border-slate-200/80 dark:border-slate-700/60">
        {booking.customerInfo?.name && (
          <div>
            <span className="text-slate-500">Customer:</span>{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {booking.customerInfo.name}
            </span>
          </div>
        )}
        {booking.distanceKm && (
          <div>
            <span className="text-slate-500">Distance:</span>{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {booking.distanceKm.toFixed(1)} km
            </span>
          </div>
        )}
      </div>

      {/* Special Notes */}
      {booking.notes && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/60">
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
            Special Instructions
          </div>
          <div className="text-sm text-amber-800 dark:text-amber-200">
            {booking.notes}
          </div>
        </div>
      )}

      {/* Navigate to Pickup */}
      {googleMapsUrl && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center justify-center gap-2 w-full h-10 rounded-xl border-2 border-[#00529B] text-[#00529B] dark:text-[#4ea0ff] font-medium hover:bg-[#00529B]/5 transition-colors"
        >
          <Navigation className="w-4 h-4" />
          View Pickup Location
        </a>
      )}

      {/* Actions */}
      <motion.div
        className="relative z-10 flex items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.3 }}
      >
        <motion.button
          onClick={() => onReject(booking.id)}
          disabled={isLoading}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow hover:shadow-md transition-all disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <X className="w-4 h-4" />
          Decline
        </motion.button>
        <Link
          href={`/driver/trips/${booking.id}`}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-slate-600 dark:bg-slate-700 px-4 text-sm font-semibold text-white shadow hover:opacity-90 transition-opacity"
        >
          View Details
        </Link>
        <motion.button
          onClick={() => onAccept(booking.id)}
          disabled={isLoading}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#34A853] to-emerald-500 px-4 text-sm font-semibold text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check className="w-4 h-4" />
          Accept
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
