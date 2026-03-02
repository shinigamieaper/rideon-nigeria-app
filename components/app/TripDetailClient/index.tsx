"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { StickyBanner, RateDriverModal, CancelTripModal } from "@/components";
import { useFeatureFlags } from "@/hooks";

interface TripDetailClientProps extends React.ComponentPropsWithoutRef<"div"> {
  bookingId: string;
}

interface TripDetail {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  scheduledPickupTime?: any;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  status?: string;
  driverId?: string | null;
  driverInfo?: {
    name?: string;
    phoneNumber?: string;
    profileImageUrl?: string;
  } | null;
  vehicleInfo?: {
    make?: string;
    model?: string;
    licensePlate?: string;
    color?: string;
  } | null;
  fareNgn?: number | null;
  distanceKm?: number | null;
  notes?: string;
  payment?: {
    status?: string | null;
    provider?: string | null;
    method?: string | null;
    amountKobo?: number | null;
    currency?: string | null;
    refunded?: boolean;
    refundAmount?: number | null;
    refund?: {
      provider?: string | null;
      status?: string | null;
      refundId?: any;
      refundReference?: string | null;
      amountKobo?: number | null;
      currency?: string | null;
      updatedAt?: string | null;
    } | null;
  } | null;
}

export default function TripDetailClient({
  bookingId,
  className,
  ...rest
}: TripDetailClientProps) {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [trip, setTrip] = React.useState<TripDetail | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [rateOpen, setRateOpen] = React.useState(false);
  const ratePromptedRef = React.useRef(false);
  const [messageLoading, setMessageLoading] = React.useState(false);

  const fetchTrip = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`/api/trips/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to fetch reservation");
      }
      const j = await res.json();
      setTrip(j);
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === "string" ? e.message : "";
      if (msg.toLowerCase().includes("not authenticated")) {
        router.replace("/login");
        return;
      }
      setError(msg || "Failed to load reservation.");
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  // Live location polling when en_route or in_progress
  React.useEffect(() => {}, [trip?.driverId, trip?.status]);

  // Compute ETA from vehicle -> pickup when we have both
  React.useEffect(() => {}, [trip?.pickupCoords?.[0], trip?.pickupCoords?.[1]]);

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

  const handleMessageDriver = React.useCallback(async () => {
    try {
      setMessageLoading(true);
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const driverId = trip?.driverId;
      if (!driverId) throw new Error("Driver not assigned yet.");
      const token = await user.getIdToken();
      const res = await fetch("/api/messages/contact-driver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverId, bookingId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to start conversation.");
      const id = j?.id as string | undefined;
      if (id) {
        router.push(`/app/messages/${encodeURIComponent(id)}`);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to start chat.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setMessageLoading(false);
    }
  }, [bookingId, router, trip?.driverId]);

  // When trip is completed and no feedback is present, prompt rating once (only if driverRatings is enabled)
  React.useEffect(() => {
    if (!trip) return;
    if (
      flags.driverRatings &&
      trip.status === "completed" &&
      !(trip as any)?.feedback &&
      !ratePromptedRef.current
    ) {
      ratePromptedRef.current = true;
      setRateOpen(true);
    }
  }, [trip?.status, (trip as any)?.feedback, flags.driverRatings]);

  const normalizedStatus = String(trip?.status || "")
    .trim()
    .toLowerCase();
  const isCancelled =
    normalizedStatus === "cancelled" ||
    normalizedStatus.startsWith("cancelled");
  const isCompleted = normalizedStatus === "completed";

  const scheduledAt = React.useMemo(() => {
    const v = (trip as any)?.scheduledPickupTime;
    if (v) {
      if (typeof v?.toDate === "function") return v.toDate() as Date;
      if (v instanceof Date) return v;
      const d = new Date(String(v));
      if (!isNaN(d.getTime())) return d;
    }

    const sd = (trip as any)?.startDate as string | null | undefined;
    const st = (trip as any)?.startTime as string | null | undefined;
    if (sd) {
      const dt = new Date(`${sd}T${st || "00:00"}:00`);
      if (!isNaN(dt.getTime())) return dt;
    }

    return null as Date | null;
  }, [trip]);

  const hasStarted = Boolean(scheduledAt)
    ? Date.now() >= (scheduledAt as Date).getTime()
    : false;
  const canCancel =
    Boolean(trip) && !isCancelled && !isCompleted && !hasStarted;

  const refundView = React.useMemo(() => {
    const p = trip?.payment;
    const paid = String(p?.status || "") === "succeeded";
    const cancelled = isCancelled;

    if (!cancelled || !paid) return null;

    const statusRaw = String(p?.refund?.status || "")
      .trim()
      .toLowerCase();
    const status = p?.refunded
      ? "processed"
      : statusRaw === "pending" ||
          statusRaw === "processing" ||
          statusRaw === "processed" ||
          statusRaw === "failed"
        ? statusRaw
        : statusRaw
          ? statusRaw
          : "pending";

    const refundAmountNgn =
      typeof p?.refundAmount === "number" && Number.isFinite(p.refundAmount)
        ? p.refundAmount
        : typeof p?.refund?.amountKobo === "number" &&
            Number.isFinite(p.refund.amountKobo)
          ? Math.round(p.refund.amountKobo / 100)
          : typeof p?.amountKobo === "number" && Number.isFinite(p.amountKobo)
            ? Math.round(p.amountKobo / 100)
            : null;

    const badgeClass =
      status === "processed"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
        : status === "failed"
          ? "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20"
          : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/20";

    const title =
      status === "processed"
        ? "Refund processed"
        : status === "failed"
          ? "Refund needs attention"
          : "Refund in progress";

    const subtitle =
      status === "processed"
        ? "Your refund has been processed. If you do not see it yet, please allow your bank some time to reflect it."
        : status === "failed"
          ? "We hit an issue processing your refund. Our team has been notified and will resolve it."
          : "Refunds may take up to 10 business days depending on your bank.";

    return { status, title, subtitle, badgeClass, refundAmountNgn };
  }, [isCancelled, trip?.payment]);

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

      {/* Map */}

      {/* Details */}
      <div className="mt-5 space-y-4">
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Reservation Details
          </h2>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <span className="text-slate-500">Pickup:</span>{" "}
              {trip?.pickupAddress}
            </p>
            <p>
              <span className="text-slate-500">Drop-off:</span>{" "}
              {trip?.dropoffAddress}
            </p>
            {typeof trip?.fareNgn === "number" && (
              <p>
                <span className="text-slate-500">Estimated Fare:</span> ₦
                {new Intl.NumberFormat("en-NG").format(trip.fareNgn)}
              </p>
            )}
          </div>
        </div>

        {refundView && (
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Refund
                </h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {refundView.subtitle}
                </p>
              </div>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                  refundView.badgeClass,
                ].join(" ")}
              >
                {refundView.title}
              </span>
            </div>

            <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
              {typeof refundView.refundAmountNgn === "number" && (
                <p>
                  <span className="text-slate-500">Amount:</span> ₦
                  {new Intl.NumberFormat("en-NG").format(
                    refundView.refundAmountNgn,
                  )}
                </p>
              )}
              <p className="mt-1">
                <span className="text-slate-500">Status:</span>{" "}
                {refundView.status}
              </p>
              {refundView.status === "failed" && (
                <p className="mt-2 text-[13px] text-red-700 dark:text-red-300">
                  If you need urgent help, contact support and share your
                  reservation date/time and pickup address.
                </p>
              )}
            </div>
          </div>
        )}

        {trip?.driverId && (
          <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Driver
            </h3>
            <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              <p>
                <span className="text-slate-500">Name:</span>{" "}
                {trip?.driverInfo?.name || "Assigned Driver"}
              </p>
              {trip?.driverInfo?.phoneNumber && (
                <p>
                  <span className="text-slate-500">Phone:</span>{" "}
                  {trip.driverInfo.phoneNumber}
                </p>
              )}
              {trip?.vehicleInfo && (
                <p>
                  <span className="text-slate-500">Vehicle:</span>{" "}
                  {trip.vehicleInfo.make} {trip.vehicleInfo.model}{" "}
                  {trip.vehicleInfo.licensePlate
                    ? `• ${trip.vehicleInfo.licensePlate}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3 flex-wrap">
        {/* Call Driver */}
        {trip?.driverInfo?.phoneNumber ? (
          <a
            href={`tel:${trip.driverInfo.phoneNumber}`}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow"
          >
            Call Driver
          </a>
        ) : (
          <button
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow"
            disabled
          >
            Call Driver
          </button>
        )}

        {/* Message Driver - only shown when inAppMessaging is enabled */}
        {flags.inAppMessaging && (
          <button
            onClick={handleMessageDriver}
            disabled={!trip?.driverId || messageLoading}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 disabled:opacity-60"
          >
            {messageLoading ? "Starting chat…" : "Message Driver"}
          </button>
        )}
        <button
          onClick={async () => {
            try {
              const shareUrl =
                typeof window !== "undefined" ? window.location.href : "";
              if ((navigator as any)?.share) {
                await (navigator as any).share({
                  title: "Share Reservation • RideOn",
                  url: shareUrl,
                });
              } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                setError("Reservation link copied to clipboard.");
                setTimeout(() => setError(null), 2000);
              }
            } catch {}
          }}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow"
        >
          Share Reservation
        </button>
        {canCancel && (
          <button
            onClick={() => setCancelOpen(true)}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#ef4444] px-5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all duration-200 hover:opacity-90"
          >
            Cancel Reservation
          </button>
        )}
      </div>

      {/* Rebook CTA for completed or cancelled trips */}
      {trip &&
        (trip.status === "completed" ||
          (trip.status || "").startsWith("cancelled")) && (
          <div className="mt-3">
            <button
              onClick={() =>
                router.push(`/app/book/rebook/${bookingId}?rebook=1`)
              }
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 hover:shadow-blue-500/30"
            >
              Book Again
            </button>
          </div>
        )}

      {/* Cancel modal with reasons */}
      <CancelTripModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        bookingId={bookingId}
        onCancelled={async () => {
          setCancelOpen(false);
          await fetchTrip();
        }}
      />

      {/* Rate driver modal */}
      <RateDriverModal
        isOpen={rateOpen}
        onClose={() => setRateOpen(false)}
        bookingId={bookingId}
        driverId={trip?.driverId}
        driverName={trip?.driverInfo?.name}
        driverImage={trip?.driverInfo?.profileImageUrl}
        vehicleInfo={trip?.vehicleInfo}
        onSubmitted={async () => {
          setRateOpen(false);
          await fetchTrip();
        }}
      />
    </div>
  );
}
