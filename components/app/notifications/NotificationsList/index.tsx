"use client";

import React from "react";

export interface NotificationEntry {
  id: string;
  title: string;
  description?: string;
  createdAt?: string;
  unread?: boolean;
}

export interface NotificationsListProps
  extends React.ComponentPropsWithoutRef<"div"> {
  items?: NotificationEntry[];
  loading?: boolean;
  emptyMessage?: string;
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const skeletonItems = Array.from({ length: 4 });

const NotificationsList: React.FC<NotificationsListProps> = ({
  items = [],
  loading,
  emptyMessage = "No notifications yet. We'll post updates here once they arrive.",
  className,
  ...rest
}) => {
  const wrapperClass = ["space-y-3", className || ""].join(" ").trim();

  return (
    <div className={wrapperClass} {...rest}>
      {loading && (
        <div className="space-y-3 animate-pulse">
          {skeletonItems.map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4 sm:p-5"
            >
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-3/5 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-3 w-4/5 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                  <div className="h-3 w-2/5 rounded bg-slate-200/50 dark:bg-slate-800/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 text-sm text-slate-600 dark:text-slate-400">
          {emptyMessage}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const timestamp = formatTimestamp(item.createdAt);
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4 sm:p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#00529B]/10 text-[#00529B] grid place-items-center text-sm font-semibold">
                    {item.title.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </p>
                      {timestamp && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {timestamp}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                    )}
                    {item.unread && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                        • New
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsList;
