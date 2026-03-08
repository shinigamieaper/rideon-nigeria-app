"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, CheckCircle2, UploadCloud } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
// Firebase Storage removed (migrated to MongoDB GridFS via API uploads)
import BlurText from "../../../../components/shared/BlurText";
import RevealOnScroll from "../../../../components/shared/RevealOnScroll";
import {
  MultiSelectCombobox,
  ProfilePhotoUpload,
} from "../../../../components";

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

interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  experienceYears: string;
  profileImageUrl: string;
  files: FilesState;
  fileNames: {
    driversLicense: string;
    governmentId: string;
    lasdriCard: string;
  };
  servedCities?: string[];
  references: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
  }[];
  kycConsent: boolean;
  // Document URLs (uploaded to Cloudinary)
  driversLicenseUrl: string;
  governmentIdUrl: string;
  lasdriCardUrl: string;
}

export function OnDemandDriverRegisterPage() {
  const router = useRouter();
  // Placement track deprecated - all drivers register as fleet chauffeurs
  const track = "fleet" as const;
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState<{
    driversLicense: boolean;
    governmentId: boolean;
    lasdriCard: boolean;
  }>({ driversLicense: false, governmentId: false, lasdriCard: false });
  const [serviceCities, setServiceCities] = useState<string[]>(
    DEFAULT_SERVICE_CITIES,
  );

  const [formData, setFormData] = useState<FormDataState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    experienceYears: "",
    profileImageUrl: "",
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
    servedCities: [],
    references: [{ name: "", email: "", phone: "", relationship: "" }],
    kycConsent: false,
    // Cloudinary document URLs (populated after client upload)
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
          "[DriverRegister] Failed to load service cities config",
          e,
        );
      }
    }
    loadServiceCities();
    return () => {
      cancelled = true;
    };
  }, []);

  // Step validation
  const isStepValid = useMemo(() => {
    // Shared: Step 1 personal info required
    if (step === 1) {
      const {
        firstName,
        lastName,
        email,
        phoneNumber,
        experienceYears,
        profileImageUrl,
      } = formData;
      return (
        firstName.trim() &&
        lastName.trim() &&
        email.trim() &&
        phoneNumber.trim() &&
        !!Number(experienceYears) &&
        profileImageUrl.trim()
      );
    }
    if (track === "fleet") {
      if (step === 2) {
        const hasAtLeastOneCity =
          Array.isArray(formData.servedCities) &&
          formData.servedCities.length > 0;
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

        return hasAtLeastOneCity && refsOk && !!formData.kycConsent;
      }
      if (step === 3) {
        const { driversLicenseUrl, governmentIdUrl } = formData;
        const docsOk = !!(driversLicenseUrl && governmentIdUrl);
        const uploadsDone =
          !docUploading.driversLicense &&
          !docUploading.governmentId &&
          !docUploading.lasdriCard;
        return docsOk && uploadsDone;
      }
      return true;
    }
    return true;
  }, [step, formData, track]);

  const nextStep = () => {
    if (step < 4 && isStepValid) setStep(step + 1);
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  // Helpers
  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    path?: [keyof FormDataState],
  ) => {
    const { value } = e.target;
    setFormData((prev) => {
      if (!path) return prev; // should not happen
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
      let msg = "Failed to upload file.";
      try {
        const j = await res.json();
        msg = j?.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json().catch(() => null);
    if (!data?.url) throw new Error("Upload succeeded but no URL returned.");
    return String(data.url);
  };

  const handleFileChange = (key: keyof FilesState, file: File | null) => {
    if (!file) {
      // Clear file and URL
      setFormData((prev) => {
        const updates: Partial<FormDataState> = {};
        if (key === "driversLicense") updates.driversLicenseUrl = "";
        if (key === "governmentId") updates.governmentIdUrl = "";
        if (key === "lasdriCard") updates.lasdriCardUrl = "";
        return { ...prev, ...updates } as FormDataState;
      });
      setFormData((prev) => ({
        ...prev,
        files: { ...prev.files, [key]: null },
        fileNames: { ...prev.fileNames, [key]: "No file selected." },
      }));
      return;
    }

    // Client-side validation for immediate feedback
    const MAX_MB = 10;
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];

    if (file.size > MAX_BYTES) {
      setError(
        `${key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${MAX_MB}MB per file.`,
      );
      setFormData((prev) => ({
        ...prev,
        fileNames: { ...prev.fileNames, [key]: "File too large" },
      }));
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        `${key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} must be a PDF, JPG, or PNG image.`,
      );
      setFormData((prev) => ({
        ...prev,
        fileNames: { ...prev.fileNames, [key]: "Invalid file type" },
      }));
      return;
    }

    // Update filename immediately
    setFormData((prev) => ({
      ...prev,
      files: { ...prev.files, [key]: file },
      fileNames: {
        ...prev.fileNames,
        [key]: "Uploading… " + file.name,
      },
    }));

    // Begin upload
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
        console.error("[DriverRegister] upload error", e);
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
              {
                label: "First Name",
                value: formData.firstName,
              },
              { label: "Last Name", value: formData.lastName },
              { label: "Email Address", value: formData.email },
              { label: "Phone Number", value: formData.phoneNumber },
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
            {track === "fleet" &&
              Array.isArray(formData.servedCities) &&
              formData.servedCities.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    Served Cities:
                  </span>
                  <span className="font-medium text-right">
                    {formData.servedCities.join(", ")}
                  </span>
                </div>
              )}
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
                KYC / Background Check Consent:
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

  // Submit handler
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 4) return; // Guard: only submit on final step
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      console.log("[DriverRegister] submit start");
      // Normalize and validate email to avoid auth/invalid-email
      const email = formData.email.trim().toLowerCase();
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      if (!emailOk) {
        setError("Please enter a valid email address.");
        setSubmitting(false);
        return;
      }
      // 1) Ensure we have an authenticated user matching the email
      let user = auth.currentUser;
      if (!user || user.email?.toLowerCase() !== email) {
        try {
          const password = cryptoRandomString(16);
          console.log("[DriverRegister] creating user...");
          const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
          );
          user = cred.user;
          console.log("[DriverRegister] user created", user.uid);
          // Send a password reset email so the driver can set their own password
          try {
            await sendPasswordResetEmail(auth, email);
          } catch (e) {
            console.warn("[DriverRegister] sendPasswordResetEmail failed", e);
          }
        } catch (e: unknown) {
          const code =
            typeof e === "object" && e && "code" in e
              ? String((e as { code?: string }).code)
              : undefined;
          if (code === "auth/email-already-in-use") {
            console.warn(
              "[DriverRegister] email already in use; sending password reset",
            );
            try {
              await fetchSignInMethodsForEmail(auth, email);
              await sendPasswordResetEmail(auth, email);
            } catch (se) {
              console.warn(
                "[DriverRegister] fetchSignInMethods/reset failed",
                se,
              );
            }
            throw new Error(
              "This email already has an account. We've sent a password reset link. Please reset your password, sign in, then return and click Submit again.",
            );
          }
          throw e;
        }
      } else {
        console.log("[DriverRegister] using existing signed-in user", user.uid);
      }

      const idToken = await user.getIdToken();

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

      const res = await fetch("/api/auth/register-driver", {
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
          experienceYears: Number(formData.experienceYears),
          profileImageUrl: formData.profileImageUrl,
          documents: {
            driversLicenseUrl,
            governmentIdUrl,
            lasdriCardUrl,
          },
          servedCities: Array.isArray(formData.servedCities)
            ? formData.servedCities
            : undefined,
          references,
          kycConsent: formData.kycConsent,
        }),
      });

      console.log("[DriverRegister] API response status", res.status);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to submit application");
      }

      // 4) Redirect to Thank You
      console.log(
        "[DriverRegister] success, redirecting to /register/driver/thank-you",
      );
      router.push("/register/driver/thank-you");
    } catch (err: unknown) {
      console.error("[DriverRegister] submit error", err);
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // If user is already logged in, we can optionally prefill email
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
        {/* Track banner */}
        <div className="mb-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 px-4 py-3">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
              Application Type
            </span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Chauffeur Registration
            </span>
          </div>
        </div>
        {/* Stepper */}
        <div className="flex items-start mb-10">
          {[1, 2, 3, 4].map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className="step-item flex-1 flex flex-col items-center text-center gap-2"
                data-step={s}
              >
                <div
                  className={`step-circle w-9 h-9 flex items-center justify-center rounded-full font-semibold text-sm transition-all duration-300 border-2 ${s < step ? "bg-green-600 text-white border-green-600" : s === step ? "bg-green-600 text-white border-green-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                <p
                  className={`step-text text-xs sm:text-sm font-medium transition-all duration-300 ${s <= step ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {s === 1 && "Personal Info"}
                  {s === 2 && "References"}
                  {s === 3 && "Documents"}
                  {s === 4 && "Review"}
                </p>
              </div>
              {idx < 3 && (
                <div
                  className={`step-connector flex-1 mt-4 h-0.5 mx-2 transition-all duration-300 ${s < step ? "bg-[#34A853]" : "bg-slate-200 dark:bg-slate-700/50"}`}
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
          {/* Step 1 */}
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
                  helperText="Upload a professional photo for your driver profile. This will be visible to customers."
                  className="pt-4"
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="step-content">
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    <BlurText
                      as="span"
                      text="References & Consent"
                      animateBy="words"
                      direction="top"
                      delay={120}
                    />
                  </h2>
                  <BlurText
                    as="p"
                    className="text-slate-500 dark:text-slate-400 mt-2"
                    text="Add your references and confirm consent for verification."
                    animateBy="words"
                    direction="top"
                    delay={24}
                  />
                </div>
                <div className="space-y-5">
                  <div className="mt-2 space-y-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Service Cities <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                      Select at least one city where you can provide chauffeur
                      services.
                    </p>
                    <MultiSelectCombobox
                      options={serviceCities.map((city) => ({
                        value: city,
                        label: city,
                      }))}
                      value={
                        Array.isArray(formData.servedCities)
                          ? formData.servedCities
                          : []
                      }
                      onValueChange={(next) =>
                        setFormData(
                          (prev) =>
                            ({ ...prev, servedCities: next }) as FormDataState,
                        )
                      }
                      placeholder="Select cities"
                      searchPlaceholder="Search cities..."
                      emptyText="No cities found."
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
                      I consent to KYC/background verification and confirm that
                      the information provided is accurate.
                    </span>
                  </label>
                </div>
              </>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="step-content">
              <>
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
                  {/* Driver's License */}
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
                  {/* Government ID */}
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
                  {/* LASDRI Card */}
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
              </>
            </div>
          )}

          {/* Step 4: Review */}
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

          {/* Navigation */}
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${step === 1 ? "opacity-0 invisible" : ""}`}
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
      </RevealOnScroll>

      {/* Page-specific styles to mimic reference */}
      <style jsx global>{`
        .step-content {
          transition:
            opacity 0.3s ease-in-out,
            transform 0.3s ease-in-out;
        }
        .file-upload-wrapper input[type="file"] {
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
    </main>
  );
}

function cryptoRandomString(len: number) {
  // Generate a random base36 string, not cryptographically strong but fine for temp password.
  const arr = Array.from(crypto.getRandomValues(new Uint32Array(len)));
  return (
    arr
      .map((x) => (x % 36).toString(36))
      .join("")
      .slice(0, len) + "A1!"
  );
}

export default function DriverRegisterPage() {
  return (
    <main className="relative z-10 flex min-h-screen w-full items-center justify-center p-4 text-foreground">
      <div className="relative w-full max-w-4xl text-center">
        <RevealOnScroll
          as="div"
          className="mb-12"
          style={
            {
              ["--tw-enter-opacity" as any]: "0",
              ["--tw-enter-translate-y" as any]: "1rem",
              ["--tw-enter-blur" as any]: "8px",
            } as React.CSSProperties
          }
        >
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            <BlurText
              as="span"
              text="Drive with RideOn"
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h1>
          <BlurText
            as="p"
            className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto"
            text="Choose the program that matches you: become an on-demand chauffeur on our platform, or apply for a full-time driver role via our recruitment program."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Link
            href="/register/driver/on-demand"
            className="group relative block p-8 rounded-2xl border border-white/10 bg-white/70 backdrop-blur-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-green-500/80 dark:bg-slate-900/80"
          >
            <div className="flex flex-col items-start text-left">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2
                  className="w-7 h-7 text-green-500"
                  strokeWidth={1.5}
                />
              </div>
              <h2 className="text-2xl font-semibold mt-6">
                <BlurText
                  as="span"
                  text="On-Demand Chauffeur"
                  animateBy="words"
                  direction="top"
                  delay={100}
                />
              </h2>
              <BlurText
                as="p"
                className="text-gray-600 dark:text-slate-400 mt-2 text-base"
                text="Register as a platform driver to accept on-demand chauffeur reservations and earn based on completed trips."
                animateBy="words"
                direction="top"
                delay={24}
              />
              <div className="mt-6 text-sm font-medium text-green-600 dark:text-green-400">
                <BlurText
                  as="span"
                  text="Start On-Demand Registration"
                  animateBy="words"
                  direction="top"
                  delay={60}
                />
              </div>
            </div>
          </Link>

          <Link
            href="/register/driver/full-time"
            className="group relative block p-8 rounded-2xl border border-white/10 bg-white/70 backdrop-blur-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-blue-500/80 dark:bg-slate-900/80"
          >
            <div className="flex flex-col items-start text-left">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <UploadCloud
                  className="w-7 h-7 text-blue-500"
                  strokeWidth={1.5}
                />
              </div>
              <h2 className="text-2xl font-semibold mt-6">
                <BlurText
                  as="span"
                  text="Full-Time Driver Recruitment"
                  animateBy="words"
                  direction="top"
                  delay={100}
                />
              </h2>
              <BlurText
                as="p"
                className="text-gray-600 dark:text-slate-400 mt-2 text-base"
                text="Apply for a full-time driver role. This is a recruitment application and does not grant access to the on-demand driver portal."
                animateBy="words"
                direction="top"
                delay={24}
              />
              <div className="mt-6 text-sm font-medium text-blue-600 dark:text-blue-400">
                <BlurText
                  as="span"
                  text="Apply for Full-Time"
                  animateBy="words"
                  direction="top"
                  delay={60}
                />
              </div>
            </div>
          </Link>
        </div>

        <RevealOnScroll
          as="div"
          className="mt-12 text-center"
          style={
            {
              ["--tw-enter-opacity" as any]: "0",
              ["--tw-enter-translate-y" as any]: "1rem",
              ["--tw-enter-blur" as any]: "8px",
            } as React.CSSProperties
          }
        >
          <p className="text-gray-500 dark:text-slate-400">
            Already started an application?{" "}
            <Link
              href="/login?next=%2Fregister%2Fdriver%2Fthank-you"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Check on-demand status
            </Link>{" "}
            or{" "}
            <Link
              href="/login?next=%2Fregister%2Fdriver%2Ffull-time%2Fthank-you"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              check full-time status
            </Link>
            .
          </p>
        </RevealOnScroll>
      </div>
    </main>
  );
}
