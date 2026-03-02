"use client";

import * as React from "react";
import Link from "next/link";
import { waitForUser } from "@/lib/firebase";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Loader2,
  TrendingUp,
  Users,
  RefreshCw,
} from "lucide-react";

interface SupportHealthData {
  // Volume
  openConversations: number;
  pendingConversations: number;
  resolvedToday: number;
  unassignedCount: number;

  // SLA
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;

  // Alerts
  alerts: {
    type: "warning" | "critical";
    message: string;
    count: number;
  }[];
}

export interface SupportHealthCardProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export function SupportHealthCard({
  className = "",
  ...props
}: SupportHealthCardProps) {
  const [data, setData] = React.useState<SupportHealthData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchHealth = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await waitForUser();
      const token = await user.getIdToken();

      // Fetch metrics and alerts in parallel
      const [metricsRes, alertsRes] = await Promise.all([
        fetch("/api/admin/messages/metrics?range=24h", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/admin/messages/alerts", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      const metricsData = await metricsRes.json().catch(() => ({}));
      const alertsData = await alertsRes.json().catch(() => ({ alerts: [] }));

      if (!metricsRes.ok)
        throw new Error(metricsData?.error || "Failed to fetch metrics");

      const metrics = metricsData.metrics || {};

      setData({
        openConversations: metrics.openConversations || 0,
        pendingConversations: metrics.pendingConversations || 0,
        resolvedToday: metrics.resolvedConversations || 0,
        unassignedCount: metrics.unassignedCount || 0,
        avgFirstResponseMinutes: metrics.avgFirstResponseMinutes,
        avgResolutionMinutes: metrics.avgResolutionMinutes,
        alerts: alertsData.alerts || [],
      });
    } catch (e: unknown) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Failed to load support health",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchHealth();
    // Refresh every 2 minutes
    const interval = setInterval(fetchHealth, 120000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "—";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const hasAlerts = data?.alerts && data.alerts.length > 0;
  const hasCritical = data?.alerts?.some((a) => a.type === "critical");

  if (loading) {
    return (
      <div
        className={`group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-7 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 ${className}`}
        {...props}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-7 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 ${className}`}
        {...props}
      >
        <div className="flex flex-col items-center justify-center py-8 text-red-500">
          <AlertTriangle className="w-6 h-6 mb-2" />
          <span className="text-sm">{error}</span>
          <button
            onClick={fetchHealth}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border ${
        hasCritical
          ? "border-red-300 dark:border-red-800/50"
          : hasAlerts
            ? "border-amber-300 dark:border-amber-800/50"
            : "border-slate-200/50 dark:border-slate-800/50"
      } rounded-3xl p-7 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${className}`}
      {...props}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 rounded-3xl transition-all duration-500" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              hasCritical
                ? "bg-gradient-to-br from-red-500 to-orange-500"
                : hasAlerts
                  ? "bg-gradient-to-br from-amber-500 to-orange-500"
                  : "bg-gradient-to-br from-blue-500 to-cyan-500"
            } text-white shadow-lg`}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Support Health
              {hasCritical && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last 24 hours
            </p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw
            className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Alerts Banner */}
      {hasAlerts && (
        <div
          className={`relative mb-5 p-3 rounded-xl ${
            hasCritical
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
              : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50"
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                hasCritical
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            />
            <div className="flex-1 min-w-0">
              {data?.alerts.map((alert, i) => (
                <p
                  key={i}
                  className={`text-sm font-medium ${
                    alert.type === "critical"
                      ? "text-red-700 dark:text-red-300"
                      : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {alert.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="relative grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Open
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {data?.openConversations || 0}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Resolved
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {data?.resolvedToday || 0}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Avg Response
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatDuration(data?.avgFirstResponseMinutes ?? null)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Avg Resolution
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatDuration(data?.avgResolutionMinutes ?? null)}
          </p>
        </div>
      </div>

      {/* Unassigned Badge */}
      {data && data.unassignedCount > 0 && (
        <div className="relative flex items-center justify-between p-3 mb-5 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              {data.unassignedCount} unassigned conversation
              {data.unassignedCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Link to Full Metrics */}
      <Link
        href="/admin/messages"
        className="relative group/link flex items-center justify-between px-5 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          View Full Metrics
        </span>
        <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

export default SupportHealthCard;
