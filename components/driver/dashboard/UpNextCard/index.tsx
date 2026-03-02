"use client";

import Link from "next/link";
import * as React from "react";
import { motion } from "motion/react";
import {
  Navigation,
  Sparkles,
  Clock,
  MapPin,
  Car,
  ChevronRight,
} from "lucide-react";

export type UpNextCardTrip = {
  _id: string; // Bookings._id as string
  pickupAddress: string;
  dropoffAddress?: string; // Optional for rentals without fixed return
  pickupCoords?: [number, number]; // [longitude, latitude]
  dropoffCoords?: [number, number]; // [longitude, latitude]
  scheduledPickupTime: string | Date; // Bookings.scheduledPickupTime
  fare: number; // Using fare as the guaranteed payout baseline
  // Rental-specific fields
  rentalUnit?: "day" | "4h"; // Type of rental
  city?: string; // Service city
  startDate?: string; // yyyy-mm-dd
  endDate?: string; // For multi-day rentals
  startTime?: string; // HH:mm
  endTime?: string; // Derived for 4h rentals
};

export interface UpNextCardProps extends React.ComponentPropsWithoutRef<"div"> {
  trip: UpNextCardTrip | null;
  /**
   * When true and trip is null, renders the "New Driver" empty state instead of the generic one.
   */
  isNewDriver?: boolean;
}

function formatPickupTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  if (sameDay) return `${time} Today`;
  if (isTomorrow) return `${time} Tomorrow`;

  const dayPart = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
  return `${time} • ${dayPart}`;
}

export default function UpNextCard({
  trip,
  isNewDriver = false,
  className,
}: UpNextCardProps) {
  // Glassmorphic card wrapper (project-standard)
  const wrapperClass = [
    "relative overflow-hidden",
    "bg-white/60 dark:bg-slate-900/60",
    "backdrop-blur-xl",
    "border border-slate-200/80 dark:border-slate-800/60",
    "shadow-lg",
    "rounded-2xl",
    "p-6 sm:p-7",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!trip) {
    // Empty states
    if (isNewDriver) {
      return (
        <motion.section
          className={wrapperClass}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          whileHover={{
            y: -2,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* Animated background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-[#00529B]/10 to-[#0077E6]/10"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-br from-[#0077E6]/5 to-[#00529B]/5"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </div>

          <div className="relative z-10 flex items-start gap-4">
            <motion.div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00529B] to-[#0077E6] text-white shadow-lg shadow-blue-500/25"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
            >
              <Sparkles className="h-6 w-6" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <motion.h2
                className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Welcome to RideOn!
              </motion.h2>
              <motion.p
                className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                Your account is approved. Set your availability to start
                receiving chauffeur assignments.
              </motion.p>
            </div>
          </div>
          <motion.div
            className="relative z-10 mt-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/driver/bookings/availability"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00529B]"
            >
              <Clock className="h-5 w-5" />
              Set My Availability
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </motion.section>
      );
    }

    return (
      <motion.section
        className={wrapperClass}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{
          y: -2,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div className="flex items-start gap-4">
          <motion.div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            <Car className="h-6 w-6" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h2
              className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              No Upcoming Reservations
            </motion.h2>
            <motion.p
              className="mt-1 text-sm text-slate-600 dark:text-slate-400"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              You're all caught up! Update your availability to receive new
              assignments.
            </motion.p>
          </div>
        </div>
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/driver/bookings/availability"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#00529B] px-4 py-2.5 text-[#00529B] dark:text-[#4ea0ff] font-medium hover:bg-[#00529B]/5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00529B]"
          >
            <Clock className="h-5 w-5" />
            Update Availability
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </motion.section>
    );
  }

  const pickupTime = formatPickupTime(trip.scheduledPickupTime);
  const detailsHref = `/driver/trips/${encodeURIComponent(trip._id)}`;
  const payoutNGN = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(trip.fare || 0)));

  // Build Google Maps navigation URL for pickup location
  const googleMapsUrl = trip.pickupCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${trip.pickupCoords[1]},${trip.pickupCoords[0]}&travelmode=driving`
    : null;

  return (
    <motion.section
      className={wrapperClass}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
    >
      {/* Animated background decoration for active trip */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-[#00529B]/8 to-[#0077E6]/8"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/5 to-emerald-400/5"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <motion.h2
            className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            Next Assignment
          </motion.h2>
          {trip.rentalUnit && (
            <motion.span
              className={[
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                trip.rentalUnit === "4h"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
              ].join(" ")}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {trip.rentalUnit === "4h" ? "4-Hour Rental" : "Day Rental"}
            </motion.span>
          )}
        </div>

        <motion.div
          className="mt-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {pickupTime}
          </div>
        </motion.div>

        <div className="mt-4 space-y-3">
          {trip.city && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Service City
              </div>
              <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                {trip.city}
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-2"
          >
            <MapPin className="w-4 h-4 text-[#00529B] dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Pickup Location
              </div>
              <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                {trip.pickupAddress || "To be confirmed"}
              </div>
            </div>
          </motion.div>
          {trip.dropoffAddress && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-start gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Return Location
                </div>
                <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100">
                  {trip.dropoffAddress}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          className="mt-5 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200/50 dark:border-emerald-800/30"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-baseline justify-between">
            <div className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              Guaranteed Payout
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {payoutNGN}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-5 flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Link
            href={detailsHref}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00529B]"
          >
            View Assignment Details
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#00529B] px-4 py-2.5 text-[#00529B] dark:text-[#4ea0ff] font-medium hover:bg-[#00529B]/5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00529B]"
            >
              <Navigation className="w-4 h-4" />
              Navigate to Pickup
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
