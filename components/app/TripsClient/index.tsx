"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UpcomingTripCard, PastTripCard, StickyBanner } from "@/components";

type UpcomingTrip = {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  scheduledPickupTime?: any;
  startDate?: string | null;
  startTime?: string | null;
  status?: string;
  driverId?: string | null;
  driverInfo?: {
    name?: string;
    profileImageUrl?: string;
    averageRating?: number;
  } | null;
  vehicleInfo?: { make?: string; model?: string; licensePlate?: string } | null;
  thumbnailUrl?: string;
  fareNgn?: number | null;
};

type PastTrip = {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  completedAt?: any;
  fareNgn?: number | null;
};

export default function TripsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "past">(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    return t === "past" ? "past" : "upcoming";
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [upcomingTrips, setUpcomingTrips] = React.useState<UpcomingTrip[]>([]);
  const [pastTrips, setPastTrips] = React.useState<PastTrip[]>([]);

  const fetchTrips = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` } as const;

      const [uRes, pRes] = await Promise.allSettled([
        fetch("/api/trips/upcoming", { headers, cache: "no-store" }),
        fetch("/api/trips/past", { headers, cache: "no-store" }),
      ]);

      if (uRes.status === "fulfilled" && uRes.value.ok) {
        const uJson = await uRes.value.json();
        setUpcomingTrips(Array.isArray(uJson.trips) ? uJson.trips : []);
      } else {
        console.warn("Upcoming trips request failed", uRes);
        setUpcomingTrips([]);
      }

      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const pJson = await pRes.value.json();
        setPastTrips(Array.isArray(pJson.trips) ? pJson.trips : []);
      } else {
        console.warn("Past trips request failed", pRes);
        setPastTrips([]);
      }
    } catch (e: any) {
      console.error(e);
      setError("We couldn't load your reservations right now.");
      setUpcomingTrips([]);
      setPastTrips([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
      } else {
        fetchTrips();
      }
    });
    return () => unsub();
  }, [fetchTrips, router]);

  // Sync active tab with URL changes (?tab=past|upcoming)
  React.useEffect(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    if (t === "past" || t === "upcoming") {
      setActiveTab(t as "past" | "upcoming");
    }
  }, [searchParams]);

  const EmptyUpcoming = (
    <div className="text-center py-16 px-6 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60">
      <div className="flex justify-center">
        <div className="h-14 w-14 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/70 flex items-center justify-center shadow-sm">
          {/* calendar-plus icon inline */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Zm7-7v6m-3-3h6"
            />
          </svg>
        </div>
      </div>
      <h2 className="text-lg font-medium text-slate-800 mt-5 tracking-tight">
        No Upcoming Reservations
      </h2>
      <p className="text-sm text-slate-600 mt-2 max-w-sm mx-auto">
        You have no upcoming reservations at the moment. Plan your next journey
        with confidence and arrive on time, every time.
      </p>
      <div className="mt-6">
        <a
          href="/app/book"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white font-medium shadow-md shadow-blue-500/30 text-sm"
        >
          Book a New Rental
        </a>
      </div>
    </div>
  );

  const EmptyPast = (
    <div className="text-center py-16 px-6 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60">
      <div className="flex justify-center">
        <div className="h-14 w-14 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/70 flex items-center justify-center shadow-sm">
          {/* route icon inline */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M3 6h18M3 18h18"
            />
          </svg>
        </div>
      </div>
      <h2 className="text-lg font-medium text-slate-800 mt-5 tracking-tight">
        Your Journey History
      </h2>
      <p className="text-sm text-slate-600 mt-2 max-w-xs mx-auto">
        After your first reservation, you'll find all the details and receipts
        right here.
      </p>
      <div className="mt-6">
        <a
          href="/app/book"
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white font-medium shadow-md shadow-blue-500/30 text-sm"
        >
          Book a rental
        </a>
      </div>
    </div>
  );

  const SkeletonList = (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse"
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      <header className="mb-6">
        <h1 className="text-[28px] md:text-[32px] tracking-tight font-medium text-slate-900 dark:text-slate-100">
          My Reservations
        </h1>
      </header>

      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800/60">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={[
              "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === "upcoming"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={[
              "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === "past"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
          >
            Past
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        SkeletonList
      ) : activeTab === "upcoming" ? (
        upcomingTrips.length === 0 ? (
          EmptyUpcoming
        ) : (
          <div className="space-y-4">
            {upcomingTrips.map((t) => {
              const booking = {
                ...t,
                startDate: (t as any).startDate || undefined,
                startTime: (t as any).startTime || undefined,
              } as const;
              return <UpcomingTripCard key={t.id} booking={booking as any} />;
            })}
          </div>
        )
      ) : pastTrips.length === 0 ? (
        EmptyPast
      ) : (
        <div className="space-y-4">
          {pastTrips.map((t) => (
            <PastTripCard key={t.id} booking={t} />
          ))}
        </div>
      )}
    </div>
  );
}
