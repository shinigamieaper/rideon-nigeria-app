"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BookingSkeletonProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export default function BookingSkeleton({
  className,
  ...rest
}: BookingSkeletonProps) {
  return (
    <div className={cn("relative min-h-dvh", className)} {...rest}>
      {/* Map area skeleton (above map, below overlays) */}
      <div className="fixed inset-0 z-20 animate-pulse pointer-events-none">
        <div className="h-full w-full bg-slate-200/50 dark:bg-slate-800/50" />
      </div>

      {/* Bottom sheet skeleton (mirrors Step 1/2 layout) */}
      <div
        className="fixed inset-x-0 z-40 px-4 sm:px-6"
        style={{
          bottom:
            "calc(var(--dock-offset, 112px) + env(safe-area-inset-bottom))",
        }}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4 sm:p-5">
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />

          <div className="mt-4 space-y-3">
            <div className="h-12 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-12 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-12 rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          </div>

          <div className="mt-4 flex gap-3">
            <div className="h-11 w-1/3 rounded-md bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-11 flex-1 rounded-md bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
