import React, { Suspense } from "react";
import { cookies, headers as nextHeaders } from "next/headers";
import AppHeader from "../../../../components/layout/AppHeader";
import DashboardSkeleton from "../../../../components/dashboard/DashboardSkeleton";
import DashboardEmptyState from "../../../../components/dashboard/DashboardEmptyState";
import DashboardErrorState from "../../../../components/dashboard/DashboardErrorState";
import DashboardView, { BookingSummary as BookingSummaryView, ActivityItem as ActivityItemView } from "../../../../components/dashboard/DashboardView";

async function getAuthToken(): Promise<string | null> {
  try {
    const ck = await cookies();
    // Try a few common cookie keys; adjust later when auth cookie is formalized
    const token = ck.get("rideon_id_token")?.value || ck.get("firebase_id_token")?.value || null;
    return token ?? null;
  } catch {
    return null;
  }
}

async function getUpcomingTrip(token: string | null): Promise<BookingSummaryView | null> {
  const h = await nextHeaders();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";
  const res = await fetch(`${origin}/api/dashboard/upcoming-trip`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upcoming trip fetch failed: ${res.status}`);
  const data = await res.json();
  const trip = data?.upcomingTrip;
  if (!trip) return null;
  return {
    _id: String(trip._id),
    scheduledPickupTime: new Date(trip.scheduledPickupTime).toISOString(),
    pickupAddress: String(trip.pickupAddress ?? ""),
    dropoffAddress: String(trip.dropoffAddress ?? ""),
    status: trip.status ? String(trip.status) : undefined,
  } satisfies BookingSummaryView;
}

async function getRecentActivity(token: string | null): Promise<ActivityItemView[]> {
  const h = await nextHeaders();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : "";
  const res = await fetch(`${origin}/api/dashboard/recent-activity`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Recent activity fetch failed: ${res.status}`);
  const data = await res.json();
  const arr = Array.isArray(data?.activity) ? data.activity : [];
  return arr.map((a: any) => ({
    id: String(a.id),
    type: (a.type ?? "other") as ActivityItemView["type"],
    description: String(a.description ?? ""),
    timestamp: new Date(a.timestamp ?? Date.now()).toISOString(),
    amount: typeof a.amount === "number" ? a.amount : undefined,
  }));
}

async function DashboardContent() {
  try {
    const token = await getAuthToken();
    const [upcomingTrip, recentActivity] = await Promise.all([
      getUpcomingTrip(token),
      getRecentActivity(token),
    ]);

    // TODO: hydrate firstName from a lightweight user profile endpoint when available
    const firstName: string | undefined = undefined;

    if (!upcomingTrip && recentActivity.length === 0) {
      return <DashboardEmptyState firstName={firstName} />;
    }

    return (
      <DashboardView firstName={firstName} upcomingTrip={upcomingTrip} recentActivity={recentActivity} />
    );
  } catch (err) {
    return <DashboardErrorState />;
  }
}

export default async function Page() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader brand="RideOn" />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
