"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { StickyBanner, DashboardEmptyState } from "@/components";
import { Clock, MapPin, Banknote, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Trip {
  id: string;
  pickupAddress: string;
  dropoffAddress?: string;
  scheduledPickupTime: string;
  status: string;
  fareNgn: number;
  customerInfo?: { name?: string } | null;
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

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
    case "in_progress":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200";
    case "confirmed":
    case "driver_assigned":
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
    case "cancelled_by_customer":
    case "cancelled_by_driver":
      return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  }
}

export default function DriverTripsPage() {
  const router = useRouter();
  const [accessGranted, setAccessGranted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [trips, setTrips] = React.useState<Trip[]>([]);

  // Access control
  React.useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login?next=/driver/trips");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/drivers/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setAccessGranted(true);
        }
      } catch (e) {
        console.warn("[Trips] Access check failed", e);
        router.replace("/driver");
      }
    };
    checkAccess();
  }, [router]);

  const fetchTrips = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const res = await fetch("/api/driver/trips", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to fetch reservations");
      }
      const j = await res.json();
      setTrips(j?.trips || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (!accessGranted || loading) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-32">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              My Reservations
            </h1>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-32">
        {error && (
          <StickyBanner className="z-50 mb-4">
            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
              {error}
            </div>
          </StickyBanner>
        )}

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            My Reservations
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            View your upcoming and past reservations
          </p>
        </div>

        {trips.length === 0 ? (
          <DashboardEmptyState
            title="No Reservations Yet"
            description="Your accepted reservations will appear here. Check the New Booking Requests page to see new assignments."
            actionLabel="View New Bookings"
            actionHref="/driver/bookings/new"
          />
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const pickupTime = formatDateTime(trip.scheduledPickupTime);
              const payoutNGN = new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                maximumFractionDigits: 0,
              }).format(trip.fareNgn || 0);
              const statusColor = getStatusColor(trip.status);
              const statusLabel = trip.status
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());

              return (
                <Link
                  key={trip.id}
                  href={`/driver/trips/${trip.id}`}
                  className="block p-4 sm:p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
                        <Clock className="w-4 h-4" />
                        <span>{pickupTime}</span>
                      </div>
                      {trip.customerInfo?.name && (
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {trip.customerInfo.name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[#34A853]">
                          {payoutNGN}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#00529B] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Pickup
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {trip.pickupAddress}
                        </div>
                      </div>
                    </div>
                    {trip.dropoffAddress ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#34A853] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Drop-off
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {trip.dropoffAddress}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
