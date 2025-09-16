"use client";

import React from "react";
import Link from "next/link";

export interface DashboardEmptyStateProps extends React.ComponentPropsWithoutRef<"section"> {
  firstName?: string;
}

export default function DashboardEmptyState({ firstName, className, ...rest }: DashboardEmptyStateProps) {
  return (
    <section className={["min-h-[60vh]", className ?? ""].join(" ")} {...rest}>
      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl px-4 pt-20 pb-16 bg-background">
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 text-center">
          {/* Illustration placeholder */}
          <div className="mx-auto mb-4 h-28 w-full bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-800/40 dark:to-slate-800/20 rounded-xl border border-slate-200/80 dark:border-slate-800/60" />

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Welcome to RideOn{firstName ? `, ${firstName}` : ""}!
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your professional and reliable ride is just a few taps away. Book a pre-scheduled trip or hire a dedicated full-time driver for your personal or business needs.
          </p>

          <div className="mt-5">
            <Link
              href="/services/pre-booked-rides"
              className="inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-95"
              style={{ background: "linear-gradient(135deg, #0061c1 0%, #00529B 50%, #003f7a 100%)" }}
            >
              Book Your First Ride
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
