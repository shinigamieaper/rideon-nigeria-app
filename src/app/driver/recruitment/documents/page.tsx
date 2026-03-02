"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Modal, StickyBanner } from "@/components";
import {
  Loader2,
  UploadCloud,
  ExternalLink,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Eye,
} from "lucide-react";

type DocumentKey =
  | "driversLicenseUrl"
  | "governmentIdUrl"
  | "lasdriCardUrl"
  | "policeReportUrl"
  | "medicalReportUrl"
  | "eyeTestUrl";

type ReferenceState = {
  name: string;
  email: string;
  phone: string;
  relationship: string;
};

type Draft = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nin: string;
  bvn?: string;
  experienceYears: string;
  vehicleTypesHandled?: string;
  vehicleExperienceCategories?: string[];
  vehicleExperienceNotes?: string;
  preferredCity: string;
  availabilityFullTime?: boolean;
  salaryExpectation?: string;
  salaryExpectationMinNgn?: string;
  salaryExpectationMaxNgn?: string;
  familyFitTags?: string[];
  familyFitNotes?: string;
  languages?: string[];
  hobbies?: string[];
  fullTimePreferences?: {
    willingToTravel?: boolean;
    preferredClientType?: "personal" | "corporate" | "any";
  };
  additionalNotes?: string;
  profileImageUrl: string;
  references: ReferenceState[];
  backgroundConsent: boolean;
  kycConsent: boolean;
  documents: Record<DocumentKey, string>;
};

const STORAGE_KEY = "driverRecruitmentDraftV1";

