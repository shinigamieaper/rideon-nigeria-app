"use client";

import * as React from "react";
import { waitForUser } from "@/lib/firebase";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Tag,
  Headphones,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

interface SupportMetrics {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  closedConversations: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  byPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  byType: {
    support: number;
    trip: number;
    general: number;
    system: number;
  };
  bySource: Record<string, number>;
  byTag: Record<string, number>;
  agentWorkload: {
    agentId: string;
    agentEmail?: string;
    openCount: number;
    pendingCount: number;
    totalAssigned: number;
  }[];
  unassignedCount: number;
  timeRange: string;
}

export interface SupportMetricsProps
  extends React.ComponentPropsWithoutRef<"div"> {
  defaultRange?: "24h" | "7d" | "30d" | "all";
}

const rangeLabels: Record<string, string> = {
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  all: "All Time",
};

export function SupportMetrics({
  defaultRange = "7d",
  className = "",
  ...props
}: SupportMetricsProps) {
  const [metrics, setMetrics] = React.useState<SupportMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState(defaultRange);

  const fetchMetrics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/messages/metrics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to fetch metrics");

      setMetrics(data.metrics);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [range]);

  React.useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "—";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  if (loading) {
    return (
      <div
        className={`rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 ${className}`}
        {...props}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 ${className}`}
        {...props}
      >
        <div className="flex items-center justify-center py-12 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`space-y-6 ${className}`} {...props}>
      {/* Header with Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Support Metrics
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {rangeLabels[range]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-[140px]">
            <Select
              value={range}
              onValueChange={(v) => setRange(v as typeof range)}
            >
              <SelectTrigger className="h-9 px-3 rounded-lg border border-slate-200/70 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 text-sm text-slate-900 dark:text-slate-100 focus:ring-blue-500/50 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Total"
          value={metrics.totalConversations}
          color="blue"
        />
        <StatCard
          icon={AlertCircle}
          label="Open"
          value={metrics.openConversations}
          color="amber"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={metrics.pendingConversations}
          color="orange"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={metrics.resolvedConversations}
          color="green"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Avg First Response
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatDuration(metrics.avgFirstResponseMinutes)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Time to first support reply
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Avg Resolution Time
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatDuration(metrics.avgResolutionMinutes)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Time to resolve tickets
          </p>
        </div>
      </div>

      {/* Priority & Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Priority */}
        <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            By Priority
          </h4>
          <div className="space-y-2">
            <PriorityBar
              label="Urgent"
              count={metrics.byPriority.urgent}
              total={metrics.totalConversations}
              color="bg-red-500"
            />
            <PriorityBar
              label="High"
              count={metrics.byPriority.high}
              total={metrics.totalConversations}
              color="bg-orange-500"
            />
            <PriorityBar
              label="Normal"
              count={metrics.byPriority.normal}
              total={metrics.totalConversations}
              color="bg-blue-500"
            />
            <PriorityBar
              label="Low"
              count={metrics.byPriority.low}
              total={metrics.totalConversations}
              color="bg-slate-400"
            />
          </div>
        </div>

        {/* Type */}
        <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            By Type
          </h4>
          <div className="space-y-2">
            <PriorityBar
              label="Support"
              count={metrics.byType.support}
              total={metrics.totalConversations}
              color="bg-blue-500"
              icon={Headphones}
            />
            <PriorityBar
              label="Trip"
              count={metrics.byType.trip}
              total={metrics.totalConversations}
              color="bg-cyan-500"
            />
            <PriorityBar
              label="General"
              count={metrics.byType.general}
              total={metrics.totalConversations}
              color="bg-slate-400"
            />
            <PriorityBar
              label="System"
              count={metrics.byType.system}
              total={metrics.totalConversations}
              color="bg-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Agent Workload */}
      {metrics.agentWorkload.length > 0 && (
        <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Agent Workload
            </h4>
            {metrics.unassignedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {metrics.unassignedCount} unassigned
              </span>
            )}
          </div>
          <div className="space-y-3">
            {metrics.agentWorkload.slice(0, 5).map((agent) => (
              <div
                key={agent.agentId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                    {agent.agentEmail?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                    {agent.agentEmail || agent.agentId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-blue-600 dark:text-blue-400">
                    {agent.openCount} open
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {agent.pendingCount} pending
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {agent.totalAssigned} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Tags */}
      {Object.keys(metrics.byTag).length > 0 && (
        <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Top Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.byTag)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([tag, count]) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <span className="text-slate-500 dark:text-slate-400">
                    ({count})
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper components
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "blue" | "amber" | "orange" | "green";
}) {
  const colorClasses = {
    blue: "from-blue-500 to-cyan-500 text-blue-600 dark:text-blue-400",
    amber: "from-amber-500 to-yellow-500 text-amber-600 dark:text-amber-400",
    orange: "from-orange-500 to-red-500 text-orange-600 dark:text-orange-400",
    green: "from-green-500 to-emerald-500 text-green-600 dark:text-green-400",
  };

  return (
    <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60">
      <div
        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color].split(" ")[0]} ${colorClasses[color].split(" ")[1]} flex items-center justify-center text-white mb-3`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function PriorityBar({
  label,
  count,
  total,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon?: React.ElementType;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs text-slate-600 dark:text-slate-400">
        {count} ({percentage}%)
      </span>
    </div>
  );
}

export default SupportMetrics;
