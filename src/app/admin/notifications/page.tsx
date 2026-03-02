"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Car,
  RefreshCw,
  Filter,
  ChevronDown,
  Activity,
  Loader2,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

interface NotificationLog {
  id: string;
  type: string;
  targetType: "customer" | "driver" | "admin" | "partner";
  targetId: string;
  status: "sent" | "failed" | "skipped" | "no_tokens";
  sentCount: number;
  failedCount: number;
  skippedByPrefs: boolean;
  payload: { title: string; body: string };
  metadata?: Record<string, string>;
  error?: string | null;
  createdAt: string | null;
}

interface HealthMetrics {
  totalTokens: { customers: number; drivers: number };
  last24h: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    noTokens: number;
    successRate: number;
  };
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  issues: string[];
}

const STATUS_CONFIG = {
  sent: {
    label: "Sent",
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  skipped: {
    label: "Skipped",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  no_tokens: {
    label: "No Tokens",
    icon: Clock,
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
  },
};

const HEALTH_STATUS_CONFIG = {
  healthy: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: CheckCircle,
  },
  degraded: {
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: AlertTriangle,
  },
  unhealthy: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    icon: XCircle,
  },
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Filters
  const [targetType, setTargetType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Wait for auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(!!user);
    });
    return () => unsubscribe();
  }, []);

  const fetchHealth = useCallback(async () => {
    if (!authReady) return;
    setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/health");
      if (!res.ok) throw new Error("Failed to fetch health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error("Failed to fetch health:", err);
    } finally {
      setHealthLoading(false);
    }
  }, [authReady]);

  const fetchNotifications = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetType) params.set("targetType", targetType);
      if (status) params.set("status", status);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [authReady, targetType, status]);

  useEffect(() => {
    fetchHealth();
    fetchNotifications();
  }, [fetchHealth, fetchNotifications]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return date.toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRefresh = () => {
    fetchHealth();
    fetchNotifications();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Bell className="h-6 w-6 text-white" />
              </div>
              Notifications
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Monitor push notification delivery and system health
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || healthLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || healthLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Health Card */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              System Health
            </h2>
            {health && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${HEALTH_STATUS_CONFIG[health.status].bg}`}
              >
                {React.createElement(HEALTH_STATUS_CONFIG[health.status].icon, {
                  className: `h-4 w-4 ${HEALTH_STATUS_CONFIG[health.status].color}`,
                })}
                <span
                  className={`text-sm font-medium capitalize ${HEALTH_STATUS_CONFIG[health.status].color}`}
                >
                  {health.status}
                </span>
              </div>
            )}
          </div>

          {healthLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : health ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {health.message}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Customer Tokens</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {health.totalTokens.customers.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                    <Car className="h-4 w-4" />
                    <span className="text-xs">Driver Tokens</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {health.totalTokens.drivers.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                    <Bell className="h-4 w-4" />
                    <span className="text-xs">24h Sent</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {health.last24h.sent.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs">Success Rate</span>
                  </div>
                  <p
                    className={`text-xl font-bold ${health.last24h.successRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : health.last24h.successRate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {health.last24h.successRate}%
                  </p>
                </div>
              </div>

              {/* 24h Breakdown */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  Sent: {health.last24h.sent}
                </span>
                <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  Failed: {health.last24h.failed}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  Skipped: {health.last24h.skipped}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  No Tokens: {health.last24h.noTokens}
                </span>
              </div>

              {/* Issues */}
              {health.issues.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                    Issues Detected
                  </h4>
                  <ul className="space-y-1">
                    {health.issues.map((issue, i) => (
                      <li
                        key={i}
                        className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Unable to load health metrics
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-lg p-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <Filter className="h-4 w-4" />
            Filters
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>

          {showFilters && (
            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Target Type
                </label>
                <Select
                  value={targetType || "all"}
                  onValueChange={(v) => setTargetType(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm shadow-none">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Status
                </label>
                <Select
                  value={status || "all"}
                  onValueChange={(v) => setStatus(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm shadow-none">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                    <SelectItem value="no_tokens">No Tokens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Table */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent Notifications
            </h2>
            <p className="text-sm text-slate-500">
              Last 100 notification attempts
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 dark:text-red-400">
              <XCircle className="h-8 w-8 mx-auto mb-2" />
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No notifications found</p>
              <p className="text-sm mt-1">
                Notifications will appear here when sent
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {notifications.map((n) => {
                    const statusConfig =
                      STATUS_CONFIG[n.status] || STATUS_CONFIG.sent;
                    return (
                      <tr
                        key={n.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {n.type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {n.targetType === "customer" ? (
                              <Users className="h-4 w-4 text-blue-600" />
                            ) : n.targetType === "driver" ? (
                              <Car className="h-4 w-4 text-cyan-600" />
                            ) : n.targetType === "admin" ? (
                              <Activity className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Users className="h-4 w-4 text-violet-600" />
                            )}
                            <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                              {n.targetType}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            {n.targetId.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg}`}
                          >
                            {React.createElement(statusConfig.icon, {
                              className: `h-3.5 w-3.5 ${statusConfig.color}`,
                            })}
                            <span
                              className={`text-xs font-medium ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                          </div>
                          {n.sentCount > 0 && (
                            <span className="ml-2 text-xs text-slate-500">
                              ({n.sentCount} sent)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {n.payload.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {n.payload.body}
                          </p>
                          {n.error && (
                            <p className="text-xs text-red-500 mt-1 truncate">
                              Error: {n.error}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatTime(n.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
