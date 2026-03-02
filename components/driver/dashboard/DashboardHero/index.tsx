"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Bell,
  ChevronRight,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { OnlineToggleLive } from "@/components";

export type FullTimeApplicationStatus =
  | "not_applied"
  | "pending_review"
  | "approved"
  | "rejected";

export interface DashboardHeroProps {
  driverName: string;
  isOnline: boolean;
  onStatusChange: (online: boolean) => void | Promise<void>;
  pendingOffersCount: number;
  fullTimeStatus: FullTimeApplicationStatus;
  unreadNotifications?: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const statusConfig: Record<
  FullTimeApplicationStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.FC<{ className?: string }>;
    ctaLabel: string;
    ctaHref: string;
  }
> = {
  not_applied: {
    label: "Not Applied",
    badgeClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
    icon: FileText,
    ctaLabel: "Apply for Full-Time Placement",
    ctaHref: "/full-time-driver/application/apply",
  },
  pending_review: {
    label: "Pending Review",
    badgeClass:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    icon: Clock,
    ctaLabel: "View Application Status",
    ctaHref: "/full-time-driver/application/status",
  },
  approved: {
    label: "Approved",
    badgeClass:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    icon: CheckCircle2,
    ctaLabel: "View Application Status",
    ctaHref: "/full-time-driver/application/status",
  },
  rejected: {
    label: "Not Approved",
    badgeClass: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    icon: XCircle,
    ctaLabel: "View Application Status",
    ctaHref: "/full-time-driver/application/status",
  },
};

export default function DashboardHero({
  driverName,
  isOnline,
  onStatusChange,
  pendingOffersCount,
  fullTimeStatus,
  unreadNotifications = 0,
}: DashboardHeroProps) {
  const greeting = getGreeting();
  const ftConfig = statusConfig[fullTimeStatus];
  const FtIcon = ftConfig.icon;

  return (
    <div className="space-y-5">
      {/* Hero Section: Greeting + Status */}
      <motion.section
        data-tour="driver-dashboard-hero"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 sm:p-6 text-white shadow-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Animated background decoration */}
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

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <motion.p
              className="text-sm text-white/70 font-medium"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {greeting}
            </motion.p>
            <motion.h1
              className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {driverName}
            </motion.h1>
          </div>
          <motion.div
            data-tour="driver-online-toggle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <OnlineToggleLive
              initialStatus={isOnline}
              onStatusChange={onStatusChange}
              className="!py-0"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* Pending requests banner */}
      {pendingOffersCount > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Link
            href="/driver/bookings/new"
            data-tour="driver-pending-requests"
            className="group flex items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/40 px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-100 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <motion.span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-500/30"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {pendingOffersCount}
              </motion.span>
              <span>
                New booking request{pendingOffersCount !== 1 ? "s" : ""} waiting
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      )}

      {/* Full-Time Placement Card */}
      <motion.section
        className="relative overflow-hidden rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        whileHover={{
          y: -2,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Animated background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#00529B]/8 to-[#0077E6]/8"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 7, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <motion.div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00529B] to-[#0077E6] text-white shadow-lg shadow-blue-500/25"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <Briefcase className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <motion.h2
                  className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Full-Time Placement
                </motion.h2>
                <motion.span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    ftConfig.badgeClass,
                  ].join(" ")}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <FtIcon className="w-3 h-3" />
                  {ftConfig.label}
                </motion.span>
              </div>
              <motion.p
                className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                Apply to be considered for verified full-time driver placements.
              </motion.p>
            </div>
          </div>
        </div>

        <motion.div
          className="relative z-10 mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            href={ftConfig.ctaHref}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00529B]"
          >
            {ftConfig.ctaLabel}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </motion.section>
    </div>
  );
}
