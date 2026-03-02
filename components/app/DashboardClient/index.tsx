"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Activity as ActivityIcon,
  KeyRound,
  UserCheck,
  UserX,
} from "lucide-react";
import DashboardView from "../../dashboard/DashboardView";
import type { ActivityItem } from "../../dashboard/RecentActivityFeed";

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
  } catch (e: any) {
    const name = typeof e?.name === "string" ? e.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      const err = new Error(`Request timed out after ${timeoutMs}ms`);
      (err as any).code = "FETCH_TIMEOUT";
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

interface UpcomingTripOut {
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupTime: string | Date;
  pickupCoords?: [number, number];
  dropoffCoords?: [number, number];
  detailsHref?: string;
}

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "past">(
    "upcoming",
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [upcomingTrip, setUpcomingTrip] =
    React.useState<UpcomingTripOut | null>(null);
  const [recentActivities, setRecentActivities] = React.useState<
    ActivityItem[] | undefined
  >(undefined);
  const [firstName, setFirstName] = React.useState<string>("");
  const [hasPastTrips, setHasPastTrips] = React.useState<boolean | undefined>(
    undefined,
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
      const idToken = await getIdTokenWithTimeout(user, 2500);

      const headers = { Authorization: `Bearer ${idToken}` };

      const [tripResult, actResult, pastResult, profileResult] =
        await Promise.allSettled([
          fetchWithTimeout("/api/reservations/upcoming", {
            headers,
            cache: "no-store",
            timeoutMs: 3500,
          }),
          fetchWithTimeout("/api/dashboard/recent-activity", {
            headers,
            cache: "no-store",
            timeoutMs: 3500,
          }),
          fetchWithTimeout("/api/reservations/past?limit=1", {
            headers,
            cache: "no-store",
            timeoutMs: 3500,
          }),
          fetchWithTimeout("/api/users/me", {
            headers,
            cache: "no-store",
            timeoutMs: 3500,
          }),
        ]);

      // Upcoming trip handling
      let tripOk = false;
      if (tripResult.status === "fulfilled") {
        const res = tripResult.value;
        if (res.ok) {
          const tripJson = await res.json();
          const trips = Array.isArray(tripJson?.reservations)
            ? tripJson.reservations
            : [];
          if (trips.length > 0) {
            // Take the soonest upcoming trip (API is already sorted asc)
            const t = trips[0] as any;
            // Compute a safe Date/string for the card to format
            let sched: any = t?.scheduledPickupTime ?? null;
            if (!sched && t?.startDate) {
              const hhmm = t?.startTime || "00:00";
              sched = `${t.startDate}T${hhmm}`;
            }
            setUpcomingTrip({
              pickupAddress: t?.pickupAddress ?? "",
              dropoffAddress: t?.dropoffAddress ?? "",
              scheduledPickupTime: sched,
              pickupCoords: Array.isArray(t?.pickupCoords)
                ? (t.pickupCoords as [number, number])
                : undefined,
              dropoffCoords: Array.isArray(t?.dropoffCoords)
                ? (t.dropoffCoords as [number, number])
                : undefined,
              detailsHref: t?.id
                ? `/app/reservations/${t.id}`
                : "/app/reservations",
            });
          } else {
            setUpcomingTrip(null);
          }
          tripOk = true;
        } else {
          console.warn("Upcoming trip fetch failed with status", res.status);
          setUpcomingTrip(null);
        }
      } else {
        console.warn("Upcoming trip request failed", tripResult.reason);
        setUpcomingTrip(null);
      }

      // Recent activity handling
      let actOk = false;
      if (actResult.status === "fulfilled") {
        const res = actResult.value;
        if (res.ok) {
          const actJson = await res.json();
          const rawActivities = (actJson.activities ?? []) as Array<{
            id: string;
            type: string;
            tone: ActivityItem["tone"];
            title: string;
            timestamp: string;
          }>;
          const iconFor = (type: string) => {
            switch (type) {
              case "trip_completed":
                return <CheckCircle2 className="h-full w-full" />;
              case "trip_canceled":
                return <XCircle className="h-full w-full" />;
              case "placement_access_activated":
                return <KeyRound className="h-full w-full" />;
              case "placement_interview_accepted":
              case "placement_hire_accepted":
                return <UserCheck className="h-full w-full" />;
              case "placement_interview_declined":
              case "placement_hire_declined":
                return <UserX className="h-full w-full" />;
              case "placement_interview_requested":
              case "placement_hire_requested":
                return <ActivityIcon className="h-full w-full" />;
              case "trip_progress":
              default:
                return <Clock className="h-full w-full" />;
            }
          };
          const items: ActivityItem[] = rawActivities.map((a) => ({
            icon: iconFor(a.type),
            tone: a.tone ?? "gray",
            title: a.title,
            timestamp: new Date(a.timestamp).toLocaleString(),
          }));
          setRecentActivities(items);
          actOk = true;
        } else {
          console.warn("Recent activity fetch failed with status", res.status);
          setRecentActivities([]);
        }
      } else {
        console.warn("Recent activity request failed", actResult.reason);
        setRecentActivities([]);
      }

      // Past reservations existence handling (for CTA label) — run independently
      if (pastResult.status === "fulfilled") {
        const pres = pastResult.value;
        if (pres.ok) {
          const pj = await pres.json();
          const pastResvArr = Array.isArray(pj?.reservations)
            ? pj.reservations
            : [];
          setHasPastTrips(pastResvArr.length > 0);
        } else {
          console.warn("Past trips fetch failed with status", pres.status);
          setHasPastTrips(undefined);
        }
      } else {
        console.warn("Past trips request failed", pastResult.reason);
        setHasPastTrips(undefined);
      }

      if (!tripOk && !actOk) {
        setError("We couldn't load your dashboard right now.");
      }

      // Profile handling (firstName)
      if (profileResult.status === "fulfilled") {
        const res = profileResult.value;
        if (res.ok) {
          const pj = await res.json();
          const name =
            typeof pj.firstName === "string" ? pj.firstName.trim() : "";
          if (name) setFirstName(name);
        } else {
          console.warn("Profile fetch failed with status", res.status);
          // keep existing firstName fallback
        }
      } else {
        console.warn("Profile request failed", profileResult.reason);
        // keep existing firstName fallback
      }
    } catch (err) {
      console.error(err);
      const msg =
        typeof (err as any)?.message === "string"
          ? String((err as any).message)
          : "";
      if (msg.toLowerCase().includes("not authenticated")) {
        router.replace("/login");
        return;
      }
      setError("We couldn't load your dashboard right now.");
      setUpcomingTrip(null);
      setRecentActivities([]);
      setHasPastTrips(undefined);
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
      } else {
        // Immediate fallback: use displayName or derive from email until API resolves
        const immediateName =
          (u.displayName && u.displayName.split(" ")[0]) ||
          (u.email ? u.email.split("@")[0] || "" : "");
        if (immediateName) setFirstName(immediateName);
        fetchAll();
      }
    });
    return () => unsub();
  }, [fetchAll, router]);

  return (
    <DashboardView
      firstName={firstName}
      loading={loading}
      error={error}
      onRetry={fetchAll}
      upcomingTrip={upcomingTrip}
      recentActivities={recentActivities}
      userType="customer"
      hasPastTrips={hasPastTrips}
    />
  );
}
