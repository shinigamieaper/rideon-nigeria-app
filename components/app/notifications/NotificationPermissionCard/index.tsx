"use client";

import React from "react";
import { motion } from "motion/react";
import { Bell, BellOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useFeatureFlags } from "@/hooks";
import { useCustomerPushNotifications } from "@/hooks/useCustomerPushNotifications";
import { cn } from "@/lib/utils";

export interface CustomerNotificationPermissionCardProps
  extends Omit<
    React.ComponentPropsWithoutRef<"div">,
    "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
  > {
  /** Compact mode - hides when enabled */
  compact?: boolean;
}

/**
 * Card component for enabling push notifications for customers
 */
export default function CustomerNotificationPermissionCard({
  compact = false,
  className,
  ...rest
}: CustomerNotificationPermissionCardProps) {
  const { flags } = useFeatureFlags();
  const { status, isEnabled, enablePush, error } =
    useCustomerPushNotifications();

  // Respect pushNotifications feature flag – hide card entirely when disabled
  if (!flags.pushNotifications) {
    return null;
  }

  // Don't render if unsupported
  if (status === "unsupported") {
    return null;
  }

  // Already enabled - hide in compact mode
  if (isEnabled && compact) {
    return null;
  }

  if (isEnabled) {
    return (
      <motion.div
        className={cn(
          "rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4",
          className,
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        {...rest}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              Notifications enabled
            </p>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80">
              You'll receive updates about your bookings
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Denied state
  if (status === "denied") {
    return (
      <motion.div
        className={cn(
          "rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4",
          className,
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        {...rest}
      >
        <div className="flex items-start gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20"
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <BellOff className="h-5 w-5 text-amber-500" />
          </motion.div>
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Notifications blocked
            </p>
            <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
              Enable notifications in your browser settings to receive booking
              updates.
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <motion.div
        className={cn(
          "rounded-2xl bg-red-500/10 border border-red-500/20 p-4",
          className,
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        {...rest}
      >
        <div className="flex items-start gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <AlertCircle className="h-5 w-5 text-red-500" />
          </motion.div>
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="font-medium text-red-700 dark:text-red-400">
              Notification error
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-500/80 mt-1">
              {error || "Something went wrong. Please try again."}
            </p>
            <motion.button
              onClick={() => enablePush()}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try again
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Loading state
  if (status === "loading") {
    return (
      <motion.div
        className={cn(
          "rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 p-4",
          className,
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        {...rest}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
            <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
          </div>
          <motion.p
            className="text-sm text-slate-600 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            Setting up notifications...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  // Prompt state - show enable button
  return (
    <motion.div
      className={cn(
        "rounded-2xl bg-gradient-to-r from-[#0077E6]/10 to-[#00529B]/10 border border-[#00529B]/20 p-4",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0 10px 30px -10px rgba(0, 82, 155, 0.2)",
      }}
      {...rest}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00529B]/20"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Bell className="h-5 w-5 text-[#00529B]" />
        </motion.div>
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="font-medium text-[#00529B] dark:text-blue-400">
            Stay updated on your bookings
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Get notified when your driver is assigned, en route, and more.
          </p>
          <motion.button
            onClick={() => enablePush()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#00529B] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d73] transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 4px 12px rgba(0, 82, 155, 0.3)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell className="h-4 w-4" />
            Enable Notifications
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
