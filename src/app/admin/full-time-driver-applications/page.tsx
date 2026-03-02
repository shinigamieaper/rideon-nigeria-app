"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  Briefcase,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";

type KycSummary = {
  overallStatus: string;
  nin: string;
  bvn: string;
  lastRunAt: string | null;
};

interface FullTimeDriverApplication {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nin: string;
  bvn: string;
  kycSummary: KycSummary;
  preferredCity: string;
  salaryExpectation: number;
  referencesSummary: { required: number; completed: number } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface StatusCounts {
  all: number;
  pending_review: number;
  needs_more_info: number;
  approved: number;
  rejected: number;
}

const STATUS_TABS = [
  { key: "all", label: "All", icon: Briefcase },
  {
    key: "pending_review",
    label: "Pending Review",
    icon: Clock,
    color: "text-amber-600",
  },
  {
    key: "needs_more_info",
    label: "Needs More Info",
    icon: AlertCircle,
    color: "text-blue-600",
  },
  {
    key: "approved",
    label: "Approved",
    icon: CheckCircle,
    color: "text-green-600",
  },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-red-600" },
] as const;

export default function FullTimeDriverApplicationsPage() {
  const [applications, setApplications] = useState<FullTimeDriverApplication[]>(
    [],
  );
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0,
    pending_review: 0,
    needs_more_info: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_TABS)[number]["key"]>("pending_review");

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(
        `/api/admin/full-time-driver-applications?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch applications");
      }

      const data = await res.json().catch(() => ({}));
      setApplications(
        Array.isArray(data?.applications) ? data.applications : [],
      );
      setCounts(
        (data?.counts as StatusCounts) || {
          all: 0,
          pending_review: 0,
          needs_more_info: 0,
          approved: 0,
          rejected: 0,
        },
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchApplications();
    });
    return () => unsubscribe();
  }, [fetchApplications]);

  const filtered = applications.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
    return (
      name.includes(q) ||
      (a.email || "").toLowerCase().includes(q) ||
      (a.phoneNumber || "").toLowerCase().includes(q) ||
      (a.preferredCity || "").toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      needs_more_info:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      approved:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    };
    const style =
      styles[status] ||
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    const label = status.replace(/_/g, " ");
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${style}`}
      >
        {label}
      </span>
    );
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatNgn = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Full-Time Placement Applications
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Review and approve drivers for the recruitment pool
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full sm:w-64"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.key as keyof StatusCounts] || 0;
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-white" : (tab as any).color || ""}`}
                />
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl">
            <Briefcase className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-medium">No applications found</p>
            <p className="text-sm text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => {
              const fullName =
                `${a.firstName || ""} ${a.lastName || ""}`.trim() ||
                "Applicant";
              const ninMasked = String(a.nin || "").trim()
                ? `••••${String(a.nin).slice(-4)}`
                : "—";
              const bvnMasked = String(a.bvn || "").trim()
                ? `••••${String(a.bvn).slice(-4)}`
                : "—";
              const kycOverall = String(
                a.kycSummary?.overallStatus || "pending",
              );
              return (
                <Link
                  key={a.id}
                  href={`/admin/full-time-driver-applications/${a.id}`}
                  className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {fullName}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {a.preferredCity || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(a.status)}
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          Email
                        </span>
                        <span className="text-slate-900 dark:text-white truncate max-w-[220px]">
                          {a.email || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          Phone
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {a.phoneNumber || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          KYC
                        </span>
                        <span className="text-slate-900 dark:text-white capitalize">
                          {kycOverall}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          NIN
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {ninMasked}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          BVN
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {bvnMasked}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          Salary Expectation
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {formatNgn(a.salaryExpectation)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          References
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {a.referencesSummary
                            ? `${a.referencesSummary.completed}/${a.referencesSummary.required}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">
                          Submitted
                        </span>
                        <span className="text-slate-900 dark:text-white">
                          {formatDateTime(a.createdAt)}
                        </span>
                      </div>
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
