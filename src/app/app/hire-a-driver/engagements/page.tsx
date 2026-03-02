"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components";
import { waitForUser } from "@/lib/firebase";
import { Briefcase, CalendarClock, MessageSquare } from "lucide-react";

type InterviewRequest = {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatarUrl: string | null;
  conversationId: string;
  status: string;
  interviewType: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
};

type HireRequest = {
  id: string;
  driverId: string;
  driverName: string;
  driverAvatarUrl: string | null;
  conversationId: string;
  status: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
};

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function statusPillClass(status: string) {
  switch (status) {
    case "requested":
      return "bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200";
    case "accepted":
      return "bg-green-50/80 dark:bg-green-900/20 border-green-200/80 dark:border-green-800/60 text-green-800 dark:text-green-200";
    case "declined":
      return "bg-red-50/80 dark:bg-red-900/20 border-red-200/80 dark:border-red-800/60 text-red-800 dark:text-red-200";
    case "scheduled":
    case "admin_approved":
      return "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/80 dark:border-blue-800/60 text-blue-800 dark:text-blue-200";
    case "cancelled":
      return "bg-slate-100/80 dark:bg-slate-900/20 border-slate-200/80 dark:border-slate-800/60 text-slate-700 dark:text-slate-200";
    default:
      return "bg-white/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/60 text-slate-700 dark:text-slate-200";
  }
}

function interviewTypeLabel(t: string) {
  if (t === "google_meet_video") return "Video call";
  if (t === "google_meet_audio") return "Phone call";
  if (t === "in_person") return "In person";
  return t;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
) {
  const timeoutMs = init?.timeoutMs ?? 8000;
  const { timeoutMs: _timeoutMs, ...rest } = init || {};

  if ((rest as any).signal) {
    return await fetch(input, rest);
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export default function Page() {
  const [tab, setTab] = React.useState<"interviews" | "hire">("interviews");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [interviews, setInterviews] = React.useState<InterviewRequest[]>([]);
  const [hires, setHires] = React.useState<HireRequest[]>([]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const [iRes, hRes] = await Promise.all([
        fetchWithTimeout("/api/customer/placement/interview-requests", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: 9000,
        }),
        fetchWithTimeout("/api/customer/placement/hire-requests", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: 9000,
        }),
      ]);

      const ij = await iRes.json().catch(() => ({}) as any);
      const hj = await hRes.json().catch(() => ({}) as any);
      if (!iRes.ok)
        throw new Error(ij?.error || "Failed to load interview requests.");
      if (!hRes.ok)
        throw new Error(hj?.error || "Failed to load hire requests.");

      setInterviews(Array.isArray(ij?.requests) ? ij.requests : []);
      setHires(Array.isArray(hj?.requests) ? hj.requests : []);
    } catch (e: any) {
      setInterviews([]);
      setHires([]);
      setError(e?.message || "We couldn't load engagements right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      <header className="mb-6">
        <h1 className="text-[22px] sm:text-[26px] tracking-tight font-semibold text-slate-900 dark:text-slate-100">
          Engagements
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Track interview requests and hiring status here.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800/60">
        <button
          onClick={() => setTab("interviews")}
          className={cx(
            "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
            tab === "interviews"
              ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
              : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
          )}
          type="button"
        >
          Interviews
        </button>
        <button
          onClick={() => setTab("hire")}
          className={cx(
            "w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
            tab === "hire"
              ? "bg-white text-blue-600 border border-slate-200/50 dark:bg-slate-900/70 dark:text-slate-100 dark:border-slate-700"
              : "text-slate-600 hover:bg-white/50 dark:text-slate-300 hover:dark:bg-slate-900/40",
          )}
          type="button"
        >
          Hire
        </button>
      </div>

      {error && (
        <section className="mb-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
          <div className="mt-4 flex items-center gap-3">
            <Button className="h-11" onClick={load}>
              Retry
            </Button>
            <Link href="/app/dashboard">
              <Button variant="secondary" className="h-11">
                Back to Home
              </Button>
            </Link>
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : tab === "interviews" ? (
        interviews.length === 0 ? (
          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <CalendarClock className="h-4 w-4" />
              <p className="text-sm">No interview requests yet.</p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/app/hire-a-driver/browse">
                <Button className="h-11">Browse Drivers</Button>
              </Link>
              <Link href="/app/dashboard">
                <Button variant="secondary" className="h-11">
                  Back to Home
                </Button>
              </Link>
            </div>
          </section>
        ) : (
          <div className="space-y-3">
            {interviews.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 overflow-hidden flex items-center justify-center shrink-0">
                      {r.driverAvatarUrl ? (
                        <Image
                          src={r.driverAvatarUrl}
                          alt={r.driverName}
                          width={44}
                          height={44}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {r.driverName.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {r.driverName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {interviewTypeLabel(r.interviewType)}
                        {r.createdAt
                          ? ` • ${new Date(r.createdAt).toLocaleDateString()}`
                          : ""}
                      </p>
                      {r.notes ? (
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                          {r.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={cx(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                      statusPillClass(r.status),
                    )}
                  >
                    {r.status}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.conversationId ? (
                    <Link
                      href={`/app/hire-a-driver/messages/${encodeURIComponent(r.conversationId)}`}
                      className="inline-flex"
                    >
                      <Button variant="secondary" className="h-10">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Open chat
                      </Button>
                    </Link>
                  ) : null}
                  <Link
                    href={`/app/hire-a-driver/driver/${encodeURIComponent(r.driverId)}`}
                    className="inline-flex"
                  >
                    <Button className="h-10">View driver</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : hires.length === 0 ? (
        <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Briefcase className="h-4 w-4" />
            <p className="text-sm">No hire requests yet.</p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Link href="/app/hire-a-driver/browse">
              <Button className="h-11">Browse Drivers</Button>
            </Link>
            <Link href="/app/dashboard">
              <Button variant="secondary" className="h-11">
                Back to Home
              </Button>
            </Link>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          {hires.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 overflow-hidden flex items-center justify-center shrink-0">
                    {r.driverAvatarUrl ? (
                      <Image
                        src={r.driverAvatarUrl}
                        alt={r.driverName}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {r.driverName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {r.driverName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Hire request
                      {r.createdAt
                        ? ` • ${new Date(r.createdAt).toLocaleDateString()}`
                        : ""}
                    </p>
                    {r.notes ? (
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                        {r.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div
                  className={cx(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    statusPillClass(r.status),
                  )}
                >
                  {r.status}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.conversationId ? (
                  <Link
                    href={`/app/hire-a-driver/messages/${encodeURIComponent(r.conversationId)}`}
                    className="inline-flex"
                  >
                    <Button variant="secondary" className="h-10">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open chat
                    </Button>
                  </Link>
                ) : null}
                <Link
                  href={`/app/hire-a-driver/driver/${encodeURIComponent(r.driverId)}`}
                  className="inline-flex"
                >
                  <Button className="h-10">View driver</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href="/app/dashboard">
          <Button variant="secondary" className="h-11">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
