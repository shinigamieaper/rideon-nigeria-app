"use client";

import * as React from "react";

export interface DriverDashboardSkeletonProps
  extends React.ComponentPropsWithoutRef<"main"> {}

export default function DriverDashboardSkeleton({
  className,
  ...rest
}: DriverDashboardSkeletonProps) {
  return (
    <main
      className={[
        "min-h-dvh bg-background text-foreground",
        className || "",
      ].join(" ")}
      {...rest}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Online toggle skeleton */}
        <section className="w-full py-10 sm:py-12 flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-24 rounded-full bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="h-4 w-40 rounded bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
        </section>

        <div className="grid grid-cols-1 gap-6">
          {/* Up Next card skeleton */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7 animate-pulse">
            <div className="h-5 w-28 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-4 h-7 w-44 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="h-4 w-2/3 rounded bg-slate-200/60 dark:bg-slate-800/60" />
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <div className="h-4 w-24 rounded bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="h-6 w-28 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="mt-6 h-10 w-full rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
          </div>

          {/* Placement card skeleton */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 animate-pulse">
            <div className="h-5 w-64 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-2 h-4 w-5/6 rounded bg-slate-200/60 dark:bg-slate-800/60" />
            <div className="mt-6 h-10 w-40 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
          </div>

          {/* Quick stats bar skeleton */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4 md:p-5 animate-pulse">
            <div className="grid grid-cols-2 divide-x divide-slate-200/80 dark:divide-slate-800/60">
              <div className="py-4 flex flex-col items-center gap-2">
                <div className="h-6 w-24 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-3 w-24 rounded bg-slate-200/60 dark:bg-slate-800/60" />
              </div>
              <div className="py-4 flex flex-col items-center gap-2">
                <div className="h-6 w-24 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-3 w-28 rounded bg-slate-200/60 dark:bg-slate-800/60" />
              </div>
            </div>
          </div>

          {/* Placement-only track: Application Status skeleton */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-8 animate-pulse">
            <div className="h-5 w-60 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <ol className="mt-5 space-y-6">
              {[0, 1, 2].map((i) => (
                <li key={i} className="grid grid-cols-[auto,1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    {i < 2 && (
                      <div className="mt-2 h-10 w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                  </div>
                  <div>
                    <div className="h-4 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="mt-2 h-3 w-64 rounded bg-slate-200/60 dark:bg-slate-800/60" />
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Profile completeness skeleton */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-8 animate-pulse">
            <div className="h-5 w-80 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="mt-2 h-3 w-3/4 rounded bg-slate-200/60 dark:bg-slate-800/60" />
            <div className="mt-5 h-10 w-40 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
        </div>
      </div>
    </main>
  );
}
