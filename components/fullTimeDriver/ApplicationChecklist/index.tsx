"use client";

import React from "react";
import { motion } from "motion/react";
import { CheckCircle2, Circle, AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

export interface ChecklistItem {
  id: string;
  label: string;
  status: "complete" | "incomplete" | "review" | "error";
  href?: string;
  detail?: string;
}

export interface ApplicationChecklistProps
  extends React.ComponentPropsWithoutRef<"div"> {
  items: ChecklistItem[];
  title?: string;
  subtitle?: string;
}

const statusConfig = {
  complete: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    label: "Done",
    labelColor: "text-emerald-600 dark:text-emerald-400",
  },
  incomplete: {
    icon: Circle,
    color: "text-slate-300 dark:text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    label: "Pending",
    labelColor: "text-slate-500 dark:text-slate-400",
  },
  review: {
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    label: "Review",
    labelColor: "text-amber-600 dark:text-amber-400",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "Action Needed",
    labelColor: "text-red-600 dark:text-red-400",
  },
};

const ApplicationChecklist: React.FC<ApplicationChecklistProps> = ({
  items,
  title = "Checklist",
  subtitle,
  className,
  ...rest
}) => {
  const completedCount = items.filter((i) => i.status === "complete").length;
  const progressPercent =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <motion.div
      className={[
        "rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl",
        "border border-slate-200/80 dark:border-slate-800/60 shadow-lg",
        "overflow-hidden",
        className || "",
      ].join(" ")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with progress */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {completedCount}
            </span>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              /{items.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          {progressPercent}% complete
        </p>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
        {items.map((item, index) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;
          const isClickable = !!item.href;

          const content = (
            <motion.div
              className={[
                "flex items-center gap-3 px-5 sm:px-6 py-4",
                isClickable
                  ? "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  : "",
              ].join(" ")}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className={[
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  config.bg,
                ].join(" ")}
              >
                <Icon className={["w-4 h-4", config.color].join(" ")} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.label}
                </span>
                {item.detail && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {item.detail}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={["text-xs font-medium", config.labelColor].join(
                    " ",
                  )}
                >
                  {config.label}
                </span>
                {isClickable && (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </motion.div>
          );

          return item.href ? (
            <Link key={item.id} href={item.href}>
              {content}
            </Link>
          ) : (
            <div key={item.id}>{content}</div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ApplicationChecklist;
