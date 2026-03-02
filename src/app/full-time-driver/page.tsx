"use client";

import * as React from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { motion } from "motion/react";
import {
  Loader2,
  FileText,
  FolderOpen,
  Eye,
  ChevronRight,
  MessageSquare,
  Users,
} from "lucide-react";
import {
  WelcomeBanner,
  ApplicationStatusCard,
  FullTimeDriverNotificationPermissionCard,
  IdentityVerificationCard,
  ApplicationChecklist,
  type ApplicationStatusType,
  type ChecklistItem,
} from "@/components";

type KycSummary = {
  overallStatus: "pending" | "verified" | "failed" | "not_started";
  nin: "pending" | "verified" | "failed" | "not_started";
  bvn: "pending" | "verified" | "failed" | "not_started";
  lastRunAt: string | null;
};

async function waitForUser(timeoutMs = 5000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    let unsub: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      if (unsub) unsub();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);
    unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      window.clearTimeout(timer);
      if (unsub) unsub();
      resolve(u);
    });
  });
}

function normalizeKycStatus(
  input: unknown,
): "pending" | "verified" | "failed" | "not_started" {
  const s = String(input || "")
    .trim()
    .toLowerCase();
  if (s === "verified" || s === "valid") return "verified";
  if (s === "failed" || s === "invalid") return "failed";
  if (s === "pending") return "pending";
  return "not_started";
}

