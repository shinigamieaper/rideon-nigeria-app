"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import BlurText from "../../../../components/shared/BlurText";
import RevealOnScroll from "../../../../components/shared/RevealOnScroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components";

type CSSVars = React.CSSProperties & {
  "--tw-enter-scale"?: number | string;
  "--tw-enter-blur"?: number | string;
};

type PartnerType = "individual" | "business";

interface PayoutState {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface FormDataState {
  partnerType: PartnerType;

  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;

  businessName: string;
  cacNumber: string;

  bvnOrNin: string;

  directorName: string;
  directorEmail: string;
  directorPhone: string;

  payout: PayoutState;
  kycConsent: boolean;
}

export default function PartnerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormDataState>({
    partnerType: "individual",

    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",

    businessName: "",
    cacNumber: "",

    bvnOrNin: "",

    directorName: "",
    directorEmail: "",
    directorPhone: "",

    payout: {
      bankName: "",
      accountNumber: "",
      accountName: "",
    },

    kycConsent: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u?.email) {
        setFormData((prev) => ({ ...prev, email: prev.email || u.email! }));
      }
    });
    return () => unsub();
  }, []);

  const isStepValid = useMemo(() => {
    if (step === 1) {
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
        formData.email.trim().toLowerCase(),
      );
      return (
        !!formData.partnerType &&
        formData.firstName.trim() &&
        formData.lastName.trim() &&
        emailOk &&
        formData.phoneNumber.trim()
      );
    }

    if (step === 2) {
      const payoutOk =
        formData.payout.bankName.trim() &&
        formData.payout.accountNumber.trim() &&
        formData.payout.accountName.trim();

      const businessOk =
        formData.businessName.trim() && formData.cacNumber.trim();

      if (formData.partnerType === "individual") {
        return businessOk && payoutOk && formData.bvnOrNin.trim();
      }

      return (
        businessOk &&
        payoutOk &&
        formData.directorName.trim() &&
        /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
          formData.directorEmail.trim().toLowerCase(),
        ) &&
        formData.directorPhone.trim()
      );
    }

    if (step === 3) {
      return !!formData.kycConsent;
    }

    return true;
  }, [formData, step]);

  const nextStep = () => {
    if (step < 3 && isStepValid) setStep(step + 1);
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
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
            console.warn("[PartnerRegister] sendPasswordResetEmail failed", e);
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
                "[PartnerRegister] fetchSignInMethods/reset failed",
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

      const basePayload: any = {
        partnerType: formData.partnerType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email,
        phoneNumber: formData.phoneNumber,
        businessName: formData.businessName,
        cacNumber: formData.cacNumber,
        payout: {
          bankName: formData.payout.bankName,
          accountNumber: formData.payout.accountNumber,
          accountName: formData.payout.accountName,
        },
        kycConsent: true,
      };

      if (formData.partnerType === "individual") {
        basePayload.bvnOrNin = formData.bvnOrNin;
      } else {
        basePayload.directorName = formData.directorName;
        basePayload.directorEmail = formData.directorEmail;
        basePayload.directorPhone = formData.directorPhone;
      }

      const res = await fetch("/api/auth/register-partner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(basePayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to submit partner application");
      }

      try {
        const u = auth.currentUser;
        if (u) {
          await u.getIdToken(true);
          const freshToken = await u.getIdToken();
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: freshToken, remember: true }),
          });
        }
      } catch {
        // ignore
      }

      router.push("/register/partner/thank-you");
    } catch (err: unknown) {
      console.error("[PartnerRegister] submit error", err);
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: string }).message)
          : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderReview = () => {
    const rows: Array<{ label: string; value: string }> = [
      {
        label: "Partner Type",
        value:
          formData.partnerType === "business"
            ? "Business / Fleet"
            : "Individual",
      },
      { label: "First Name", value: formData.firstName },
      { label: "Last Name", value: formData.lastName },
      { label: "Email", value: formData.email },
      { label: "Phone", value: formData.phoneNumber },
      { label: "Business Name", value: formData.businessName },
      { label: "CAC Number", value: formData.cacNumber },
    ];

    if (formData.partnerType === "individual") {
      rows.push({ label: "BVN/NIN", value: formData.bvnOrNin });
    } else {
      rows.push({ label: "Director Name", value: formData.directorName });
      rows.push({ label: "Director Email", value: formData.directorEmail });
      rows.push({ label: "Director Phone", value: formData.directorPhone });
    }

    rows.push({ label: "Bank", value: formData.payout.bankName });
    rows.push({
      label: "Account Number",
      value: formData.payout.accountNumber,
    });
    rows.push({ label: "Account Name", value: formData.payout.accountName });

    return (
      <div className="space-y-6 text-sm">
        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
            Application Summary
          </h3>
          <div className="space-y-2 mt-3">
            {rows.map((row) => (
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
            Consent
          </h3>
          <div className="space-y-2 mt-3">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                KYC / Business Verification Consent:
              </span>
              <span className="font-medium text-right">
                {formData.kycConsent ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              Onboarding
            </span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Partner Application
            </span>
          </div>
        </div>

        <div className="flex items-start mb-10">
          {[1, 2, 3].map((s, idx) => (
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
                  {s === 1 && "Profile"}
                  {s === 2 && "Business"}
                  {s === 3 && "Review"}
                </p>
              </div>
              {idx < 2 && (
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
                    text="Partner Profile"
                    animateBy="words"
                    direction="top"
                    delay={120}
                  />
                </h2>
                <BlurText
                  as="p"
                  className="text-slate-500 dark:text-slate-400 mt-2"
                  text="Tell us who you are and what type of partner you are registering as."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Partner Type
                  </label>
                  <Select
                    value={formData.partnerType}
                    onValueChange={(value) =>
                      setFormData((p) => ({
                        ...p,
                        partnerType: value as PartnerType,
                      }))
                    }
                  >
                    <SelectTrigger aria-label="Partner Type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">
                        Individual vehicle owner
                      </SelectItem>
                      <SelectItem value="business">
                        Business / fleet owner
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input
                    type="text"
                    placeholder="First Name"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, firstName: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, lastName: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                />

                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phoneNumber: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
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
                    text="Business & Payout"
                    animateBy="words"
                    direction="top"
                    delay={120}
                  />
                </h2>
                <BlurText
                  as="p"
                  className="text-slate-500 dark:text-slate-400 mt-2"
                  text="Provide business information and payout details."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>

              <div className="space-y-5">
                <input
                  type="text"
                  placeholder="Business Name"
                  required
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, businessName: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                />

                <input
                  type="text"
                  placeholder="CAC Number"
                  required
                  value={formData.cacNumber}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, cacNumber: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                />

                {formData.partnerType === "individual" ? (
                  <input
                    type="text"
                    placeholder="BVN or NIN"
                    required
                    value={formData.bvnOrNin}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, bvnOrNin: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/30 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Director Details
                    </p>
                    <input
                      type="text"
                      placeholder="Director Name"
                      required
                      value={formData.directorName}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          directorName: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Director Email"
                      required
                      value={formData.directorEmail}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          directorEmail: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Director Phone"
                      required
                      value={formData.directorPhone}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          directorPhone: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                    />
                  </div>
                )}

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/30 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Payout Details
                  </p>
                  <input
                    type="text"
                    placeholder="Bank Name"
                    required
                    value={formData.payout.bankName}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        payout: { ...p.payout, bankName: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    required
                    value={formData.payout.accountNumber}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        payout: { ...p.payout, accountNumber: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Account Name"
                    required
                    value={formData.payout.accountName}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        payout: { ...p.payout, accountName: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
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
                  text="Confirm your details and consent for verification."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>

              {renderReview()}

              <label className="mt-6 flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.kycConsent}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, kycConsent: e.target.checked }))
                  }
                  className="mt-1 h-4 w-4 border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span>
                  I consent to business/KYC verification (CAC and identity
                  verification where applicable) and confirm the information
                  provided is accurate.
                </span>
              </label>
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

            {step < 3 ? (
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
                disabled={submitting || !isStepValid}
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
