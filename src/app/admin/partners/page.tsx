"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  AlertCircle,
  Building2,
  Check,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import {
  ActionModal,
  Modal,
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

function maskSecret(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "—";
  if (s.length <= 4) return "****";
  return `****${s.slice(-4)}`;
}

function maskIdLike(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s) return "—";
  if (s.length <= 4) return "****";
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

function safeJsonPreview(input: unknown, max = 6000): string {
  try {
    const raw = JSON.stringify(input, null, 2);
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max)}\n…`;
  } catch {
    return "";
  }
}

function extractDocumentUrls(
  input: unknown,
): Array<{ label: string; url: string }> {
  const results: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();

  const isDocUrl = (s: string) =>
    s.startsWith("/api/files/") ||
    s.startsWith("https://res.cloudinary.com/") ||
    s.startsWith("http://res.cloudinary.com/") ||
    s.startsWith("https://") ||
    s.startsWith("http://");

  const walk = (val: unknown, path: string[], depth: number) => {
    if (results.length >= 40) return;
    if (depth > 6) return;

    if (typeof val === "string") {
      const url = val.trim();
      if (url && isDocUrl(url) && !seen.has(url)) {
        seen.add(url);
        results.push({ label: path.join(".") || "document", url });
      }
      return;
    }

    if (!val || typeof val !== "object") return;
    if (val instanceof Date) return;

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        walk(val[i], [...path, String(i)], depth + 1);
      }
      return;
    }

    const obj = val as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "payload") continue;
      walk(v, [...path, k], depth + 1);
    }
  };

  walk(input, [], 0);

  results.sort((a, b) => a.label.localeCompare(b.label));
  return results;
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

  const [detailModal, setDetailModal] = useState<{
    kind: "application" | "partner";
    id: string;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerResolvedUrl, setViewerResolvedUrl] = useState("");
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerKind, setViewerKind] = useState<"pdf" | "image" | "other">(
    "other",
  );

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerTitle("");
    setViewerResolvedUrl("");
    setViewerError(null);
    setViewerLoading(false);
    setViewerKind("other");
  };

  const openDocument = async (key: string, rawUrl: string) => {
    try {
      setError(null);
      setViewerTitle(key);
      setViewerOpen(true);
      setViewerResolvedUrl("");
      setViewerError(null);
      setViewerLoading(true);
      setViewerKind("other");

      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      const base = String(rawUrl || "").split("?")[0];
      if (base.startsWith("/api/files/")) {
        const res = await fetch(`${base}?resolve=1`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to open document");
        const resolved = typeof j?.url === "string" ? j.url : "";
        if (!resolved) throw new Error("Failed to open document");

        const kindFromApi =
          j?.kind === "pdf" || j?.kind === "image" || j?.kind === "other"
            ? j.kind
            : null;
        if (kindFromApi) {
          setViewerKind(kindFromApi);
        } else {
          const isPdf = /\.pdf(\?|$)/i.test(resolved);
          const isImg = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(resolved);
          setViewerKind(isPdf ? "pdf" : isImg ? "image" : "other");
        }

        setViewerTitle(key);
        setViewerResolvedUrl(resolved);
        return;
      }

      throw new Error(
        "This document link is not compatible. Please ask the partner to re-upload the document.",
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unable to open document.";
      setError(msg);
      setViewerError(msg);
    } finally {
      setViewerLoading(false);
    }
  };

  const openPartnerDetails = async (
    kind: "application" | "partner",
    id: string,
  ) => {
    try {
      setDetailModal({ kind, id });
      setDetail(null);
      setDetailError(null);
      setShowSensitive(false);
      setDetailLoading(true);

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const res = await fetch(
        `/api/admin/partners/applications/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j?.error || "Failed to load partner details");
      setDetail(j || null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load details";
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

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
                                onClick={() =>
                                  void openPartnerDetails("application", a.id)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </button>
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
                            <button
                              onClick={() =>
                                void openPartnerDetails("partner", p.id)
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
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

      <Modal
        isOpen={Boolean(detailModal)}
        onClose={() => {
          setDetailModal(null);
          setDetail(null);
          setDetailError(null);
          setShowSensitive(false);
        }}
        title={
          detailModal?.kind === "partner"
            ? "Partner Details"
            : "Partner Application Details"
        }
        className="max-w-4xl"
      >
        {detailLoading ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : detailError ? (
          <div className="p-6">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
              {detailError}
            </div>
          </div>
        ) : detail ? (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {String(detail?.partnerType || "") === "business"
                    ? String(detail?.businessName || "").trim() || "Partner"
                    : `${String(detail?.firstName || "").trim()} ${String(detail?.lastName || "").trim()}`.trim() ||
                      "Partner"}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-all">
                  {String(detail?.email || "").trim() || "—"}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {String(detail?.phoneNumber || "").trim() || "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSensitive((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {showSensitive ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showSensitive ? "Hide sensitive" : "Show sensitive"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Partner Type
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white capitalize">
                  {String(detail?.partnerType || "individual")}
                </div>
              </div>
              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  CAC Number
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white font-mono">
                  {String(detail?.cacNumber || "").trim() || "—"}
                </div>
              </div>
            </div>

            {String(detail?.partnerType || "") === "individual" ? (
              <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  BVN / NIN
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white font-mono">
                  {showSensitive
                    ? String(detail?.bvnOrNin || "").trim() || "—"
                    : maskIdLike(detail?.bvnOrNin)}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Director Name
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {String(detail?.directorName || "").trim() || "—"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Director Email
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white break-all">
                    {String(detail?.directorEmail || "").trim() || "—"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Director Phone
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {String(detail?.directorPhone || "").trim() || "—"}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Payout Details
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Bank
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {String(detail?.payout?.bankName || "").trim() || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Account Name
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {String(detail?.payout?.accountName || "").trim() || "—"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Account Number
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white font-mono">
                    {showSensitive
                      ? String(detail?.payout?.accountNumber || "").trim() ||
                        "—"
                      : maskSecret(detail?.payout?.accountNumber)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                KYC
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Overall
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {String(detail?.kyc?.overallStatus || "pending")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    CAC
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {String(detail?.kyc?.cac?.status || "pending")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    ID / Director
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {String(
                      detail?.partnerType === "business"
                        ? detail?.kyc?.director?.status || "pending"
                        : detail?.kyc?.individualId?.status || "pending",
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                <details className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/30 p-3">
                  <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                    CAC details
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-[11px] text-slate-700 dark:text-slate-200">
                    {safeJsonPreview(detail?.kyc?.cac || null)}
                  </pre>
                </details>
                <details className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/30 p-3">
                  <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                    ID / Director details
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-[11px] text-slate-700 dark:text-slate-200">
                    {safeJsonPreview(
                      detail?.partnerType === "business"
                        ? detail?.kyc?.director || null
                        : detail?.kyc?.individualId || null,
                    )}
                  </pre>
                </details>
              </div>
            </div>

            {(() => {
              const docsRaw: any = detail?.documents;
              const items: Array<{ label: string; url: string }> = [];

              if (Array.isArray(docsRaw)) {
                for (const d of docsRaw) {
                  const label =
                    String(d?.type || d?.key || "Document").trim() ||
                    "Document";
                  const url = String(d?.url || d?.value || "").trim();
                  if (url) items.push({ label, url });
                }
              } else if (docsRaw && typeof docsRaw === "object") {
                for (const [k, v] of Object.entries(docsRaw)) {
                  const maybeUrl =
                    typeof (v as any)?.url === "string" ? (v as any).url : v;
                  const url = String(maybeUrl || "").trim();
                  if (url) items.push({ label: k, url });
                }
              }

              const discovered = extractDocumentUrls(detail);
              for (const d of discovered) {
                if (!items.some((x) => x.url === d.url)) items.push(d);
              }

              if (items.length === 0) return null;
              return (
                <div className="rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 p-4">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Uploaded Documents
                  </div>
                  <div className="mt-3 space-y-2">
                    {items.map((d) => (
                      <div
                        key={`${d.label}-${d.url}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/30 p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {d.label}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {d.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openDocument(d.label, d.url)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-600 dark:text-slate-300">
            No details.
          </div>
        )}
      </Modal>

      <Modal
        isOpen={viewerOpen}
        onClose={closeViewer}
        title={viewerTitle || "Document"}
        className="max-w-5xl"
      >
        <div className="p-6">
          {viewerLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : viewerError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
              {viewerError}
            </div>
          ) : viewerResolvedUrl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <a
                  href={`${viewerResolvedUrl}${viewerResolvedUrl.includes("?") ? "&" : "?"}download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
              {viewerKind === "image" ? (
                <img
                  src={viewerResolvedUrl}
                  alt={viewerTitle}
                  className="w-full max-h-[70vh] object-contain rounded-xl bg-white/60 dark:bg-slate-900/40"
                />
              ) : viewerKind === "pdf" ? (
                <iframe
                  src={viewerResolvedUrl}
                  className="w-full h-[70vh] rounded-xl bg-white/60 dark:bg-slate-900/40"
                />
              ) : (
                <a
                  href={viewerResolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              No document.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
