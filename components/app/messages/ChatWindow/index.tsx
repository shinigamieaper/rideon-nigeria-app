"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, waitForUser } from "@/lib/firebase";
import {
  doc,
  collection,
  onSnapshot,
  orderBy,
  query,
  limit as fbLimit,
} from "firebase/firestore";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  MoreVertical,
  Phone,
  Briefcase,
  UserRound,
} from "lucide-react";
import StickyBanner from "@/components/ui/StickyBanner";
import ActionModal from "@/components/ui/ActionModal";

const USER_WAIT_TIMEOUT_MS = 15_000;
const AUTH_TIMEOUT_MS = 8_000;
const API_TIMEOUT_MS = 12_000;
const API_TIMEOUT_MS_SEND = 15_000;

function isTransientNetworkError(err: unknown) {
  const name =
    typeof (err as any)?.name === "string" ? String((err as any).name) : "";
  const msg =
    typeof (err as any)?.message === "string"
      ? String((err as any).message)
      : "";
  const m = msg.toLowerCase();
  return (
    name === "TimeoutError" ||
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("networkerror") ||
    m.includes("failed to fetch")
  );
}

function isTransientNetworkMessage(msg: string) {
  const m = String(msg || "").toLowerCase();
  return (
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("failed to fetch") ||
    m.includes("networkerror")
  );
}

function normalizeErrorMessage(err: unknown, fallback: string) {
  const name =
    typeof (err as any)?.name === "string" ? String((err as any).name) : "";
  const msg =
    typeof (err as any)?.message === "string"
      ? String((err as any).message)
      : "";
  const m = msg.toLowerCase();
  if (
    name === "TimeoutError" ||
    m.includes("timed out") ||
    m.includes("timeout")
  ) {
    return "Network is slow. Please try again.";
  }
  if (msg === "auth_init_timeout") return "Please sign in to continue.";
  return msg || fallback;
}

async function getIdTokenWithTimeout(
  user: { getIdToken: (forceRefresh?: boolean) => Promise<string> },
  timeoutMs = AUTH_TIMEOUT_MS,
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
  const timeoutMs = init?.timeoutMs ?? API_TIMEOUT_MS;
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
  } finally {
    clearTimeout(t);
  }
}

interface ChatWindowProps extends React.ComponentPropsWithoutRef<"div"> {
  conversationId: string;
  basePath?: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string | null;
  status?: "sending" | "sent" | "delivered" | "error";
}

interface ConversationDetail {
  id: string;
  type: string;
  status?: string;
  context?: any;
  other: { id?: string | null; name?: string; avatarUrl?: string | null };
  messages: Message[];
}

