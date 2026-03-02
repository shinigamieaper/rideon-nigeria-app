"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from "lucide-react";

type KycSummary = {
  overallStatus: string;
  nin: string;
  bvn: string;
  lastRunAt: string | null;
};

interface ApplicationDetail {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nin: string;
  bvn: string;
  kycSummary: KycSummary;
  experienceYears: number;
  profileImageUrl: string | null;
  preferredCity: string;
  salaryExpectation: number;
  profileSummary: string;
  vehicleTypesHandled?: string;
  vehicleExperience?: { categories?: string[]; notes?: string };
  familyFitTags?: string[];
  familyFitNotes?: string;
  languages?: string[];
  hobbies?: string[];
  fullTimePreferences?: {
    willingToTravel?: boolean | null;
    preferredClientType?: string | null;
  } | null;
  backgroundConsent: boolean;
  kycConsent: boolean;
  documents: Record<string, any>;
  references: any[];
  referencesSummary: { required: number; completed: number } | null;
  createdAt: string | null;
  updatedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  needsMoreInfoReason?: string | null;
  needsMoreInfoAt?: string | null;
  needsMoreInfoBy?: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FullTimeDriverApplicationDetailPage({
  params,
}: PageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  const [application, setApplication] = useState<ApplicationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/full-time-driver-applications/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load application");
      }

