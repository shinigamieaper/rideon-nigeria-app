"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, Loader2, User } from "lucide-react";
import { auth } from "@/lib/firebase";
import { usePartnerTeam } from "@/hooks";

type SubmissionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

interface DriverDoc {
  type: string;
  url: string;
}

interface SubmissionRow {
  id: string;
  status: SubmissionStatus;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  documents: DriverDoc[];
  changesRequestedMessage: string | null;
  rejectedReason: string | null;
  updatedAt: string | null;
}

function statusPill(status: SubmissionStatus) {
  const styles: Record<SubmissionStatus, string> = {
    draft: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
    pending_review:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    changes_requested:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    approved:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function PartnerDriversPage() {
  const router = useRouter();
  const { isTeamMember, teamRole } = usePartnerTeam();
  const isReadOnlyTeam =
    isTeamMember && teamRole !== "admin" && teamRole !== "manager";
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<SubmissionRow[]>([]);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const user = auth.currentUser;
        if (!user) {
          router.replace("/login");
          return;
        }

        let token = await user.getIdToken();

        const fetchList = async (t: string) =>
          fetch("/api/partner/drivers/submissions", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
          });

        let res = await fetchList(token);
        if (res.status === 403) {
          token = await user.getIdToken(true);
          res = await fetchList(token);
        }

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to load submissions.");
        }

        const j = await res.json();
        const submissions = Array.isArray(j?.submissions)
          ? (j.submissions as SubmissionRow[])
          : [];

        if (!mounted) return;
        setRows(submissions);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Something went wrong.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Drivers
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create partner drivers and submit documents for admin verification.
          </p>
        </div>

        {isReadOnlyTeam ? null : (
          <Link
            href="/partner/drivers/new"
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90"
            style={{ backgroundColor: "#00529B" }}
          >
            Add driver
          </Link>
        )}
      </div>

      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Loading submissions…</span>
          </div>
        ) : err ? (
          <div className="flex items-start gap-3 p-6 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Couldn’t load submissions</p>
              <p className="text-sm">{err}</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600 dark:text-slate-400">
            <User className="h-10 w-10 opacity-60" />
            <p className="mt-3 text-sm font-semibold">
              No driver submissions yet
            </p>
            <p className="mt-1 text-sm">
              Create your first driver submission to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/50 dark:divide-slate-800/60">
            {rows.map((r) => {
              const name = `${r.firstName} ${r.lastName}`.trim() || "Driver";
              const canEdit =
                r.status === "draft" || r.status === "changes_requested";
              const actionLabel = canEdit ? "Continue" : "View";

              return (
                <Link
                  key={r.id}
                  href={`/partner/drivers/submissions/${encodeURIComponent(r.id)}`}
                  className="block p-6 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {name}
                        </p>
                        {statusPill(r.status)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                        {r.city || "—"} • {r.phone || "—"}
                        {r.email ? ` • ${r.email}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {Array.isArray(r.documents) ? r.documents.length : 0}{" "}
                        document(s)
                      </p>
                      {r.status === "changes_requested" &&
                      r.changesRequestedMessage ? (
                        <p className="mt-2 text-xs text-blue-700 dark:text-blue-300 truncate">
                          {r.changesRequestedMessage}
                        </p>
                      ) : null}
                      {r.status === "rejected" && r.rejectedReason ? (
                        <p className="mt-2 text-xs text-red-700 dark:text-red-300 truncate">
                          {r.rejectedReason}
                        </p>
                      ) : null}
                    </div>

                    <div
                      className="inline-flex items-center gap-1 text-sm font-semibold flex-shrink-0"
                      style={{ color: "#00529B" }}
                    >
                      {actionLabel}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
