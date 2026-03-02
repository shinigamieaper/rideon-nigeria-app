"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, waitForUser } from "@/lib/firebase";
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Car,
  Headphones,
  ChevronRight,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SupportMetrics,
} from "@/components";
import type {
  AdminConversationListItem,
  ConversationType,
  ConversationStatus,
  ConversationPriority,
} from "@/types/messaging";

const statusConfig: Record<
  ConversationStatus,
  { bg: string; text: string; icon: React.ElementType; label: string }
> = {
  open: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: Clock,
    label: "Open",
  },
  pending: {
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: Clock,
    label: "Pending",
  },
  resolved: {
    bg: "bg-blue-500/10 border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    icon: CheckCircle2,
    label: "Resolved",
  },
  closed: {
    bg: "bg-slate-500/10 border-slate-500/20",
    text: "text-slate-500 dark:text-slate-400",
    icon: CheckCircle2,
    label: "Closed",
  },
};

const priorityConfig: Record<
  ConversationPriority,
  { dot: string; label: string }
> = {
  low: { dot: "bg-slate-400", label: "Low" },
  normal: { dot: "bg-blue-500", label: "Normal" },
  high: { dot: "bg-orange-500", label: "High" },
  urgent: { dot: "bg-red-500 animate-pulse", label: "Urgent" },
};

