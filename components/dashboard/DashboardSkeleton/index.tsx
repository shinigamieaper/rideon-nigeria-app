"use client";

import * as React from "react";
import { motion } from "motion/react";

export interface DashboardSkeletonProps
  extends React.ComponentPropsWithoutRef<"section"> {}

export default function DashboardSkeleton({
  className,
  ...rest
}: DashboardSkeletonProps) {
  return (
    <div className={className} {...rest}>
      <div className="py-6 space-y-6">
        {/* Hero skeleton - matching CustomerDashboardHero */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B]/10 via-[#0066BB]/10 to-[#0077E6]/10 p-5 sm:p-6 shadow-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <div className="relative z-10">
            <div className="h-4 w-32 bg-white/20 dark:bg-slate-700/40 rounded mb-2 animate-pulse" />
            <div className="h-8 w-48 bg-white/30 dark:bg-slate-700/50 rounded mb-4 animate-pulse" />
            <div className="h-4 w-64 bg-white/20 dark:bg-slate-700/40 rounded mb-5 animate-pulse" />

            {/* Action grid skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="rounded-xl bg-white/10 border border-white/20 p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-lg bg-white/15 mb-2 animate-pulse" />
                    <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Notification permission skeleton */}
        <motion.div
          className="rounded-2xl p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-slate-200/80 dark:bg-slate-700/60 rounded mb-2 animate-pulse" />
              <div className="h-3 w-56 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
          </div>
        </motion.div>

        {/* UpcomingTripCard skeleton */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50/60 to-white/40 dark:from-blue-900/20 dark:to-slate-900/40 backdrop-blur-lg border border-blue-200/60 dark:border-blue-900/40 shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: 0.3,
            }}
          />
          <div className="relative z-10">
            <div className="h-5 w-40 bg-slate-200/80 dark:bg-slate-700/60 rounded mb-4 animate-pulse" />
            <div className="flex gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-4 w-full bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
              </div>
              <div className="w-24 h-24 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            </div>
          </div>
        </motion.div>

        {/* RecentActivityFeed skeleton */}
        <motion.div
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="h-5 w-36 bg-slate-200/80 dark:bg-slate-700/60 rounded mb-4 animate-pulse" />
          <ul className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <motion.li
                key={i}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
                  <div className="h-2 w-1/3 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
