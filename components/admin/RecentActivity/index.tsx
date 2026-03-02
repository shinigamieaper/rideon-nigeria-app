"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import {
  UserPlus,
  Car,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type:
    | "driver_application"
    | "booking"
    | "payment"
    | "system"
    | "partner_application"
    | "vehicle_submission"
    | "partner_driver_submission"
    | "ft_driver_application"
    | "ops_queue"
    | "placement";
  title: string;
  description?: string;
  timestamp: string;
  link: string;
  status?: "success" | "warning" | "error" | "info";
}

export interface RecentActivityProps
  extends React.ComponentPropsWithoutRef<"section"> {}

const activityIcons: Record<ActivityItem["type"], LucideIcon> = {
  driver_application: UserPlus,
  booking: Calendar,
  payment: DollarSign,
  system: AlertCircle,
  partner_application: UserPlus,
  vehicle_submission: Car,
  partner_driver_submission: UserPlus,
  ft_driver_application: UserPlus,
  ops_queue: AlertCircle,
  placement: Calendar,
};

const statusColors = {
  success:
    "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
  warning:
    "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",
  error: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
  info: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
};

export function RecentActivity({
  className = "",
  ...props
}: RecentActivityProps) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchActivities = async () => {
    try {
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        return; // Wait for authentication
      }

      const token = await user.getIdToken();
      const response = await fetch("/api/admin/dashboard/recent-activity", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch activities");
      }

      const result = await response.json();
      setActivities(result.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to be ready
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        fetchActivities();
      } else {
        setLoading(false);
        setError("Not authenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh every 30 seconds once authenticated
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (loading) {
    return (
      <section
        className={[
          "bg-white/60 dark:bg-slate-900/60",
          "backdrop-blur-xl",
          "border border-slate-200/50 dark:border-slate-800/50",
          "rounded-2xl sm:rounded-3xl p-5 sm:p-6",
          "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        <div className="mb-5 sm:mb-7">
          <div className="h-8 w-52 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl animate-pulse mb-2" />
          <div className="h-4 w-72 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg animate-pulse ml-4" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-white/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/40 dark:border-slate-700/40"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2.5">
                <div className="h-5 w-3/4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg animate-pulse" />
                <div className="h-4 w-1/2 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={[
          "bg-red-50/50 dark:bg-red-900/10",
          "backdrop-blur-lg",
          "border border-red-200/80 dark:border-red-800/60",
          "rounded-2xl p-6",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Failed to load activity feed</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        "group/section relative",
        "bg-white/60 dark:bg-slate-900/60",
        "backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-800/50",
        "rounded-2xl sm:rounded-3xl p-5 sm:p-6",
        "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
        "transition-all duration-500",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover/section:from-blue-500/[0.02] group-hover/section:to-cyan-500/[0.02] rounded-3xl transition-all duration-700 pointer-events-none" />

      <div className="relative mb-5 sm:mb-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full" />
              Recent Activity
            </h2>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-4">
              Latest platform events and updates
            </p>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100/80 dark:bg-slate-800/50 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Live
            </span>
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="relative text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
            <Clock className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            No recent activity
          </p>
        </div>
      ) : (
        <div className="relative space-y-3 max-h-[480px] sm:max-h-[600px] overflow-y-auto custom-scrollbar pr-1 sm:pr-2">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.type];
            const statusColor = activity.status
              ? statusColors[activity.status]
              : statusColors.info;

            return (
              <Link
                key={activity.id}
                href={activity.link}
                className="group/item relative flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/70 border border-slate-200/40 dark:border-slate-700/40 hover:border-blue-300/60 dark:hover:border-blue-700/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg sm:hover:scale-[1.01] animate-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Subtle hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-cyan-500/0 group-hover/item:from-blue-500/5 group-hover/item:to-cyan-500/5 rounded-2xl transition-all duration-300" />

                <div
                  className={`relative p-2.5 sm:p-3 rounded-xl ${statusColor} shadow-md transition-all duration-300 group-hover/item:scale-110 group-hover/item:rotate-3`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>

                <div className="relative flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors leading-snug text-sm sm:text-base">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-500 mt-2.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                <div className="relative text-slate-400 dark:text-slate-600 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-all duration-300 group-hover/item:translate-x-1 text-lg sm:text-xl">
                  →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
