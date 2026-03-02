"use client";

import React from "react";
import { motion } from "motion/react";
import {
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  Fingerprint,
} from "lucide-react";

export interface IdentityVerificationCardProps
  extends React.ComponentPropsWithoutRef<"div"> {
  ninStatus: "pending" | "verified" | "failed" | "not_started";
  bvnStatus: "pending" | "verified" | "failed" | "not_started";
  overallStatus: "pending" | "verified" | "failed" | "not_started";
  lastRunAt?: string | null;
  onRunVerification?: () => void;
  isRunning?: boolean;
}

const statusConfig = {
  verified: {
    icon: CheckCircle2,
    label: "Verified",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800/50",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800/50",
  },
  failed: {
    icon: AlertCircle,
    label: "Failed",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800/50",
  },
  not_started: {
    icon: Clock,
    label: "Not Started",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
  },
};

const IdentityVerificationCard: React.FC<IdentityVerificationCardProps> = ({
  ninStatus,
  bvnStatus,
  overallStatus,
  lastRunAt,
  onRunVerification,
  isRunning = false,
  className,
  ...rest
}) => {
  const overall = statusConfig[overallStatus];
  const OverallIcon = overall.icon;

  const items = [
    { label: "NIN", status: ninStatus, required: true },
    { label: "BVN", status: bvnStatus, required: false },
  ];

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

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
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Identity Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verify your identity to complete your application
            </p>
          </div>
          <div
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              overall.bg,
              overall.color,
              overall.border,
              "border",
            ].join(" ")}
          >
            <OverallIcon className="w-3.5 h-3.5" />
            {overall.label}
          </div>
        </div>
      </div>

      {/* Verification Items */}
      <div className="p-5 sm:p-6 space-y-3">
        {items.map((item, index) => {
          const config = statusConfig[item.status];
          const Icon = config.icon;

          return (
            <motion.div
              key={item.label}
              className={[
                "flex items-center gap-3 p-3 rounded-xl",
                "bg-slate-50/80 dark:bg-slate-800/50",
                "border border-slate-200/60 dark:border-slate-700/50",
              ].join(" ")}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={[
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  config.bg,
                ].join(" ")}
              >
                <Fingerprint className={["w-4 h-4", config.color].join(" ")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-[10px] font-medium text-red-500 uppercase tracking-wider">
                      Required
                    </span>
                  )}
                  {!item.required && (
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Optional
                    </span>
                  )}
                </div>
              </div>
              <div
                className={[
                  "flex items-center gap-1.5 text-xs font-medium",
                  config.color,
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </div>
            </motion.div>
          );
        })}

        {lastRunAt && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2">
            Last verified: {formatDate(lastRunAt)}
          </p>
        )}
      </div>

      {/* Action Button */}
      {onRunVerification && overallStatus !== "verified" && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <motion.button
            onClick={onRunVerification}
            disabled={isRunning}
            className={[
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
              "bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white font-medium",
              "shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40",
              "transition-all duration-200 active:scale-[0.98]",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            whileHover={{ scale: isRunning ? 1 : 1.01 }}
            whileTap={{ scale: isRunning ? 1 : 0.98 }}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Run Verification
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default IdentityVerificationCard;
