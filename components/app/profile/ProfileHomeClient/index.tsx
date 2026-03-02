"use client";

import React from "react";
import Link from "next/link";
import { waitForUser } from "@/lib/firebase";
import {
  UserRound,
  Bell,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Shield,
} from "lucide-react";

export interface ProfileHomeClientProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export default function ProfileHomeClient({
  className,
  ...rest
}: ProfileHomeClientProps) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await waitForUser(3500);
      } catch {
        // ignore; keep page usable even if offline
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = [
    {
      href: "/app/profile/details",
      title: "My Profile",
      icon: <UserRound className="h-5 w-5" />,
    },
    {
      href: "/app/profile/notifications",
      title: "Notification Settings",
      icon: <Bell className="h-5 w-5" />,
    },
    {
      href: "/app/profile/account",
      title: "Account & Privacy",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      href: "/app/profile/support",
      title: "Contact Support",
      icon: <LifeBuoy className="h-5 w-5" />,
    },
    {
      href: "/app/profile/logout",
      title: "Logout",
      icon: <LogOut className="h-5 w-5" />,
    },
  ];

  return (
    <div className={className} {...rest}>
      {loading ? (
        <div className="overflow-hidden rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg divide-y divide-slate-200/80 dark:divide-slate-800/60 animate-pulse">
          {items.map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-9 w-9 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="h-5 w-5 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg divide-y divide-slate-200/80 dark:divide-slate-800/60">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/60 dark:hover:bg-slate-900/60 transition"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60">
                {it.icon}
              </span>
              <span className="flex-1 min-w-0 text-[15px] font-medium text-slate-900 dark:text-slate-100">
                {it.title}
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
