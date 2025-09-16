"use client";

import React from "react";
import { useRouter } from "next/navigation";

export interface DashboardErrorStateProps extends React.ComponentPropsWithoutRef<"section"> {
  onRetry?: () => void;
}

export default function DashboardErrorState({ onRetry, className, ...rest }: DashboardErrorStateProps) {
  const router = useRouter();
  return (
    <section className={["min-h-[60vh]", className ?? ""].join(" ")} {...rest}>
      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl px-4 pt-20 pb-16 bg-background">
        <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden>
              <path d="M12 9v4m0 4h.01M10.29 3.86l-7.1 12.28A2 2 0 004.89 20h14.22a2 2 0 001.71-3.86l-7.1-12.28a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Something went wrong.</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">We couldn't load your dashboard details at the moment. Please check your internet connection and try again.</p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => (onRetry ? onRetry() : router.refresh())}
              className="inline-flex w-full items-center justify-center rounded-full border border-blue-600 text-blue-700 dark:text-blue-300 bg-white px-4 py-2 text-sm font-medium hover:bg-blue-50 dark:hover:bg-white/10 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
