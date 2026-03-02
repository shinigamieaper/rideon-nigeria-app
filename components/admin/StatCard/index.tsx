"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

export interface StatCardProps extends React.ComponentPropsWithoutRef<"div"> {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
  loading?: boolean;
  suffix?: string;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  href,
  loading = false,
  suffix = "",
  iconColor = "text-blue-600 dark:text-blue-400",
  iconBgColor = "bg-blue-100 dark:bg-blue-900/30",
  className = "",
  ...props
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Animated counter effect
  useEffect(() => {
    if (loading || typeof value !== "number") return;

    let start = 0;
    const end = value;
    const duration = 1500; // 1.5 seconds for smoother animation
    const increment = end / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, loading]);

  const content = (
    <div
      className={[
        "group relative overflow-hidden",
        "bg-white/60 dark:bg-slate-900/60",
        "backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-800/50",
        "rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6",
        "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
        "transition-all duration-500 ease-out",
        href
          ? "cursor-pointer hover:shadow-2xl hover:shadow-slate-300/60 dark:hover:shadow-slate-900/80 sm:hover:-translate-y-2 sm:hover:scale-[1.02]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Multi-layer background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-slate-100/40 dark:from-slate-800/40 dark:via-transparent dark:to-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Accent gradient glow */}
      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/0 via-blue-400/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:via-blue-400/10 group-hover:to-cyan-500/10 blur-xl transition-all duration-700 rounded-3xl" />

      {/* Border shine effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-400/0 via-transparent to-cyan-400/0 group-hover:from-blue-400/20 group-hover:to-cyan-400/20 transition-all duration-500" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4 sm:mb-5">
          {/* Enhanced icon container */}
          <div
            className={`${iconBgColor} p-3 sm:p-3.5 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 relative overflow-hidden`}
          >
            {/* Icon glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Icon
              className={`h-6 w-6 sm:h-7 sm:w-7 ${iconColor} relative z-10 transition-transform duration-300`}
            />
          </div>

          {trend && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm transition-all duration-300 ${
                trend.isPositive
                  ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 shadow-green-500/20"
                  : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 shadow-red-500/20"
              } shadow-lg group-hover:scale-110`}
            >
              <span className="text-sm sm:text-base">
                {trend.isPositive ? "↑" : "↓"}
              </span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p
            title={title}
            className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-600 dark:text-slate-400 tracking-wide uppercase leading-snug truncate sm:whitespace-normal sm:overflow-visible sm:text-clip sm:break-words transition-colors duration-300 group-hover:text-slate-700 dark:group-hover:text-slate-300"
          >
            {title}
          </p>
          {loading ? (
            <div className="h-8 sm:h-10 w-20 sm:w-28 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-1">
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">
                {typeof value === "number" ? displayValue : value}
              </p>
              {suffix && (
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-600 dark:text-slate-400 ml-0.5">
                  {suffix}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Animated shine effect on hover */}
      {href && (
        <div
          className={`absolute inset-0 -translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent ${
            isHovered ? "translate-x-full" : ""
          }`}
        />
      )}

      {/* Subtle bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
