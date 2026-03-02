import { LayoutDashboard } from "lucide-react";
import React from "react";
import Link from "next/link";

interface AdminHeaderProps extends React.ComponentPropsWithoutRef<"header"> {
  title?: string;
  subtitle?: string;
  showQuickNav?: boolean;
}

export function AdminHeader({
  title = "Platform Dashboard",
  subtitle = "Real-time operations center",
  showQuickNav = true,
  className = "",
  ...props
}: AdminHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/50 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 ${className}`}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Enhanced logo/icon */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl blur group-hover:blur-md transition-all duration-300 opacity-60 group-hover:opacity-100" />
              <div className="relative p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-xl shadow-blue-500/30 dark:shadow-blue-500/50 group-hover:scale-110 transition-transform duration-300">
                <LayoutDashboard className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Quick Nav */}
          {showQuickNav && (
            <nav className="hidden md:flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-inner">
              <Link
                href="/admin"
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-300 hover:shadow-md"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-300 hover:shadow-md"
              >
                Users
              </Link>
              <Link
                href="/admin/drivers"
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-300 hover:shadow-md"
              >
                Drivers
              </Link>
              <Link
                href="/admin/bookings"
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-300 hover:shadow-md"
              >
                Bookings
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
