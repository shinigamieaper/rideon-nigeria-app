"use client";

import * as React from "react";
import { Star, CarFront } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { auth } from "@/lib/firebase";
import { Modal } from "@/components";

export type BookingStatus =
  | "requested"
  | "confirmed"
  | "driver_assigned"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "cancelled_by_customer"
  | "cancelled_by_driver";

export interface BookingPreview {
  id?: string; // Firestore doc id
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  scheduledPickupTime?: string | Date | { toDate?: () => Date };
  startDate?: string; // YYYY-MM-DD (fallback if scheduledPickupTime missing)
  startTime?: string; // HH:mm
  status?: BookingStatus;
  driverId?: string | null;
  driverInfo?: {
    name?: string;
    profileImageUrl?: string;
    averageRating?: number;
    phoneNumber?: string;
  } | null;
  vehicleInfo?: {
    make?: string;
    model?: string;
    licensePlate?: string;
    color?: string;
  } | null;
  thumbnailUrl?: string; // optional static route image
}

function ensureSparkAnimKeyframes() {
  if (typeof document === "undefined") return;
  const id = "rideon-dashflow-kf";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `@keyframes rideonDashFlow { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }`;
  document.head.appendChild(style);
}

// Inject a gentle floating animation for car icons
function ensureCarAnimKeyframes() {
  if (typeof document === "undefined") return;
  const id = "rideon-car-float-kf";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `@keyframes rideonCarFloat { 0% { transform: translateY(0px);} 50% { transform: translateY(-2px);} 100% { transform: translateY(0px);} }`;
  document.head.appendChild(style);
}

export interface UpcomingTripCardProps
  extends Omit<
    React.ComponentPropsWithoutRef<"div">,
    "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
  > {
  /** Preferred: full booking object */
  booking?: BookingPreview;
  /** Back-compat: individual props (used if booking is not provided) */
  pickupAddress?: string;
  dropoffAddress?: string;
  scheduledPickupTime?: string | Date;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  thumbnailUrl?: string;
  /** Optional explicit href; defaults to /app/trips/[id] when booking.id is available */
  detailsHref?: string;
}

