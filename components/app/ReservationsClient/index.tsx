"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { StickyBanner } from "@/components";

interface UpcomingReservation {
  id: string;
  pickupAddress?: string;
  startDate?: string | null;
  startTime?: string | null;
  rentalUnit?: string | null;
  city?: string | null;
  status?: string;
}

interface PastReservation {
  id: string;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  rentalUnit?: string | null;
  city?: string | null;
  fareNgn?: number | null;
  status?: string;
}

function scheduleLabel(r: {
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
}) {
  const left = [r.startDate || "", r.startTime || ""].filter(Boolean).join(" ");
  const right = [r.endDate || "", r.endTime || ""].filter(Boolean).join(" ");
  return right ? `${left} → ${right}` : left || "—";
}

export default function ReservationsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "past">(() =>
    (searchParams.get("tab") || "").toLowerCase() === "past"
      ? "past"
      : "upcoming",
  );
  const [serviceFilter, setServiceFilter] = React.useState<string>(() =>
    String(searchParams.get("service") || "").trim(),
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [upcoming, setUpcoming] = React.useState<UpcomingReservation[]>([]);
  const [past, setPast] = React.useState<PastReservation[]>([]);

  const setCustomerAppMode = React.useCallback(
    (next: "chauffeur" | "driver" | "fulltime") => {
      try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("rideon:customerAppMode", next);
      } catch {}
    },
    [],
  );

  const fetchAll = React.useCallback(async () => {
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
      const qs = serviceFilter
        ? `?service=${encodeURIComponent(serviceFilter)}`
        : "";
      const [uRes, pRes] = await Promise.allSettled([
        fetch(`/api/reservations/upcoming${qs}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`/api/reservations/past${qs}`, { headers, cache: "no-store" }),
      ]);
      if (uRes.status === "fulfilled" && uRes.value.ok) {
        const j = await uRes.value.json();
        setUpcoming(Array.isArray(j?.reservations) ? j.reservations : []);
      } else {
        setUpcoming([]);
      }
      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const j = await pRes.value.json();
        setPast(Array.isArray(j?.reservations) ? j.reservations : []);
      } else {
        setPast([]);
      }
    } catch (e: any) {
      setError("We couldn't load your reservations right now.");
      setUpcoming([]);
      setPast([]);
    } finally {
      setLoading(false);
    }
  }, [serviceFilter, router]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.replace("/login");
      else fetchAll();
    });
    return () => unsub();
  }, [fetchAll, router]);

  React.useEffect(() => {
    if (!auth.currentUser) return;
    fetchAll();
  }, [fetchAll]);

  React.useEffect(() => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    if (t === "past" || t === "upcoming") setActiveTab(t as any);
    const rawService = String(searchParams.get("service") || "").trim();
    if (rawService === "rental") {
      setServiceFilter("chauffeur");
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      sp.set("service", "chauffeur");
      router.replace(`/app/reservations?${sp.toString()}`);
    } else {
      setServiceFilter(rawService);
    }
  }, [searchParams, router]);

  const updateServiceFilter = React.useCallback(
    (next: string) => {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      if (next) sp.set("service", next);
      else sp.delete("service");
      router.replace(`/app/reservations?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const SkeletonList = (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse"
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      <motion.header
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-[28px] md:text-[32px] tracking-tight font-medium text-slate-900 dark:text-slate-100">
          My Reservations
        </h1>
      </motion.header>

      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="relative grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800/60">
          <motion.button
            onClick={() => updateServiceFilter("")}
            className={[
              "w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              !serviceFilter
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
            whileTap={{ scale: 0.95 }}
          >
            All
          </motion.button>
          <motion.button
            onClick={() => updateServiceFilter("drive_my_car")}
            className={[
              "w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              serviceFilter === "drive_my_car"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
            whileTap={{ scale: 0.95 }}
          >
            Driver
          </motion.button>
          <motion.button
            onClick={() => updateServiceFilter("chauffeur")}
            className={[
              "w-full text-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              serviceFilter === "chauffeur" || serviceFilter === "rental"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
            whileTap={{ scale: 0.95 }}
          >
            Chauffeur
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800/60">
          <motion.button
            onClick={() => setActiveTab("upcoming")}
            className={[
              "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === "upcoming"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
            whileTap={{ scale: 0.95 }}
          >
            Upcoming
          </motion.button>
          <motion.button
            onClick={() => setActiveTab("past")}
            className={[
              "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === "past"
                ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
                : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
            ].join(" ")}
            whileTap={{ scale: 0.95 }}
          >
            Past
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {SkeletonList}
          </motion.div>
        ) : activeTab === "upcoming" ? (
          upcoming.length === 0 ? (
            <motion.div
              key="upcoming-empty"
              className="text-center py-16 px-6 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
                No Upcoming Reservations
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                {serviceFilter === "drive_my_car"
                  ? "Start a request to hire a professional driver for your car."
                  : "Browse our chauffeur fleet and schedule your next rental."}
              </p>
              <div className="mt-6">
                <Link
                  href={
                    serviceFilter === "drive_my_car"
                      ? "/app/drive-my-car"
                      : "/app/catalog"
                  }
                  onClick={() => {
                    if (serviceFilter === "drive_my_car")
                      setCustomerAppMode("driver");
                    else setCustomerAppMode("chauffeur");
                  }}
                  className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white font-medium shadow-md text-sm"
                >
                  {serviceFilter === "drive_my_car"
                    ? "Hire a Driver"
                    : "Book a Chauffeur"}
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upcoming-list"
              className="space-y-3"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
            >
              {upcoming.map((r, idx) => (
                <motion.div
                  key={r.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <Link
                    href={`/app/reservations/${encodeURIComponent(r.id)}`}
                    className="block p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 hover:shadow-lg transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                          {r.pickupAddress || r.city || "Reservation"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {scheduleLabel(r)}
                        </p>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {r.rentalUnit || ""}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )
        ) : past.length === 0 ? (
          <motion.div
            key="past-empty"
            className="text-center py-16 px-6 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">
              Your Reservation History
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs mx-auto">
              After your first reservation, your history and receipts will
              appear here.
            </p>
            <div className="mt-6">
              <Link
                href="/app/catalog"
                className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white font-medium shadow-md text-sm"
              >
                Book a Chauffeur
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="past-list"
            className="space-y-3"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
          >
            {past.map((r, idx) => (
              <motion.div
                key={r.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <Link
                  href={`/app/reservations/${encodeURIComponent(r.id)}`}
                  className="block p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 hover:shadow-lg transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                        {r.city || "Reservation"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {scheduleLabel(r)}
                      </p>
                    </div>
                    {typeof r.fareNgn === "number" && (
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        ₦{new Intl.NumberFormat("en-NG").format(r.fareNgn)}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
