"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, waitForUser } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  limit as fbLimit,
} from "firebase/firestore";
import ConversationItem from "../ConversationItem";
import { StickyBanner } from "@/components";

interface ConversationSummary {
  id: string;
  type?: string;
  name: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
  isPlacement?: boolean;
}

export interface ConversationListProps
  extends React.ComponentPropsWithoutRef<"div"> {
  basePath?: string;
  supportSource?: string;
  mode?: "app" | "full_time_driver" | "placement";
}

const ConversationList: React.FC<ConversationListProps> = ({
  basePath = "/app/messages",
  supportSource = "profile_support",
  mode = "app",
  className,
  ...rest
}) => {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<ConversationSummary[]>([]);

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

  const isPlacementConversation = React.useCallback((c: any): boolean => {
    const memberKey = typeof c?.memberKey === "string" ? c.memberKey : "";
    if (memberKey.endsWith("|placement")) return true;
    const source =
      typeof c?.context?.source === "string"
        ? String(c.context.source)
        : typeof c?.contextSource === "string"
          ? String(c.contextSource)
          : "";
    if (source === "placement_portfolio") return true;
    return false;
  }, []);

  // Fallback: server API list (works even if client rules block reads)

  const fetchViaApi = React.useCallback(async (): Promise<boolean> => {
    try {
      const user = await waitForUser();
      const token = await user.getIdToken();
      const apiUrl =
        mode === "placement"
          ? "/api/customer/placement/messages"
          : "/api/messages";
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to fetch conversations");
      const arr = Array.isArray(j.conversations) ? j.conversations : [];
      const filtered =
        mode === "full_time_driver"
          ? arr.filter(
              (c: any) => c?.type === "support" || isPlacementConversation(c),
            )
          : mode === "placement"
            ? arr
            : arr;
      setItems(filtered);
      return true;
    } catch (e) {
      console.error(e);
      setItems([]);
      return false;
    }
  }, [router, mode, isPlacementConversation]);

  // Live conversations via Firestore listener (reads only)
  React.useEffect(() => {
    let unsubList: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        // Keep last-known list; avoid redirect on transient null
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, "conversations"),
        where("memberIds", "array-contains", u.uid),
        fbLimit(50),
      );
      unsubList?.();
      unsubList = onSnapshot(
        q,
        (snap) => {
          const arr = snap.docs.map((d) => {
            const v = d.data() as any;
            const type = typeof v.type === "string" ? v.type : "direct";
            const members: string[] = Array.isArray(v.memberIds)
              ? v.memberIds
              : [];
            const otherId = members.find((m) => m !== u.uid) || null;
            const profiles = (v.participantProfiles || {}) as Record<
              string,
              { name?: string; avatarUrl?: string | null }
            >;
            const other = otherId
              ? profiles[otherId] || { name: "Conversation", avatarUrl: null }
              : { name: "RideOn Support", avatarUrl: null };
            const unread =
              v.unreadCounts && typeof v.unreadCounts === "object"
                ? Number(v.unreadCounts[u.uid] || 0)
                : 0;
            return {
              id: d.id,
              type,
              name: other?.name || "Conversation",
              avatarUrl: other?.avatarUrl || null,
              lastMessage:
                typeof v.lastMessage === "string" ? v.lastMessage : "",
              lastMessageAt: toIsoOrNull(v.lastMessageAt),
              unreadCount: unread,
              isPlacement: isPlacementConversation(v),
            } as ConversationSummary;
          });
          const filtered =
            mode === "full_time_driver"
              ? arr.filter((c) => c.type === "support" || c.isPlacement)
              : mode === "placement"
                ? arr.filter((c) => c.isPlacement)
                : arr;
          // Sort client-side by lastMessageAt desc to avoid composite index requirement
          filtered.sort((a, b) => {
            const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
            const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
            return tb - ta;
          });
          setItems(filtered);
          setLoading(false);
        },
        async (err) => {
          console.error("onSnapshot conversations error", err);
          // Graceful fallback to API if rules block reads
          const ok = await fetchViaApi();
          if (!ok) setError("Failed to load conversations.");
          else setError(null);
          setLoading(false);
        },
      );
    });
    return () => {
      unsubList?.();
      unsubAuth();
    };
  }, [router, fetchViaApi, mode, toIsoOrNull, isPlacementConversation]);

  const [supportLoading, setSupportLoading] = React.useState(false);
  const startSupportChat = React.useCallback(async () => {
    try {
      setSupportLoading(true);
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch("/api/messages/contact-support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ source: supportSource, channel: "in_app" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to start support chat");
      const id = j?.id as string | undefined;
      if (id)
        router.push(`${basePath.replace(/\/$/, "")}/${encodeURIComponent(id)}`);
    } catch (e) {
      console.error(e);
      setError("Unable to start a support chat right now.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setSupportLoading(false);
    }
  }, [router, basePath, supportSource]);

  // Removed API fetch cycle; handled by Firestore listener above

  const EmptyState =
    mode === "full_time_driver" ? (
      <div className="text-center py-16 px-6 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-center shadow-sm">
            {/* users/handshake icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-blue-500 dark:text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-5 tracking-tight">
          No Conversations Yet
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto">
          When customers express interest in hiring you, your conversations will
          appear here. You can also contact support if you need help.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={startSupportChat}
            disabled={supportLoading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-medium text-sm disabled:opacity-60 hover:bg-white/80 dark:hover:bg-slate-900/80 transition-colors"
          >
            {supportLoading ? "Starting…" : "Contact Support"}
          </button>
        </div>
      </div>
    ) : mode === "placement" ? (
      <div className="text-center py-16 px-6 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/70 flex items-center justify-center shadow-sm">
            {/* speech-bubble icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 8h10M7 12h6m-8.5 6.5 2.5-2.5H19a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100 mt-5 tracking-tight">
          No Placement Messages Yet
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto">
          Your placement chats will appear here after you request an interview
          (and the driver accepts).
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <a
            href="/login?next=%2Fapp%2Fhire-a-driver%2Fbrowse"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white font-medium shadow-md shadow-blue-500/30 text-sm"
          >
            Browse Drivers
          </a>
        </div>
      </div>
    ) : (
      <div className="text-center py-16 px-6 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/70 flex items-center justify-center shadow-sm">
            {/* speech-bubble icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 8h10M7 12h6m-8.5 6.5 2.5-2.5H19a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100 mt-5 tracking-tight">
          No Messages Yet
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto">
          Your conversations with drivers and our support team will appear here
          once you have an active service.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <a
            href="/login?next=%2Fapp%2Fcatalog"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white font-medium shadow-md shadow-blue-500/30 text-sm"
          >
            Browse Services
          </a>
        </div>
      </div>
    );

  const SkeletonList = (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse"
        />
      ))}
    </div>
  );

  return (
    <div
      className={[
        "mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28",
        className || "",
      ].join(" ")}
      {...rest}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] md:text-[32px] tracking-tight font-medium text-slate-900 dark:text-slate-100">
            Messages
          </h1>
          {mode === "full_time_driver" && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Conversations with potential employers and support
            </p>
          )}
          {mode === "placement" && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Placement chats unlock after the driver accepts your request
            </p>
          )}
        </div>
        <button
          onClick={startSupportChat}
          disabled={supportLoading}
          className={[
            "inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60",
            mode === "full_time_driver"
              ? "border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-900/80"
              : "bg-gradient-to-br from-[#0077E6] to-[#00529B] text-white shadow-md shadow-blue-500/30 hover:opacity-90",
          ].join(" ")}
        >
          {supportLoading ? "Starting…" : "Contact Support"}
        </button>
      </div>

      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      {loading ? (
        SkeletonList
      ) : items.length === 0 ? (
        EmptyState
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <ConversationItem
              key={c.id}
              id={c.id}
              name={c.name}
              avatarUrl={c.avatarUrl}
              lastMessage={c.lastMessage}
              lastMessageAt={c.lastMessageAt}
              unreadCount={c.unreadCount}
              onClick={() =>
                router.push(
                  `${basePath.replace(/\/$/, "")}/${encodeURIComponent(c.id)}`,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationList;
