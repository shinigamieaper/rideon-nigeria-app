"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ActionModal, StickyBanner } from "@/components";
import {
  Navigation,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Banknote,
  Sparkles,
} from "lucide-react";

export interface DriverTripDetailClientProps
  extends React.ComponentPropsWithoutRef<"div"> {
  bookingId: string;
}

interface TripDetail {
  id: string;
  pickupAddress: string;
  dropoffAddress?: string; // Optional for rentals
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  scheduledPickupTime?: any;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  status?: string;
  pickupPinRequired?: boolean;
  pickupPinVerifiedAt?: string | null;
  customerId?: string | null;
  customerInfo?: {
    name?: string;
    phoneNumber?: string;
    profileImageUrl?: string;
  } | null;
  fareNgn?: number | null;
  distanceKm?: number | null;
  notes?: string;
  // Rental-specific fields
  rentalUnit?: "day" | "4h";
  city?: string;
  blocks?: number;
}

function formatDateTime(input: any): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default function DriverTripDetailClient({
  bookingId,
  className,
  ...rest
}: DriverTripDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [errorStatus, setErrorStatus] = React.useState<number | null>(null);
  const [trip, setTrip] = React.useState<TripDetail | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const [pinModalOpen, setPinModalOpen] = React.useState(false);
  const [pickupPinInput, setPickupPinInput] = React.useState("");

  const fetchTrip = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const res = await fetch(`/api/driver/trips/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || "Failed to fetch reservation";
        setTrip(null);
        setError(String(msg));
        setErrorStatus(res.status);
        return;
      }
      const j = await res.json();
      setTrip(j);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load reservation.");
      setErrorStatus(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
      } else {
        fetchTrip();
      }
    });
    return () => unsub();
  }, [fetchTrip, router]);

  const handleStartTrip = React.useCallback(async () => {
    try {
      setActionLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const body = trip?.pickupPinRequired
        ? JSON.stringify({ pickupPin: pickupPinInput.trim() })
        : undefined;
      const res = await fetch(`/api/driver/trips/${bookingId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to start reservation");
      }
      setPickupPinInput("");
      setPinModalOpen(false);
      await fetchTrip();
    } catch (e: any) {
      setError(e?.message || "Failed to start reservation");
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  }, [bookingId, fetchTrip, pickupPinInput, trip?.pickupPinRequired]);

  const handleAcceptTrip = React.useCallback(async () => {
    try {
      setActionLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const res = await fetch(`/api/driver/trips/${bookingId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to accept reservation");
      }
      await fetchTrip();
    } catch (e: any) {
      setError(e?.message || "Failed to accept reservation");
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  }, [bookingId, fetchTrip]);

  const handleCompleteTrip = React.useCallback(async () => {
    try {
      setActionLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const res = await fetch(`/api/driver/trips/${bookingId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to complete reservation");
      }
      await fetchTrip();
    } catch (e: any) {
      setError(e?.message || "Failed to complete reservation");
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(false);
    }
  }, [bookingId, fetchTrip]);

  // Build Google Maps URL to navigate to pickup location
  const googleMapsUrl = React.useMemo(() => {
    if (!trip?.pickupCoords) return null;
    const [lon, lat] = trip.pickupCoords;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
  }, [trip?.pickupCoords]);

  const pickupTime = formatDateTime(trip?.scheduledPickupTime);
  const payoutNGN = trip?.fareNgn
    ? new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(trip.fareNgn)
    : null;

  const showAcceptButton =
    trip?.status === "confirmed" || trip?.status === "driver_assigned";
  const showStartButton = trip?.status === "en_route";
  const showCompleteButton = trip?.status === "in_progress";

  const needsPickupPin = Boolean(trip?.pickupPinRequired);

  if (loading) {
    return (
      <div
        className={[
          "mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-28",
          className || "",
        ].join(" ")}
        {...rest}
      >
        <div className="space-y-4">
          <div className="h-80 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
          <div className="h-32 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
          <div className="h-24 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div
        className={[
          "mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-28",
          className || "",
        ].join(" ")}
        {...rest}
      >
        {error && (
          <StickyBanner className="z-50 mb-4">
            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
              {error}
            </div>
          </StickyBanner>
        )}

        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-6">
          <div className="text-sm text-slate-700 dark:text-slate-300">
            {errorStatus === 409
              ? "This request has already been taken by another driver."
              : errorStatus === 410
                ? "This offer is no longer available (expired or closed)."
                : "You don’t currently have access to view this request."}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push("/driver/bookings/new")}
              className="h-11 px-4 rounded-xl bg-[#00529B] text-white text-sm font-semibold shadow hover:opacity-95"
            >
              Back to New Requests
            </button>
            <button
              type="button"
              onClick={() => fetchTrip()}
              className="h-11 px-4 rounded-xl bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow hover:shadow-md"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={[
        "mx-auto max-w-3xl px-4 sm:px-6 pt-4 pb-28",
        className || "",
      ].join(" ")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <StickyBanner className="z-50 mb-4">
              <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
                {error}
              </div>
            </StickyBanner>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigate to Pickup Button */}
      {googleMapsUrl && (
        <motion.a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Navigation className="w-5 h-5" />
          Navigate to Pickup
        </motion.a>
      )}

      {/* Assignment Details */}
      <div className="mt-5 space-y-4">
        {/* Rental Badge */}
        {trip?.rentalUnit && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
                trip.rentalUnit === "4h"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
              ].join(" ")}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {trip.rentalUnit === "4h"
                ? `${(trip.blocks || 1) * 4}-Hour Rental`
                : "Day Rental"}
            </span>
            {trip.city && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                • {trip.city}
              </span>
            )}
          </motion.div>
        )}

        {/* Scheduled Time & Payout */}
        <motion.div
          className="relative overflow-hidden p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{
            y: -2,
            boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.12)",
          }}
        >
          {/* Background decoration */}
          <motion.div
            className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/10 to-green-500/10 pointer-events-none"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                <span>Scheduled Pickup</span>
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {pickupTime || "Not scheduled"}
              </div>
            </div>
            {payoutNGN && (
              <div className="text-right">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1 justify-end">
                  <Banknote className="w-4 h-4" />
                  <span>Payout</span>
                </div>
                <motion.div
                  className="text-xl font-bold text-[#34A853]"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  {payoutNGN}
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Location Details */}
        <motion.div
          className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{
            y: -2,
            boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.12)",
          }}
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Location
          </h2>
          <div className="space-y-3">
            {trip?.city && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Service City
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {trip.city}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-[#00529B] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Pickup Location
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                  {trip?.pickupAddress || "To be confirmed"}
                </div>
              </div>
            </div>
            {trip?.dropoffAddress && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-[#34A853] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Return Location
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                    {trip.dropoffAddress}
                  </div>
                </div>
              </div>
            )}
          </div>
          {trip?.distanceKm && (
            <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/60 text-sm text-slate-600 dark:text-slate-400">
              Distance: {trip.distanceKm.toFixed(1)} km
            </div>
          )}
        </motion.div>

        {/* Customer Info */}
        {trip?.customerId && (
          <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Customer
            </h3>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <p className="mb-2">
                <span className="text-slate-500">Name:</span>{" "}
                <span className="font-medium">
                  {trip?.customerInfo?.name || "Customer"}
                </span>
              </p>
              {trip?.customerInfo?.phoneNumber && (
                <p>
                  <span className="text-slate-500">Phone:</span>{" "}
                  <span className="font-medium">
                    {trip.customerInfo.phoneNumber}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Special Notes */}
        {trip?.notes && (
          <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-lg border border-amber-200/80 dark:border-amber-800/60 shadow-lg">
            <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Special Instructions
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {trip.notes}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {/* Accept Reservation */}
        {showAcceptButton && (
          <button
            onClick={handleAcceptTrip}
            disabled={actionLoading}
            className="w-full h-12 flex items-center justify-center rounded-xl bg-[#00529B] px-5 text-base font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 disabled:opacity-60"
          >
            {actionLoading
              ? "Accepting..."
              : "Accept Reservation (Go En Route)"}
          </button>
        )}

        {/* Start Reservation */}
        {showStartButton && (
          <button
            onClick={() => {
              if (needsPickupPin) {
                setPinModalOpen(true);
                return;
              }
              void handleStartTrip();
            }}
            disabled={actionLoading}
            className="w-full h-12 flex items-center justify-center rounded-xl bg-[#00529B] px-5 text-base font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 disabled:opacity-60"
          >
            {actionLoading ? "Starting..." : "Start Reservation"}
          </button>
        )}

        {/* Complete Reservation */}
        {showCompleteButton && (
          <button
            onClick={handleCompleteTrip}
            disabled={actionLoading}
            className="w-full h-12 flex items-center justify-center rounded-xl bg-[#34A853] px-5 text-base font-semibold text-white shadow-lg shadow-green-900/30 transition-all duration-200 hover:opacity-90 disabled:opacity-60"
          >
            {actionLoading ? "Completing..." : "Complete Reservation"}
          </button>
        )}

        {/* Contact Actions */}
        <div className="grid grid-cols-2 gap-3">
          {trip?.customerInfo?.phoneNumber &&
            trip?.status !== "confirmed" &&
            trip?.status !== "driver_assigned" && (
              <a
                href={`tel:${trip.customerInfo.phoneNumber}`}
                className="h-11 flex items-center justify-center gap-2 rounded-xl bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow hover:shadow-md transition-shadow"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
          <button
            onClick={() => router.push(`/driver/messages`)}
            className="h-11 flex items-center justify-center gap-2 rounded-xl bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow hover:shadow-md transition-shadow"
          >
            <MessageSquare className="w-4 h-4" />
            Message
          </button>
        </div>
      </div>

      {/* Trip Status Badge */}
      {trip?.status && (
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <span className="inline-block px-4 py-2 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Status:{" "}
            {trip.status
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
        </motion.div>
      )}

      <ActionModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPickupPinInput("");
        }}
        title="Enter Pickup PIN"
        description="Ask the customer for the 4-digit pickup PIN to start the reservation."
        confirmText={actionLoading ? "Starting…" : "Start"}
        cancelText="Cancel"
        confirmVariant="primary"
        reasonLabel="Pickup PIN"
        reasonPlaceholder="e.g. 1234"
        reasonValue={pickupPinInput}
        onReasonValueChange={(v) => setPickupPinInput(v)}
        requireReason
        loading={actionLoading}
        confirmDisabled={!pickupPinInput.trim()}
        onConfirm={async () => {
          await handleStartTrip();
        }}
      />
    </motion.div>
  );
}
