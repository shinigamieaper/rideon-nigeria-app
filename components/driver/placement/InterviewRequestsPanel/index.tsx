"use client";

import * as React from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { CalendarClock, Check, MessageSquare, X } from "lucide-react";

import { auth } from "@/lib/firebase";
import StickyBanner from "@/components/ui/StickyBanner";
import type { PlacementInterviewRequest } from "@/types/placement";

export interface InterviewRequestsPanelProps
  extends React.ComponentPropsWithoutRef<"div"> {}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function statusClass(status: string) {
  switch (status) {
    case "requested":
      return "bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200";
    case "accepted":
      return "bg-green-50/80 dark:bg-green-900/20 border-green-200/80 dark:border-green-800/60 text-green-800 dark:text-green-200";
    case "declined":
      return "bg-red-50/80 dark:bg-red-900/20 border-red-200/80 dark:border-red-800/60 text-red-800 dark:text-red-200";
    case "scheduled":
      return "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/80 dark:border-blue-800/60 text-blue-800 dark:text-blue-200";
    default:
      return "bg-slate-50/80 dark:bg-slate-900/20 border-slate-200/80 dark:border-slate-800/60 text-slate-700 dark:text-slate-200";
  }
}

function interviewTypeLabel(t: string) {
  if (t === "google_meet_video") return "Video call";
  if (t === "google_meet_audio") return "Phone call";
  if (t === "in_person") return "In-person";
  return t;
}

export default function InterviewRequestsPanel({
  className,
  ...rest
}: InterviewRequestsPanelProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<PlacementInterviewRequest[]>(
    [],
  );
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setRequests([]);
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch("/api/driver/placement/interview-requests", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to fetch interview requests");
      }

      const j = await res.json();
      setRequests(Array.isArray(j?.requests) ? j.requests : []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load interview requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        fetchRequests();
      } else {
        setRequests([]);
        setLoading(false);
      }
    });
    return () => unsub();
  }, [fetchRequests]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !actionLoading) {
        fetchRequests();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRequests, loading, actionLoading]);

  const handleAction = React.useCallback(
    async (requestId: string, action: "accept" | "decline") => {
      try {
        setActionLoading(requestId);
        setError(null);

        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();

        const res = await fetch(
          `/api/driver/placement/interview-requests/${requestId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action }),
          },
        );

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "Failed to respond");
        }

        setError(
          action === "accept"
            ? "✓ Interview request accepted."
            : "Interview request declined.",
        );
        setTimeout(() => setError(null), 3000);
        await fetchRequests();
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Action failed.");
        setTimeout(() => setError(null), 4000);
      } finally {
        setActionLoading(null);
      }
    },
    [fetchRequests],
  );

  return (
    <div className={cx(className)} {...rest}>
      {error && (
        <StickyBanner className="z-50 mb-4">
          <div
            className={cx(
              "rounded-xl border px-3 py-2 text-[13px] shadow",
              error.startsWith("✓")
                ? "bg-green-50/80 dark:bg-green-900/20 border-green-200/80 dark:border-green-800/60 text-green-800 dark:text-green-100"
                : "bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-100",
            )}
          >
            {error}
          </div>
        </StickyBanner>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10">
          <CalendarClock className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            No interview requests yet
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            When an employer wants to interview you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const isPending = r.status === "requested";
            const busy = actionLoading === r.id;

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {r.customerAvatarUrl ? (
                      <img
                        src={r.customerAvatarUrl}
                        alt={r.customerName}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-200/60 dark:border-slate-800/60"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    )}

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {r.customerName}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {interviewTypeLabel(r.interviewType)}
                        {r.createdAt
                          ? ` • ${new Date(r.createdAt).toLocaleDateString()}`
                          : ""}
                      </div>
                      {r.notes && (
                        <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                          {r.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={cx(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                      statusClass(r.status),
                    )}
                  >
                    {r.status}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.conversationId && (
                    <Link
                      href={`/driver/messages/${r.conversationId}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Open chat
                    </Link>
                  )}

                  {isPending && (
                    <>
                      <button
                        onClick={() => handleAction(r.id, "decline")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:shadow-sm disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Decline
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "accept")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#34A853] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Accept
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Auto-refreshes every 30 seconds
          </div>
        </div>
      )}
    </div>
  );
}