export default function FullTimeDriverHomePage() {
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] =
    React.useState<ApplicationStatusType>("not_applied");
  const [error, setError] = React.useState<string | null>(null);
  const [driverFirstName, setDriverFirstName] =
    React.useState<string>("Driver");
  const [referencesSummary, setReferencesSummary] = React.useState<{
    required: number;
    completed: number;
  } | null>(null);
  const [kycSummary, setKycSummary] = React.useState<KycSummary | null>(null);
  const [runningKyc, setRunningKyc] = React.useState(false);
  const [documentsUploaded, setDocumentsUploaded] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const user = await waitForUser();
        const token = await user.getIdToken();

        const fetchJson = async (url: string) => {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const j = await res.json().catch(() => ({}));
          return { ok: res.ok, json: j };
        };

        const [ft, d] = await Promise.all([
          fetchJson("/api/full-time-driver/me"),
          fetchJson("/api/users/me"),
        ]);

        if (!ft.ok)
          throw new Error(
            ft.json?.error || "Failed to load application status.",
          );

        const s = String(ft.json?.status || "not_applied");
        const normalized: ApplicationStatusType =
          s === "pending_review" ||
          s === "approved" ||
          s === "rejected" ||
          s === "not_applied" ||
          s === "needs_more_info"
            ? (s as ApplicationStatusType)
            : "not_applied";

        if (mounted) {
          setStatus(normalized);
          setReferencesSummary(
            ft.json?.referencesSummary &&
              typeof ft.json.referencesSummary === "object" &&
              Number.isFinite(Number(ft.json.referencesSummary?.required)) &&
              Number.isFinite(Number(ft.json.referencesSummary?.completed))
              ? {
                  required: Number(ft.json.referencesSummary.required),
                  completed: Number(ft.json.referencesSummary.completed),
                }
              : null,
          );

          const ks = ft.json?.kycSummary;
          setKycSummary(
            ks && typeof ks === "object"
              ? {
                  overallStatus: normalizeKycStatus((ks as any).overallStatus),
                  nin: normalizeKycStatus((ks as any).nin),
                  bvn: normalizeKycStatus((ks as any).bvn),
                  lastRunAt:
                    typeof (ks as any).lastRunAt === "string"
                      ? (ks as any).lastRunAt
                      : null,
                }
              : null,
          );

          if (
            d.ok &&
            typeof d.json?.firstName === "string" &&
            d.json.firstName.trim()
          ) {
            setDriverFirstName(d.json.firstName.trim());
          } else if (
            typeof user?.displayName === "string" &&
            user.displayName.trim()
          ) {
            setDriverFirstName(
              user.displayName.trim().split(" ")[0] || "Driver",
            );
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const runKyc = React.useCallback(async () => {
    if (runningKyc) return;
    if (status === "not_applied") {
      setError("Please submit your application details first.");
      return;
    }

    try {
      setRunningKyc(true);
      setError(null);

      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch("/api/full-time-driver/kyc/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to run verification.");

      const ftRes = await fetch("/api/full-time-driver/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const ftJson = await ftRes.json().catch(() => ({}));

      if (ftRes.ok) {
        const ks = ftJson?.kycSummary;
        setKycSummary(
          ks && typeof ks === "object"
            ? {
                overallStatus: normalizeKycStatus((ks as any).overallStatus),
                nin: normalizeKycStatus((ks as any).nin),
                bvn: normalizeKycStatus((ks as any).bvn),
                lastRunAt:
                  typeof (ks as any).lastRunAt === "string"
                    ? (ks as any).lastRunAt
                    : null,
              }
            : null,
        );
      }
    } catch (e: any) {
      setError(e?.message || "Failed to run verification.");
    } finally {
      setRunningKyc(false);
    }
  }, [runningKyc, status]);

  const statusLabel: Record<ApplicationStatusType, string> = {
    not_applied: "Not Applied",
    pending_review: "Under Review",
    needs_more_info: "Action Required",
    approved: "Approved",
    rejected: "Not Approved",
  };

  const badgeClass: Record<ApplicationStatusType, string> = {
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

  const primaryCtaHref =
    status === "not_applied"
      ? "/full-time-driver/application/apply"
      : "/full-time-driver/application/status";
  const primaryCtaLabel =
    status === "not_applied" ? "Start Application" : "View Status";

  const secondaryCtaHref =
    status === "not_applied"
      ? "/full-time-driver/application/apply"
      : "/full-time-driver/application/documents";
  const secondaryCtaLabel =
    status === "not_applied" ? "Continue" : "Upload / Update Documents";

  const nextStepCopy =
    status === "not_applied"
      ? "Complete your profile and submit your documents."
      : status === "pending_review"
        ? "Your application is being reviewed. You can still update your documents if needed."
        : status === "approved"
          ? "You’re approved. Next, watch for placement opportunities and keep your documents up to date."
          : "You can re-apply later with updated information and documents.";

  // Build checklist items
  const checklistItems: ChecklistItem[] = [
    {
      id: "application",
      label: "Application details submitted",
      status: status === "not_applied" ? "incomplete" : "complete",
      href: "/full-time-driver/application/apply",
    },
    {
      id: "documents",
      label: "Documents uploaded",
      status: status === "not_applied" ? "incomplete" : "review",
      href: "/full-time-driver/application/documents",
    },
    {
      id: "references",
      label: "References confirmed",
      status:
        referencesSummary &&
        referencesSummary.completed >= referencesSummary.required
          ? "complete"
          : "incomplete",
      detail: referencesSummary
        ? `${referencesSummary.completed} of ${referencesSummary.required} confirmed`
        : undefined,
    },
    {
      id: "kyc",
      label: "Identity verification",
      status:
        kycSummary?.overallStatus === "verified"
          ? "complete"
          : kycSummary?.overallStatus === "pending"
            ? "review"
            : "incomplete",
    },
  ];

  if (loading) {
    return (
      <main className="min-h-dvh bg-background text-foreground">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-5">
          <div className="h-32 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 animate-pulse" />
          <div className="h-40 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="h-64 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
            <div className="h-64 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-5">
        {/* Welcome Banner */}
        <WelcomeBanner userName={driverFirstName} applicationStatus={status} />

        {/* Error Banner */}
        {error && (
          <motion.div
            className="rounded-xl border border-red-200/80 dark:border-red-900/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Application Status Card */}
        <ApplicationStatusCard
          status={status}
          href="/full-time-driver/application/status"
        />

        {status !== "not_applied" && (
          <FullTimeDriverNotificationPermissionCard compact />
        )}

        {/* Quick Actions + Verification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Quick Actions */}
          <motion.section
            className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                {
                  href: "/full-time-driver/application/apply",
                  icon: FileText,
                  label: "Update application details",
                },
                {
                  href: "/full-time-driver/application/documents",
                  icon: FolderOpen,
                  label: "Upload / replace documents",
                },
                {
                  href: "/full-time-driver/application/status",
                  icon: Eye,
                  label: "View review progress",
                },
                {
                  href: "/full-time-driver/messages",
                  icon: MessageSquare,
                  label: "Messages",
                },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/30 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-950/50 transition-all hover:shadow-sm"
                >
                  <action.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </motion.section>

          {/* Identity Verification */}
          {status !== "not_applied" && kycSummary ? (
            <IdentityVerificationCard
              ninStatus={kycSummary.nin}
              bvnStatus={kycSummary.bvn}
              overallStatus={kycSummary.overallStatus}
              lastRunAt={kycSummary.lastRunAt}
              onRunVerification={runKyc}
              isRunning={runningKyc}
            />
          ) : (
            <motion.section
              className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077E6] to-[#00529B] flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Identity Verification
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submit your application to enable verification
                  </p>
                </div>
              </div>
              <Link
                href="/full-time-driver/application/apply"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Start Application
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.section>
          )}
        </div>

        {/* Checklist */}
        <ApplicationChecklist
          items={checklistItems}
          title="Application Checklist"
          subtitle="Complete these steps to avoid delays in your application review."
        />
      </div>
    </main>
  );
}
