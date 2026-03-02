"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { AlertCircle, Building2, Check, Loader2, X } from "lucide-react";
import {
  ActionModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

type ApplicationStatus = "pending_review" | "approved" | "rejected";

type KycStatus = "pending" | "passed" | "failed";

interface PartnerApplication {
  id: string;
  status: ApplicationStatus;
  partnerType: "individual" | "business";
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  cacNumber: string;
  kycSummary: {
    overallStatus: KycStatus;
    cac: KycStatus;
    individualId: KycStatus;
    director: KycStatus;
    lastRunAt: string | null;
  };
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface PartnerAccount {
  id: string;
  status: "approved" | "suspended" | string;
  partnerType: "individual" | "business" | string;
  businessName: string;
  email: string;
  phoneNumber: string;
  live: boolean;
  approvedVehicles: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"applications" | "partners">("applications");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [partners, setPartners] = useState<PartnerAccount[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    "pending_review",
  );
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<
    "approved" | "suspended" | "all"
  >("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    kind: "application" | "partner";
    id: string;
    action: "reject" | "suspend";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");

  const fetchApplications = async (token: string) => {
    const res = await fetch("/api/admin/partners/applications", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch partner applications");
    }

    const data = await res.json().catch(() => ({}));
    setApplications(Array.isArray(data.applications) ? data.applications : []);
  };

  const fetchPartners = async (token: string) => {
    const params = new URLSearchParams();
    if (partnerStatusFilter !== "all")
      params.set("status", partnerStatusFilter);

    const res = await fetch(`/api/admin/partners?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch partners");
    }

    const data = await res.json().catch(() => ({}));
    setPartners(Array.isArray(data.partners) ? data.partners : []);
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
        if (tab === "applications") {
          await fetchApplications(token);
        } else {
          await fetchPartners(token);
        }
      } catch (err: any) {
        setError(
          err?.message ||
            (tab === "applications"
              ? "Failed to load partner applications"
              : "Failed to load partners"),
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, tab, partnerStatusFilter]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const filteredPartners = useMemo(() => {
    if (partnerStatusFilter === "all") return partners;
    return partners.filter((p) => p.status === partnerStatusFilter);
  }, [partners, partnerStatusFilter]);

  const counts = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(
      (a) => a.status === "pending_review",
    ).length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [applications]);

  const partnerCounts = useMemo(() => {
    const total = partners.length;
    const approved = partners.filter((p) => p.status === "approved").length;
    const suspended = partners.filter((p) => p.status === "suspended").length;
    return { total, approved, suspended };
  }, [partners]);

  const handleAction = async (
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    if (action === "reject" && !String(reason || "").trim()) {
      return;
    }
    try {
      setActionLoadingId(id);
      setError(null);

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const res = await fetch("/api/admin/partners/applications", {
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

      await fetchApplications(token);
      setActionModal(null);
      setActionReason("");
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePartnerAction = async (
    id: string,
    action: "suspend" | "reinstate",
    reason?: string,
  ) => {
    if (action === "suspend" && !String(reason || "").trim()) {
      return;
    }
    try {
      setActionLoadingId(id);
      setError(null);

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason: reason?.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }

      await fetchPartners(token);
      setActionModal(null);
      setActionReason("");
    } catch (err: any) {
      setError(err?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      approved:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      suspended: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    };

    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending_review}`}
      >
        {String(status).replace("_", " ")}
      </span>
    );
  };

  const kycBadge = (status: KycStatus) => {
    const styles: Record<KycStatus, string> = {
      pending:
        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
      passed:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    };

    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div
          data-tour="admin-partners-header"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Partners
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {tab === "applications"
                  ? "Review partner applications and approve into marketplace"
                  : "Manage partner accounts and suspend/reinstate access"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div
              data-tour="admin-partners-tab-switch"
              className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1"
            >
              <button
                onClick={() => setTab("applications")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "applications"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Applications
              </button>
              <button
                onClick={() => setTab("partners")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "partners"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Partner Accounts
              </button>
            </div>

            <div className="w-full sm:w-[180px]">
              <Select
                value={
                  tab === "applications" ? statusFilter : partnerStatusFilter
                }
                onValueChange={(v) => {
                  if (tab === "applications") {
                    setStatusFilter(v as any);
                  } else {
                    setPartnerStatusFilter(v as any);
                  }
                }}
              >
                <SelectTrigger className="h-11 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tab === "applications" ? (
                    <>
                      <SelectItem value="pending_review">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {tab === "applications" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total
              </p>
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {partnerCounts.total}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Approved
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {partnerCounts.approved}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Suspended
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {partnerCounts.suspended}
              </p>
            </div>
          </div>
        )}

        <div
          data-tour="admin-partners-list"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : tab === "applications" ? (
            filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Building2 className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
                <p>No partner applications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Partner
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        KYC
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
                    {filteredApplications.map((a) => {
                      const busy = actionLoadingId === a.id;
                      const isPending = a.status === "pending_review";
                      const name =
                        a.partnerType === "business"
                          ? a.businessName
                          : `${a.firstName} ${a.lastName}`.trim();

                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                  {name || "Partner"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {a.email}
                                </p>
                                {a.phoneNumber ? (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {a.phoneNumber}
                                  </p>
                                ) : null}
                                {a.cacNumber ? (
                                  <p className="text-[11px] text-slate-400">
                                    CAC: {a.cacNumber}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Overall
                                </span>
                                {kycBadge(
                                  a.kycSummary?.overallStatus || "pending",
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  CAC
                                </span>
                                {kycBadge(a.kycSummary?.cac || "pending")}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ID
                                </span>
                                {kycBadge(
                                  a.kycSummary?.individualId || "pending",
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Director
                                </span>
                                {kycBadge(a.kycSummary?.director || "pending")}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            {statusBadge(a.status)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleAction(a.id, "approve")}
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
                                    kind: "application",
                                    id: a.id,
                                    action: "reject",
                                  });
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
            )
          ) : filteredPartners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Building2 className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
              <p>No partners found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Partner
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Vehicles
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
                  {filteredPartners.map((p) => {
                    const busy = actionLoadingId === p.id;
                    const isApproved = p.status === "approved";
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                {p.businessName || p.email || p.id}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {p.email}
                              </p>
                              {p.phoneNumber ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {p.phoneNumber}
                                </p>
                              ) : null}
                              {p.suspensionReason ? (
                                <p className="text-[11px] text-slate-400">
                                  Reason: {p.suspensionReason}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">
                            {(p.approvedVehicles || 0).toLocaleString()}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            Live: {p.live ? "Yes" : "No"}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          {statusBadge(p.status)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isApproved ? (
                              <button
                                onClick={() => {
                                  setActionReason("");
                                  setActionModal({
                                    kind: "partner",
                                    id: p.id,
                                    action: "suspend",
                                  });
                                }}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                title="Suspend"
                              >
                                <X className="h-4 w-4" />
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handlePartnerAction(p.id, "reinstate")
                                }
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                title="Reinstate"
                              >
                                {busy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Reinstate
                              </button>
                            )}
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
          actionModal?.kind === "application"
            ? "Reject Application"
            : "Suspend Partner"
        }
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {actionModal?.kind === "application"
              ? "This will reject the partner application."
              : "This will suspend the partner account."}
          </div>
        }
        confirmText={actionModal?.kind === "application" ? "Reject" : "Suspend"}
        confirmVariant="destructive"
        reasonLabel={
          actionModal?.kind === "application"
            ? "Rejection reason"
            : "Suspension reason"
        }
        reasonPlaceholder={
          actionModal?.kind === "application"
            ? "Enter rejection reason..."
            : "Enter suspension reason..."
        }
        reasonValue={actionReason}
        onReasonValueChange={setActionReason}
        requireReason
        loading={Boolean(actionModal && actionLoadingId === actionModal.id)}
        onConfirm={() => {
          if (!actionModal) return;
          if (actionModal.kind === "application") {
            return handleAction(actionModal.id, "reject", actionReason);
          }
          return handlePartnerAction(actionModal.id, "suspend", actionReason);
        }}
      />
    </div>
  );
}
