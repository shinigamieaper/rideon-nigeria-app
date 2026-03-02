"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";

export interface HeaderProps extends React.ComponentPropsWithoutRef<"header"> {
  brand?: string;
  homeHref?: string;
  profileHref?: string;
  notificationsHref?: string;
  avatarUrl?: string;
  userInitials?: string;
  unreadNotifications?: number;
}

export default function Header({
  brand = "RideOn Nigeria",
  homeHref = "/app/dashboard",
  profileHref = "/app/profile",
  notificationsHref = "/app/notifications",
  avatarUrl,
  userInitials = "RN",
  unreadNotifications = 0,
  className,
  ...rest
}: HeaderProps) {
  const showBrandLabel = brand.trim().toLowerCase() !== "rideon nigeria";

  return (
    <header
      className={["sticky top-0 z-50 w-full", className ?? ""].join(" ")}
      {...rest}
    >
      {/* Background and border */}
      <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand / Logo */}
          <Link
            href={homeHref}
            className="flex items-center gap-2"
            aria-label="Dashboard home"
          >
            <Image
              src="/RIDEONNIGERIA%20LOGO.png"
              alt="RideOn Nigeria"
              width={1024}
              height={1024}
              className="h-9 w-auto sm:h-10"
              priority
            />
            {showBrandLabel ? (
              <span
                className="font-semibold tracking-tight text-sm sm:text-base"
                style={{ color: "#00529B" }}
              >
                {brand}
              </span>
            ) : null}
          </Link>

          {/* Right cluster */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notifications */}
            <Link
              href={notificationsHref}
              aria-label="Notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/60 dark:bg-white/10 ring-1 ring-slate-900/10 dark:ring-white/20 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/15 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-950"
                />
              )}
            </Link>

            {/* Avatar / Profile */}
            <Link
              href={profileHref}
              aria-label="Profile and settings"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full overflow-hidden ring-2 ring-slate-200 hover:ring-[#00529B]/60 dark:ring-white/15 transition-all"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="User avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="h-full w-full flex items-center justify-center text-sm font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {userInitials.slice(0, 2).toUpperCase()}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