function coerceDate(
  input?: string | Date | { toDate?: () => Date } | null,
): Date | null {
  if (!input) return null;
  // Firestore Timestamp-like
  if (
    typeof input === "object" &&
    !(input instanceof Date) &&
    typeof (input as any)?.toDate === "function"
  ) {
    try {
      const d = (input as any).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  // Native Date
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  // ISO string or similar
  if (typeof input === "string") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toLocalDate(yyyy_mm_dd?: string, hh_mm?: string): Date | null {
  if (!yyyy_mm_dd) return null;
  const [y, m, d] = yyyy_mm_dd.split("-").map((n) => parseInt(n, 10));
  const [hh, mm] = (hh_mm || "00:00").split(":").map((n) => parseInt(n, 10));
  const dt = new Date(y || 1970, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatTripTime(
  input: string | Date | { toDate?: () => Date } | undefined,
  fallbackDate?: string,
  fallbackTime?: string,
) {
  const d =
    coerceDate(input) ?? toLocalDate(fallbackDate, fallbackTime) ?? null;
  if (!d) return "Scheduled";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const weekday = d.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${weekday} • ${time}`;
}

function getStatusMeta(
  status?: BookingStatus,
): { label: string; classes: string } | null {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        classes: "bg-blue-100 text-blue-800 border border-blue-200/60",
      };
    case "driver_assigned":
      return {
        label: "Driver Assigned",
        classes: "bg-yellow-100 text-yellow-800 border border-yellow-200/60",
      };
    case "en_route":
    case "in_progress":
      return {
        label: status === "en_route" ? "En Route" : "In Progress",
        classes: "bg-green-100 text-green-800 border border-green-200/60",
      };
    case "completed":
      return {
        label: "Completed",
        classes: "bg-emerald-100 text-emerald-800 border border-emerald-200/60",
      };
    case "cancelled":
    case "cancelled_by_customer":
    case "cancelled_by_driver":
      return {
        label: "Cancelled",
        classes: "bg-red-100 text-red-800 border border-red-200/60",
      };
    case "requested":
      return {
        label: "Requested",
        classes: "bg-slate-100 text-slate-700 border border-slate-200/60",
      };
    default:
      return null;
  }
}

export default function UpcomingTripCard({
  booking,
  pickupAddress: legacyPickup,
  dropoffAddress: legacyDropoff,
  scheduledPickupTime: legacyTime,
  pickupCoords: legacyPickupCoords,
  dropoffCoords: legacyDropoffCoords,
  thumbnailUrl: legacyThumb,
  detailsHref,
  className,
  ...rest
}: UpcomingTripCardProps) {
  const router = useRouter();
  const data: BookingPreview = booking ?? {
    pickupAddress: legacyPickup || "",
    dropoffAddress: legacyDropoff || "",
    scheduledPickupTime: legacyTime,
    pickupCoords: legacyPickupCoords,
    dropoffCoords: legacyDropoffCoords,
    thumbnailUrl: legacyThumb,
  };

  const href =
    detailsHref ||
    (data.id ? `/app/reservations/${data.id}` : "/app/reservations");
  const statusMeta = getStatusMeta(data.status);
  const timeLabel = formatTripTime(
    data.scheduledPickupTime,
    data.startDate,
    data.startTime,
  );
  const thumb = data.thumbnailUrl || undefined;

  const [showPreview, setShowPreview] = React.useState(false);
  const [msgLoading, setMsgLoading] = React.useState(false);

  React.useEffect(() => {
    ensureCarAnimKeyframes();
  }, []);
  React.useEffect(() => {
    ensureSparkAnimKeyframes();
  }, []);

  // Thin vertical "road" between pickup and dropoff – always straight
  function renderMiniSpark(height = 56, width = 20) {
    const x = Math.round(width / 2);
    const y1 = 4;
    const y2 = height - 4;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        <line
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke="white"
          className="dark:stroke-slate-900"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke="#00529B"
          className="dark:stroke-sky-300"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke="#0077E6"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            strokeDasharray: "6 10",
            animation: "rideonDashFlow 2.2s linear infinite",
          }}
        />
      </svg>
    );
  }

  // Fetch a small route geometry for inline SVG preview
  React.useEffect(() => {}, [
    data.pickupCoords?.[0],
    data.pickupCoords?.[1],
    data.dropoffCoords?.[0],
    data.dropoffCoords?.[1],
  ]);

  function renderMiniSvg(width = 96, height = 96) {
    return (
      <div className="w-full h-full bg-slate-200/60 dark:bg-slate-800/60" />
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      {...rest}
    >
      <motion.div
        whileHover={{
          y: -2,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href={href}
          className="block rounded-2xl bg-gradient-to-br from-blue-50/60 to-white/40 dark:from-blue-900/20 dark:to-slate-900/40 backdrop-blur-lg border border-blue-200/60 dark:border-blue-900/40 shadow-lg p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 relative overflow-hidden"
        >
          {/* Animated background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-[#00529B]/5 to-[#0077E6]/5"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-gradient-to-br from-blue-500/5 to-cyan-400/5"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 6, repeat: Infinity }}
            />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <motion.h2
                className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                Upcoming Reservation
              </motion.h2>
              <motion.p
                className="text-sm text-slate-600 dark:text-slate-400 mt-0.5"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {timeLabel}
              </motion.p>
            </div>
            {statusMeta && (
              <motion.span
                className={[
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  statusMeta.classes,
                ].join(" ")}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
              >
                {statusMeta.label}
              </motion.span>
            )}
          </div>

          <motion.div
            className="relative z-10 my-4 border-t border-slate-200/80 dark:border-slate-800/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          />

          <div className="relative z-10 flex gap-4">
            <div className="flex-1">
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                {/* Column: icons + road */}
                <div className="flex flex-col items-center w-6">
                  <motion.div
                    className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-[#00529B]/10 text-[#00529B] shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                  >
                    <CarFront className="w-4 h-4" strokeWidth={1.8} />
                  </motion.div>
                  <div className="my-1 w-full flex items-stretch justify-center">
                    {renderMiniSpark(44, 2)}
                  </div>
                  <motion.div
                    className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.45 }}
                  >
                    <CarFront className="w-4 h-4" strokeWidth={1.8} />
                  </motion.div>
                </div>
                {/* Column: text blocks */}
                <div className="flex-1">
                  <motion.div
                    className="pb-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Pickup
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      {data.pickupAddress}
                    </p>
                  </motion.div>
                  <motion.div
                    className="pt-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Drop-off
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      {data.dropoffAddress}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
            <motion.div
              className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                {renderMiniSvg(96, 96)}
              </div>
            </motion.div>
          </div>

          {/* Driver info (conditional) */}
          {data.driverId && (
            <motion.div
              className="relative z-10 mt-5 pt-5 border-t border-slate-200/80 dark:border-slate-800/60"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <p className="text-xs text-slate-500 mb-2">
                {data.driverInfo?.name
                  ? `Your driver is ${data.driverInfo.name}.`
                  : "Your driver is assigned."}
              </p>
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.6 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      data.driverInfo?.profileImageUrl ||
                      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=256&auto=format&fit=crop"
                    }
                    alt="Driver"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {data.vehicleInfo?.make && data.vehicleInfo?.model
                        ? `${data.vehicleInfo.make} ${data.vehicleInfo.model}`
                        : "Assigned Vehicle"}
                    </p>
                    {typeof data.driverInfo?.averageRating === "number" && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star
                          className="h-4 w-4 text-amber-400 fill-amber-400"
                          strokeWidth={1.5}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {data.driverInfo.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  {data.vehicleInfo?.licensePlate && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {data.vehicleInfo.licensePlate}
                    </p>
                  )}
                </div>
              </div>
              {/* Actions */}
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!data.driverId) return;
                    try {
                      setMsgLoading(true);
                      const user = auth.currentUser;
                      if (!user) {
                        router.push("/login");
                        return;
                      }
                      const token = await user.getIdToken();
                      const res = await fetch("/api/messages/contact-driver", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          driverId: data.driverId,
                          reservationId: data.id,
                        }),
                      });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok)
                        throw new Error(j?.error || "Failed to start chat");
                      const id = j?.id as string | undefined;
                      if (id)
                        router.push(`/app/messages/${encodeURIComponent(id)}`);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setMsgLoading(false);
                    }
                  }}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white text-sm font-semibold shadow-md shadow-blue-500/30 hover:opacity-90 disabled:opacity-60"
                  disabled={msgLoading}
                  title="Message Driver"
                >
                  {msgLoading ? "Starting…" : "Message Driver"}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </Link>
      </motion.div>

      {/* Modal route preview */}
      {/* Modal route preview */}
    </motion.div>
  );
}
