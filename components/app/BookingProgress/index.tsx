"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BookingProgressProps
  extends React.ComponentPropsWithoutRef<"div"> {
  current: 1 | 2 | 3;
  total?: 3;
  titles?: [string, string, string];
}

const stepsDefault: [string, string, string] = [
  "Your Rental",
  "Schedule & Details",
  "Confirm & Pay",
];

export default function BookingProgress({
  className,
  current,
  total = 3,
  titles = stepsDefault,
  ...rest
}: BookingProgressProps) {
  return (
    <div
      className={cn("w-full mx-auto max-w-5xl px-4 sm:px-6 pt-4", className)}
      {...rest}
    >
      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg transition-all duration-300 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          {Array.from({ length: total }).map((_, i) => {
            const step = (i + 1) as 1 | 2 | 3;
            const isActive = step === current;
            const isDone = step < current;
            return (
              <div key={step} className="flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-8 w-8 shrink-0 rounded-xl border flex items-center justify-center text-xs font-medium",
                      isDone &&
                        "bg-emerald-500/90 border-emerald-600 text-white",
                      isActive && "bg-blue-600/90 border-blue-700 text-white",
                      !isActive &&
                        !isDone &&
                        "bg-transparent border-slate-300 dark:border-slate-700 text-slate-600",
                    )}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {step}
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {titles[i]}
                  </div>
                </div>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-200/70 dark:bg-slate-800/70 overflow-hidden">
                  <div
                    className={cn(
                      "h-1",
                      isActive || isDone ? "bg-blue-600" : "bg-transparent",
                    )}
                    style={{ width: isDone ? "100%" : isActive ? "50%" : 0 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          Step {current} of {total}
        </p>
      </div>
    </div>
  );
}
