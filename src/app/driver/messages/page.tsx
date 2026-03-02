"use client";

import * as React from "react";
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
import { MessageSquare } from "lucide-react";
import ConversationListItem from "@/components/driver/messages/ConversationListItem";
import { StickyBanner } from "@/components";

interface Conversation {
  id: string;
  otherParticipantName: string;
  otherParticipantAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

function isPlacementConversation(conv: any): boolean {
  const memberKey =
    typeof conv?.memberKey === "string" ? String(conv.memberKey) : "";
  if (memberKey.endsWith("|placement")) return true;
  const source =
    typeof conv?.context?.source === "string"
      ? String(conv.context.source)
      : "";
  if (source === "placement_portfolio") return true;
  return false;
}

function toIsoOrNow(input: any): string {
  if (!input) return new Date(0).toISOString();
  if (typeof input === "string") return input;
  if (input?.toDate) {
    try {
      return input.toDate().toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  }
  if (input instanceof Date) {
    try {
      return input.toISOString();
    } catch {
      return new Date(0).toISOString();
    }
  }
  return new Date(0).toISOString();
}

export default function DriverMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fallback: server API list (works even if client rules block reads)
  const fetchViaApi = React.useCallback(async (): Promise<boolean> => {
    try {
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch("/api/driver/messages", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to fetch conversations");
      const arr = Array.isArray(j.conversations) ? j.conversations : [];
      setConversations(arr);
      return true;
    } catch (e) {
      console.error(e);
      setConversations([]);
      return false;
    }
  }, []);

  // Live conversations via Firestore listener (reads only)
  React.useEffect(() => {
    let unsubList: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
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
          const arr = snap.docs
            .map((d) => {
              const v = d.data() as any;
              if (isPlacementConversation(v)) return null;
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
                otherParticipantName: other?.name || "Conversation",
                otherParticipantAvatar: other?.avatarUrl || null,
                lastMessage:
                  typeof v.lastMessage === "string" ? v.lastMessage : "",
                lastMessageAt: toIsoOrNow(v.lastMessageAt),
                unreadCount: unread,
              } as Conversation;
            })
            .filter((x): x is Conversation => Boolean(x));
          // Sort client-side by lastMessageAt desc
          arr.sort((a, b) => {
            const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
            const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
            return tb - ta;
          });
          setConversations(arr);
          setLoading(false);
        },
        async (err) => {
          console.error("onSnapshot conversations error", err);
          // Graceful fallback to API if rules block reads
          const ok = await fetchViaApi();
          if (!ok) setError("Failed to load conversations.");
          setLoading(false);
        },
      );
    });
    return () => {
      unsubList?.();
      unsubAuth();
    };
  }, [router, fetchViaApi]);

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

  const EmptyState = (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        No Messages Yet
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-md">
        Your conversations with customers and our support team will appear here.
      </p>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-32">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Messages
        </h1>

        {error && (
          <StickyBanner className="z-50 mb-4">
            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
              {error}
            </div>
          </StickyBanner>
        )}

        {loading ? (
          SkeletonList
        ) : conversations.length === 0 ? (
          EmptyState
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
