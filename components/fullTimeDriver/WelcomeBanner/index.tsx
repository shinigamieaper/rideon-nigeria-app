"use client";

import React from "react";
import { motion } from "motion/react";
import { Sparkles, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export interface WelcomeBannerProps
  extends React.ComponentPropsWithoutRef<"div"> {
  userName?: string;
  applicationStatus?:
    | "not_applied"
    | "pending_review"
    | "needs_more_info"
    | "approved"
    | "rejected";
  completionPercent?: number;
}

const statusMessages: Record<
  string,
  { title: string; subtitle: string; icon: React.ReactNode }
> = {
  not_applied: {
    title: "Ready to join RideOn?",
    subtitle: "Complete your application to become a full-time driver.",
    icon: <Sparkles className="w-5 h-5" />,
  },
  pending_review: {
    title: "Application Under Review",
    subtitle: "Our team is reviewing your details. We'll update you soon.",
    icon: <Clock className="w-5 h-5" />,
  },
  needs_more_info: {
    title: "Action Required",
    subtitle: "We need additional information to process your application.",
    icon: <TrendingUp className="w-5 h-5" />,
  },
  approved: {
    title: "Welcome to the Team!",
    subtitle: "Your application has been approved. You're ready to drive.",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  rejected: {
    title: "Application Update",
    subtitle:
      "Your application wasn't approved this time. Contact support for details.",
    icon: <Clock className="w-5 h-5" />,
  },
};

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName,
  applicationStatus = "not_applied",
  completionPercent,
  className,
  ...rest
}) => {
  const status =
    statusMessages[applicationStatus] || statusMessages.not_applied;
  const greeting = getGreeting();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <motion.div
      className={[
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6]",
        "p-5 sm:p-6 shadow-xl",
        className || "",
      ].join(" ")}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-white/10"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-white/5"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <motion.p
              className="text-white/80 text-sm font-medium"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {greeting}
            </motion.p>
            <motion.h1
              className="text-xl sm:text-2xl font-bold text-white mt-0.5"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {userName || "Driver"}
            </motion.h1>
          </div>

          {/* Status indicator */}
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {status.icon}
            <span className="text-xs font-medium text-white/90 hidden sm:inline">
              {applicationStatus === "approved"
                ? "Active"
                : applicationStatus === "pending_review"
                  ? "In Review"
                  : applicationStatus === "needs_more_info"
                    ? "Action Needed"
                    : applicationStatus === "rejected"
                      ? "Declined"
                      : "Applying"}
            </span>
          </motion.div>
        </div>

        <motion.p
          className="text-white/70 text-sm mt-3 max-w-md"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {status.subtitle}
        </motion.p>

        {/* Completion progress (optional) */}
        {typeof completionPercent === "number" && completionPercent < 100 && (
          <motion.div
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
              <span>Profile completion</span>
              <span className="font-medium text-white">
                {completionPercent}%
              </span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: 0.6, delay: 0.4 }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default WelcomeBanner;
