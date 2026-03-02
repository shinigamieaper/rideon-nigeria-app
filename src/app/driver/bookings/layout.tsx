"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock } from "lucide-react";

const tabs = [
  {
    label: "Requests",
    href: "/driver/bookings/new",
    icon: CalendarClock,
    patterns: ["/driver/bookings/new"],
  },
  {
    label: "Availability",
    href: "/driver/bookings/availability",
    icon: Clock,
    patterns: ["/driver/bookings/availability"],
  },
];

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (patterns: string[]) =>
    patterns.some((p) => pathname === p || pathname?.startsWith(p + "/"));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-32">
        {/* Tab bar */}
        <nav
          className="mb-6 flex gap-1 p-1 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-sm"
          aria-label="Bookings navigation"
        >
          {tabs.map((tab) => {
            const active = isActive(tab.patterns);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[#00529B] text-white shadow-md"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
