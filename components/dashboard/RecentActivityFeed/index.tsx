"use client";

import * as React from "react";
import { motion } from "motion/react";
import Skeleton from "react-loading-skeleton";

export interface ActivityItem {
  icon?: React.ReactNode;
  tone?: "emerald" | "blue" | "rose" | "amber" | "gray";
  title: string;
  timestamp: string;
}

export interface RecentActivityFeedProps
  extends Omit<
    React.ComponentPropsWithoutRef<"section">,
    "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
  > {
  activity?: ActivityItem[];
  // Backward-compat: keep items as an alias so existing usages don't break
  items?: ActivityItem[];
  isLoading?: boolean;
  viewAllHref?: string;
}

const toneMap: Record<
  NonNullable<ActivityItem["tone"]>,
  { bg: string; text: string }
> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
  gray: { bg: "bg-slate-500/10", text: "text-slate-500" },
};

export default function RecentActivityFeed({
  activity,
  items,
  isLoading = false,
  viewAllHref = "/app/activity",
  className,
  ...rest
}: RecentActivityFeedProps) {
  const list = activity ?? items ?? [];
  return (
    <section className={className} {...rest}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <motion.div
          className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6"
          whileHover={{
            y: -2,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
          }}
          transition={{ duration: 0.3 }}
        >
          {isLoading ? (
            <div>
              <Skeleton width={160} height={20} className="mb-4" />
              <ul className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-center gap-4">
                    <Skeleton circle width={40} height={40} />
                    <div className="flex-1 min-w-0">
                      <Skeleton height={14} width="60%" />
                      <div className="mt-1">
                        <Skeleton height={10} width="30%" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <motion.h2
                className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-4"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                Recent Activity
              </motion.h2>
              <motion.ul
                className="space-y-4"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.3,
                    },
                  },
                }}
              >
                {list.map((item, idx) => {
                  const t = toneMap[item.tone ?? "gray"];
                  return (
                    <motion.li
                      key={idx}
                      className="flex items-center gap-4"
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        show: { opacity: 1, x: 0 },
                      }}
                    >
                      <motion.div
                        className={[
                          "w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center",
                          t.bg,
                        ].join(" ")}
                        whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className={["w-5 h-5", t.text].join(" ")}>
                          {item.icon}
                        </div>
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.timestamp}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </motion.ul>
              <motion.div
                className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.a
                  href={viewAllHref}
                  className="block text-center text-sm font-medium text-[#00529B] hover:opacity-90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View All Activity
                </motion.a>
              </motion.div>
            </>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
