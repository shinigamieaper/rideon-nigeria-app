"use client";

import * as React from "react";
import { CustomerDashboardHero } from "@/components";
import UpcomingTripCard from "../UpcomingTripCard";
import RecentActivityFeed, { ActivityItem } from "../RecentActivityFeed";
import DashboardSkeleton from "../DashboardSkeleton";
import DashboardEmptyState from "../DashboardEmptyState";
import DashboardErrorState from "../DashboardErrorState";
import { CustomerNotificationPermissionCard } from "@/components";

export interface DashboardViewProps
  extends React.ComponentPropsWithoutRef<"div"> {
  firstName?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  upcomingTrip?: {
    pickupAddress: string;
    dropoffAddress: string;
    scheduledPickupTime: string | Date;
    pickupCoords?: [number, number];
    dropoffCoords?: [number, number];
    thumbnailUrl?: string;
    detailsHref?: string;
  } | null;
  recentActivities?: ActivityItem[];
  userType?: "customer" | "driver";
  hasPastTrips?: boolean;
}

export default function DashboardView({
  firstName = "",
  loading = false,
  error = null,
  onRetry,
  upcomingTrip = null,
  recentActivities,
  userType = "customer",
  hasPastTrips,
  className,
  ...rest
}: DashboardViewProps) {
  // Respect empty state: no demo data. If undefined/null, treat as empty
  const items = recentActivities ?? [];

  return (
    <div className={["relative", className ?? ""].join(" ")} {...rest}>
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <DashboardErrorState onRetry={onRetry} />
        ) : !upcomingTrip && (!items || items.length === 0) ? (
          <div className="py-6 space-y-6">
            <CustomerDashboardHero firstName={firstName} />
            <CustomerNotificationPermissionCard compact />
            <DashboardEmptyState
              firstName={firstName || "there"}
              ctaHref="/app/catalog"
              ctaLabel="Explore services"
              description="Book a chauffeur, request a driver to drive your car, or hire a full-time driver. Choose what you need and we’ll guide you from there."
            />
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <CustomerDashboardHero firstName={firstName} />
            <CustomerNotificationPermissionCard compact />
            {upcomingTrip && (
              <UpcomingTripCard
                pickupAddress={upcomingTrip.pickupAddress}
                dropoffAddress={upcomingTrip.dropoffAddress}
                scheduledPickupTime={upcomingTrip.scheduledPickupTime}
                pickupCoords={upcomingTrip.pickupCoords}
                dropoffCoords={upcomingTrip.dropoffCoords}
                thumbnailUrl={upcomingTrip.thumbnailUrl}
                detailsHref={upcomingTrip.detailsHref}
              />
            )}
            {items && items.length > 0 && <RecentActivityFeed items={items} />}
          </div>
        )}
      </main>
    </div>
  );
}
