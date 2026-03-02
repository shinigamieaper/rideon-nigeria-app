"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { StickyBanner, CancelTripModal, RateDriverModal } from "@/components";
import { useFeatureFlags } from "@/hooks";

async function getIdTokenWithTimeout(
  user: { getIdToken: (forceRefresh?: boolean) => Promise<string> },
  timeoutMs = 2500,
): Promise<string> {
  return await Promise.race([
    user.getIdToken(),
    new Promise<string>((_, reject) =>
      setTimeout(
        () => reject(new Error(`getIdToken timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 3500;
  const { timeoutMs: _timeoutMs, ...rest } = init || {};

  if ((rest as any).signal) {
    return await fetch(input, rest);
  }

  const controller = new AbortController();
  const t = setTimeout(() => {
    try {
      controller.abort(
        new DOMException(`Timed out after ${timeoutMs}ms`, "TimeoutError"),
      );
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function normalizeCustomerError(err: unknown, fallback: string) {
  const name =
    typeof (err as any)?.name === "string" ? String((err as any).name) : "";
  const msg =
    typeof (err as any)?.message === "string"
      ? String((err as any).message)
      : "";
  const m = msg.toLowerCase();
  if (
    name === "TimeoutError" ||
    m.includes("timed out") ||
    m.includes("timeout")
  ) {
    return "We're having trouble connecting. Please try again.";
  }
  return msg || fallback;
}

export interface ReservationDetailClientProps
  extends React.ComponentPropsWithoutRef<"div"> {
  reservationId: string;
}

type Reservation = {
  id: string;
  service?: string;
  status?: string;
  scheduledPickupTime?: any;
  driverId?: string | null;
  driverInfo?: {
    name?: string;
    profileImageUrl?: string;
    averageRating?: number;
    phoneNumber?: string;
  } | null;
  partnerDriverId?: string | null;
  partnerDriverInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    city?: string;
  } | null;
  driverRatingStats?: {
    thumbsUp: number;
    thumbsDown: number;
    totalRatings: number;
  } | null;
  vehicleInfo?: { make?: string; model?: string; licensePlate?: string } | null;
  driveMyCar?: { blockHours?: number; pickupPin?: string } | null;
  rentalUnit?: string | null;
  listingId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  pickupAddress?: string;
  pickupCoords?: [number, number];
  city?: string | null;
  fareNgn?: number | null;
  feedback?: { createdAt?: string } | null;
  payment?: {
    status?: string;
    amountKobo?: number | null;
    reference?: string | null;
    currency?: string;
  };
  createdAt?: string | null;
};

export default function ReservationDetailClient({
  reservationId,
  className,
  ...rest
}: ReservationDetailClientProps) {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [reservation, setReservation] = React.useState<Reservation | null>(
    null,
  );
  const [msgLoading, setMsgLoading] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [rateOpen, setRateOpen] = React.useState(false);
  const ratePromptedRef = React.useRef(false);

  const normalizedStatus = String(reservation?.status || "")
    .trim()
    .toLowerCase();
  const isCancelled =
    normalizedStatus === "cancelled" ||
    normalizedStatus.startsWith("cancelled");
  const isCompleted = normalizedStatus === "completed";
  const allowSensitiveContact =
    Boolean(reservation) && !isCancelled && !isCompleted;

  const scheduledAt = React.useMemo(() => {
    const v = (reservation as any)?.scheduledPickupTime;
    if (v) {
      if (typeof v?.toDate === "function") return v.toDate() as Date;
      if (v instanceof Date) return v;
      const d = new Date(String(v));
      if (!isNaN(d.getTime())) return d;
    }
    const sd = (reservation as any)?.startDate as string | null | undefined;
    const st = (reservation as any)?.startTime as string | null | undefined;
    if (sd) {
      const dt = new Date(`${sd}T${st || "00:00"}:00`);
      if (!isNaN(dt.getTime())) return dt;
    }
    return null as Date | null;
  }, [reservation]);

  const hasStarted = Boolean(scheduledAt)
    ? Date.now() >= (scheduledAt as Date).getTime()
    : false;
  const canCancel =
    Boolean(reservation) && !isCancelled && !isCompleted && !hasStarted;

  const fetchReservation = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      const token = await getIdTokenWithTimeout(user, 2500);
      const res = await fetchWithTimeout(
        `/api/reservations/${encodeURIComponent(reservationId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: 3500,
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to fetch reservation");
      setReservation(j?.reservation ?? null);
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "";
      if (msg.toLowerCase().includes("not authenticated")) {
        router.replace("/login");
        return;
      }
      setError(normalizeCustomerError(e, "Failed to load reservation."));
    } finally {
      setLoading(false);
    }
  }, [reservationId, router]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
      } else {
        fetchReservation();
      }
    });
    return () => unsub();
  }, [fetchReservation, router]);

  const startChat = React.useCallback(async () => {
    if (!reservation?.driverId) return;
    try {
      setMsgLoading(true);
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      const token = await getIdTokenWithTimeout(user, 2500);
      const res = await fetchWithTimeout("/api/messages/contact-driver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reservationId, driverId: reservation.driverId }),
        timeoutMs: 3500,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to start chat");
      const id = j?.id as string | undefined;
      if (id) router.push(`/app/messages/${encodeURIComponent(id)}`);
    } catch (e: any) {
      setError(normalizeCustomerError(e, "Failed to start chat."));
    } finally {
      setMsgLoading(false);
    }
  }, [reservation?.driverId, reservationId, router]);

  const scheduleText = React.useMemo(() => {
    const sd = reservation?.startDate;
    const st = reservation?.startTime;
    const ed = reservation?.endDate;
    const et = reservation?.endTime;
    if (!sd && !st && !ed && !et) return "—";
    const left = [sd, st].filter(Boolean).join(" ");
    const right = [ed, et].filter(Boolean).join(" ");
    return right ? `${left} → ${right}` : left || "—";
  }, [
    reservation?.startDate,
    reservation?.startTime,
    reservation?.endDate,
    reservation?.endTime,
  ]);

  const normalizedService = String(reservation?.service || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const isDriveMyCar =
    normalizedService === "drive_my_car" || Boolean(reservation?.driveMyCar);
  const bookAnotherHref = isDriveMyCar ? "/app/drive-my-car" : "/app/catalog";
  const callNumber = React.useMemo(() => {
    if (!reservation) return null;
    if (isDriveMyCar) {
      const n = reservation.driverInfo?.phoneNumber;
      return n ? String(n) : null;
    }
    const n = reservation.partnerDriverInfo?.phone;
    return n ? String(n) : null;
  }, [isDriveMyCar, reservation]);

  const pickupPin = React.useMemo(() => {
    if (!isDriveMyCar) return null;
    const pin =
      reservation?.driveMyCar &&
      typeof reservation.driveMyCar.pickupPin === "string"
        ? reservation.driveMyCar.pickupPin
        : null;
    if (!pin) return null;
    const st = String(reservation?.status || "").trim();
    const show = ["driver_assigned", "en_route"].includes(st);
    return show ? pin : null;
  }, [isDriveMyCar, reservation?.driveMyCar, reservation?.status]);

  const ratingText = React.useMemo(() => {
    if (!isDriveMyCar) return null;
    const s = reservation?.driverRatingStats;
    if (!s || !Number.isFinite(s.totalRatings) || s.totalRatings <= 0)
      return null;
    const pct = Math.round(
      (Math.max(0, s.thumbsUp) / Math.max(1, s.totalRatings)) * 100,
    );
    return `${pct}% thumbs up • ${new Intl.NumberFormat("en-NG").format(s.totalRatings)} ratings`;
  }, [isDriveMyCar, reservation?.driverRatingStats]);

  React.useEffect(() => {
    if (!reservation) return;
    if (!flags.driverRatings) return;
    if (!isDriveMyCar) return;
    if (!reservation.driverId) return;
    if (String(reservation.status || "") !== "completed") return;
    if (reservation.feedback?.createdAt) return;
    if (ratePromptedRef.current) return;
    ratePromptedRef.current = true;
    setRateOpen(true);
  }, [flags.driverRatings, isDriveMyCar, reservation]);

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

      {notice && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {notice}
          </div>
        </StickyBanner>
      )}

      {(isCancelled || isCompleted) && (
        <div className="mb-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
          {isCancelled
            ? "This reservation has been cancelled."
            : "This reservation has been completed."}
        </div>
      )}

      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Reservation Details
        </h2>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          <p>
            <span className="text-slate-500">ID:</span>{" "}
            <span className="font-mono">
              {reservation?.id || reservationId}
            </span>
          </p>
          <p>
            <span className="text-slate-500">Status:</span>{" "}
            {reservation?.status || "—"}
          </p>
          <p>
            <span className="text-slate-500">Rental:</span>{" "}
            {reservation?.rentalUnit || "—"}
          </p>
          <p>
            <span className="text-slate-500">Schedule:</span> {scheduleText}
          </p>
          <p>
            <span className="text-slate-500">Pickup:</span>{" "}
            {reservation?.pickupAddress || "—"}
          </p>
          <p>
            <span className="text-slate-500">City:</span>{" "}
            {reservation?.city || "—"}
          </p>
          {typeof reservation?.fareNgn === "number" && (
            <p>
              <span className="text-slate-500">Fare:</span> ₦
              {new Intl.NumberFormat("en-NG").format(reservation.fareNgn)}
            </p>
          )}
          <p>
            <span className="text-slate-500">Payment:</span>{" "}
            {reservation?.payment?.status || "—"}
          </p>
        </div>
      </div>

      {(Boolean(
        reservation?.driverId ||
          reservation?.driverInfo?.name ||
          reservation?.partnerDriverId ||
          reservation?.partnerDriverInfo?.name,
      ) ||
        Boolean(
          reservation?.vehicleInfo &&
            (reservation.vehicleInfo.make ||
              reservation.vehicleInfo.model ||
              reservation.vehicleInfo.licensePlate),
        )) && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Boolean(reservation?.driverId || reservation?.driverInfo?.name) && (
            <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4">
              <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
                Driver
              </h3>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                <p className="font-medium">
                  {reservation?.driverInfo?.name || "Assigned"}
                </p>
                {typeof reservation?.driverInfo?.averageRating === "number" && (
                  <p className="text-slate-500 mt-0.5">
                    Rating: {reservation.driverInfo.averageRating.toFixed(1)} /
                    5
                  </p>
                )}
                {allowSensitiveContact &&
                  reservation?.driverInfo?.phoneNumber && (
                    <p className="text-slate-500 mt-0.5">
                      Phone: {reservation.driverInfo.phoneNumber}
                    </p>
                  )}
                {ratingText && (
                  <p className="text-slate-500 mt-0.5">{ratingText}</p>
                )}
              </div>
            </div>
          )}

          {Boolean(
            reservation?.partnerDriverId ||
              reservation?.partnerDriverInfo?.name ||
              reservation?.partnerDriverInfo?.phone,
          ) && (
            <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4">
              <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
                Chauffeur Driver
              </h3>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                <p className="font-medium">
                  {reservation?.partnerDriverInfo?.name || "Assigned"}
                </p>
                {allowSensitiveContact &&
                  reservation?.partnerDriverInfo?.phone && (
                    <p className="text-slate-500 mt-0.5">
                      Phone: {reservation.partnerDriverInfo.phone}
                    </p>
                  )}
              </div>
            </div>
          )}
          {Boolean(
            reservation?.vehicleInfo &&
              (reservation.vehicleInfo.make ||
                reservation.vehicleInfo.model ||
                reservation.vehicleInfo.licensePlate),
          ) && (
            <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4">
              <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
                Vehicle
              </h3>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                <p className="font-medium">
                  {[
                    reservation?.vehicleInfo?.make,
                    reservation?.vehicleInfo?.model,
                  ]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </p>
                {reservation?.vehicleInfo?.licensePlate && (
                  <p className="text-slate-500 mt-0.5">
                    Plate: {reservation.vehicleInfo.licensePlate}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {pickupPin && (
        <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4">
          <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
            Pickup PIN
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Share this code with your driver to start the reservation.
          </p>
          <div className="mt-3 inline-flex items-center justify-center rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-4 py-3 font-mono text-xl tracking-widest text-slate-900 dark:text-slate-100">
            {pickupPin}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        {allowSensitiveContact && callNumber && (
          <a
            href={`tel:${callNumber}`}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow"
          >
            Call Driver
          </a>
        )}

        {allowSensitiveContact &&
          flags.inAppMessaging &&
          reservation?.driverId && (
            <button
              type="button"
              onClick={startChat}
              disabled={msgLoading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-gradient-to-br from-[#0077E6] to-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 disabled:opacity-60"
            >
              {msgLoading ? "Starting…" : "Message Driver"}
            </button>
          )}
        {canCancel && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#ef4444] px-5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-all duration-200 hover:opacity-90"
          >
            Cancel
          </button>
        )}
        <Link
          href={bookAnotherHref}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90"
        >
          Book Another
        </Link>
        <Link
          href="/app/reservations"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow"
        >
          Back to Reservations
        </Link>
      </div>

      {loading && (
        <div className="mt-6 h-28 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
      )}

      <CancelTripModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        bookingId={reservationId}
        onCancelled={async () => {
          setCancelOpen(false);
          setNotice("Reservation cancelled. Redirecting…");
          await fetchReservation();
          window.setTimeout(() => {
            router.replace("/app/reservations");
          }, 1200);
        }}
      />

      <RateDriverModal
        isOpen={rateOpen}
        onClose={() => setRateOpen(false)}
        bookingId={reservationId}
        driverId={reservation?.driverId}
        driverName={reservation?.driverInfo?.name}
        driverImage={reservation?.driverInfo?.profileImageUrl}
        vehicleInfo={reservation?.vehicleInfo as any}
        onSubmitted={async () => {
          setRateOpen(false);
          await fetchReservation();
        }}
      />
    </div>
  );
}
