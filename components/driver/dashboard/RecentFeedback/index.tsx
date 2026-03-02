"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export interface FeedbackItem {
  id: string;
  liked: boolean;
  compliments?: string[];
  issues?: string[];
  comment?: string;
  customerName?: string;
  customerInitial?: string;
  createdAt: string;
}

export interface RecentFeedbackProps
  extends React.ComponentPropsWithoutRef<"section"> {
  items: FeedbackItem[];
  /** Link to view all feedback */
  viewAllHref?: string;
}

export default function RecentFeedback({
  items,
  viewAllHref = "/driver/performance",
  className,
}: RecentFeedbackProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <motion.section
      className={[
        "relative overflow-hidden p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg",
        className || "",
      ].join(" ")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      whileHover={{ y: -2, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }}
    >
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/8 to-amber-400/5"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#00529B] dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Feedback
            </h3>
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="group text-sm text-[#00529B] dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              View all
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </motion.div>

        {/* Feedback list */}
        {items.length === 0 ? (
          <motion.div
            className="text-center py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <motion.div
              className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <Sparkles className="w-6 h-6 text-slate-400" />
            </motion.div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No feedback yet. Complete reservations to receive customer
              ratings!
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                className={[
                  "p-3 rounded-xl border",
                  item.liked
                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30"
                    : "bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30",
                ].join(" ")}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
                whileHover={{ scale: 1.01, x: 2 }}
              >
                <div className="flex items-start gap-3">
                  {/* Thumb icon */}
                  <motion.div
                    className={[
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      item.liked ? "bg-emerald-500/20" : "bg-red-500/20",
                    ].join(" ")}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      delay: 0.15 + index * 0.08,
                    }}
                  >
                    {item.liked ? (
                      <ThumbsUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ThumbsDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Customer name & date */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {item.customerName || "Customer"}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    {/* Compliments or issues */}
                    {item.liked &&
                      item.compliments &&
                      item.compliments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {item.compliments.slice(0, 3).map((c, i) => (
                            <motion.span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/30"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: 0.2 + index * 0.08 + i * 0.05,
                              }}
                            >
                              {c}
                            </motion.span>
                          ))}
                          {item.compliments.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              +{item.compliments.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                    {!item.liked && item.issues && item.issues.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {item.issues.slice(0, 2).map((issue, i) => (
                          <motion.span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-700/30"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: 0.2 + index * 0.08 + i * 0.05,
                            }}
                          >
                            {issue}
                          </motion.span>
                        ))}
                        {item.issues.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            +{item.issues.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Comment (only show for positive feedback) */}
                    {item.liked && item.comment && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 italic line-clamp-2">
                        &ldquo;{item.comment}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
