"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function EarningsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSummary =
    pathname === "/driver/earnings" || pathname === "/driver/earnings/summary";
  const isPayouts = pathname?.startsWith("/driver/earnings/payouts");
  const isSettings = pathname?.startsWith("/driver/earnings/payout-settings");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Earnings
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track your income and manage payouts
          </p>
        </div>

        {/* Tab Navigation */}
        <nav className="border-b border-slate-200/80 dark:border-slate-800/60 mb-6">
          <ul className="flex items-center gap-6 overflow-x-auto">
            <li>
              <Link
                href="/driver/earnings/summary"
                className={cx(
                  "inline-flex items-center gap-2 px-1 py-3 text-sm transition-colors whitespace-nowrap",
                  isSummary
                    ? "font-semibold text-slate-900 dark:text-slate-100 border-b-2 border-[#00529B]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-b-2 border-transparent",
                )}
              >
                Summary
              </Link>
            </li>
            <li>
              <Link
                href="/driver/earnings/payouts"
                className={cx(
                  "inline-flex items-center gap-2 px-1 py-3 text-sm transition-colors whitespace-nowrap",
                  isPayouts
                    ? "font-semibold text-slate-900 dark:text-slate-100 border-b-2 border-[#00529B]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-b-2 border-transparent",
                )}
              >
                Payouts
              </Link>
            </li>
            <li>
              <Link
                href="/driver/earnings/payout-settings"
                className={cx(
                  "inline-flex items-center gap-2 px-1 py-3 text-sm transition-colors whitespace-nowrap",
                  isSettings
                    ? "font-semibold text-slate-900 dark:text-slate-100 border-b-2 border-[#00529B]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-b-2 border-transparent",
                )}
              >
                Payout Settings
              </Link>
            </li>
          </ul>
        </nav>

        <div>{children}</div>
      </div>
    </div>
  );
}
