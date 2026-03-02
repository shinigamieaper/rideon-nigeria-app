"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion } from "motion/react";
import { FileText } from "lucide-react";
import {
  StickyBanner,
  ProfilePhotoUpload,
  Checkbox,
  SingleSelectCombobox,
  MultiSelectCombobox,
} from "@/components";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/vehicleTypes";

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
  vehicleExperienceCategories: string[];
  vehicleExperienceNotes?: string;
  preferredCity: string;
  availabilityFullTime?: boolean;
  salaryExpectation?: string;
  salaryExpectationMinNgn?: string;
  salaryExpectationMaxNgn?: string;
  familyFitTags: string[];
  familyFitNotes?: string;
  languages: string[];
  hobbies: string[];
  fullTimePreferences: {
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

const DEFAULT_DRAFT: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  nin: "",
  bvn: "",
  experienceYears: "",
  vehicleTypesHandled: "",
  vehicleExperienceCategories: [],
  vehicleExperienceNotes: "",
  preferredCity: "",
  availabilityFullTime: undefined,
  salaryExpectation: "",
  salaryExpectationMinNgn: "",
  salaryExpectationMaxNgn: "",
  familyFitTags: [],
  familyFitNotes: "",
  languages: [],
  hobbies: [],
  fullTimePreferences: {
    willingToTravel: undefined,
    preferredClientType: undefined,
  },
  additionalNotes: "",
  profileImageUrl: "",
  references: [{ name: "", email: "", phone: "", relationship: "" }],
  backgroundConsent: false,
  kycConsent: false,
  documents: {
    driversLicenseUrl: "",
    governmentIdUrl: "",
    lasdriCardUrl: "",
    policeReportUrl: "",
    medicalReportUrl: "",
    eyeTestUrl: "",
  },
};

function parseCommaList(raw: string | undefined | null): string[] {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function joinCommaList(values: string[]): string {
  return values
    .map((s) => String(s || "").trim())
    .filter((s) => s.length > 0)
    .join(", ");
}

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DRAFT;
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed || typeof parsed !== "object") return DEFAULT_DRAFT;
    const next = {
      ...DEFAULT_DRAFT,
      ...parsed,
      documents: { ...DEFAULT_DRAFT.documents, ...(parsed as any).documents },
      references:
        Array.isArray((parsed as any).references) &&
        (parsed as any).references.length > 0
          ? (parsed as any).references
          : DEFAULT_DRAFT.references,
    };

    const legacy = String((next as any).salaryExpectation || "").trim();
    const min = String((next as any).salaryExpectationMinNgn || "").trim();
    const max = String((next as any).salaryExpectationMaxNgn || "").trim();
    if (!min && !max && legacy) {
      (next as any).salaryExpectationMinNgn = legacy;
      (next as any).salaryExpectationMaxNgn = legacy;
    }

    return next;
  } catch {
    return DEFAULT_DRAFT;
  }
}

function saveDraft(draft: Draft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim().toLowerCase());
}

