"use client";

import * as React from "react";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";
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
import { StickyBanner } from "@/components";

export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string | null;
  status?: "sending" | "sent" | "delivered" | "error";
}

export interface ConversationDetail {
  id: string;
  type: string;
  status?: string;
  other: { id?: string | null; name?: string; avatarUrl?: string | null };
  messages: Message[];
}

export interface ChatWindowProps extends React.ComponentPropsWithoutRef<"div"> {
  conversationId: string;
  otherParticipantName: string;
}

// Helper to generate avatar initials and color
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

export default function ChatWindow({
  conversationId,
  otherParticipantName,
  className,
  ...props
}: ChatWindowProps) {
  const router = useRouter();
  const [uid, setUid] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [conv, setConv] = React.useState<ConversationDetail | null>(null);
  const [useApiFallback, setUseApiFallback] = React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const [showActions, setShowActions] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const fetchAndMarkRead = React.useCallback(async () => {
    setError(null);
    try {
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/driver/messages/${encodeURIComponent(conversationId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to fetch conversation");
      // Use server response to initialize until listeners attach
      setConv({
        id: conversationId,
        type: "direct",
        other: { name: otherParticipantName },
        messages: (j.messages || []).map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.text || m.content || "",
          createdAt: m.createdAt,
          status: "sent",
        })),
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load conversation.");
    }
  }, [conversationId, otherParticipantName]);

  React.useEffect(() => {
    let unsubConv: undefined | (() => void);
    let unsubMsgs: undefined | (() => void);
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
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
              ? profiles[otherId] || {
                  name: otherParticipantName,
                  avatarUrl: null,
                }
              : { name: "RideOn Support", avatarUrl: null };
            setConv((prev) => ({
              id: snap.id,
              type: data.type || "direct",
              status: data.status || "open",
              other: {
                id: otherId,
                name: other?.name || otherParticipantName,
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

                // Hide internal notes from driver-facing chat
                if (m?.meta?.internalNote) {
                  return null;
                }

                let createdAt: string | null = null;
                const ca = m?.createdAt;
                if (typeof ca === "string") {
                  createdAt = ca;
                } else if (ca?.toDate) {
                  try {
                    createdAt = ca.toDate().toISOString();
                  } catch {
                    createdAt = null;
                  }
                } else if (ca instanceof Date) {
                  createdAt = ca.toISOString();
                }

                return {
                  id: d.id,
                  senderId: m.senderId,
                  content:
                    typeof m.content === "string"
                      ? m.content
                      : typeof m.text === "string"
                        ? m.text
                        : "",
                  createdAt,
                  status: m.status || "sent",
                } as Message;
              })
              .filter((m): m is Message => m !== null)
              .sort((a, b) => {
                const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
                const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
                return ta - tb;
              });
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
  }, [conversationId, otherParticipantName, fetchAndMarkRead]);

  // Fallback: API polling if Firestore listeners are blocked by rules
  React.useEffect(() => {
    if (!useApiFallback) return;
    let cancelled = false;
    let timer: any;
    async function poll() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/driver/messages/${encodeURIComponent(conversationId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        const j = await res.json().catch(() => ({}));
        if (res.ok && !cancelled) {
          setConv({
            id: conversationId,
            type: "direct",
            other: { name: otherParticipantName },
            messages: (j.messages || []).map((m: any) => ({
              id: m.id,
              senderId: m.senderId,
              content: m.text || m.content || "",
              createdAt: m.createdAt,
              status: "sent",
            })),
          });
        }
      } catch (e) {
        // silent
      } finally {
        if (!cancelled) timer = setTimeout(poll, 3000);
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [useApiFallback, conversationId, otherParticipantName]);

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages?.length]);

  async function handleSend() {
    if (!inputText.trim()) return;

    try {
      const tempId = `temp-${Date.now()}`;
      const nowIso = new Date().toISOString();
      setConv((prev) => {
        if (!prev) return prev;
        const optimistic: Message = {
          id: tempId,
          senderId: uid || "me",
          content: inputText.trim(),
          createdAt: nowIso,
          status: "sending",
        };
        return { ...prev, messages: [...prev.messages, optimistic] };
      });
      setInputText("");
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/driver/messages/${encodeURIComponent(conversationId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: inputText.trim() }),
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to send");
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
      setError(e?.message || "Failed to send message.");
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
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/messages/${encodeURIComponent(conversationId)}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "resolved" }),
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to resolve");
      setConv((prev) => (prev ? { ...prev, status: "resolved" } : prev));
      setShowActions(false);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to mark as resolved.");
    } finally {
      setResolving(false);
    }
  }

  const isSupport = conv?.type === "support";
  const isResolved = conv?.status === "resolved" || conv?.status === "closed";

  return (
    <div
      className={["flex flex-col h-full overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {error && (
        <StickyBanner className="z-50">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      {/* Header - static within viewport container */}
      <div className="relative z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/driver/messages")}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all active:scale-95"
              aria-label="Back to messages"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>

            {/* Avatar */}
            <div className="relative">
              {conv?.other.avatarUrl ? (
                <img
                  src={conv.other.avatarUrl}
                  alt={conv.other.name || otherParticipantName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                  style={{
                    background: colorFor(
                      conv?.other.name || otherParticipantName,
                    ),
                  }}
                >
                  {nameInitials(conv?.other.name || otherParticipantName)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                {conv?.other.name || otherParticipantName}
              </h1>
              {isSupport && isResolved && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              )}
            </div>
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
      </div>

      {/* Messages - Scrollable area with proper padding for floating dock */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading conversation...
              </p>
            </div>
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
                Start the conversation by sending a message below.
              </p>
            </div>
          </div>
        ) : (
          conv.messages.map((msg) => {
            const isMe = msg.senderId === uid;
            return (
              <div
                key={msg.id}
                className={[
                  "flex items-end gap-2",
                  isMe ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {!isMe && (
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
                      isMe
                        ? "bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white rounded-br-md"
                        : "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/70 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 rounded-bl-md",
                    ].join(" ")}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                  <div
                    className={[
                      "flex items-center gap-1.5 mt-1 px-1",
                      isMe ? "justify-end" : "justify-start",
                    ].join(" ")}
                  >
                    {msg.createdAt && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {msg.status === "sending" && (
                      <span className="text-[11px] text-slate-400">
                        Sending...
                      </span>
                    )}
                    {msg.status === "error" && (
                      <span className="text-[11px] text-red-500">Failed</span>
                    )}
                  </div>
                </div>
                {isMe && <div className="w-7" />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom with safe area for floating dock */}
      <div
        className="fixed bottom-0 left-0 right-0 pb-32 pt-3 px-4 bg-gradient-to-t from-background via-background to-transparent"
        style={{ zIndex: 45 }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-2 p-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/60 shadow-lg">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-4 py-3 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none max-h-32"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={[
                "p-3 rounded-xl transition-all active:scale-95 flex-shrink-0",
                inputText.trim()
                  ? "bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed",
              ].join(" ")}
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
