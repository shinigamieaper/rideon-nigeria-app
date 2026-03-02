"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * AppHeader: Persistent top header for the authenticated portal.
 * - Left: brand wordmark (links to dashboard)
 * - Right: notification bell + user avatar (links to profile)
 * Uses neutral, minimal UI aligned with our theme tokens and brand primary blue.
 */
export interface AppHeaderProps
  extends React.ComponentPropsWithoutRef<"header"> {
  brand?: string;
  homeHref?: string;
  profileHref?: string;
  notificationsHref?: string;
  userInitials?: string;
  avatarColor?: string;
  unreadNotifications?: number;
}

export default function AppHeader({
  brand = "RideOn Nigeria",
  homeHref = "/app/dashboard",
  profileHref = "/app/profile",
  notificationsHref = "/app/notifications",
  userInitials = "RN",
  avatarColor = "#00529B",
  unreadNotifications = 0,
  className,
  ...rest
}: AppHeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = (resolvedTheme ?? theme) === "dark";
  const showBrandLabel = brand.trim().toLowerCase() !== "rideon nigeria";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <header
      className={["sticky top-0 z-50 w-full", className ?? ""].join(" ")}
      {...rest}
    >
      <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
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
            {/* Theme Toggle (same style as PublicHeader) */}
            <button
              type="button"
              role="switch"
              aria-checked={mounted ? !isDark : undefined}
              onClick={toggleTheme}
              className={[
                "relative inline-flex h-7 w-12 md:h-8 md:w-16 items-center rounded-full p-0.5 transition-all duration-500 ease-out focus:outline-none backdrop-blur-sm",
                "bg-slate-200 ring-1 ring-slate-300 shadow-inner",
                "dark:bg-black/70 dark:ring-white/10 dark:shadow-[inset_0_-10px_30px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                mounted
                  ? !isDark
                    ? "justify-end"
                    : "justify-start"
                  : "justify-start",
              ].join(" ")}
              aria-label="Toggle theme"
            >
              <span className="sr-only">Toggle theme</span>
              <span
                className="pointer-events-none absolute inset-0 rounded-full opacity-70 dark:opacity-70"
                style={{
                  background:
                    "radial-gradient(30px 20px at 60% 50%, rgba(255,255,255,0.04), transparent 65%)",
                }}
              />
              <span
                className={[
                  "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ease-out",
                  mounted
                    ? isDark
                      ? "opacity-100"
                      : "opacity-0"
                    : "opacity-0",
                ].join(" ")}
                style={{
                  background:
                    "radial-gradient(35px 25px at 75% 50%, rgba(6,182,212,0.25), transparent 60%), radial-gradient(40px 25px at 80% 50%, rgba(0,119,230,0.22), transparent 65%)",
                  filter: "blur(4px)",
                }}
              />
              <span
                className={[
                  "relative z-10 flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full transition-all duration-500 ease-out",
                  "bg-white shadow-md ring-1 ring-slate-200",
                  "dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-800 dark:ring-1 dark:ring-white/15 dark:shadow-[0_8px_20px_rgba(0,0,0,0.55)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none absolute -inset-[2px] rounded-full transition-all duration-500 ease-out",
                    mounted
                      ? !isDark
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-90"
                      : "opacity-0 scale-90",
                  ].join(" ")}
                  style={{
                    boxShadow:
                      "0 0 15px rgba(245, 158, 11, 0.4), 0 0 30px rgba(245, 158, 11, 0.2)",
                    background:
                      "radial-gradient(15px 15px at 50% 50%, rgba(245, 158, 11, 0.25), transparent 80%)",
                  }}
                />
                <span
                  className={[
                    "pointer-events-none absolute -inset-[2px] rounded-full transition-all duration-500 ease-out",
                    mounted
                      ? isDark
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-90"
                      : "opacity-0 scale-90",
                  ].join(" ")}
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.09), inset 0 0 10px rgba(255,255,255,0.06), 0 0 20px rgba(0,119,230,0.40), 0 0 35px rgba(6,182,212,0.30)",
                    background:
                      "radial-gradient(25px 20px at 65% 40%, rgba(6,182,212,0.55), transparent 55%)",
                  }}
                />
                {!mounted ? (
                  <Moon className="h-3 w-3 md:h-4 md:w-4 text-slate-400 transition-all duration-500 ease-out" />
                ) : (
                  <>
                    <Moon
                      className={[
                        "h-3 w-3 md:h-4 md:w-4 text-cyan-300/90 transition-all duration-500 ease-out",
                        isDark
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-90 absolute",
                      ].join(" ")}
                    />
                    <Sun
                      className={[
                        "h-3 w-3 md:h-4 md:w-4 text-amber-500 transition-all duration-500 ease-out",
                        !isDark
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-90 absolute",
                      ].join(" ")}
                    />
                  </>
                )}
              </span>
            </button>

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

            {/* Avatar / Profile (initials only) */}
            <Link
              href={profileHref}
              aria-label="Profile and settings"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full overflow-hidden ring-2 ring-slate-200 hover:ring-[#00529B]/60 dark:ring-white/15 transition-all"
            >
              <span
                className="h-full w-full flex items-center justify-center text-sm font-semibold text-white"
                style={{ background: avatarColor }}
              >
                {userInitials.slice(0, 2).toUpperCase()}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
