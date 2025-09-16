"use client";

import React from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { CheckCircle2, UserPlus, XCircle, Clock } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: "completed" | "hired_driver" | "cancelled" | "requested" | "confirmed" | "other";
  description: string;
  timestamp: string; // ISO
  amount?: number;
}

export interface RecentActivityFeedProps extends React.ComponentPropsWithoutRef<"div"> {
  activity: ActivityItem[];
  isLoading?: boolean;
}

export default function RecentActivityFeed({ activity, isLoading, className, ...rest }: RecentActivityFeedProps) {
  const cardCls = [
    "rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
    className ?? "",
  ].join(" ");

  if (isLoading) {
    return (
      <div className={cardCls} {...rest}>
        <div className="p-5">
          <Skeleton width={140} height={20} borderRadius={8} />
          <div className="mt-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton circle width={36} height={36} />
                <div className="flex-1 min-w-0">
                  <Skeleton height={14} borderRadius={8} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardCls} {...rest}>
      <div className="p-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No recent activity.</p>
        ) : (
          <ul role="list" className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
            {activity.map((item) => (
              <li key={item.id} className="flex items-center py-3.5 gap-3">
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center">
                    {renderIcon(item.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{formatRelative(item.timestamp)}</p>
                </div>
                {typeof item.amount === "number" ? (
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatCurrency(item.amount)}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Link href="/app/trips?tab=past" className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline">
            View All Activity
          </Link>
        </div>
      </div>
    </div>
  );
}

function renderIcon(type: ActivityItem["type"]) {
  const base = "w-5 h-5";
  switch (type) {
    case "completed":
      return <CheckCircle2 className={`${base} text-emerald-600 dark:text-emerald-400`} />;
    case "hired_driver":
      return <UserPlus className={`${base} text-purple-600 dark:text-purple-400`} />;
    case "cancelled":
      return <XCircle className={`${base} text-red-600 dark:text-red-400`} />;
    default:
      return <Clock className={`${base} text-slate-500 dark:text-slate-400`} />;
  }
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.max(0, now.getTime() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₦${amount.toLocaleString()}`;
  }
}