function mergeDraftIfEmpty(current: Draft, patch: Partial<Draft>): Draft {
  const next: Draft = { ...current };

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
  setIfEmpty("profileImageUrl", patch.profileImageUrl);
  setIfEmpty("preferredCity", patch.preferredCity);

  if (String(next.experienceYears || "").trim().length === 0) {
    const v: any = (patch as any).experienceYears;
    if (typeof v === "number" && Number.isFinite(v))
      next.experienceYears = String(v);
    if (typeof v === "string" && v.trim().length > 0) next.experienceYears = v;
  }

  if (String(next.salaryExpectationMinNgn || "").trim().length === 0) {
    const v: any =
      (patch as any).salaryExpectationMinNgn ??
      (patch as any).salaryExpectation;
    if (typeof v === "number" && Number.isFinite(v) && v > 0)
      next.salaryExpectationMinNgn = String(v);
    if (typeof v === "string" && v.trim().length > 0)
      next.salaryExpectationMinNgn = v;
  }

  if (String(next.salaryExpectationMaxNgn || "").trim().length === 0) {
    const v: any =
      (patch as any).salaryExpectationMaxNgn ??
      (patch as any).salaryExpectation;
    if (typeof v === "number" && Number.isFinite(v) && v > 0)
      next.salaryExpectationMaxNgn = String(v);
    if (typeof v === "string" && v.trim().length > 0)
      next.salaryExpectationMaxNgn = v;
  }

  if (String(next.salaryExpectation || "").trim().length === 0) {
    const v: any = (patch as any).salaryExpectation;
    if (typeof v === "number" && Number.isFinite(v) && v > 0)
      next.salaryExpectation = String(v);
    if (typeof v === "string" && v.trim().length > 0)
      next.salaryExpectation = v;
  }

  if (String(next.vehicleTypesHandled || "").trim().length === 0) {
    const v: any = (patch as any).vehicleTypesHandled;
    if (typeof v === "string" && v.trim().length > 0)
      next.vehicleTypesHandled = v;
  }

  if (
    Array.isArray((patch as any).vehicleExperienceCategories) &&
    next.vehicleExperienceCategories.length === 0
  ) {
    next.vehicleExperienceCategories = (
      patch as any
    ).vehicleExperienceCategories;
  }

  if (String(next.vehicleExperienceNotes || "").trim().length === 0) {
    const v: any = (patch as any).vehicleExperienceNotes;
    if (typeof v === "string" && v.trim().length > 0)
      next.vehicleExperienceNotes = v;
  }

  if (
    Array.isArray((patch as any).familyFitTags) &&
    next.familyFitTags.length === 0
  ) {
    next.familyFitTags = (patch as any).familyFitTags;
  }

  if (String(next.familyFitNotes || "").trim().length === 0) {
    const v: any = (patch as any).familyFitNotes;
    if (typeof v === "string" && v.trim().length > 0) next.familyFitNotes = v;
  }

  if (Array.isArray((patch as any).languages) && next.languages.length === 0) {
    next.languages = (patch as any).languages;
  }

  if (Array.isArray((patch as any).hobbies) && next.hobbies.length === 0) {
    next.hobbies = (patch as any).hobbies;
  }

  if (
    next.fullTimePreferences &&
    typeof next.fullTimePreferences === "object" &&
    patch.fullTimePreferences &&
    typeof patch.fullTimePreferences === "object"
  ) {
    if (
      typeof next.fullTimePreferences.willingToTravel !== "boolean" &&
      typeof (patch.fullTimePreferences as any).willingToTravel === "boolean"
    ) {
      next.fullTimePreferences.willingToTravel = (
        patch.fullTimePreferences as any
      ).willingToTravel;
    }
    if (
      !next.fullTimePreferences.preferredClientType &&
      ((patch.fullTimePreferences as any).preferredClientType === "personal" ||
        (patch.fullTimePreferences as any).preferredClientType ===
          "corporate" ||
        (patch.fullTimePreferences as any).preferredClientType === "any")
    ) {
      next.fullTimePreferences.preferredClientType = (
        patch.fullTimePreferences as any
      ).preferredClientType;
    }
  }

  if (
    typeof next.availabilityFullTime !== "boolean" &&
    typeof (patch as any).availabilityFullTime === "boolean"
  ) {
    next.availabilityFullTime = (patch as any).availabilityFullTime;
  }

  if (String(next.additionalNotes || "").trim().length === 0) {
    const v: any = (patch as any).additionalNotes;
    if (typeof v === "string" && v.trim().length > 0) next.additionalNotes = v;
  }

  if (
    Array.isArray((patch as any).references) &&
    Array.isArray(next.references) &&
    next.references.length === 1 &&
    !next.references[0]?.name &&
    !next.references[0]?.email &&
    !next.references[0]?.phone &&
    !next.references[0]?.relationship
  ) {
    const incoming = (patch as any).references as any[];
    const normalized = incoming
      .map((r) => ({
        name: String(r?.name || "").trim(),
        email: String(r?.email || "").trim(),
        phone: String(r?.phone || "").trim(),
        relationship: String(r?.relationship || "").trim(),
      }))
      .filter((r) => r.name || r.email || r.phone || r.relationship);
    if (normalized.length > 0) next.references = normalized;
  }

  return next;
}

