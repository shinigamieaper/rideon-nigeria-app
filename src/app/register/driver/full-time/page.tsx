"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, UploadCloud } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import BlurText from "../../../../../components/shared/BlurText";
import RevealOnScroll from "../../../../../components/shared/RevealOnScroll";
import {
  ProfilePhotoUpload,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components";

type CSSVars = React.CSSProperties & {
  "--tw-enter-scale"?: number | string;
  "--tw-enter-blur"?: number | string;
};

interface FilesState {
  driversLicense: File | null;
  governmentId: File | null;
  lasdriCard: File | null;
}

const DEFAULT_SERVICE_CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan"];

interface ReferenceState {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nin: string;
  bvn: string;
  experienceYears: string;
  profileImageUrl: string;

  preferredCity: string;
  salaryExpectationMinNgn: string;
  salaryExpectationMaxNgn: string;
  profileSummary: string;

  references: ReferenceState[];
  backgroundConsent: boolean;
  kycConsent: boolean;

  files: FilesState;
  fileNames: {
    driversLicense: string;
    governmentId: string;
    lasdriCard: string;
  };

  driversLicenseUrl: string;
  governmentIdUrl: string;
  lasdriCardUrl: string;
}

export default function FullTimeDriverRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState<{
    driversLicense: boolean;
    governmentId: boolean;
    lasdriCard: boolean;
  }>({
    driversLicense: false,
    governmentId: false,
    lasdriCard: false,
  });

  const [serviceCities, setServiceCities] = useState<string[]>(
    DEFAULT_SERVICE_CITIES,
  );

  const [formData, setFormData] = useState<FormDataState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    nin: "",
    bvn: "",
    experienceYears: "",
    profileImageUrl: "",

    preferredCity: "",
    salaryExpectationMinNgn: "",
    salaryExpectationMaxNgn: "",
    profileSummary: "",

    references: [{ name: "", email: "", phone: "", relationship: "" }],
    backgroundConsent: false,
    kycConsent: false,

    files: {
      driversLicense: null,
      governmentId: null,
      lasdriCard: null,
    },
    fileNames: {
      driversLicense: "No file selected.",
      governmentId: "No file selected.",
      lasdriCard: "No file selected.",
    },

    driversLicenseUrl: "",
    governmentIdUrl: "",
    lasdriCardUrl: "",
  });

  useEffect(() => {
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
        if (!cancelled && cities.length > 0) {
          setServiceCities(cities);
        }
      } catch (e) {
        console.error(
          "[FullTimeDriverRegister] Failed to load service cities config",
          e,
        );
      }
    }
    loadServiceCities();
    return () => {
      cancelled = true;
    };
  }, []);

  const isStepValid = useMemo(() => {
    if (step === 1) {
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        nin,
        bvn,
        experienceYears,
        profileImageUrl,
      } = formData;
      const ninOk = /^\d{11}$/.test(String(nin || "").trim());
      const bvnRaw = String(bvn || "").trim();
      const bvnOk = bvnRaw.length === 0 || /^\d{11}$/.test(bvnRaw);
      return (
        firstName.trim() &&
        lastName.trim() &&
        email.trim() &&
        phoneNumber.trim() &&
        ninOk &&
        bvnOk &&
        !!Number(experienceYears) &&
        profileImageUrl.trim()
      );
    }

    if (step === 2) {
      const preferredCityOk = !!formData.preferredCity.trim();
      const min = Number(formData.salaryExpectationMinNgn);
      const max = Number(formData.salaryExpectationMaxNgn);
      const hasAny =
        (Number.isFinite(min) && min > 0) || (Number.isFinite(max) && max > 0);
      const rangeOk =
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min <= 0 ||
        max <= 0 ||
        max >= min;
      const salaryOk = hasAny && rangeOk;

      const normalizedReferences = (
        Array.isArray(formData.references) ? formData.references : []
      )
        .map((r) => ({
          name: String(r?.name || "").trim(),
          email: String(r?.email || "").trim(),
          phone: String(r?.phone || "").trim(),
          relationship: String(r?.relationship || "").trim(),
        }))
        .filter((r) => r.name || r.email || r.phone || r.relationship);

      const refsOk =
        normalizedReferences.length > 0 &&
        normalizedReferences.every(
          (r) => r.name && r.email && r.phone && r.relationship,
        );

      return (
        preferredCityOk &&
        salaryOk &&
        refsOk &&
        !!formData.backgroundConsent &&
        !!formData.kycConsent
      );
    }

    if (step === 3) {
      const docsOk = !!(formData.driversLicenseUrl && formData.governmentIdUrl);
      const uploadsDone =
        !docUploading.driversLicense &&
        !docUploading.governmentId &&
        !docUploading.lasdriCard;
      return docsOk && uploadsDone;
    }

    return true;
  }, [
    docUploading.driversLicense,
    docUploading.governmentId,
    docUploading.lasdriCard,
    formData,
    step,
  ]);

  const nextStep = () => {
    if (step < 4 && isStepValid) setStep(step + 1);
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    path?: [keyof FormDataState],
  ) => {
    const { value } = e.target;
    setFormData((prev) => {
      if (!path) return prev;
      const key = path[0] as keyof FormDataState;
      return { ...prev, [key]: value } as FormDataState;
    });
  };

  const uploadToCloudinary = async (
    key: keyof FilesState,
    file: File,
  ): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Unauthorized");

    const token = await user.getIdToken();
    const fd = new FormData();
    fd.append("key", String(key));
    fd.append("file", file);

    const res = await fetch("/api/uploads/driver-docs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || "Failed to upload file");
    }
    const data = await res.json().catch(() => null);
    if (!data?.url) throw new Error("Upload failed");
    return String(data.url);
  };

  const handleFileChange = (key: keyof FilesState, file: File | null) => {
    setError(null);

    setFormData((prev) => ({
      ...prev,
      files: { ...prev.files, [key]: file },
      fileNames: {
        ...prev.fileNames,
        [key]: file ? "Uploading… " + file.name : "No file selected.",
      },
    }));

    if (!file) {
      setFormData((prev) => {
        const updates: Partial<FormDataState> = {};
        if (key === "driversLicense") updates.driversLicenseUrl = "";
        if (key === "governmentId") updates.governmentIdUrl = "";
        if (key === "lasdriCard") updates.lasdriCardUrl = "";
        return { ...prev, ...updates } as FormDataState;
      });
      return;
    }

    setDocUploading((s) => ({ ...s, [key]: true }));
    uploadToCloudinary(key, file)
      .then((url) => {
        setFormData((prev) => {
          const updates: Partial<FormDataState> = {};
          if (key === "driversLicense") updates.driversLicenseUrl = url;
          if (key === "governmentId") updates.governmentIdUrl = url;
          if (key === "lasdriCard") updates.lasdriCardUrl = url;
          return {
            ...prev,
            ...updates,
            fileNames: { ...prev.fileNames, [key]: file.name },
          } as FormDataState;
        });
      })
      .catch((e) => {
        console.error("[FullTimeDriverRegister] upload error", e);
        setError(
          typeof e?.message === "string" ? e.message : "Failed to upload file.",
        );
        setFormData((prev) => ({
          ...prev,
          fileNames: { ...prev.fileNames, [key]: "Upload failed" },
        }));
      })
      .finally(() => setDocUploading((s) => ({ ...s, [key]: false })));
  };

  const populateReview = () => {
    return (
      <div className="space-y-6 text-sm">
        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            Personal Information
          </h3>
          <div className="space-y-2 mt-3">
            {[
              { label: "First Name", value: formData.firstName },
              { label: "Last Name", value: formData.lastName },
              { label: "Email Address", value: formData.email },
              { label: "Phone Number", value: formData.phoneNumber },
              { label: "NIN", value: formData.nin },
              { label: "BVN (optional)", value: formData.bvn || "" },
              {
                label: "Years of Professional Driving Experience",
                value: formData.experienceYears,
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {row.label}:
                </span>
                <span className="font-medium text-right">
                  {row.value || "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            Recruitment Details
          </h3>
          <div className="space-y-2 mt-3">
            {[
              { label: "Preferred City", value: formData.preferredCity },
              {
                label: "Salary Expectation (Monthly, NGN)",
                value:
                  String(formData.salaryExpectationMinNgn || "").trim() &&
                  String(formData.salaryExpectationMaxNgn || "").trim()
                    ? `${formData.salaryExpectationMinNgn} - ${formData.salaryExpectationMaxNgn}`
                    : formData.salaryExpectationMinNgn ||
                      formData.salaryExpectationMaxNgn,
              },
              {
                label: "Professional Summary",
                value: formData.profileSummary || "N/A",
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {row.label}:
                </span>
                <span className="font-medium text-right max-w-[60%] truncate">
                  {row.value || "N/A"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            References
          </h3>
          <div className="space-y-2 mt-3">
            {(Array.isArray(formData.references)
              ? formData.references
              : []
            ).map((r, idx) => {
              const name = String(r?.name || "").trim();
              const email = String(r?.email || "").trim();
              const phone = String(r?.phone || "").trim();
              const relationship = String(r?.relationship || "").trim();
              const empty = !name && !email && !phone && !relationship;
              if (empty) return null;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Name:
                    </span>
                    <span className="font-medium text-right">
                      {name || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Email:
                    </span>
                    <span className="font-medium text-right">
                      {email || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Phone:
                    </span>
                    <span className="font-medium text-right">
                      {phone || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      Relationship:
                    </span>
                    <span className="font-medium text-right">
                      {relationship || "N/A"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            Consent
          </h3>
          <div className="space-y-2 mt-3">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Background Consent:
              </span>
              <span className="font-medium text-right">
                {formData.backgroundConsent ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                KYC Consent:
              </span>
              <span className="font-medium text-right">
                {formData.kycConsent ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            Uploaded Documents
          </h3>
          <div className="space-y-2 mt-3">
            {[
              { label: "Driver's License", key: "driversLicense" as const },
              { label: "Government ID", key: "governmentId" as const },
              { label: "LASDRI Card (optional)", key: "lasdriCard" as const },
            ].map((doc) => (
              <div key={doc.key} className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">
                  {doc.label}:
                </span>
                <span className="font-medium text-right text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {formData.fileNames[doc.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 4) return;
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const email = formData.email.trim().toLowerCase();
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      if (!emailOk) {
        setError("Please enter a valid email address.");
        setSubmitting(false);
        return;
      }

      let user = auth.currentUser;
      if (!user || user.email?.toLowerCase() !== email) {
        try {
          const password = cryptoRandomString(16);
          const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
          );
          user = cred.user;
          try {
            await sendPasswordResetEmail(auth, email);
          } catch (e) {
            console.warn(
              "[FullTimeDriverRegister] sendPasswordResetEmail failed",
              e,
            );
          }
        } catch (e: unknown) {
          const code =
            typeof e === "object" && e && "code" in e
              ? String((e as { code?: string }).code)
              : undefined;
          if (code === "auth/email-already-in-use") {
            try {
              await fetchSignInMethodsForEmail(auth, email);
              await sendPasswordResetEmail(auth, email);
            } catch (se) {
              console.warn(
                "[FullTimeDriverRegister] fetchSignInMethods/reset failed",
                se,
              );
            }
            throw new Error(
              "This email already has an account. We've sent a password reset link. Please reset your password, sign in, then return and click Submit again.",
            );
          }
          throw e;
        }
      }

      const idToken = await user.getIdToken();

      let minNgn = Number(formData.salaryExpectationMinNgn);
      let maxNgn = Number(formData.salaryExpectationMaxNgn);
      minNgn = Number.isFinite(minNgn) && minNgn > 0 ? Math.round(minNgn) : 0;
      maxNgn = Number.isFinite(maxNgn) && maxNgn > 0 ? Math.round(maxNgn) : 0;
      if (minNgn > 0 && maxNgn <= 0) maxNgn = minNgn;
      if (maxNgn > 0 && minNgn <= 0) minNgn = maxNgn;
      if (minNgn > 0 && maxNgn > 0 && maxNgn < minNgn) {
        const t = minNgn;
        minNgn = maxNgn;
        maxNgn = t;
      }
      const legacySalaryExpectation = Math.max(0, maxNgn || minNgn || 0);

      const driversLicenseUrl = formData.driversLicenseUrl;
      const governmentIdUrl = formData.governmentIdUrl;
      const lasdriCardUrl = formData.lasdriCardUrl;
      if (!driversLicenseUrl || !governmentIdUrl) {
        throw new Error("Please upload all required documents.");
      }

      const references = (
        Array.isArray(formData.references) ? formData.references : []
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
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email,
          phoneNumber: formData.phoneNumber,
          nin: formData.nin,
          bvn: formData.bvn,
          experienceYears: Number(formData.experienceYears),
          profileImageUrl: formData.profileImageUrl,
          preferredCity: formData.preferredCity,
          salaryExpectation: legacySalaryExpectation,
          ...(minNgn > 0 ? { salaryExpectationMinNgn: minNgn } : {}),
          ...(maxNgn > 0 ? { salaryExpectationMaxNgn: maxNgn } : {}),
          profileSummary: formData.profileSummary,
          backgroundConsent: formData.backgroundConsent,
          documents: {
            driversLicenseUrl,
            governmentIdUrl,
            lasdriCardUrl,
          },
          references,
          kycConsent: formData.kycConsent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to submit application");
      }

      router.push("/register/driver/full-time/thank-you");
    } catch (err: unknown) {
      console.error("[FullTimeDriverRegister] submit error", err);
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u?.email) {
        setFormData((prev) => ({ ...prev, email: prev.email || u.email! }));
      }
    });
    return () => unsub();
  }, []);

  return (
    <main className="flex min-h-screen w-full items-center justify-center pt-24 pb-12 px-4">
      <RevealOnScroll
        as="div"
        className="w-full max-w-3xl rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8 md:p-12"
        style={
          {
            "--tw-enter-scale": 0.9,
            "--tw-enter-blur": "16px",
            boxShadow:
              "0 25px 50px -12px rgba(0,0,0,0.25), 0 0px 40px -10px rgba(0, 82, 155, 0.40)",
          } as CSSVars
        }
      >
        <div className="mb-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 px-4 py-3">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
              Application Type
            </span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Full-Time Recruitment
            </span>
          </div>
        </div>

        <div className="flex items-start mb-10">
          {[1, 2, 3, 4].map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className="step-item flex-1 flex flex-col items-center text-center gap-2"
                data-step={s}
              >
                <div
                  className={`step-circle w-9 h-9 flex items-center justify-center rounded-full font-semibold text-sm transition-all duration-300 border-2 ${
                    s < step
                      ? "bg-green-600 text-white border-green-600"
                      : s === step
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                <p
                  className={`step-text text-xs sm:text-sm font-medium transition-all duration-300 ${
                    s <= step
                      ? "text-slate-800 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {s === 1 && "Personal Info"}
                  {s === 2 && "Details"}
                  {s === 3 && "Documents"}
                  {s === 4 && "Review"}
                </p>
              </div>
              {idx < 3 && (
                <div
                  className={`step-connector flex-1 mt-4 h-0.5 mx-2 transition-all duration-300 ${
                    s < step
                      ? "bg-[#34A853]"
                      : "bg-slate-200 dark:bg-slate-700/50"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="overflow-hidden"
        >
          {step === 1 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText
                    as="span"
                    text="Personal Information"
                    animateBy="words"
                    direction="top"
                    delay={120}
                  />
                </h2>
                <BlurText
                  as="p"
                  className="text-slate-500 dark:text-slate-400 mt-2"
                  text="Tell us a bit about yourself."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input
                    type="text"
                    placeholder="First Name"
                    required
                    value={formData.firstName}
                    onChange={(e) => handleInput(e, ["firstName"])}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    required
                    value={formData.lastName}
                    onChange={(e) => handleInput(e, ["lastName"])}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={formData.email}
                  onChange={(e) => handleInput(e, ["email"])}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => handleInput(e, ["phoneNumber"])}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="NIN (11 digits)"
                    required
                    value={formData.nin}
                    onChange={(e) => handleInput(e, ["nin"])}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="BVN (optional, 11 digits)"
                    value={formData.bvn}
                    onChange={(e) => handleInput(e, ["bvn"])}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Years of Professional Driving Experience"
                  required
                  value={formData.experienceYears}
                  onChange={(e) => handleInput(e, ["experienceYears"])}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                />

                <ProfilePhotoUpload
                  currentPhotoUrl={formData.profileImageUrl}
                  onPhotoChange={(url) =>
                    setFormData((prev) => ({ ...prev, profileImageUrl: url }))
                  }
                  required
                  label="Professional Headshot"
                  helperText="Upload a professional photo for your recruitment profile."
                  className="pt-4"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText
                    as="span"
                    text="Recruitment Details"
                    animateBy="words"
                    direction="top"
                    delay={120}
                  />
                </h2>
                <BlurText
                  as="p"
                  className="text-slate-500 dark:text-slate-400 mt-2"
                  text="Tell us what you're looking for and add your references."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Preferred City
                    </label>
                    <Select
                      value={formData.preferredCity}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          preferredCity: value,
                        }))
                      }
                    >
                      <SelectTrigger aria-label="Preferred City">
                        <SelectValue placeholder="Select a city" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Salary Expectation (Monthly, NGN)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Min (e.g., 200000)"
                        value={formData.salaryExpectationMinNgn}
                        onChange={(e) =>
                          handleInput(e, ["salaryExpectationMinNgn"])
                        }
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max (e.g., 300000)"
                        value={formData.salaryExpectationMaxNgn}
                        onChange={(e) =>
                          handleInput(e, ["salaryExpectationMaxNgn"])
                        }
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Professional Summary (optional)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.profileSummary}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        profileSummary: e.target.value,
                      }))
                    }
                    placeholder="Briefly describe your experience, certifications, and what makes you a great chauffeur."
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                </div>

                {(Array.isArray(formData.references)
                  ? formData.references
                  : []
                ).map((ref, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/30 p-4 space-y-3"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Reference {idx + 1}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Full name"
                        value={ref.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = Array.isArray(prev.references)
                              ? [...prev.references]
                              : [];
                            while (next.length <= idx)
                              next.push({
                                name: "",
                                email: "",
                                phone: "",
                                relationship: "",
                              });
                            next[idx] = { ...next[idx], name: value };
                            return {
                              ...prev,
                              references: next,
                            } as FormDataState;
                          });
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={ref.email}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = Array.isArray(prev.references)
                              ? [...prev.references]
                              : [];
                            while (next.length <= idx)
                              next.push({
                                name: "",
                                email: "",
                                phone: "",
                                relationship: "",
                              });
                            next[idx] = { ...next[idx], email: value };
                            return {
                              ...prev,
                              references: next,
                            } as FormDataState;
                          });
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={ref.phone}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = Array.isArray(prev.references)
                              ? [...prev.references]
                              : [];
                            while (next.length <= idx)
                              next.push({
                                name: "",
                                email: "",
                                phone: "",
                                relationship: "",
                              });
                            next[idx] = { ...next[idx], phone: value };
                            return {
                              ...prev,
                              references: next,
                            } as FormDataState;
                          });
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Relationship (e.g., Former employer)"
                        value={ref.relationship}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData((prev) => {
                            const next = Array.isArray(prev.references)
                              ? [...prev.references]
                              : [];
                            while (next.length <= idx)
                              next.push({
                                name: "",
                                email: "",
                                phone: "",
                                relationship: "",
                              });
                            next[idx] = { ...next[idx], relationship: value };
                            return {
                              ...prev,
                              references: next,
                            } as FormDataState;
                          });
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                      />
                    </div>
                  </div>
                ))}

                {Array.isArray(formData.references) &&
                  formData.references.length < 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData(
                          (prev) =>
                            ({
                              ...prev,
                              references: [
                                ...(Array.isArray(prev.references)
                                  ? prev.references
                                  : []),
                                {
                                  name: "",
                                  email: "",
                                  phone: "",
                                  relationship: "",
                                },
                              ],
                            }) as FormDataState,
                        )
                      }
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Add another reference
                    </button>
                  )}

                <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.backgroundConsent}
                    onChange={(e) =>
                      setFormData(
                        (prev) =>
                          ({
                            ...prev,
                            backgroundConsent: e.target.checked,
                          }) as FormDataState,
                      )
                    }
                    className="mt-1 h-4 w-4 border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <span>
                    I consent to background checks as part of the recruitment
                    process.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.kycConsent}
                    onChange={(e) =>
                      setFormData(
                        (prev) =>
                          ({
                            ...prev,
                            kycConsent: e.target.checked,
                          }) as FormDataState,
                      )
                    }
                    className="mt-1 h-4 w-4 border-slate-300 text-green-600 focus:ring-green-500"
                  />
                  <span>
                    I consent to KYC/identity verification and confirm the
                    information provided is accurate.
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText
                    as="span"
                    text="Document Upload"
                    animateBy="words"
                    direction="top"
                    delay={120}
                  />
                </h2>
                <BlurText
                  as="p"
                  className="text-slate-500 dark:text-slate-400 mt-2"
                  text="Upload clear copies of the following documents."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>

              <div className="space-y-4">
                <div className="file-upload-wrapper p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
                      Driver's License
                    </p>
                    <p
                      className={`file-name text-xs ${formData.files.driversLicense ? "text-green-600 dark:text-green-500" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {formData.fileNames.driversLicense}
                    </p>
                  </div>
                  <label
                    className="shrink-0 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#00529B" }}
                  >
                    <UploadCloud className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Upload
                    <input
                      type="file"
                      required
                      className="sr-only"
                      onChange={(e) =>
                        handleFileChange(
                          "driversLicense",
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                  </label>
                </div>

                <div className="file-upload-wrapper p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
                      Government ID
                    </p>
                    <p
                      className={`file-name text-xs ${formData.files.governmentId ? "text-green-600 dark:text-green-500" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {formData.fileNames.governmentId}
                    </p>
                  </div>
                  <label
                    className="shrink-0 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#00529B" }}
                  >
                    <UploadCloud className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Upload
                    <input
                      type="file"
                      required
                      className="sr-only"
                      onChange={(e) =>
                        handleFileChange(
                          "governmentId",
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                  </label>
                </div>

                <div className="file-upload-wrapper p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300">
                      LASDRI Card
                    </p>
                    <p
                      className={`file-name text-xs ${formData.files.lasdriCard ? "text-green-600 dark:text-green-500" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {formData.fileNames.lasdriCard}
                    </p>
                  </div>
                  <label
                    className="shrink-0 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#00529B" }}
                  >
                    <UploadCloud className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Upload
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) =>
                        handleFileChange(
                          "lasdriCard",
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText
                    as="span"
                    text="Review & Submit"
                    animateBy="words"
                    direction="top"
                    delay={120}
                  />
                </h2>
                <BlurText
                  as="p"
                  className="text-slate-500 dark:text-slate-400 mt-2"
                  text="Please confirm all details are correct."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>
              {populateReview()}
            </div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                step === 1 ? "opacity-0 invisible" : ""
              }`}
            >
              Previous
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid}
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-green-500/20 dark:shadow-green-500/30 disabled:opacity-50"
                style={{ backgroundColor: "#34A853" }}
              >
                <BlurText
                  as="span"
                  text="Next Step"
                  animateBy="words"
                  direction="top"
                  delay={60}
                />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-green-500/20 dark:shadow-green-500/30 disabled:opacity-50"
                style={{ backgroundColor: "#34A853" }}
              >
                <BlurText
                  as="span"
                  text={submitting ? "Submitting…" : "Submit Application"}
                  animateBy="words"
                  direction="top"
                  delay={60}
                />
              </button>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>

        <style jsx global>{`
          .step-content {
            transition:
              opacity 0.3s ease-in-out,
              transform 0.3s ease-in-out;
          }
          .file-upload-wrapper input[type=\"file\"] {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }
        `}</style>
      </RevealOnScroll>
    </main>
  );
}

function cryptoRandomString(len: number) {
  const arr = Array.from(crypto.getRandomValues(new Uint32Array(len)));
  return (
    arr
      .map((x) => (x % 36).toString(36))
      .join("")
      .slice(0, len) + "A1!"
  );
}
