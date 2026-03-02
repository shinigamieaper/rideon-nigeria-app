"use client";

import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export type ApplicationStatusType =
  | "not_applied"
  | "pending_review"
  | "needs_more_info"
  | "approved"
  | "rejected";

export interface ApplicationStatusCardProps
  extends React.ComponentPropsWithoutRef<"div"> {
  status: ApplicationStatusType;
  submittedAt?: string | null;
  updatedAt?: string | null;
  href?: string;
}

const statusConfig: Record<
  ApplicationStatusType,
  {
    icon: React.FC<{ className?: string }>;
    label: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    iconBg: string;
  }
> = {
  not_applied: {
    icon: FileText,
    label: "Not Applied",
    description: "Complete your profile and submit your application.",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
    iconBg: "from-slate-400 to-slate-500",
  },
  pending_review: {
    icon: Clock,
    label: "Under Review",
    description: "Our team is reviewing your application.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800/50",
    iconBg: "from-amber-400 to-amber-500",
  },
  needs_more_info: {
    icon: AlertCircle,
    label: "Action Required",
    description: "We need additional information from you.",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800/50",
    iconBg: "from-orange-400 to-orange-500",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    description: "Congratulations! You're ready to drive.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800/50",
    iconBg: "from-emerald-400 to-emerald-500",
  },
  rejected: {
    icon: XCircle,
    label: "Not Approved",
    description: "Contact support for more information.",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800/50",
    iconBg: "from-red-400 to-red-500",
  },
};

const ApplicationStatusCard: React.FC<ApplicationStatusCardProps> = ({
  status,
  submittedAt,
  updatedAt,
  href,
  className,
  ...rest
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const content = (
    <motion.div
      className={[
        "rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl",
        "border border-slate-200/80 dark:border-slate-800/60 shadow-lg",
        "p-5 sm:p-6 transition-all duration-200",
        href
          ? "hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
          : "",
        className || "",
      ].join(" ")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={href ? { y: -2 } : undefined}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <motion.div
          className={[
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-gradient-to-br shadow-lg",
            config.iconBg,
          ].join(" ")}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Application Status
            </h3>
            <div
              className={[
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                config.bg,
                config.color,
                config.border,
                "border",
              ].join(" ")}
            >
              {config.label}
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {config.description}
          </p>

          {/* Timestamps */}
          {(submittedAt || updatedAt) && (
            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              {submittedAt && <span>Submitted: {formatDate(submittedAt)}</span>}
              {updatedAt && <span>Updated: {formatDate(updatedAt)}</span>}
            </div>
          )}
        </div>

        {/* Chevron for clickable card */}
        {href && (
          <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 self-center" />
        )}
      </div>
    </motion.div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
};

export default ApplicationStatusCard;