export default function DriverRecruitmentApplyPage() {
  const router = useRouter();

  const [ready, setReady] = React.useState(false);
  const [serviceCities, setServiceCities] = React.useState<string[]>([
    "Lagos",
    "Abuja",
    "Port Harcourt",
    "Ibadan",
  ]);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [draft, setDraft] = React.useState<Draft>(DEFAULT_DRAFT);
  const [error, setError] = React.useState<string | null>(null);
  const prefillDoneRef = React.useRef(false);
  const [hobbyInput, setHobbyInput] = React.useState("");

  const preferredCityOptions = React.useMemo(
    () => serviceCities.map((c) => ({ value: c, label: c })),
    [serviceCities],
  );

  const preferredClientTypeOptions = React.useMemo(
    () => [
      { value: "personal", label: "Personal" },
      { value: "corporate", label: "Corporate" },
      { value: "any", label: "Any" },
    ],
    [],
  );

  const vehicleTypeOptions = React.useMemo(() => {
    const existing = parseCommaList(draft.vehicleTypesHandled);
    const set = new Set(VEHICLE_TYPE_OPTIONS.map((o) => o.value));
    const custom = existing
      .filter((v) => !set.has(v))
      .map((v) => ({ value: v, label: v }));
    return [...VEHICLE_TYPE_OPTIONS, ...custom];
  }, [draft.vehicleTypesHandled]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace(
          `/login?next=${encodeURIComponent("/full-time-driver/application/apply")}`,
        );
        return;
      }
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  React.useEffect(() => {
    setDraft(loadDraft());
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    if (prefillDoneRef.current) return;
    prefillDoneRef.current = true;

    let cancelled = false;

    async function prefill() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        const fetchJson = async (url: string) => {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await res.json().catch(() => ({}));
          return { ok: res.ok, json: j };
        };

        const [u, a] = await Promise.all([
          fetchJson("/api/users/me"),
          fetchJson("/api/full-time-driver/me"),
        ]);

        if (cancelled) return;

        setDraft((cur) => {
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
            a.ok &&
            typeof a.json?.status === "string" &&
            a.json.status !== "not_applied"
          ) {
            next = mergeDraftIfEmpty(next, {
              firstName:
                typeof a.json?.firstName === "string" ? a.json.firstName : "",
              lastName:
                typeof a.json?.lastName === "string" ? a.json.lastName : "",
              email: typeof a.json?.email === "string" ? a.json.email : "",
              phoneNumber:
                typeof a.json?.phoneNumber === "string"
                  ? a.json.phoneNumber
                  : "",
              nin: typeof a.json?.nin === "string" ? a.json.nin : "",
              bvn: typeof a.json?.bvn === "string" ? a.json.bvn : "",
              preferredCity:
                typeof a.json?.preferredCity === "string"
                  ? a.json.preferredCity
                  : "",
              experienceYears:
                typeof a.json?.experienceYears === "number"
                  ? a.json.experienceYears
                  : undefined,
              salaryExpectation:
                typeof a.json?.salaryExpectation === "number"
                  ? a.json.salaryExpectation
                  : undefined,
              salaryExpectationMinNgn:
                typeof a.json?.salaryExpectationMinNgn === "number"
                  ? a.json.salaryExpectationMinNgn
                  : undefined,
              salaryExpectationMaxNgn:
                typeof a.json?.salaryExpectationMaxNgn === "number"
                  ? a.json.salaryExpectationMaxNgn
                  : undefined,
              vehicleTypesHandled:
                typeof a.json?.vehicleTypesHandled === "string"
                  ? a.json.vehicleTypesHandled
                  : "",
              vehicleExperienceCategories: Array.isArray(
                a.json?.vehicleExperience?.categories,
              )
                ? a.json.vehicleExperience.categories
                : [],
              vehicleExperienceNotes:
                typeof a.json?.vehicleExperience?.notes === "string"
                  ? a.json.vehicleExperience.notes
                  : "",
              familyFitTags: Array.isArray(a.json?.familyFitTags)
                ? a.json.familyFitTags
                : [],
              familyFitNotes:
                typeof a.json?.familyFitNotes === "string"
                  ? a.json.familyFitNotes
                  : "",
              languages: Array.isArray(a.json?.languages)
                ? a.json.languages
                : [],
              hobbies: Array.isArray(a.json?.hobbies) ? a.json.hobbies : [],
              fullTimePreferences:
                a.json?.fullTimePreferences &&
                typeof a.json.fullTimePreferences === "object"
                  ? {
                      willingToTravel:
                        typeof a.json.fullTimePreferences.willingToTravel ===
                        "boolean"
                          ? a.json.fullTimePreferences.willingToTravel
                          : undefined,
                      preferredClientType:
                        a.json.fullTimePreferences.preferredClientType ===
                          "personal" ||
                        a.json.fullTimePreferences.preferredClientType ===
                          "corporate" ||
                        a.json.fullTimePreferences.preferredClientType === "any"
                          ? a.json.fullTimePreferences.preferredClientType
                          : undefined,
                    }
                  : undefined,
              availabilityFullTime:
                typeof a.json?.availabilityFullTime === "boolean"
                  ? a.json.availabilityFullTime
                  : undefined,
              additionalNotes:
                typeof a.json?.additionalNotes === "string"
                  ? a.json.additionalNotes
                  : "",
              references: Array.isArray(a.json?.references)
                ? a.json.references
                : undefined,
            } as any);
          }

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
  }, [ready]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadServiceCities() {
      try {
        const res = await fetch("/api/config/service-cities");
        if (!res.ok) return;
        const j = await res.json();
        const fromEnabled = Array.isArray(j.enabledCities)
          ? j.enabledCities
          : [];
        const fromFull = Array.isArray(j.cities)
          ? j.cities
              .map((c: any) => (typeof c?.name === "string" ? c.name : ""))
              .filter((name: string) => name.trim().length > 0)
          : [];
        const cities: string[] =
          fromEnabled.length > 0 ? fromEnabled : fromFull;
        if (!cancelled && cities.length > 0) setServiceCities(cities);
      } catch {
        // ignore
      }
    }
    loadServiceCities();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    saveDraft(draft);
  }, [draft, ready]);

  const canContinue = React.useMemo(() => {
    if (step === 1) {
      const ninOk = /^\d{11}$/.test(String(draft.nin || "").trim());
      const bvnRaw = String(draft.bvn || "").trim();
      const bvnOk = bvnRaw.length === 0 || /^\d{11}$/.test(bvnRaw);
      return (
        draft.firstName.trim().length > 0 &&
        draft.lastName.trim().length > 0 &&
        isValidEmail(draft.email) &&
        draft.phoneNumber.trim().length >= 6 &&
        ninOk &&
        bvnOk &&
        Number.isFinite(Number(draft.experienceYears)) &&
        Number(draft.experienceYears) >= 0 &&
        draft.profileImageUrl.trim().length > 0
      );
    }

    if (step === 2) {
      const minRaw = Number(draft.salaryExpectationMinNgn);
      const maxRaw = Number(draft.salaryExpectationMaxNgn);
      const hasMin = Number.isFinite(minRaw) && minRaw > 0;
      const hasMax = Number.isFinite(maxRaw) && maxRaw > 0;
      const hasAny = hasMin || hasMax;
      const rangeOk =
        !hasAny ||
        (!hasMin && !hasMax) ||
        (!hasMin && hasMax) ||
        (hasMin && !hasMax) ||
        (hasMin && hasMax && maxRaw >= minRaw);
      return (
        draft.preferredCity.trim().length > 0 &&
        typeof draft.availabilityFullTime === "boolean" &&
        rangeOk
      );
    }

    const refs = (Array.isArray(draft.references) ? draft.references : [])
      .map((r) => ({
        name: String(r?.name || "").trim(),
        email: String(r?.email || "").trim(),
        phone: String(r?.phone || "").trim(),
        relationship: String(r?.relationship || "").trim(),
      }))
      .filter((r) => r.name || r.email || r.phone || r.relationship);

    const refsOk =
      refs.length > 0 &&
      refs.every((r) => r.name && r.email && r.phone && r.relationship);
    return refsOk && draft.backgroundConsent && draft.kycConsent;
  }, [draft, step]);

  const toggleArrayValue = (arr: string[], value: string) => {
    const set = new Set(arr);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    return Array.from(set);
  };

  const addTag = (key: "languages" | "hobbies", raw: string) => {
    const v = String(raw || "").trim();
    if (!v) return;
    setDraft((d) => {
      const next = toggleArrayValue((d as any)[key] as string[], v);
      return { ...d, [key]: next } as any;
    });
  };

  const removeTag = (key: "languages" | "hobbies", value: string) => {
    setDraft((d) => {
      const next = ((d as any)[key] as string[]).filter((x) => x !== value);
      return { ...d, [key]: next } as any;
    });
  };

  const VEHICLE_CATEGORIES = [
    "Sedan",
    "SUV",
    "Van/Minivan",
    "Bus",
    "Pickup/Truck",
    "Luxury",
    "Manual",
    "Automatic",
  ];

  const FAMILY_FIT_TAGS = [
    "Kids/School runs",
    "Elderly care",
    "Special needs experience",
    "Executive/Corporate driving",
    "Night driving",
    "Long-distance/Interstate trips",
  ];

  const next = () => {
    setError(null);
    if (!canContinue) {
      setError("Please complete the required fields to continue.");
      return;
    }
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 3));
  };

  const prev = () => {
    setError(null);
    setStep((s) => (s === 3 ? 2 : s === 2 ? 1 : 1));
  };

  const continueToDocuments = () => {
    setError(null);
    if (!canContinue) {
      setError("Please complete the required fields to continue.");
      return;
    }
    saveDraft(draft);
    router.push("/full-time-driver/application/documents");
  };

  const addReference = () => {
    setDraft((d) => ({
      ...d,
      references: [
        ...(Array.isArray(d.references) ? d.references : []),
        { name: "", email: "", phone: "", relationship: "" },
      ],
    }));
  };

  const removeReference = (idx: number) => {
    setDraft((d) => {
      const refs = Array.isArray(d.references) ? [...d.references] : [];
      if (refs.length <= 1) return d;
      refs.splice(idx, 1);
      return { ...d, references: refs };
    });
  };

  if (!ready) {
    return (
      <main className="min-h-dvh bg-background text-foreground">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-10">
          <div className="h-10 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="mt-4 h-28 rounded-2xl bg-slate-200/50 dark:bg-slate-800/40 animate-pulse" />
          <div className="mt-5 h-64 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/full-time-driver/application/status"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Link>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            Step {step} of 3
          </span>
        </div>

        {error ? (
          <StickyBanner className="z-50">
            <div className="rounded-xl px-3 py-2 text-[13px] shadow border bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200">
              {error}
            </div>
          </StickyBanner>
        ) : null}

        <motion.section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 sm:p-6 text-white shadow-xl"
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
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Apply for Full-Time Placement
                </h1>
                <p className="text-sm text-white/80 mt-0.5">
                  Complete your details, then upload documents.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {step === 1 ? (
          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7 space-y-5">
            <ProfilePhotoUpload
              currentPhotoUrl={draft.profileImageUrl}
              onPhotoChange={(url) =>
                setDraft((d) => ({ ...d, profileImageUrl: url }))
              }
              required
              folder="driver_profiles"
              label="Professional Photo"
              helperText="Upload a clear headshot. This helps with placement review."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  First Name
                </label>
                <input
                  value={draft.firstName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, firstName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="e.g. Chinedu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Last Name
                </label>
                <input
                  value={draft.lastName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, lastName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="e.g. Okafor"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  inputMode="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  inputMode="tel"
                  value={draft.phoneNumber}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, phoneNumber: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="e.g. 08012345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  NIN (11 digits)
                </label>
                <input
                  inputMode="numeric"
                  value={draft.nin}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, nin: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="e.g. 12345678901"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  BVN (optional, 11 digits)
                </label>
                <input
                  inputMode="numeric"
                  value={draft.bvn || ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, bvn: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="e.g. 12345678901"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Years of Driving Experience
                </label>
                <input
                  inputMode="numeric"
                  value={draft.experienceYears}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, experienceYears: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={next}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl hover:opacity-95 transition-all"
            >
              Continue
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Vehicle types handled
              </label>
              <MultiSelectCombobox
                options={vehicleTypeOptions}
                value={parseCommaList(draft.vehicleTypesHandled)}
                onValueChange={(next) =>
                  setDraft((d) => ({
                    ...d,
                    vehicleTypesHandled: joinCommaList(next),
                  }))
                }
                placeholder="Select vehicle types"
                searchPlaceholder="Search vehicle types"
                emptyText="No vehicle types"
              />
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Vehicle experience (select all that apply)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VEHICLE_CATEGORIES.map((cat) => {
                  const checked =
                    draft.vehicleExperienceCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setDraft((d) => ({
                            ...d,
                            vehicleExperienceCategories: toggleArrayValue(
                              d.vehicleExperienceCategories,
                              cat,
                            ),
                          }))
                        }
                      />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={draft.vehicleExperienceNotes || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      vehicleExperienceNotes: e.target.value,
                    }))
                  }
                  className="w-full min-h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="Any specific vehicle experience you want to highlight…"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Family-fit (select all that apply)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FAMILY_FIT_TAGS.map((tag) => {
                  const checked = draft.familyFitTags.includes(tag);
                  return (
                    <label
                      key={tag}
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setDraft((d) => ({
                            ...d,
                            familyFitTags: toggleArrayValue(
                              d.familyFitTags,
                              tag,
                            ),
                          }))
                        }
                      />
                      <span>{tag}</span>
                    </label>
                  );
                })}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={draft.familyFitNotes || ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, familyFitNotes: e.target.value }))
                  }
                  className="w-full min-h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="Any additional context (e.g. ages you’ve worked with, school-run routine, etc.)…"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Languages
              </div>
              <MultiSelectCombobox
                options={LANGUAGE_OPTIONS}
                value={draft.languages}
                onValueChange={(next) =>
                  setDraft((d) => ({ ...d, languages: next }))
                }
                placeholder="Select languages"
                searchPlaceholder="Search languages"
                emptyText="No languages"
              />
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Interests (optional)
              </div>
              <div className="flex gap-2">
                <input
                  value={hobbyInput}
                  onChange={(e) => setHobbyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag("hobbies", hobbyInput);
                      setHobbyInput("");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="Type an interest and press Enter"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag("hobbies", hobbyInput);
                    setHobbyInput("");
                  }}
                  className="shrink-0 rounded-xl bg-[#00529B] px-4 py-3 text-sm font-medium text-white"
                >
                  Add
                </button>
              </div>
              {draft.hobbies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {draft.hobbies.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-2 rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
                    >
                      {h}
                      <button
                        type="button"
                        onClick={() => removeTag("hobbies", h)}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Full-time preferences
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  checked={draft.fullTimePreferences.willingToTravel === true}
                  onCheckedChange={(next) =>
                    setDraft((d) => ({
                      ...d,
                      fullTimePreferences: {
                        ...d.fullTimePreferences,
                        willingToTravel: next,
                      },
                    }))
                  }
                />
                Willing to travel
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Preferred client type
                </label>
                <SingleSelectCombobox
                  options={preferredClientTypeOptions}
                  value={draft.fullTimePreferences.preferredClientType || ""}
                  onValueChange={(next) => {
                    setDraft((d) => ({
                      ...d,
                      fullTimePreferences: {
                        ...d.fullTimePreferences,
                        preferredClientType:
                          next === "personal" ||
                          next === "corporate" ||
                          next === "any"
                            ? next
                            : undefined,
                      },
                    }));
                  }}
                  placeholder="Select"
                  searchPlaceholder="Search"
                  emptyText="No options"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Preferred work location
              </label>
              <SingleSelectCombobox
                options={preferredCityOptions}
                value={draft.preferredCity}
                onValueChange={(next) =>
                  setDraft((d) => ({ ...d, preferredCity: next }))
                }
                placeholder="Select a city"
                searchPlaceholder="Search cities"
                emptyText="No cities"
                allowClear={false}
              />
            </div>

            <div>
              <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Available for full-time work?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, availabilityFullTime: true }))
                  }
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-medium",
                    draft.availabilityFullTime === true
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
                  ].join(" ")}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({ ...d, availabilityFullTime: false }))
                  }
                  className={[
                    "rounded-xl border px-4 py-3 text-sm font-medium",
                    draft.availabilityFullTime === false
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
                  ].join(" ")}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Salary expectation (optional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  inputMode="numeric"
                  value={draft.salaryExpectationMinNgn || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      salaryExpectationMinNgn: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="Min (e.g. 200000)"
                />
                <input
                  inputMode="numeric"
                  value={draft.salaryExpectationMaxNgn || ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      salaryExpectationMaxNgn: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                  placeholder="Max (e.g. 300000)"
                />
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Monthly (NGN). Leave blank if unsure.
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Additional notes (optional)
              </label>
              <textarea
                value={draft.additionalNotes || ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, additionalNotes: e.target.value }))
                }
                className="w-full min-h-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                placeholder="Anything you want the team to know…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={prev}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-slate-700 dark:text-slate-200 font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl hover:opacity-95 transition-all"
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                References
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Add at least one reference for verification.
              </p>
            </div>

            <div className="space-y-4">
              {(Array.isArray(draft.references) ? draft.references : []).map(
                (r, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Reference {idx + 1}
                      </div>
                      {(draft.references.length || 0) > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeReference(idx)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <input
                      value={r.name}
                      onChange={(e) =>
                        setDraft((d) => {
                          const refs = Array.isArray(d.references)
                            ? [...d.references]
                            : [];
                          refs[idx] = { ...refs[idx], name: e.target.value };
                          return { ...d, references: refs };
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                      placeholder="Full name"
                    />
                    <input
                      value={r.email}
                      onChange={(e) =>
                        setDraft((d) => {
                          const refs = Array.isArray(d.references)
                            ? [...d.references]
                            : [];
                          refs[idx] = { ...refs[idx], email: e.target.value };
                          return { ...d, references: refs };
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                      placeholder="Email"
                    />
                    <input
                      value={r.phone}
                      onChange={(e) =>
                        setDraft((d) => {
                          const refs = Array.isArray(d.references)
                            ? [...d.references]
                            : [];
                          refs[idx] = { ...refs[idx], phone: e.target.value };
                          return { ...d, references: refs };
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                      placeholder="Phone"
                    />
                    <input
                      value={r.relationship}
                      onChange={(e) =>
                        setDraft((d) => {
                          const refs = Array.isArray(d.references)
                            ? [...d.references]
                            : [];
                          refs[idx] = {
                            ...refs[idx],
                            relationship: e.target.value,
                          };
                          return { ...d, references: refs };
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                      placeholder="Relationship (e.g. Former employer)"
                    />
                  </div>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={addReference}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-slate-700 dark:text-slate-200 font-medium"
            >
              Add another reference
            </button>

            <div className="space-y-3">
              <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  checked={draft.backgroundConsent}
                  onCheckedChange={(next) =>
                    setDraft((d) => ({ ...d, backgroundConsent: next }))
                  }
                  className="mt-1"
                />
                <span>I consent to background verification.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <Checkbox
                  checked={draft.kycConsent}
                  onCheckedChange={(next) =>
                    setDraft((d) => ({ ...d, kycConsent: next }))
                  }
                  className="mt-1"
                />
                <span>
                  I confirm my details are accurate and I consent to KYC checks.
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={prev}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-slate-700 dark:text-slate-200 font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={continueToDocuments}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl hover:opacity-95 transition-all"
              >
                Continue to Documents
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
