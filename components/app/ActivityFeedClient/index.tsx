"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Skeleton from "react-loading-skeleton";
import { onAuthStateChanged } from "firebase/auth";
import {
  CheckCircle2,
  Clock,
  Activity as ActivityIcon,
  XCircle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { StickyBanner } from "@/components";

type ServiceGroup = "driver" | "chauffeur";

type ActivityRow = {
  id: string;
  type: string;
  tone: "emerald" | "blue" | "rose" | "amber" | "gray";
  title: string;
  timestamp: string;
  serviceGroup?: ServiceGroup;
  link?: string;
};

export interface ActivityFeedClientProps
  extends React.ComponentPropsWithoutRef<"div"> {}

type TabKey = "all" | ServiceGroup;

const toneMap: Record<
  ActivityRow["tone"],
  { bg: string; text: string; ring: string }
> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "ring-emerald-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    ring: "ring-blue-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    ring: "ring-rose-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    ring: "ring-amber-500/20",
  },
  gray: {
    bg: "bg-slate-500/10",
    text: "text-slate-500",
    ring: "ring-slate-500/20",
  },
};

function iconFor(type: string) {
  switch (type) {
    case "trip_completed":
      return <CheckCircle2 className="h-full w-full" />;
    case "trip_canceled":
      return <XCircle className="h-full w-full" />;
    case "trip_progress":
      return <Clock className="h-full w-full" />;
    default:
      return <ActivityIcon className="h-full w-full" />;
  }
}

function serviceLabel(g?: ServiceGroup) {
  if (g === "driver") return "Hire a Driver";
  if (g === "chauffeur") return "Chauffeur";
  return "Activity";
}

export default function ActivityFeedClient({
  className,
  ...rest
}: ActivityFeedClientProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ActivityRow[]>([]);

  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        router.replace("/login?next=/app/activity");
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch("/api/dashboard/recent-activity?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to fetch activity");
      setRows(
        Array.isArray(j?.activities) ? (j.activities as ActivityRow[]) : [],
      );
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "";
      if (msg.toLowerCase().includes("not authenticated")) {
        router.replace("/login?next=/app/activity");
        return;
      }
      setError(msg || "Failed to load activity.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setError(null);
        setLoading(false);
        router.replace("/login?next=/app/activity");
        return;
      }
      fetchAll();
    });
    return () => unsub();
  }, [fetchAll, router]);

  const filtered = React.useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.serviceGroup === tab);
  }, [rows, tab]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "driver", label: "Hire a Driver" },
    { key: "chauffeur", label: "Chauffeur" },
  ];

  return (
    <div className={className} {...rest}>
      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "h-9 px-3 rounded-full text-sm font-medium border transition-all",
                active
                  ? "bg-[#00529B] text-white border-[#00529B] shadow-lg shadow-blue-900/20"
                  : "bg-white/60 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-800/60 hover:shadow",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-4">
        {loading ? (
          <div>
            <Skeleton width={160} height={18} className="mb-4" />
            <ul className="space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-center gap-4">
                  <Skeleton circle width={40} height={40} />
                  <div className="flex-1 min-w-0">
                    <Skeleton height={14} width="70%" />
                    <div className="mt-1">
                      <Skeleton height={10} width="40%" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-600 dark:text-slate-400">
            No activity yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => {
              const t = toneMap[r.tone ?? "gray"];
              const href =
                r.link || `/app/reservations/${encodeURIComponent(r.id)}`;
              return (
                <li key={r.id}>
                  <Link
                    href={href}
                    className="group flex items-center gap-4 rounded-xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 px-3 py-3 shadow-sm hover:shadow transition-all"
                  >
                    <div
                      className={[
                        "w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ring-1",
                        t.bg,
                        t.ring,
                      ].join(" ")}
                    >
                      <div className={["w-5 h-5", t.text].join(" ")}>
                        {iconFor(r.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">
                          {r.title}
                        </p>
                        <span className="inline-flex flex-shrink-0 items-center rounded-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                          {serviceLabel(r.serviceGroup)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(r.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-slate-400 dark:text-slate-600 group-hover:text-[#00529B] transition-colors">
                      →
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