const AVATAR_COLORS = [
  "#00529B",
  "#0f4c81",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#dc2626",
  "#025b4c",
  "#111827",
];
function nameInitials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b || a || "U").toUpperCase();
}
function colorFor(name?: string) {
  const s = (name || "User").toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  basePath = "/app/messages",
  className,
  ...rest
}) => {
  const router = useRouter();
  const [uid, setUid] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [connectionNotice, setConnectionNotice] = React.useState<string | null>(
    null,
  );
  const [conv, setConv] = React.useState<ConversationDetail | null>(null);
  const [useApiFallback, setUseApiFallback] = React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const [showActions, setShowActions] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [placementHasAccess, setPlacementHasAccess] = React.useState<
    boolean | null
  >(null);
  const [placementOtherPhone, setPlacementOtherPhone] = React.useState<
    string | null
  >(null);
  const [hireModalOpen, setHireModalOpen] = React.useState(false);
  const [hireNotes, setHireNotes] = React.useState("");
  const [submittingHire, setSubmittingHire] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const noticeTimerRef = React.useRef<number | null>(null);

  const showConnectionNotice = React.useCallback((msg: string) => {
    try {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    } catch {}
    setConnectionNotice(msg);
    noticeTimerRef.current = window.setTimeout(() => {
      setConnectionNotice(null);
      noticeTimerRef.current = null;
    }, 4500);
  }, []);

  React.useEffect(() => {
    return () => {
      try {
        if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      } catch {}
    };
  }, []);

  const isPlacement = conv?.context?.source === "placement_portfolio";
  const placementDriverId = React.useMemo(() => {
    if (!isPlacement) return null;
    const fromContext =
      typeof conv?.context?.driverId === "string"
        ? String(conv.context.driverId).trim()
        : "";
    if (fromContext) return fromContext;
    const fromOther =
      typeof conv?.other?.id === "string" ? String(conv.other.id).trim() : "";
    return fromOther || null;
  }, [isPlacement, conv?.context?.driverId, conv?.other?.id]);

  const placementHireStatus =
    typeof conv?.context?.placementHireStatus === "string"
      ? String(conv.context.placementHireStatus)
      : "";
  const placementHireAlreadyRequested =
    placementHireStatus === "requested" || placementHireStatus === "accepted";

  const placementAccepted =
    conv?.context?.placementContactStatus === "accepted" ||
    conv?.context?.placementHireStatus === "accepted";

  const placementSendEnabled = Boolean(
    isPlacement && placementAccepted && placementHasAccess !== false,
  );

  const placementSendDisabledReason = React.useMemo(() => {
    if (!isPlacement) return null;
    if (placementHasAccess === false)
      return "Your access has expired. Renew access to send messages.";
    if (!placementAccepted)
      return "Waiting for the driver to accept your request.";
    return null;
  }, [isPlacement, placementAccepted, placementHasAccess]);

  const toIsoOrNull = React.useCallback((raw: any): string | null => {
    if (!raw) return null;
    if (typeof raw === "string") return raw;
    if (raw?.toDate) {
      try {
        return raw.toDate().toISOString();
      } catch {
        return null;
      }
    }
    if (raw instanceof Date) {
      try {
        return raw.toISOString();
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const fetchAndMarkRead = React.useCallback(async () => {
    setError(null);
    try {
      const user = await waitForUser(USER_WAIT_TIMEOUT_MS);
      const token = await getIdTokenWithTimeout(user, AUTH_TIMEOUT_MS);
      const res = await fetchWithTimeout(
        `/api/messages/${encodeURIComponent(conversationId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: API_TIMEOUT_MS,
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to fetch conversation");
      // Use server response to initialize header metadata and optimistic messages until listeners attach
      setConv(j);
    } catch (e: any) {
      console.error(e);
      if (isTransientNetworkError(e)) {
        setError(null);
        showConnectionNotice("Reconnecting…");
        return;
      }
      setError(normalizeErrorMessage(e, "Failed to load conversation."));
    }
  }, [conversationId, showConnectionNotice]);

  const fetchPlacementAccess = React.useCallback(async () => {
    try {
      const user = await waitForUser(USER_WAIT_TIMEOUT_MS);
      const token = await getIdTokenWithTimeout(user, AUTH_TIMEOUT_MS);
      const res = await fetchWithTimeout(
        "/api/customer/placement/access-status",
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: API_TIMEOUT_MS,
        },
      );
      const j = await res.json().catch(() => ({}) as any);
      if (!res.ok) throw new Error(j?.error || "Failed to load access status");
      if (j?.unknown === true) {
        setPlacementHasAccess(null);
        return;
      }
      setPlacementHasAccess(Boolean(j?.hasAccess));
    } catch {
      setPlacementHasAccess(null);
    }
  }, []);

  const fetchPlacementOtherPhone = React.useCallback(async () => {
    try {
      const driverId =
        typeof conv?.context?.driverId === "string"
          ? conv.context.driverId
          : "";
      if (!driverId) {
        setPlacementOtherPhone(null);
        return;
      }
      const user = await waitForUser(USER_WAIT_TIMEOUT_MS);
      const token = await getIdTokenWithTimeout(user, AUTH_TIMEOUT_MS);
      const res = await fetchWithTimeout(
        `/api/customer/placement/drivers/${encodeURIComponent(driverId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: API_TIMEOUT_MS,
        },
      );
      const j = await res.json().catch(() => ({}) as any);
      if (!res.ok) throw new Error(j?.error || "Failed to fetch driver");
      const phone =
        typeof j?.driver?.phoneNumber === "string"
          ? String(j.driver.phoneNumber).trim()
          : "";
      setPlacementOtherPhone(phone || null);
    } catch {
      setPlacementOtherPhone(null);
    }
  }, [conv?.context?.driverId]);

  React.useEffect(() => {
    let unsubConv: undefined | (() => void);
    let unsubMsgs: undefined | (() => void);
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        // Keep last-known state; avoid redirect on transient null
        setUid(null);
        setLoading(false);
      } else {
        setUid(u.uid);
        // Mark as read + seed initial metadata
        fetchAndMarkRead().finally(() => setLoading(false));

        // Attach Firestore listeners for live updates (reads only)
        const convRef = doc(db, "conversations", conversationId);
        const msgsQuery = query(
          collection(db, "conversations", conversationId, "messages"),
          orderBy("createdAt", "asc"),
          fbLimit(200),
        );

        unsubConv = onSnapshot(
          convRef,
          (snap) => {
            if (!snap.exists()) return;
            const data = snap.data() as any;
            const members: string[] = Array.isArray(data.memberIds)
              ? data.memberIds
              : [];
            const otherId = members.find((m) => m !== u.uid) || null;
            const profiles = (data.participantProfiles || {}) as Record<
              string,
              { name?: string; avatarUrl?: string | null }
            >;
            const other = otherId
              ? profiles[otherId] || { name: "Conversation", avatarUrl: null }
              : { name: "RideOn Support", avatarUrl: null };
            setConv((prev) => ({
              id: snap.id,
              type: data.type || "direct",
              status: data.status || "open",
              context: data.context || undefined,
              other: {
                id: otherId,
                name: other?.name || "Conversation",
                avatarUrl: other?.avatarUrl || null,
              },
              messages: prev?.messages || [],
            }));
          },
          (err) => {
            console.error("onSnapshot conv error", err);
            setError("Failed to subscribe to conversation updates.");
            setUseApiFallback(true);
          },
        );

        unsubMsgs = onSnapshot(
          msgsQuery,
          (snap) => {
            const msgs: Message[] = snap.docs
              .map((d) => {
                const m = d.data() as any;

                // Hide internal notes from customer-facing chat
                if (m?.meta?.internalNote) {
                  return null;
                }

                return {
                  id: d.id,
                  senderId: m.senderId,
                  content: typeof m.content === "string" ? m.content : "",
                  createdAt: toIsoOrNull(m.createdAt),
                  status: m.status || "sent",
                } as Message;
              })
              .filter((m): m is Message => m !== null);
            setConv((prev) => (prev ? { ...prev, messages: msgs } : prev));
          },
          (err) => {
            console.error("onSnapshot messages error", err);
            setError("Failed to subscribe to messages.");
            setUseApiFallback(true);
          },
        );
      }
    });
    return () => {
      unsubConv?.();
      unsubMsgs?.();
      unsubAuth();
    };
  }, [conversationId, router, fetchAndMarkRead, toIsoOrNull]);

  React.useEffect(() => {
    if (!isPlacement) {
      setPlacementHasAccess(null);
      setPlacementOtherPhone(null);
      return;
    }
    fetchPlacementAccess();

    const t = setInterval(() => {
      fetchPlacementAccess();
    }, 60_000);

    return () => clearInterval(t);
  }, [isPlacement, fetchPlacementAccess]);

  React.useEffect(() => {
    if (!isPlacement) return;
    if (!placementAccepted) {
      setPlacementOtherPhone(null);
      return;
    }
    if (placementHasAccess !== true) {
      setPlacementOtherPhone(null);
      return;
    }
    fetchPlacementOtherPhone();
  }, [
    isPlacement,
    placementAccepted,
    placementHasAccess,
    fetchPlacementOtherPhone,
  ]);

  // Removed API polling – live updates handled by onSnapshot

  // Fallback: API polling if Firestore listeners are blocked by rules
  React.useEffect(() => {
    if (!useApiFallback) return;
    let cancelled = false;
    let timer: any;
    async function poll() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await getIdTokenWithTimeout(user, AUTH_TIMEOUT_MS);
        const res = await fetchWithTimeout(
          `/api/messages/${encodeURIComponent(conversationId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            timeoutMs: API_TIMEOUT_MS,
          },
        );
        const j = await res.json().catch(() => ({}));
        if (res.ok && !cancelled) setConv(j);
      } catch (e) {
        // silent
      } finally {
        if (!cancelled) timer = setTimeout(poll, 5000);
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [useApiFallback, conversationId]);

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages?.length]);

  async function handleSend() {
    if (!inputText.trim()) return;
    if (isPlacement && !placementSendEnabled) return;

    try {
      const tempId = `temp-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const content = inputText.trim();
      setConv((prev) => {
        if (!prev) return prev;
        const optimistic: Message = {
          id: tempId,
          senderId: uid || "me",
          content,
          createdAt: nowIso,
          status: "sending",
        };
        return { ...prev, messages: [...prev.messages, optimistic] };
      });
      setInputText("");
      const user = await waitForUser(USER_WAIT_TIMEOUT_MS);
      const token = await getIdTokenWithTimeout(user, AUTH_TIMEOUT_MS);
      const res = await fetchWithTimeout(
        `/api/messages/${encodeURIComponent(conversationId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
          timeoutMs: API_TIMEOUT_MS_SEND,
        },
      );
      const j = await res.json().catch(() => ({}) as any);
      if (!res.ok) {
        const errMsg =
          typeof j?.error === "string" ? j.error : "Failed to send";
        if (
          res.status === 403 &&
          typeof errMsg === "string" &&
          errMsg.toLowerCase().includes("access has expired")
        ) {
          setPlacementHasAccess(false);
        }
        throw new Error(errMsg);
      }
      const serverId = j?.id;
      setConv((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === tempId
              ? { ...m, id: serverId || m.id, status: "sent" }
              : m,
          ),
        };
      });
    } catch (e: any) {
      console.error(e);
      if (isTransientNetworkError(e)) {
        setError(null);
        showConnectionNotice("Reconnecting…");
      } else {
        setError(normalizeErrorMessage(e, "Failed to send message."));
      }
      // Mark the last optimistic message as error
      setConv((prev) => {
        if (!prev || prev.messages.length === 0) return prev;
        const idx = prev.messages.length - 1;
        const last = prev.messages[idx];
        if (last.status === "sending") {
          const next = [...prev.messages];
          next[idx] = { ...last, status: "error" };
          return { ...prev, messages: next };
        }
        return prev;
      });
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  async function handleResolve() {
    if (resolving) return;
    try {
      setResolving(true);
      const user = await waitForUser(USER_WAIT_TIMEOUT_MS);
      const token = await getIdTokenWithTimeout(user, AUTH_TIMEOUT_MS);
      const res = await fetchWithTimeout(
        `/api/messages/${encodeURIComponent(conversationId)}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "resolved" }),
          timeoutMs: API_TIMEOUT_MS_SEND,
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to resolve");
      setConv((prev) => (prev ? { ...prev, status: "resolved" } : prev));
      setShowActions(false);
    } catch (e: any) {
      console.error(e);
      if (isTransientNetworkError(e)) {
        setError(null);
        showConnectionNotice("Reconnecting…");
      } else {
        setError(normalizeErrorMessage(e, "Failed to mark as resolved."));
      }
    } finally {
      setResolving(false);
    }
  }

  const isSupport = conv?.type === "support";
  const isResolved = conv?.status === "resolved" || conv?.status === "closed";

  async function submitPlacementHireRequest() {
    const driverId = placementDriverId;
    if (!isPlacement || !driverId) return;
    if (submittingHire) return;
    try {
      setSubmittingHire(true);
      setError(null);
      const user = await waitForUser(USER_WAIT_TIMEOUT_MS);
      const token = await getIdTokenWithTimeout(user, AUTH_TIMEOUT_MS);
      const res = await fetchWithTimeout(
        "/api/customer/placement/hire-requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ driverId, notes: hireNotes }),
          timeoutMs: API_TIMEOUT_MS_SEND,
        },
      );
      const j = await res.json().catch(() => ({}) as any);
      if (!res.ok)
        throw new Error(j?.error || "Failed to submit hire request.");

      setHireModalOpen(false);
      setHireNotes("");

      setConv((prev) => {
        if (!prev) return prev;
        const nextCtx = { ...(prev.context || {}) };
        if (!nextCtx.placementHireStatus)
          nextCtx.placementHireStatus = "requested";
        return { ...prev, context: nextCtx };
      });

      setError("✓ Hire request sent.");
      setTimeout(() => setError(null), 3500);
    } catch (e: any) {
      if (isTransientNetworkError(e)) {
        setError(null);
        showConnectionNotice("Reconnecting…");
      } else {
        setError(normalizeErrorMessage(e, "Failed to submit hire request."));
      }
      setTimeout(() => setError(null), 4500);
    } finally {
      setSubmittingHire(false);
    }
  }

  return (
    <div
      className={["flex flex-col h-full overflow-hidden", className || ""].join(
        " ",
      )}
      {...rest}
    >
      {error && !isTransientNetworkMessage(error) && (
        <StickyBanner className="z-50">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      {/* Header (static) */}
      <div className="relative z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(basePath)}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          <div className="relative">
            {conv?.other.avatarUrl ? (
              <img
                src={conv.other.avatarUrl}
                alt={conv.other.name || "User"}
                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                style={{ background: colorFor(conv?.other?.name) }}
              >
                {nameInitials(conv?.other?.name)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {conv?.other?.name || "Chat"}
            </h1>
            {isSupport && isResolved && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Resolved
              </span>
            )}
            {connectionNotice && (
              <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {connectionNotice}
              </span>
            )}
          </div>
          {isPlacement && placementDriverId && (
            <div className="flex items-center gap-1.5">
              {placementOtherPhone && placementSendEnabled && (
                <a
                  href={`tel:${placementOtherPhone}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 dark:bg-white/10 ring-1 ring-slate-900/10 dark:ring-white/20 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/15 transition-colors"
                  aria-label="Call"
                  title="Call"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 dark:bg-white/10 ring-1 ring-slate-900/10 dark:ring-white/20 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/15 transition-colors"
                onClick={() =>
                  router.push(
                    `/app/hire-a-driver/driver/${encodeURIComponent(placementDriverId)}`,
                  )
                }
                aria-label="View profile"
                title="View profile"
              >
                <UserRound className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#00529B] text-white shadow-md shadow-blue-900/20 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
                disabled={placementHireAlreadyRequested || submittingHire}
                onClick={() => {
                  if (placementHasAccess === false) {
                    router.push("/app/hire-a-driver/access");
                    return;
                  }
                  setHireModalOpen(true);
                }}
                aria-label={
                  placementHireStatus === "accepted"
                    ? "Hired"
                    : placementHireStatus === "requested"
                      ? "Hire request sent"
                      : "Hire"
                }
                title={
                  placementHireStatus === "accepted"
                    ? "Hired"
                    : placementHireStatus === "requested"
                      ? "Hire request sent"
                      : "Hire"
                }
              >
                <Briefcase className="h-4 w-4" />
                {placementHireStatus === "accepted" && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white/90"
                  />
                )}
                {placementHireStatus === "requested" && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white/90"
                  />
                )}
              </button>
            </div>
          )}

          {/* Actions menu for support chats */}
          {isSupport && !isResolved && (
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all"
                aria-label="Actions"
              >
                <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowActions(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50">
                    <button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {resolving ? "Resolving..." : "Mark as Resolved"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40 space-y-3">
        {isPlacement && placementSendDisabledReason && (
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200/70 dark:border-slate-800/60 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
            {placementSendDisabledReason}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading...
            </p>
          </div>
        ) : !conv || conv.messages.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No messages yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isPlacement
                  ? placementSendEnabled
                    ? "Start your conversation below."
                    : placementSendDisabledReason ||
                      "Messaging will unlock after the driver accepts your request."
                  : "Start your conversation below."}
              </p>
            </div>
          </div>
        ) : (
          conv.messages.map((m) => {
            const mine = !!uid && m.senderId === uid;
            return (
              <div
                key={m.id}
                className={[
                  "flex items-end gap-2",
                  mine ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {!mine && (
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-semibold"
                    style={{ background: colorFor(conv.other.name) }}
                  >
                    {nameInitials(conv.other.name)}
                  </div>
                )}
                <div className="flex flex-col max-w-[75%]">
                  <div
                    className={[
                      "rounded-2xl px-4 py-2.5 shadow-sm",
                      mine
                        ? "bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white rounded-br-md"
                        : "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/70 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 rounded-bl-md",
                    ].join(" ")}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                  <div
                    className={[
                      "flex items-center gap-1.5 mt-1 px-1",
                      mine ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    {m.createdAt && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {m.status === "sending" && (
                      <span className="text-[11px] text-slate-400">
                        Sending...
                      </span>
                    )}
                    {m.status === "error" && (
                      <span className="text-[11px] text-red-500">Failed</span>
                    )}
                  </div>
                </div>
                {mine && <div className="w-7" />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Fixed Bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 pb-32 pt-3 px-4 bg-gradient-to-t from-background via-background to-transparent"
        style={{ zIndex: 45 }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 p-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/60 shadow-lg">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isPlacement && !placementSendEnabled
                  ? "Messaging is locked for now."
                  : "Type a message..."
              }
              rows={1}
              disabled={isPlacement ? !placementSendEnabled : false}
              className="flex-1 px-4 py-3 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-32 disabled:opacity-60"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={handleSend}
              disabled={
                !inputText.trim() ||
                (isPlacement ? !placementSendEnabled : false)
              }
              className={[
                "p-3 rounded-xl transition-all active:scale-95 flex-shrink-0",
                inputText.trim() && (!isPlacement || placementSendEnabled)
                  ? "bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed",
              ].join(" ")}
              aria-label="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <ActionModal
        isOpen={hireModalOpen}
        onClose={() => {
          if (submittingHire) return;
          setHireModalOpen(false);
        }}
        title="Hire this driver"
        description={
          <div className="space-y-2">
            <p>
              Send a clear signal that you’re ready to proceed. The driver can
              accept or decline, and an admin may follow up for documentation.
            </p>
          </div>
        }
        confirmText="Send hire request"
        cancelText="Cancel"
        confirmVariant="primary"
        reasonLabel="Notes (optional)"
        reasonPlaceholder="Role expectations, start date, schedule, etc."
        reasonValue={hireNotes}
        onReasonValueChange={setHireNotes}
        loading={submittingHire}
        confirmDisabled={
          !isPlacement || !placementDriverId || placementHasAccess !== true
        }
        onConfirm={submitPlacementHireRequest}
      />
    </div>
  );
};

export default ChatWindow;
