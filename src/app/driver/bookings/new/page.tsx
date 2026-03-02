"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { StickyBanner } from "@/components";
import PendingBookingCard from "@/components/driver/bookings/PendingBookingCard";
import type { PendingBooking } from "@/components/driver/bookings/PendingBookingCard";

export default function NewBookingsPage() {
  const router = useRouter();
  const [accessGranted, setAccessGranted] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [bookings, setBookings] = React.useState<PendingBooking[]>([]);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [driverMeta, setDriverMeta] = React.useState<{
    status?: string;
    onlineStatus?: boolean;
    servedCities?: string[];
  } | null>(null);

  // Access control
  React.useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login?next=/driver/bookings/new");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/drivers/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const j = await res.json().catch(() => ({}) as any);
          setDriverMeta({
            status: typeof j?.status === "string" ? j.status : undefined,
            onlineStatus:
              typeof j?.onlineStatus === "boolean"
                ? j.onlineStatus
                : typeof j?.online === "boolean"
                  ? j.online
                  : undefined,
            servedCities: Array.isArray(j?.servedCities)
              ? j.servedCities
              : undefined,
          });
          setAccessGranted(true);
          return;
        }
      } catch (e) {
        console.warn("[Bookings] Access check failed", e);
        router.replace("/driver");
      }
    };
    checkAccess();
  }, [router]);

  const fetchBookings = React.useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (!accessGranted) return;
      if (mode === "initial") {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();
        const res = await fetch("/api/driver/bookings/pending", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "Failed to fetch bookings");
        }
        const j = await res.json();
        setBookings(j?.bookings || []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load bookings.");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [accessGranted],
  );

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
      } else if (accessGranted) {
        fetchBookings("initial");
      }
    });
    return () => unsub();
  }, [fetchBookings, router, accessGranted]);

  // Auto-refresh every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!initialLoading && !refreshing && !actionLoading) {
        fetchBookings("refresh");
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchBookings, initialLoading, refreshing, actionLoading]);

  const handleAccept = React.useCallback(
    async (bookingId: string) => {
      try {
        setActionLoading(bookingId);
        setError(null);
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();
        const res = await fetch(`/api/driver/bookings/${bookingId}/accept`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const apiError = String(j?.error || "Failed to accept booking");
          const shouldRefresh =
            apiError.toLowerCase().includes("expired") ||
            apiError.toLowerCase().includes("taken") ||
            apiError.toLowerCase().includes("already started") ||
            apiError.toLowerCase().includes("not found");
          if (shouldRefresh) {
            setError(apiError);
            setTimeout(() => setError(null), 3500);
            await fetchBookings("refresh");
            return;
          }
          throw new Error(apiError);
        }
        // Show success message briefly
        setError("✓ Booking accepted! It now appears in your schedule.");
        setTimeout(() => setError(null), 3000);
        // Refresh list
        await fetchBookings();
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to accept booking");
        setTimeout(() => setError(null), 4000);
      } finally {
        setActionLoading(null);
      }
    },
    [fetchBookings],
  );

  const handleReject = React.useCallback(
    async (bookingId: string) => {
      try {
        setActionLoading(bookingId);
        setError(null);
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();
        const res = await fetch(`/api/driver/bookings/${bookingId}/reject`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: "Not available" }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const apiError = String(j?.error || "Failed to reject booking");
          const shouldRefresh =
            apiError.toLowerCase().includes("expired") ||
            apiError.toLowerCase().includes("taken") ||
            apiError.toLowerCase().includes("already started") ||
            apiError.toLowerCase().includes("not found");
          if (shouldRefresh) {
            setError(apiError);
            setTimeout(() => setError(null), 3500);
            await fetchBookings("refresh");
            return;
          }
          throw new Error(apiError);
        }
        // Show success message briefly
        setError("Booking declined. It will be reassigned to another driver.");
        setTimeout(() => setError(null), 3000);
        // Refresh list
        await fetchBookings();
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to reject booking");
        setTimeout(() => setError(null), 4000);
      } finally {
        setActionLoading(null);
      }
    },
    [fetchBookings],
  );

  if (initialLoading) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            New Booking Requests
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Review and accept reservations assigned to you
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {error && (
        <StickyBanner className="z-50 mb-4">
          <div
            className={`rounded-xl border px-3 py-2 text-[13px] shadow ${
              error.startsWith("✓")
                ? "bg-green-50/80 dark:bg-green-900/20 border-green-200/80 dark:border-green-800/60 text-green-800 dark:text-green-100"
                : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-100"
            }`}
          >
            {error}
          </div>
        </StickyBanner>
      )}

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          New Booking Requests
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Review reservation details and choose whether to accept or decline
        </p>
      </div>

      {driverMeta?.status && driverMeta.status !== "approved" && (
        <div className="mb-4 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/60 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Your driver account is currently{" "}
          <span className="font-semibold">
            {driverMeta.status.replace("_", " ")}
          </span>
          . You will only receive new requests after your account is approved.
        </div>
      )}

      {driverMeta?.status === "approved" &&
        driverMeta?.onlineStatus === false && (
          <div className="mb-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
            You're currently <span className="font-semibold">offline</span>.
            Turn online to receive requests.
          </div>
        )}

      {refreshing && (
        <div className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Refreshing…
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-2xl text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-8 sm:p-10">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-[#00529B]/10 text-[#00529B] flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            No New Requests
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-prose mx-auto">
            You're all caught up! New reservation requests will appear here when
            they're assigned to you based on your schedule and availability.
          </p>
          <div className="mt-6">
            <Link
              href="/driver"
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-[#0077E6] to-[#00529B] shadow-lg hover:opacity-95"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <PendingBookingCard
              key={booking.id}
              booking={booking}
              onAccept={handleAccept}
              onReject={handleReject}
              isLoading={actionLoading === booking.id}
            />
          ))}
        </div>
      )}

      {bookings.length > 0 && (
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>This page auto-refreshes every 30 seconds</p>
        </div>
      )}
    </>
  );
}
