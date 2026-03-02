"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { StatCard } from "../StatCard";
import { UserCheck, Calendar, Car, CreditCard, Users } from "lucide-react";

export interface KeyMetricsProps
  extends React.ComponentPropsWithoutRef<"section"> {
  data?: {
    pendingDriverApprovals: number;
    bookingsToday: number;
    activeTrips: number;
    paymentSuccessRate: number;
    pendingInterviews: number;
  };
}

export function KeyMetrics({
  data,
  className = "",
  ...props
}: KeyMetricsProps) {
  const [loading, setLoading] = useState(!data);
  const [metrics, setMetrics] = useState(data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) return; // If data provided via props, don't fetch

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = auth.currentUser;
        if (!user) {
          return; // Wait for authentication
        }

        const token = await user.getIdToken();
        const response = await fetch("/api/admin/dashboard/summary", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch metrics");
        }

        const result = await response.json();
        setMetrics(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    // Wait for auth to be ready
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchMetrics();
      } else {
        setLoading(false);
        setError("Not authenticated");
      }
    });

    return () => unsubscribe();
  }, [data]);

  if (error) {
    return (
      <div
        className={[
          "bg-red-50/50 dark:bg-red-900/10",
          "backdrop-blur-lg",
          "border border-red-200/80 dark:border-red-800/60",
          "rounded-2xl p-6",
          "text-red-600 dark:text-red-400",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        <p className="font-medium">Failed to load metrics</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <section className={className} {...props}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          <span className="w-2 h-10 bg-gradient-to-b from-blue-600 via-cyan-600 to-blue-600 rounded-full" />
          Platform Overview
        </h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-5">
          Real-time metrics and operational health
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          title="Driver Approvals Pending"
          value={metrics?.pendingDriverApprovals ?? 0}
          icon={UserCheck}
          href="/admin/drivers"
          loading={loading}
          iconColor="text-orange-600 dark:text-orange-400"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
        />

        <StatCard
          title="Bookings Today"
          value={metrics?.bookingsToday ?? 0}
          icon={Calendar}
          loading={loading}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />

        <StatCard
          title="Active Trips"
          value={metrics?.activeTrips ?? 0}
          icon={Car}
          loading={loading}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />

        <StatCard
          title="Payment Success Rate (24h)"
          value={metrics?.paymentSuccessRate ?? 0}
          suffix="%"
          icon={CreditCard}
          loading={loading}
          trend={
            metrics?.paymentSuccessRate
              ? {
                  value: 2.5,
                  isPositive: metrics.paymentSuccessRate >= 95,
                }
              : undefined
          }
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />

        <StatCard
          title="Pending Interviews"
          value={metrics?.pendingInterviews ?? 0}
          icon={Users}
          loading={loading}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
        />
      </div>
    </section>
  );
}
