"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import {
  ApplicationStepper,
  IdentityVerificationCard,
  ApplicationStep,
} from "@/components";

export type FullTimeApplicationStatus =
  | "not_applied"
  | "pending_review"
  | "needs_more_info"
  | "approved"
  | "rejected";

interface StatusPageClientProps {
  status: FullTimeApplicationStatus;
  rejectionReason?: string | null;
  needsMoreInfoReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  errorMessage?: string | null;
  kycData?: {
    ninStatus: "pending" | "verified" | "failed" | "not_started";
    bvnStatus: "pending" | "verified" | "failed" | "not_started";
    overallStatus: "pending" | "verified" | "failed" | "not_started";
    lastRunAt?: string | null;
  };
}

const statusLabels: Record<FullTimeApplicationStatus, string> = {
  not_applied: "Not Applied",
  pending_review: "Under Review",
  needs_more_info: "Action Required",
  approved: "Approved",
  rejected: "Not Approved",
};

const statusBadgeStyles: Record<FullTimeApplicationStatus, string> = {
  not_applied:
    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  pending_review:
    "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  needs_more_info:
    "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  approved:
    "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
};

export default function StatusPageClient({
  status,
  rejectionReason,
  needsMoreInfoReason,
  createdAt,
  updatedAt,
  errorMessage,
  kycData,
}: StatusPageClientProps) {
  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Build stepper steps based on status
  const steps: ApplicationStep[] = [
    {
      id: "submit",
      title: "Submit Application",
      description: "Complete your details and upload your documents.",
      status: status === "not_applied" ? "current" : "completed",
    },
    {
      id: "review",
      title: "Admin Review",
      description: "Our team reviews your information and documents.",
      status:
        status === "pending_review" || status === "needs_more_info"
          ? "current"
          : status === "approved" || status === "rejected"
            ? "completed"
            : "upcoming",
    },
    {
      id: "decision",
      title: "Decision",
      description: "You'll see your final status here once a decision is made.",
      status:
        status === "approved" || status === "rejected"
          ? "completed"
          : "upcoming",
    },
  ];

  const nextStepMessage = {
    not_applied: "Start your application and submit your documents for review.",
    pending_review: "Please wait while our team reviews your application.",
    needs_more_info: "Update your application with the requested information.",
    approved:
      "You're approved! You'll be considered when clients request full-time drivers.",
    rejected: "You can apply again later with updated information.",
  };

  const nextStepCta = {
    not_applied: {
      label: "Start Application",
      href: "/full-time-driver/application/apply",
    },
    pending_review: {
      label: "View Documents",
      href: "/full-time-driver/application/documents",
    },
    needs_more_info: {
      label: "Update Application",
      href: "/full-time-driver/application/apply",
    },
    approved: { label: "Back to Portal", href: "/full-time-driver" },
    rejected: { label: "Back to Portal", href: "/full-time-driver" },
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/full-time-driver"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <motion.span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              statusBadgeStyles[status],
            ].join(" ")}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {statusLabels[status]}
          </motion.span>
        </div>

        {/* Hero Banner */}
        <motion.section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 sm:p-6 text-white shadow-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-white/5" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Full-Time Placement
                </h1>
                <p className="text-sm text-white/80 mt-0.5">
                  Track your application status and next steps.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {errorMessage ? (
          <motion.section
            className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-red-200/80 dark:border-red-900/30 shadow-lg p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Something went wrong
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {errorMessage}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <Link
                href="/full-time-driver/application/status"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Retry
              </Link>
            </div>
          </motion.section>
        ) : (
          <>
            {/* Current Status Card */}
            <motion.section
              className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Current Status
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {status === "not_applied"
                      ? "You have not started an application yet."
                      : status === "pending_review"
                        ? "Your application has been submitted and is under review."
                        : status === "needs_more_info"
                          ? "Action required: please update your application."
                          : status === "approved"
                            ? "You are approved for full-time placement consideration."
                            : "Your application was not approved at this time."}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div>Submitted: {formatDate(createdAt)}</div>
                  <div>Updated: {formatDate(updatedAt)}</div>
                </div>
              </div>

              {/* Rejection or Needs More Info Reason */}
              {status === "rejected" && rejectionReason && (
                <div className="mt-4 rounded-xl border border-red-200/50 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">
                    Reason
                  </div>
                  <div className="mt-1 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                    {rejectionReason}
                  </div>
                </div>
              )}

              {status === "needs_more_info" && (
                <div className="mt-4 rounded-xl border border-orange-200/50 dark:border-orange-800/30 bg-orange-50/50 dark:bg-orange-900/10 p-4">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-orange-600 dark:text-orange-400">
                    What to update
                  </div>
                  <div className="mt-1 text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                    {needsMoreInfoReason ||
                      "Please update your application details and resubmit."}
                  </div>
                  <Link
                    href="/full-time-driver/application/apply"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    Update Application
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </motion.section>

            {/* Application Progress Stepper */}
            <ApplicationStepper steps={steps} />

            {/* Identity Verification */}
            {kycData && status !== "not_applied" && (
              <IdentityVerificationCard
                ninStatus={kycData.ninStatus}
                bvnStatus={kycData.bvnStatus}
                overallStatus={kycData.overallStatus}
                lastRunAt={kycData.lastRunAt}
              />
            )}

            {/* Next Step */}
            <motion.section
              className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00529B] to-[#0077E6] text-white shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Next Step
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {nextStepMessage[status]}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={nextStepCta[status].href}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  {nextStepCta[status].label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.section>
          </>
        )}
      </div>
    </main>
  );
}