const typeIcons: Record<ConversationType, React.ElementType> = {
  support: Headphones,
  trip: Car,
  general: MessageSquare,
  system: AlertCircle,
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = React.useState<
    AdminConversationListItem[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = React.useState<string>(
    searchParams.get("type") || "all",
  );
  const [statusFilter, setStatusFilter] = React.useState<string>(
    searchParams.get("status") || "all",
  );
  const [priorityFilter, setPriorityFilter] = React.useState<string>(
    searchParams.get("priority") || "all",
  );
  const [assignedFilter, setAssignedFilter] = React.useState<string>(
    searchParams.get("assignedTo") || "all",
  );
  const [searchQuery, setSearchQuery] = React.useState<string>(
    searchParams.get("q") || "",
  );
  const [showMetrics, setShowMetrics] = React.useState(false);

  const fetchConversations = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (assignedFilter !== "all") params.set("assignedTo", assignedFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/admin/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to fetch messages");

      setConversations(data.conversations || []);
      setTotal(data.total || 0);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, priorityFilter, assignedFilter, searchQuery]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchConversations();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchConversations]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleConversationClick = (id: string) => {
    router.push(`/admin/messages/${id}`);
  };

  // Skeleton loader
  const Skeleton = (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = (
    <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-gradient-to-b from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/40 shadow-xl">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
        No Conversations
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-sm px-4">
        {searchQuery || typeFilter !== "all" || statusFilter !== "all"
          ? "No conversations match your filters. Try adjusting your search criteria."
          : "Support conversations will appear here when customers or drivers reach out."}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div
          data-tour="admin-messages-header"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Messages
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Support inbox and conversation monitoring
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                showMetrics
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                  : "bg-white/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Metrics
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showMetrics ? "rotate-180" : ""}`}
              />
            </button>
            <button
              onClick={fetchConversations}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Metrics Dashboard (Collapsible) */}
        {showMetrics && (
          <div className="animate-in slide-in-from-top-4 duration-300">
            <SupportMetrics />
          </div>
        )}

        {/* Filters */}
        <div
          data-tour="admin-messages-filters"
          className="p-5 rounded-2xl bg-gradient-to-b from-white/70 to-white/50 dark:from-slate-900/70 dark:to-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/40 shadow-xl"
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, message, or email..."
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                onKeyDown={(e) => e.key === "Enter" && fetchConversations()}
              />
            </div>

            {/* Filter Dropdowns - styled consistently */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="relative w-full sm:w-[170px]">
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v)}
                >
                  <SelectTrigger className="h-12 pl-4 pr-10 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-blue-500/40 transition-all">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="support">🎧 Support</SelectItem>
                    <SelectItem value="trip">🚗 Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-[170px]">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v)}
                >
                  <SelectTrigger className="h-12 pl-4 pr-10 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-blue-500/40 transition-all">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">● Open</SelectItem>
                    <SelectItem value="pending">● Pending</SelectItem>
                    <SelectItem value="resolved">● Resolved</SelectItem>
                    <SelectItem value="closed">● Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="relative w-full sm:w-[170px]">
                <Select
                  value={priorityFilter}
                  onValueChange={(v) => setPriorityFilter(v)}
                >
                  <SelectTrigger className="h-12 pl-4 pr-10 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-blue-500/40 transition-all">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="normal">🔵 Normal</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Filter */}
              <div className="relative w-full sm:w-[190px]">
                <Select
                  value={assignedFilter}
                  onValueChange={(v) => setAssignedFilter(v)}
                >
                  <SelectTrigger className="h-12 pl-4 pr-10 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-blue-500/40 transition-all">
                    <SelectValue placeholder="All Agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    <SelectItem value="me">Assigned to Me</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Apply Filter Button */}
              <button
                onClick={fetchConversations}
                className="w-full sm:w-auto justify-center h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Apply
              </button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {loading
                ? "Searching..."
                : `${total} conversation${total !== 1 ? "s" : ""}`}
            </span>
            {(searchQuery ||
              typeFilter !== "all" ||
              statusFilter !== "all" ||
              priorityFilter !== "all" ||
              assignedFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setAssignedFilter("all");
                }}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Conversation List */}
        {loading ? (
          Skeleton
        ) : conversations.length === 0 ? (
          EmptyState
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const TypeIcon = typeIcons[conv.type] || MessageSquare;
              const participant =
                conv.participants.find((p) => p.id !== "support") ||
                conv.participants[0];
              const status = statusConfig[conv.status];
              const StatusIcon = status.icon;
              const priority = priorityConfig[conv.priority];
              const hasUnread = conv.unreadCount > 0;

              return (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className={`w-full text-left group relative overflow-hidden ${
                    hasUnread
                      ? "bg-gradient-to-r from-blue-500/5 via-white/80 to-white/60 dark:from-blue-500/10 dark:via-slate-900/80 dark:to-slate-900/60"
                      : "bg-white/60 dark:bg-slate-900/60"
                  } backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/40 hover:border-blue-500/30 dark:hover:border-blue-500/30 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300`}
                >
                  {/* Unread indicator bar */}
                  {hasUnread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-l-2xl" />
                  )}

                  <div className="flex items-center gap-4 p-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                          hasUnread
                            ? "bg-gradient-to-br from-blue-500 to-cyan-500 ring-2 ring-blue-500/30 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                            : "bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700"
                        }`}
                      >
                        {participant?.avatarUrl ? (
                          <img
                            src={participant.avatarUrl}
                            alt={participant?.name || "User"}
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          participant?.name?.charAt(0).toUpperCase() || (
                            <User className="w-7 h-7" />
                          )
                        )}
                      </div>
                      {/* Type badge */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
                          conv.type === "support"
                            ? "bg-purple-500 text-white"
                            : conv.type === "trip"
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        <TypeIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`font-semibold truncate ${
                              hasUnread
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {participant?.name || "Unknown User"}
                          </span>
                          {participant?.role && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              {participant.role}
                            </span>
                          )}
                          {hasUnread && (
                            <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-500/30">
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      {/* Last message */}
                      <p
                        className={`text-sm truncate mb-2.5 ${
                          hasUnread
                            ? "text-slate-700 dark:text-slate-300 font-medium"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {conv.lastMessage || "No messages yet"}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${status.bg} ${status.text}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>

                        {/* Priority indicator */}
                        {conv.priority !== "normal" && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <span
                              className={`w-2 h-2 rounded-full ${priority.dot}`}
                            />
                            {priority.label}
                          </span>
                        )}

                        {/* Reservation ID */}
                        {conv.context?.reservationId && (
                          <span className="px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-[11px] font-mono font-semibold text-violet-600 dark:text-violet-400">
                            #{conv.context.reservationId.slice(0, 8)}
                          </span>
                        )}

                        {/* Tags */}
                        {conv.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {conv.tags && conv.tags.length > 2 && (
                          <span className="text-xs text-slate-400">
                            +{conv.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white text-slate-400 transition-all duration-300">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