async function waitForAuthUser(timeoutMs = 5000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(u);
    });
  });
}

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed || typeof parsed !== "object") return null;
    const legacy = String((parsed as any).salaryExpectation || "").trim();
    const min = String((parsed as any).salaryExpectationMinNgn || "").trim();
    const max = String((parsed as any).salaryExpectationMaxNgn || "").trim();
    if (!min && !max && legacy) {
      (parsed as any).salaryExpectationMinNgn = legacy;
      (parsed as any).salaryExpectationMaxNgn = legacy;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(next: Draft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function mergeDraftIfEmpty(current: Draft, patch: Partial<Draft>): Draft {
  const next: Draft = { ...current, documents: { ...current.documents } };

  const setIfEmpty = (key: keyof Draft, value: any) => {
    const cur = (next as any)[key];
    const curEmpty =
      typeof cur !== "string" ? cur == null : cur.trim().length === 0;
    if (curEmpty && typeof value === "string" && value.trim().length > 0) {
      (next as any)[key] = value;
    }
  };

  setIfEmpty("firstName", patch.firstName);
  setIfEmpty("lastName", patch.lastName);
  setIfEmpty("email", patch.email);
  setIfEmpty("phoneNumber", patch.phoneNumber);
  setIfEmpty("nin", patch.nin);
  setIfEmpty("bvn", patch.bvn);
  setIfEmpty("profileImageUrl", patch.profileImageUrl);

  if (String((next as any).salaryExpectationMinNgn || "").trim().length === 0) {
    const v: any =
      (patch as any).salaryExpectationMinNgn ??
      (patch as any).salaryExpectation;
    if (typeof v === "number" && Number.isFinite(v) && v > 0)
      (next as any).salaryExpectationMinNgn = String(v);
    if (typeof v === "string" && v.trim().length > 0)
      (next as any).salaryExpectationMinNgn = v;
  }

  if (String((next as any).salaryExpectationMaxNgn || "").trim().length === 0) {
    const v: any =
      (patch as any).salaryExpectationMaxNgn ??
      (patch as any).salaryExpectation;
    if (typeof v === "number" && Number.isFinite(v) && v > 0)
      (next as any).salaryExpectationMaxNgn = String(v);
    if (typeof v === "string" && v.trim().length > 0)
      (next as any).salaryExpectationMaxNgn = v;
  }

  if (patch.documents && typeof patch.documents === "object") {
    const pDocs = patch.documents as any;
    (Object.keys(next.documents) as DocumentKey[]).forEach((k) => {
      const cur = next.documents[k];
      const incoming = pDocs?.[k];
      if (
        String(cur || "").trim().length === 0 &&
        typeof incoming === "string" &&
        incoming.trim().length > 0
      ) {
        next.documents[k] = incoming;
      }
    });
  }

  return next;
}

async function uploadDocumentViaApi(args: {
  key: DocumentKey;
  file: File;
}): Promise<string> {
  const user = await waitForAuthUser();
  const token = await user.getIdToken();

  const fd = new FormData();
  fd.append("key", args.key);
  fd.append("file", args.file);

  const res = await fetch("/api/uploads/full-time-driver-docs", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(j?.error || "Failed to upload file");
  }

  const url = typeof j?.url === "string" ? j.url : "";
  if (!url) throw new Error("Upload failed");
  return url;
}

export default function DriverRecruitmentDocumentsPage() {
  const router = useRouter();

  const [ready, setReady] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);

  const [uploadingKey, setUploadingKey] = React.useState<DocumentKey | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerTitle, setViewerTitle] = React.useState("");
  const [viewerResolvedUrl, setViewerResolvedUrl] = React.useState("");
  const [viewerPreviewUrl, setViewerPreviewUrl] = React.useState("");
  const [viewerPageUrls, setViewerPageUrls] = React.useState<string[]>([]);
  const [viewerLoading, setViewerLoading] = React.useState(false);
  const [viewerError, setViewerError] = React.useState<string | null>(null);
  const [viewerKind, setViewerKind] = React.useState<"pdf" | "image" | "other">(
    "other",
  );
  const prefillDoneRef = React.useRef(false);

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerTitle("");
    setViewerResolvedUrl("");
    setViewerPreviewUrl("");
    setViewerPageUrls([]);
    setViewerError(null);
    setViewerLoading(false);
    setViewerKind("other");
  };

  const openViewer = async (args: { title: string; url: string }) => {
    const base = String(args.url || "").split("?")[0];
    if (!base) return;

    setViewerTitle(args.title);
    setViewerOpen(true);
    setViewerResolvedUrl("");
    setViewerError(null);
    setViewerLoading(true);
    setViewerKind("other");

    try {
      if (!base.startsWith("/api/files/")) {
        throw new Error(
          "This document link is not compatible. Please re-upload the document.",
        );
      }

      const user = await waitForAuthUser();
      const token = await user.getIdToken();

      const res = await fetch(`${base}?resolve=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to open document");

      const resolved = typeof j?.url === "string" ? j.url : "";
      if (!resolved) throw new Error("Failed to open document");

      const preview = typeof j?.previewUrl === "string" ? j.previewUrl : "";
      setViewerPreviewUrl(preview);

      const pageUrls = Array.isArray(j?.pageUrls)
        ? (j.pageUrls as any[]).filter((v) => typeof v === "string")
        : [];
      setViewerPageUrls(pageUrls as string[]);

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
      setViewerResolvedUrl(resolved);
    } catch (e: any) {
      setViewerError(e?.message || "Unable to open document.");
    } finally {
      setViewerLoading(false);
    }
  };

  React.useEffect(() => {
    const d = loadDraft();
    if (!d) {
      router.replace("/full-time-driver/application/apply");
      return;
    }
    setDraft(d);
    setReady(true);
  }, [router]);

  React.useEffect(() => {
    if (!ready || !draft) return;
    if (prefillDoneRef.current) return;
    prefillDoneRef.current = true;

    let cancelled = false;

    async function prefill() {
      try {
        const user = await waitForAuthUser();
        const token = await user.getIdToken();

        const fetchJson = async (url: string) => {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await res.json().catch(() => ({}));
          return { ok: res.ok, json: j };
        };

        const [u, ft] = await Promise.all([
          fetchJson("/api/users/me"),
          fetchJson("/api/full-time-driver/me"),
        ]);

        if (cancelled) return;

        setDraft((cur) => {
          if (!cur) return cur;

          let next = cur;

          if (u.ok) {
            next = mergeDraftIfEmpty(next, {
              firstName:
                typeof u.json?.firstName === "string" ? u.json.firstName : "",
              lastName:
                typeof u.json?.lastName === "string" ? u.json.lastName : "",
              email: typeof u.json?.email === "string" ? u.json.email : "",
              phoneNumber:
                typeof u.json?.phoneNumber === "string"
                  ? u.json.phoneNumber
                  : "",
              profileImageUrl:
                typeof u.json?.profileImageUrl === "string"
                  ? u.json.profileImageUrl
                  : "",
            });
          }

          if (
            ft.ok &&
            typeof ft.json?.status === "string" &&
            ft.json.status !== "not_applied"
          ) {
            next = mergeDraftIfEmpty(next, {
              nin: typeof ft.json?.nin === "string" ? ft.json.nin : "",
              bvn: typeof ft.json?.bvn === "string" ? ft.json.bvn : "",
              salaryExpectation:
                typeof ft.json?.salaryExpectation === "number"
                  ? ft.json.salaryExpectation
                  : undefined,
              salaryExpectationMinNgn:
                typeof ft.json?.salaryExpectationMinNgn === "number"
                  ? ft.json.salaryExpectationMinNgn
                  : undefined,
              salaryExpectationMaxNgn:
                typeof ft.json?.salaryExpectationMaxNgn === "number"
                  ? ft.json.salaryExpectationMaxNgn
                  : undefined,
            } as any);
          }

          if (
            ft.ok &&
            ft.json?.documents &&
            typeof ft.json.documents === "object"
          ) {
            const docs = ft.json.documents as any;
            next = mergeDraftIfEmpty(next, {
              documents: {
                driversLicenseUrl:
                  typeof docs?.driversLicense === "string"
                    ? docs.driversLicense
                    : "",
                governmentIdUrl:
                  typeof docs?.governmentId === "string"
                    ? docs.governmentId
                    : "",
                lasdriCardUrl:
                  typeof docs?.lasdriCard === "string" ? docs.lasdriCard : "",
                policeReportUrl:
                  typeof docs?.policeReport === "string"
                    ? docs.policeReport
                    : "",
                medicalReportUrl:
                  typeof docs?.medicalReport === "string"
                    ? docs.medicalReport
                    : "",
                eyeTestUrl:
                  typeof docs?.eyeTest === "string" ? docs.eyeTest : "",
              } as any,
            });
          }

          if (next !== cur) saveDraft(next);
          return next;
        });
      } catch {
        return;
      }
    }

    prefill();
    return () => {
      cancelled = true;
    };
  }, [draft, ready]);

  const docs = draft?.documents;

  const items: Array<{
    key: DocumentKey;
    label: string;
    description: string;
    required?: boolean;
  }> = [
    {
      key: "driversLicenseUrl",
      label: "Driver's License",
      description: "Valid Nigerian driver's license",
      required: true,
    },
    {
      key: "governmentIdUrl",
      label: "Government ID",
      description: "National ID, Passport, or Voter's Card",
      required: true,
    },
    {
      key: "policeReportUrl",
      label: "Police Report",
      description: "Character certificate from police",
    },
    {
      key: "medicalReportUrl",
      label: "Medical Report",
      description: "Recent medical fitness certificate",
    },
    {
      key: "eyeTestUrl",
      label: "Eye Test",
      description: "Vision test results",
    },
    {
      key: "lasdriCardUrl",
      label: "LASDRI Card",
      description: "Lagos State Drivers' Institute card",
    },
  ];

  const handleFileSelect = async (key: DocumentKey, file: File | null) => {
    if (!draft || !file) return;

    try {
      setError(null);
      setSuccess(null);
      setUploadingKey(key);

      const isTooBig = file.size > 10 * 1024 * 1024;
      if (isTooBig) throw new Error("File is too large. Max 10MB.");

      const url = await uploadDocumentViaApi({ key, file });

      setDraft((cur) => {
        if (!cur) return cur;
        const next: Draft = {
          ...cur,
          documents: { ...cur.documents, [key]: url },
        };
        saveDraft(next);
        return next;
      });
      setSuccess("Uploaded successfully.");
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      setError(e?.message || "Failed to upload file.");
      setTimeout(() => setError(null), 3500);
    } finally {
      setUploadingKey(null);
    }
  };

  const canSubmit = React.useMemo(() => {
    if (!draft) return false;
    const dl = draft.documents.driversLicenseUrl;
    const gid = draft.documents.governmentIdUrl;
    return Boolean(dl && gid);
  }, [draft]);

  const handleSubmit = async () => {
    if (!draft) return;
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (
        !draft.documents.driversLicenseUrl ||
        !draft.documents.governmentIdUrl
      ) {
        throw new Error("Please upload Driver's License and Government ID.");
      }

      const nin = String((draft as any).nin || "").trim();
      const bvn = String((draft as any).bvn || "").trim();
      if (!/^\d{11}$/.test(nin)) {
        throw new Error(
          "Please enter a valid 11-digit NIN on the application details page.",
        );
      }
      if (bvn && !/^\d{11}$/.test(bvn)) {
        throw new Error("BVN must be 11 digits (or left empty).");
      }

      let minNgn = Number((draft as any).salaryExpectationMinNgn);
      let maxNgn = Number((draft as any).salaryExpectationMaxNgn);
      minNgn = Number.isFinite(minNgn) && minNgn > 0 ? Math.round(minNgn) : 0;
      maxNgn = Number.isFinite(maxNgn) && maxNgn > 0 ? Math.round(maxNgn) : 0;
      if (minNgn > 0 && maxNgn <= 0) maxNgn = minNgn;
      if (maxNgn > 0 && minNgn <= 0) minNgn = maxNgn;
      if (minNgn > 0 && maxNgn > 0 && maxNgn < minNgn) {
        throw new Error(
          "Max salary must be greater than or equal to min salary.",
        );
      }
      const legacySalaryExpectation = Math.max(0, maxNgn || minNgn || 0);

      const user = await waitForAuthUser();
      const token = await user.getIdToken();

      const email = String(draft.email || "")
        .trim()
        .toLowerCase();

      const references = (
        Array.isArray(draft.references) ? draft.references : []
      )
        .map((r) => ({
          name: String(r?.name || "").trim(),
          email: String(r?.email || "")
            .trim()
            .toLowerCase(),
          phone: String(r?.phone || "").trim(),
          relationship: String(r?.relationship || "").trim(),
        }))
        .filter((r) => r.name || r.email || r.phone || r.relationship);

      const res = await fetch("/api/auth/apply-full-time-driver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: draft.firstName,
          lastName: draft.lastName,
          email,
          phoneNumber: draft.phoneNumber,
          nin,
          bvn,
          experienceYears: Number(draft.experienceYears || 0),
          profileImageUrl: draft.profileImageUrl,
          preferredCity: draft.preferredCity,
          salaryExpectation: legacySalaryExpectation,
          ...(minNgn > 0 ? { salaryExpectationMinNgn: minNgn } : {}),
          ...(maxNgn > 0 ? { salaryExpectationMaxNgn: maxNgn } : {}),
          vehicleTypesHandled: draft.vehicleTypesHandled || "",
          vehicleExperience: {
            categories: Array.isArray(draft.vehicleExperienceCategories)
              ? draft.vehicleExperienceCategories
              : [],
            notes:
              typeof draft.vehicleExperienceNotes === "string"
                ? draft.vehicleExperienceNotes
                : "",
          },
          familyFitTags: Array.isArray(draft.familyFitTags)
            ? draft.familyFitTags
            : [],
          familyFitNotes:
            typeof draft.familyFitNotes === "string"
              ? draft.familyFitNotes
              : "",
          languages: Array.isArray(draft.languages) ? draft.languages : [],
          hobbies: Array.isArray(draft.hobbies) ? draft.hobbies : [],
          fullTimePreferences:
            draft.fullTimePreferences &&
            typeof draft.fullTimePreferences === "object"
              ? draft.fullTimePreferences
              : undefined,
          availabilityFullTime:
            typeof draft.availabilityFullTime === "boolean"
              ? draft.availabilityFullTime
              : undefined,
          additionalNotes: draft.additionalNotes || "",
          profileSummary: draft.additionalNotes || "",
          backgroundConsent: draft.backgroundConsent,
          kycConsent: draft.kycConsent,
          references,
          documents: {
            driversLicenseUrl: draft.documents.driversLicenseUrl,
            governmentIdUrl: draft.documents.governmentIdUrl,
            lasdriCardUrl: draft.documents.lasdriCardUrl,
            policeReportUrl: draft.documents.policeReportUrl,
            medicalReportUrl: draft.documents.medicalReportUrl,
            eyeTestUrl: draft.documents.eyeTestUrl,
          },
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to submit application.");

      sessionStorage.removeItem(STORAGE_KEY);
      router.replace("/full-time-driver/application/status");
    } catch (e: any) {
      setError(e?.message || "Failed to submit application.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate upload progress
  const uploadedCount = React.useMemo(() => {
    if (!docs) return 0;
    return items.reduce((count, it) => {
      const url = docs[it.key];
      return count + (url && url.trim().length > 0 ? 1 : 0);
    }, 0);
  }, [docs, items]);

  const requiredUploaded = React.useMemo(() => {
    if (!docs) return 0;
    let count = 0;
    if (docs.driversLicenseUrl) count++;
    if (docs.governmentIdUrl) count++;
    return count;
  }, [docs]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
        {/* Header skeleton */}
        <div className="h-6 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />

        {/* Banner skeleton */}
        <div className="h-32 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 animate-pulse" />

        {/* Progress skeleton */}
        <div className="h-20 rounded-2xl bg-white/50 dark:bg-slate-900/50 animate-pulse" />

        {/* Document cards skeleton */}
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-white/50 dark:bg-slate-900/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!draft || !docs) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
      {/* Back navigation */}
      <Link
        href="/full-time-driver/application/apply"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Application
      </Link>

      {(error || success) && (
        <StickyBanner className="z-50">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={[
              "rounded-xl px-4 py-3 text-sm shadow-lg border flex items-center gap-3",
              success
                ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200",
            ].join(" ")}
          >
            {success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            {success || error}
          </motion.div>
        </StickyBanner>
      )}

      {/* Header Banner */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 sm:p-6 shadow-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Upload Documents
              </h1>
              <p className="text-sm text-white/80 mt-0.5">
                Complete your application with required documents
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Upload Progress
            </span>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {uploadedCount} of {items.length} uploaded
          </span>
        </div>
        <div className="h-2 bg-slate-200/70 dark:bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#00529B] to-[#0077E6] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(uploadedCount / items.length) * 100}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          {requiredUploaded >= 2 ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-400">
                Required documents uploaded
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Upload Driver's License and Government ID to submit</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Document Cards */}
      <div className="space-y-3">
        {items.map((it, index) => {
          const url = docs[it.key];
          const isUploading = uploadingKey === it.key;
          const hasFile = Boolean(url && url.trim().length > 0);

          return (
            <motion.div
              key={it.key}
              className={[
                "rounded-xl border p-4 transition-all duration-200",
                hasFile
                  ? "bg-green-50/50 dark:bg-green-900/10 border-green-200/70 dark:border-green-800/40"
                  : "bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/60",
                "hover:shadow-md",
              ].join(" ")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div
                  className={[
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    hasFile
                      ? "bg-green-100 dark:bg-green-900/30"
                      : it.required
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : "bg-slate-100 dark:bg-slate-800/50",
                  ].join(" ")}
                >
                  {hasFile ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <FileText
                      className={[
                        "w-5 h-5",
                        it.required
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-500 dark:text-slate-400",
                      ].join(" ")}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {it.label}
                    </span>
                    {it.required && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {it.description}
                  </p>
                  {hasFile && (
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1 truncate">
                      ✓ Uploaded
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasFile && (
                    <button
                      type="button"
                      onClick={() => void openViewer({ title: it.label, url })}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition-colors"
                      title="View document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  <label
                    className={[
                      "inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all",
                      hasFile
                        ? "border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                        : "bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white shadow-md hover:shadow-lg hover:opacity-95",
                      isUploading || submitting
                        ? "opacity-60 cursor-not-allowed"
                        : "",
                    ].join(" ")}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1.5" />
                        {hasFile ? "Replace" : "Upload"}
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      disabled={Boolean(uploadingKey) || submitting}
                      onChange={(e) =>
                        handleFileSelect(it.key, e.target.files?.[0] || null)
                      }
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Submit Button */}
      <motion.div
        className="pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          type="button"
          disabled={!canSubmit || submitting || Boolean(uploadingKey)}
          onClick={handleSubmit}
          className={[
            "inline-flex w-full items-center justify-center rounded-xl px-4 py-3.5 font-semibold shadow-lg transition-all",
            canSubmit
              ? "bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white hover:shadow-xl hover:opacity-95"
              : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed",
          ].join(" ")}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Submitting Application...
            </>
          ) : (
            "Submit Application"
          )}
        </button>

        {!canSubmit && (
          <p className="mt-3 text-center text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Upload required documents to submit your application
          </p>
        )}
      </motion.div>

      <Modal
        isOpen={viewerOpen}
        onClose={closeViewer}
        title={viewerTitle || "Document"}
        className="max-w-5xl"
      >
        {viewerLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Opening…</span>
          </div>
        ) : viewerError ? (
          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300">
              {viewerError}
            </div>
          </div>
        ) : viewerResolvedUrl ? (
          <div className="space-y-3">
            {viewerKind === "image" ? (
              <img
                src={viewerResolvedUrl}
                alt={viewerTitle}
                className="w-full max-h-[70vh] object-contain rounded-xl bg-white/60 dark:bg-slate-900/40"
              />
            ) : viewerKind === "pdf" ? (
              <div className="space-y-3">
                {viewerPageUrls.length > 0 ? (
                  <div className="max-h-[70vh] overflow-auto space-y-3 rounded-xl bg-white/60 dark:bg-slate-900/40 p-3">
                    {viewerPageUrls.map((u, idx) => (
                      <img
                        key={`${u}-${idx}`}
                        src={u}
                        alt={`${viewerTitle} (Page ${idx + 1})`}
                        className="w-full object-contain rounded-lg bg-white/60 dark:bg-slate-900/40"
                      />
                    ))}
                  </div>
                ) : viewerPreviewUrl ? (
                  <img
                    src={viewerPreviewUrl}
                    alt={`${viewerTitle} (Preview)`}
                    className="w-full max-h-[70vh] object-contain rounded-xl bg-white/60 dark:bg-slate-900/40"
                  />
                ) : (
                  <iframe
                    src={viewerResolvedUrl}
                    className="w-full h-[70vh] rounded-xl bg-white/60 dark:bg-slate-900/40"
                  />
                )}
              </div>
            ) : (
              <a
                href={viewerResolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Eye className="h-4 w-4" />
                Open
              </a>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
