import Link from "next/link";
import {
  UserRound,
  Bell,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Shield,
} from "lucide-react";

export default function Page() {
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
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Account Settings
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Manage your personal information, privacy, notifications, and get help.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg divide-y divide-slate-200/80 dark:divide-slate-800/60">
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
    </div>
  );
}
