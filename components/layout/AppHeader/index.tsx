"use client";

import React from "react";
import Link from "next/link";
import { Bell, User } from "lucide-react";
import NeonThemeToggle from "../../ui/NeonThemeToggle";

export interface AppHeaderProps extends React.ComponentPropsWithoutRef<"header"> {
  brand?: string;
}

export default function AppHeader({ brand = "RideOn", className, ...rest }: AppHeaderProps) {
  return (
    <header
      className={[
        "fixed top-0 inset-x-0 z-40 h-14 bg-white/95 dark:bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-200/80 dark:border-slate-800 shadow-sm",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      <div className="mx-auto max-w-3xl px-4 flex h-full items-center justify-between">
        {/* Left: Wordmark */}
        <Link href="/app/dashboard" className="font-semibold tracking-tight text-[17px]" aria-label="Dashboard Home">
          <span className="text-[#00529B]">{brand}</span>
        </Link>

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <NeonThemeToggle aria-label="Toggle theme" />

          <Link
            href="/app/notifications"
            className="inline-flex items-center justify-center rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </Link>

          <Link
            href="/app/profile"
            className="inline-flex items-center justify-center rounded-full h-8 w-8 bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 ring-1 ring-slate-200/70 dark:ring-slate-800/70"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
