"use client";

import React from "react";
import { Bell, BellOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useFeatureFlags } from "@/hooks";
import { useFullTimeDriverPushNotifications } from "@/hooks/useFullTimeDriverPushNotifications";
import { cn } from "@/lib/utils";

export interface FullTimeDriverNotificationPermissionCardProps
  extends React.ComponentPropsWithoutRef<"div"> {
  compact?: boolean;
}

export default function FullTimeDriverNotificationPermissionCard({
  compact = false,
  className,
  ...rest
}: FullTimeDriverNotificationPermissionCardProps) {
  const { flags } = useFeatureFlags();
  const { status, isEnabled, enablePush, error } =
    useFullTimeDriverPushNotifications();

  if (!flags.pushNotifications) {
    return null;
  }

  if (status === "unsupported") {
    return null;
  }

  if (isEnabled && compact) {
    return null;
  }

  if (isEnabled) {
    return (
      <div
        className={cn(
          "rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4",
          className,
        )}
        {...rest}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-medium text-emerald-700 dark:text-emerald-400">
              Notifications enabled
            </p>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80">
              You'll get updates about your full-time driver application
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div
        className={cn(
          "rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4",
          className,
        )}
        {...rest}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <BellOff className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Notifications blocked
            </p>
            <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
              Enable notifications in your browser settings to receive
              application updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={cn(
          "rounded-2xl bg-red-500/10 border border-red-500/20 p-4",
          className,
        )}
        {...rest}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-red-700 dark:text-red-400">
              Notification error
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-500/80 mt-1">
              {error || "Something went wrong. Please try again."}
            </p>
            <button
              onClick={() => enablePush()}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div
        className={cn(
          "rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 p-4",
          className,
        )}
        {...rest}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
            <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Setting up notifications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-r from-[#0077E6]/10 to-[#00529B]/10 border border-[#00529B]/20 p-4",
        className,
      )}
      {...rest}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00529B]/20">
          <Bell className="h-5 w-5 text-[#00529B]" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[#00529B] dark:text-blue-400">
            Enable notifications
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Get notified when your application status changes and when action is
            required.
          </p>
          <button
            onClick={() => enablePush()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#00529B] px-4 py-2 text-sm font-medium text-white hover:bg-[#003d73] transition-colors"
          >
            <Bell className="h-4 w-4" />
            Enable Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
