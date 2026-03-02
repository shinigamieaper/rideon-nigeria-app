"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Check,
  X,
  ClipboardList,
  Users,
} from "lucide-react";
import {
  ActionModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

type SubmissionStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

interface DriverDoc {
  type: string;
  url: string;
}

interface Submission {
  id: string;
  status: SubmissionStatus;
  partnerId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city: string;
  documents?: DriverDoc[];
  driverId?: string;
  createdAt?: string | null;
}

export default function AdminPartnerDriverSubmissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<SubmissionStatus>("pending_review");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    id: string;
    action: "reject" | "request_changes";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");

  const fetchSubmissions = async (token: string) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/partner-driver-submissions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch submissions");
    }

    const data = await res.json();
    setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const token = await user.getIdToken();
        await fetchSubmissions(token);
      } catch (err: any) {
        setError(err?.message || "Failed to load submissions");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, statusFilter]);

  const handleAction = async (
    id: string,
    action: "approve" | "reject" | "request_changes",
    reason?: string,
  ) => {
    if (
      (action === "reject" || action === "request_changes") &&
      !String(reason || "").trim()
    ) {
      return;
    }
    try {
      setActionLoadingId(id);
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const res = await fetch("/api/admin/partner-driver-submissions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          action,
          reason: reason?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }

      await fetchSubmissions(token);
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const counts = useMemo(() => {
    const total = submissions.length;
    const approved = submissions.filter((s) => s.status === "approved").length;
    const rejected = submissions.filter((s) => s.status === "rejected").length;
    const pending = submissions.filter(
      (s) => s.status === "pending_review",
    ).length;
    const changesRequested = submissions.filter(
      (s) => s.status === "changes_requested",
    ).length;
    return { total, approved, rejected, pending, changesRequested };
  }, [submissions]);

  const docCount = (s: Submission) =>
    Array.isArray(s.documents) ? s.documents.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Partner Driver Submissions
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Review partner-submitted chauffeurs and approve into partner
                drivers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-[210px]">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as SubmissionStatus)}
              >
                <SelectTrigger className="h-11 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_review">Pending</SelectItem>
                  <SelectItem value="changes_requested">
                    Changes Requested
                  </SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.total}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pending
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.pending}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Changes
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.changesRequested}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Approved
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.approved}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Rejected
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.rejected}
            </p>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <ClipboardList className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
              <p>No submissions found</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                New partner driver submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Driver
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      City
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Docs
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                  {submissions.map((s) => {
                    const isPending = s.status === "pending_review";
                    const busy = actionLoadingId === s.id;
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
                              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {s.phone}
                                {s.email ? ` • ${s.email}` : ""}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Partner: {s.partnerId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {s.city}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">
                            {docCount(s)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {s.status.replace("_", " ")}
                          </span>
                          {s.driverId && (
                            <div className="text-[11px] text-slate-400 mt-1">
                              Driver: {s.driverId}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(s.id, "approve")}
                              disabled={!isPending || busy}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              title="Approve"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActionReason("");
                                setActionModal({
                                  id: s.id,
                                  action: "request_changes",
                                });
                              }}
                              disabled={!isPending || busy}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                              title="Request changes"
                            >
                              <AlertCircle className="h-4 w-4" />
                              Request changes
                            </button>
                            <button
                              onClick={() => {
                                setActionReason("");
                                setActionModal({ id: s.id, action: "reject" });
                              }}
                              disabled={!isPending || busy}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ActionModal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={
          actionModal?.action === "reject"
            ? "Reject Submission"
            : "Request Changes"
        }
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {actionModal?.action === "reject"
              ? "This will mark the submission as rejected."
              : "This will request changes from the partner."}
          </div>
        }
        confirmText={
          actionModal?.action === "reject" ? "Reject" : "Send Request"
        }
        confirmVariant={
          actionModal?.action === "reject" ? "destructive" : "primary"
        }
        reasonLabel={
          actionModal?.action === "reject"
            ? "Rejection reason"
            : "Requested changes"
        }
        reasonPlaceholder={
          actionModal?.action === "reject"
            ? "Enter rejection reason..."
            : "Enter requested changes..."
        }
        reasonValue={actionReason}
        onReasonValueChange={setActionReason}
        requireReason
        loading={Boolean(actionModal && actionLoadingId === actionModal.id)}
        onConfirm={() => {
          if (!actionModal) return;
          return handleAction(actionModal.id, actionModal.action, actionReason);
        }}
      />
    </div>
  );
}