      const data = await res.json().catch(() => ({}));
      setApplication((data?.application as ApplicationDetail) || null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load application");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchApplication();
    });
    return () => unsubscribe();
  }, [fetchApplication]);

  const handleAction = async (
    action: "approve" | "reject" | "needs_more_info",
  ) => {
    if (!application) return;

    let reason: string | undefined;
    if (action === "reject" || action === "needs_more_info") {
      reason =
        window.prompt(
          action === "reject"
            ? "Rejection reason:"
            : "What should the applicant update?",
        ) || undefined;
      if (!reason) return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      const res = await fetch(
        `/api/admin/full-time-driver-applications/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, reason }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }

      await fetchApplication();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const fullName = application
    ? `${String(application.firstName || "").trim()} ${String(application.lastName || "").trim()}`.trim() ||
      "Applicant"
    : "Applicant";

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

  const docUrl = (val: any): string | null => {
    if (typeof val === "string") return val;
    if (val && typeof val === "object" && typeof val.url === "string")
      return val.url;
    return null;
  };

  const renderDocRow = (label: string, value: any) => {
    const url = docUrl(value);
    const status =
      value && typeof value === "object"
        ? String((value as any).status || "")
        : "";
    const prettyStatus = status ? status.replace(/_/g, " ") : "";

    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="font-medium">{label}</span>
          {prettyStatus ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({prettyStatus})
            </span>
          ) : null}
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            View
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/full-time-driver-applications"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {fullName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {application ? getStatusBadge(application.status) : null}
                {application?.preferredCity ? (
                  <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4" />
                    {application.preferredCity}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {application && application.status === "pending_review" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction("reject")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </button>
              <button
                onClick={() => handleAction("approve")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:opacity-95 disabled:opacity-60"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve
              </button>
            </div>
          ) : null}
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
        ) : !application ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Application not found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Driver Information
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Email
                    </span>
                    <span className="inline-flex items-center gap-2 text-slate-900 dark:text-white">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {application.email || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Phone
                    </span>
                    <span className="inline-flex items-center gap-2 text-slate-900 dark:text-white">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {application.phoneNumber || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      NIN
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {application.nin || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      BVN
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {application.bvn || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Experience (years)
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {application.experienceYears ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Salary Expectation
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {formatNgn(application.salaryExpectation)}
                    </span>
                  </div>
                  <div className="pt-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Profile Summary
                    </span>
                    <p className="mt-2 text-slate-900 dark:text-white whitespace-pre-wrap">
                      {application.profileSummary || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Profile Depth (Marketplace)
                </h2>

                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Vehicle types handled (free text)
                    </div>
                    <div className="mt-1 text-slate-900 dark:text-white whitespace-pre-wrap">
                      {application.vehicleTypesHandled || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Vehicle experience
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(Array.isArray(application.vehicleExperience?.categories)
                        ? application.vehicleExperience?.categories
                        : []
                      ).length > 0 ? (
                        (application.vehicleExperience?.categories || []).map(
                          (c) => (
                            <span
                              key={c}
                              className="inline-flex items-center rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
                            >
                              {c}
                            </span>
                          ),
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                    {String(
                      application.vehicleExperience?.notes || "",
                    ).trim() ? (
                      <div className="mt-2 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {application.vehicleExperience?.notes}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Family-fit tags
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Array.isArray(application.familyFitTags) &&
                      application.familyFitTags.length > 0 ? (
                        application.familyFitTags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 px-3 py-1 text-xs text-blue-700 dark:text-blue-300"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                    {String(application.familyFitNotes || "").trim() ? (
                      <div className="mt-2 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {application.familyFitNotes}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Languages
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Array.isArray(application.languages) &&
                      application.languages.length > 0 ? (
                        application.languages.map((l) => (
                          <span
                            key={l}
                            className="inline-flex items-center rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
                          >
                            {l}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Interests
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Array.isArray(application.hobbies) &&
                      application.hobbies.length > 0 ? (
                        application.hobbies.map((h) => (
                          <span
                            key={h}
                            className="inline-flex items-center rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
                          >
                            {h}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Full-time preferences
                    </div>
                    <div className="mt-1 text-slate-900 dark:text-white">
                      <div>
                        Willing to travel:{" "}
                        {typeof application.fullTimePreferences
                          ?.willingToTravel === "boolean"
                          ? application.fullTimePreferences?.willingToTravel
                            ? "Yes"
                            : "No"
                          : "—"}
                      </div>
                      <div>
                        Preferred client type:{" "}
                        {application.fullTimePreferences?.preferredClientType
                          ? String(
                              application.fullTimePreferences
                                .preferredClientType,
                            ).replace(/_/g, " ")
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Documents
                </h2>
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {renderDocRow(
                    "Driver's License",
                    application.documents?.driversLicense ??
                      application.documents?.driversLicenseUrl,
                  )}
                  {renderDocRow(
                    "Government ID",
                    application.documents?.governmentId ??
                      application.documents?.governmentIdUrl,
                  )}
                  {renderDocRow(
                    "LASDRI Card",
                    application.documents?.lasdriCard ??
                      application.documents?.lasdriCardUrl,
                  )}
                  {renderDocRow(
                    "Police Report",
                    application.documents?.policeReport ??
                      application.documents?.policeReportUrl,
                  )}
                  {renderDocRow(
                    "Medical Report",
                    application.documents?.medicalReport ??
                      application.documents?.medicalReportUrl,
                  )}
                  {renderDocRow(
                    "Eye Test",
                    application.documents?.eyeTest ??
                      application.documents?.eyeTestUrl,
                  )}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  References
                </h2>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {application.referencesSummary
                    ? `Completed ${application.referencesSummary.completed} of ${application.referencesSummary.required}`
                    : "—"}
                </div>

                {Array.isArray(application.references) &&
                application.references.length > 0 ? (
                  <div className="space-y-3">
                    {application.references.map((r: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {String(r?.name || "").trim() || "Reference"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            {String(r?.relationship || "").trim() || "—"}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          <div>
                            Email: {String(r?.email || "").trim() || "—"}
                          </div>
                          <div>
                            Phone: {String(r?.phone || "").trim() || "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    No references provided.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Status & Timeline
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Submitted
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {formatDateTime(application.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Updated
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {formatDateTime(application.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Approved At
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {formatDateTime(application.approvedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Rejected At
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {formatDateTime(application.rejectedAt)}
                    </span>
                  </div>

                  {application.status === "needs_more_info" ? (
                    <div className="pt-3">
                      <span className="text-slate-500 dark:text-slate-400">
                        Needs More Info Reason
                      </span>
                      <p className="mt-2 text-slate-900 dark:text-white whitespace-pre-wrap">
                        {application.needsMoreInfoReason || "—"}
                      </p>
                    </div>
                  ) : null}

                  {application.status === "rejected" ? (
                    <div className="pt-3">
                      <span className="text-slate-500 dark:text-slate-400">
                        Rejection Reason
                      </span>
                      <p className="mt-2 text-slate-900 dark:text-white whitespace-pre-wrap">
                        {application.rejectionReason || "—"}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  KYC Verification
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Overall
                    </span>
                    <span className="text-slate-900 dark:text-white capitalize">
                      {String(
                        application.kycSummary?.overallStatus || "pending",
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      NIN
                    </span>
                    <span className="text-slate-900 dark:text-white capitalize">
                      {String(application.kycSummary?.nin || "pending")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      BVN
                    </span>
                    <span className="text-slate-900 dark:text-white capitalize">
                      {String(application.kycSummary?.bvn || "pending")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Last run
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {application.kycSummary?.lastRunAt
                        ? formatDateTime(application.kycSummary.lastRunAt)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Consents
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      Background Consent
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {application.backgroundConsent ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      KYC Consent
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {application.kycConsent ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
