"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, waitForUser } from "@/lib/firebase";
import {
  ArrowLeft,
  Send,
  User,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Car,
  Headphones,
  MoreVertical,
  X,
  StickyNote,
  UserPlus,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";
import type {
  AdminConversationDetailResponse,
  ConversationStatus,
  ConversationPriority,
  MessageSenderRole,
} from "@/types/messaging";

interface Agent {
  id: string;
  email: string;
  name?: string;
  openCount: number;
  pendingCount: number;
  totalAssigned: number;
}

const statusConfig: Record<
  ConversationStatus,
  { bg: string; text: string; dot: string }
> = {
  open: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  pending: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  resolved: {
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  closed: {
    bg: "bg-slate-500/10 border-slate-500/30",
    text: "text-slate-500 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

const priorityOptions: {
  value: ConversationPriority;
  label: string;
  color: string;
}[] = [
  { value: "low", label: "Low", color: "text-slate-500" },
  { value: "normal", label: "Normal", color: "text-blue-500" },
  { value: "high", label: "High", color: "text-orange-500" },
  { value: "urgent", label: "Urgent", color: "text-red-500" },
];

const statusOptions: { value: ConversationStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = React.useState<string>("");

  const [data, setData] =
    React.useState<AdminConversationDetailResponse | null>(null);
  const [placementRequests, setPlacementRequests] = React.useState<{
    interviewRequest: any | null;
    hireRequest: any | null;
  } | null>(null);
  const [placementRequestsLoading, setPlacementRequestsLoading] =
    React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [messageText, setMessageText] = React.useState("");
  const [isInternalNote, setIsInternalNote] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = React.useState(false);
  const [joining, setJoining] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const isPlacementConversation =
    data?.conversation?.context?.source === "placement_portfolio";

  React.useEffect(() => {
    if (isPlacementConversation) {
      setIsInternalNote(true);
    }
  }, [isPlacementConversation]);

  const fetchConversation = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (!conversationId) return;
      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);
        const user = await waitForUser();
        const token = await user.getIdToken();

        const res = await fetch(`/api/admin/messages/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(json?.error || "Failed to fetch conversation");

        setData(json);
      } catch (e: unknown) {
        console.error(e);
        setError(
          e instanceof Error ? e.message : "Failed to load conversation",
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [conversationId],
  );

  const fetchPlacementRequests = React.useCallback(async () => {
    if (!conversationId) return;

    try {
      setPlacementRequestsLoading(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch(
        `/api/admin/placement/requests?conversationId=${encodeURIComponent(conversationId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to fetch placement requests");

      setPlacementRequests({
        interviewRequest: json?.interviewRequest || null,
        hireRequest: json?.hireRequest || null,
      });
    } catch (e) {
      console.error(e);
      setPlacementRequests(null);
    } finally {
      setPlacementRequestsLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchConversation();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchConversation]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  // Auto-refresh every 15 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchConversation({ silent: true });
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchConversation]);

  React.useEffect(() => {
    const source = data?.conversation?.context?.source;
    if (source === "placement_portfolio") {
      fetchPlacementRequests();
    } else {
      setPlacementRequests(null);
    }
  }, [data?.conversation?.context?.source, fetchPlacementRequests]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/messages/${conversationId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: messageText.trim(),
          internalNote: isPlacementConversation ? true : isInternalNote,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to send message");

      setMessageText("");
      setIsInternalNote(isPlacementConversation ? true : false);
      await fetchConversation({ silent: true });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateConversation = async (updates: {
    status?: ConversationStatus;
    priority?: ConversationPriority;
  }) => {
    try {
      setUpdating(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/messages/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to update conversation");

      await fetchConversation({ silent: true });
      setShowActions(false);
    } catch (e: unknown) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Failed to update conversation",
      );
    } finally {
      setUpdating(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setAgentsLoading(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch("/api/admin/messages/agents", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to fetch agents");

      setAgents(json.agents || []);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setAgentsLoading(false);
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    try {
      setUpdating(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/messages/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignedAgentId: agentId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to assign agent");

      await fetchConversation({ silent: true });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to assign agent");
    } finally {
      setUpdating(false);
    }
  };

  const handleJoinAsSupport = async () => {
    try {
      setJoining(true);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/messages/${conversationId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to join conversation");

      await fetchConversation({ silent: true });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to join conversation");
    } finally {
      setJoining(false);
    }
  };

  // Fetch agents when actions menu opens
  React.useEffect(() => {
    if (showActions && agents.length === 0) {
      fetchAgents();
    }
  }, [showActions]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    if (!data?.messages) return [];
    const groups: { date: string; messages: typeof data.messages }[] = [];
    let currentDate = "";

    data.messages.forEach((msg) => {
      const msgDate = formatDate(msg.createdAt);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [data?.messages]);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] rounded-2xl overflow-hidden bg-gradient-to-b from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/40">
        {/* Header skeleton */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/40">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Messages skeleton */}
        <div className="flex-1 p-6 space-y-4">
          <div className="flex justify-start">
            <div className="w-48 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
          <div className="flex justify-end">
            <div className="w-56 h-12 rounded-2xl bg-blue-200 dark:bg-blue-900/40 animate-pulse" />
          </div>
          <div className="flex justify-start">
            <div className="w-40 h-10 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>
        {/* Input skeleton */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/40">
          <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] rounded-2xl bg-gradient-to-b from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/40">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => router.push("/admin/messages")}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 transition-all"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  const conversation = data?.conversation;
  const messages = data?.messages || [];
  const participant =
    conversation?.participants.find((p) => p.id !== "support") ||
    conversation?.participants[0];

  const displayName =
    participant?.name && participant.name !== "Unknown"
      ? participant.name
      : participant?.email || "Unknown User";

  const currentStatus = conversation ? statusConfig[conversation.status] : null;

  return (
    <div className="flex flex-col min-h-screen rounded-2xl overflow-hidden bg-gradient-to-b from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/40 shadow-xl">
      {/* Header */}
      <div className="relative z-20 flex-shrink-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/40">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/messages")}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {participant?.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant?.name || "User"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    participant?.name?.charAt(0).toUpperCase() || (
                      <User className="w-6 h-6" />
                    )
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium capitalize">
                    {participant?.role || "customer"}
                  </span>
                  {participant?.email && (
                    <span className="text-xs truncate max-w-[180px]">
                      {participant.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge - More prominent */}
            {conversation && currentStatus && (
              <button
                onClick={() => setShowActions(!showActions)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all hover:shadow-md ${currentStatus.bg} ${currentStatus.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatus.dot}`} />
                {conversation.status.charAt(0).toUpperCase() +
                  conversation.status.slice(1)}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showActions ? "rotate-180" : ""}`}
                />
              </button>
            )}

            {/* Actions Menu */}
            <div className="relative z-50">
              <button
                onClick={() => setShowActions(!showActions)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>

              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowActions(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 shadow-2xl z-50">
                    <div className="space-y-3">
                      {/* Status */}
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Status
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {statusOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                handleUpdateConversation({ status: opt.value })
                              }
                              disabled={
                                updating || conversation?.status === opt.value
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                conversation?.status === opt.value
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Priority
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {priorityOptions.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() =>
                                handleUpdateConversation({
                                  priority: opt.value,
                                })
                              }
                              disabled={
                                updating || conversation?.priority === opt.value
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                conversation?.priority === opt.value
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Agent Assignment */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          <Users className="w-3 h-3 inline mr-1" />
                          Assign To
                        </label>
                        {agentsLoading ? (
                          <div className="text-xs text-slate-500">
                            Loading agents...
                          </div>
                        ) : (
                          <Select
                            value={
                              conversation?.assignedAgentId || "unassigned"
                            }
                            onValueChange={(v) =>
                              handleAssignAgent(v === "unassigned" ? null : v)
                            }
                            disabled={updating}
                          >
                            <SelectTrigger className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:ring-blue-500/50 shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                Unassigned
                              </SelectItem>
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name || agent.email} ({agent.openCount}{" "}
                                  open)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Join as Support (for trip conversations) */}
                      {conversation?.type === "trip" &&
                        !data?.conversation.participants.some(
                          (p) => p.id === "support",
                        ) && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                              onClick={handleJoinAsSupport}
                              disabled={joining}
                              className="w-full flex items-center justify-center gap-2 h-8 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-medium hover:shadow-lg transition-all disabled:opacity-50"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              {joining ? "Joining..." : "Join as Support"}
                            </button>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                              This will add you to this conversation
                            </p>
                          </div>
                        )}

                      {conversation?.context?.source ===
                        "placement_portfolio" && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                            Placement
                          </label>
                          {placementRequestsLoading ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Loading placement request data...
                            </div>
                          ) : placementRequests?.interviewRequest ||
                            placementRequests?.hireRequest ? (
                            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                              {placementRequests?.interviewRequest && (
                                <p>
                                  Interview:{" "}
                                  {String(
                                    placementRequests.interviewRequest.status ||
                                      "",
                                  ).replace(/_/g, " ")}
                                  {placementRequests.interviewRequest
                                    .interviewType
                                    ? ` • ${String(placementRequests.interviewRequest.interviewType).replace(/_/g, " ")}`
                                    : ""}
                                </p>
                              )}
                              {placementRequests?.hireRequest && (
                                <p>
                                  Hire:{" "}
                                  {String(
                                    placementRequests.hireRequest.status || "",
                                  ).replace(/_/g, " ")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              No placement requests found for this conversation.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Context Info */}
                      {conversation?.context && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                            Context
                          </label>
                          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            {conversation.context.reservationId && (
                              <p>
                                Reservation: #
                                {conversation.context.reservationId.slice(0, 8)}
                              </p>
                            )}
                            {conversation.context.source && (
                              <p>
                                Source:{" "}
                                {conversation.context.source.replace(/_/g, " ")}
                              </p>
                            )}
                            {conversation.context.channel && (
                              <p>
                                Channel:{" "}
                                {conversation.context.channel.replace(
                                  /_/g,
                                  " ",
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/80 to-slate-100/50 dark:from-slate-950/80 dark:to-slate-900/50">
        <div className="flex min-h-full flex-col justify-end px-6 pt-4 pb-3 space-y-6">
          {groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* Date separator */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                <span className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-sm">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((msg) => {
                  const isSupport = msg.senderId === "support";
                  const isInternal = msg.meta?.internalNote === true;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSupport ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                          isInternal
                            ? "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/20 border-2 border-dashed border-amber-300 dark:border-amber-700/50"
                            : isSupport
                              ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        } ${isSupport && !isInternal ? "rounded-br-md" : ""} ${
                          !isSupport && !isInternal ? "rounded-bl-md" : ""
                        }`}
                      >
                        {isInternal && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold mb-2">
                            <StickyNote className="w-3.5 h-3.5" />
                            Internal Note
                          </div>
                        )}
                        <p
                          className={`text-[15px] leading-relaxed ${
                            isInternal
                              ? "text-amber-800 dark:text-amber-200"
                              : isSupport
                                ? "text-white"
                                : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {msg.content}
                        </p>
                        <p
                          className={`text-xs mt-2 flex items-center gap-1.5 ${
                            isInternal
                              ? "text-amber-600/70 dark:text-amber-400/70"
                              : isSupport
                                ? "text-blue-200"
                                : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {formatTime(msg.createdAt)}
                          {isSupport && !isInternal && (
                            <span className="ml-1 font-medium">• You</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-slate-400/20 blur-2xl rounded-full" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No messages yet
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Start the conversation by sending a message
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/40">
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Internal Note Toggle - more prominent */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsInternalNote(!isInternalNote)}
              disabled={isPlacementConversation}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isInternalNote
                  ? "bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20 text-amber-700 dark:text-amber-300 border-2 border-amber-300 dark:border-amber-700/50 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <StickyNote className="w-4 h-4" />
              Internal Note
            </button>
            {(isInternalNote || isPlacementConversation) && (
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-lg">
                {isPlacementConversation
                  ? "Placement conversations are view-only"
                  : "Only visible to support agents"}
              </span>
            )}
          </div>

          {/* Message Input */}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={
                  isPlacementConversation
                    ? "Add an internal note..."
                    : isInternalNote
                      ? "Add an internal note..."
                      : "Type your reply..."
                }
                rows={2}
                className={`w-full px-5 py-4 rounded-2xl border-2 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none transition-all ${
                  isInternalNote
                    ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 focus:border-amber-400 dark:focus:border-amber-600"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!messageText.trim() || sending}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                isInternalNote || isPlacementConversation
                  ? "bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25"
                  : "bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-500/25"
              }`}
            >
              <Send
                className={`w-6 h-6 text-white ${sending ? "animate-pulse" : ""}`}
              />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
