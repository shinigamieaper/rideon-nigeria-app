"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { StickyBanner } from "@/components";

interface TripHistoryClientProps extends React.ComponentPropsWithoutRef<"div"> {
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
  fareNgn?: number | null;
  distanceKm?: number | null;
  rating?: { customerToDriver?: number; customerComment?: string } | null;
}

export default function TripHistoryClient({
  bookingId,
  className,
  ...rest
}: TripHistoryClientProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [trip, setTrip] = React.useState<TripDetail | null>(null);
  const [score, setScore] = React.useState<number>(0);
  const [comment, setComment] = React.useState<string>("");
  const [rated, setRated] = React.useState<boolean>(false);

  const fetchTrip = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`/api/trips/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to fetch reservation");
      setTrip(j);
      const already = Number(j?.rating?.customerToDriver);
      setRated(isFinite(already) && already > 0);
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

  async function submitRating() {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      if (score < 1 || score > 5) throw new Error("Please select a rating.");
      const token = await user.getIdToken();
      const res = await fetch(`/api/trips/${bookingId}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score, comment }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to submit rating");
      setRated(true);
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "";
      if (msg.toLowerCase().includes("not authenticated")) {
        router.replace("/login");
        return;
      }
      setError(msg || "Failed to submit rating.");
    }
  }

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

      {/* Map (static planned route) */}

      {/* Fare breakdown */}
      <div className="mt-5 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Fare Breakdown
        </h2>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 space-y-1">
          <div className="flex justify-between">
            <span>Base Fare</span>
            <span>
              {typeof trip?.fareNgn === "number"
                ? `₦${new Intl.NumberFormat("en-NG").format(Math.max(0, Math.round((trip!.fareNgn as number) * 0.8)))}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Taxes & Fees</span>
            <span>
              {typeof trip?.fareNgn === "number"
                ? `₦${new Intl.NumberFormat("en-NG").format(Math.round((trip!.fareNgn as number) * 0.2))}`
                : "—"}
            </span>
          </div>
          <div className="my-2 border-t border-slate-200/80 dark:border-slate-800/60" />
          <div className="flex justify-between font-semibold">
            <span>Total Paid</span>
            <span>
              {typeof trip?.fareNgn === "number"
                ? `₦${new Intl.NumberFormat("en-NG").format(trip!.fareNgn as number)}`
                : "—"}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <button
            className="inline-flex h-11 items-center justify-center rounded-md bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-5 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow"
            onClick={() => router.push("/app/profile/support")}
          >
            Contact Support for Receipt
          </button>
        </div>
      </div>

      {/* Rate your driver */}
      {!rated && (
        <div className="mt-5 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Rate Your Driver
          </h3>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={[
                  "h-10 w-10 rounded-full flex items-center justify-center border transition",
                  n <= score
                    ? "bg-amber-400 text-amber-900 border-amber-300"
                    : "bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-800/60",
                ].join(" ")}
                aria-label={`${n} star`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6"
                >
                  <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1">
              Comments (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-200/70 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 p-2 text-sm"
              placeholder="Tell us about your experience"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={submitRating}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#00529B] px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:opacity-90 disabled:opacity-60"
              disabled={score < 1}
            >
              Submit Rating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
