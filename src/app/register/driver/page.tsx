"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  UploadCloud,
} from "lucide-react";
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

type CSSVars = React.CSSProperties & {
  '--tw-enter-scale'?: number | string;
  '--tw-enter-blur'?: number | string;
};

interface VehicleData {
  make: string;
  model: string;
  year: string; // keep as string for inputs; cast on submit
  licensePlate: string;
}

interface FilesState {
  driversLicense: File | null;
  lasdriCard: File | null;
  proofOfOwnership: File | null;
}

interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  experienceYears: string;
  vehicle: VehicleData;
  files: FilesState;
  fileNames: {
    driversLicense: string;
    lasdriCard: string;
    proofOfOwnership: string;
  };
}

export default function DriverRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormDataState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    experienceYears: "",
    vehicle: {
      make: "",
      model: "",
      year: "",
      licensePlate: "",
    },
    files: {
      driversLicense: null,
      lasdriCard: null,
      proofOfOwnership: null,
    },
    fileNames: {
      driversLicense: "No file selected.",
      lasdriCard: "No file selected.",
      proofOfOwnership: "No file selected.",
    },
  });

  // Step validation
  const isStepValid = useMemo(() => {
    if (step === 1) {
      const { firstName, lastName, email, phoneNumber, experienceYears } = formData;
      return (
        firstName.trim() &&
        lastName.trim() &&
        email.trim() &&
        phoneNumber.trim() &&
        !!Number(experienceYears)
      );
    }
    if (step === 2) {
      const { make, model, year, licensePlate } = formData.vehicle;
      return make.trim() && model.trim() && !!Number(year) && licensePlate.trim();
    }
    if (step === 3) {
      const { driversLicense, lasdriCard, proofOfOwnership } = formData.files;
      return !!(driversLicense && lasdriCard && proofOfOwnership);
    }
    return true;
  }, [step, formData]);

  const nextStep = () => {
    if (step < 4 && isStepValid) setStep(step + 1);
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  // Helpers
  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    path?: [keyof FormDataState] | ["vehicle", keyof VehicleData]
  ) => {
    const { value } = e.target;
    setFormData((prev) => {
      if (!path) return prev; // should not happen
      if (path[0] === "vehicle") {
        const key = path[1] as keyof VehicleData;
        return { ...prev, vehicle: { ...prev.vehicle, [key]: value } };
      }
      const key = path[0] as keyof FormDataState;
      return { ...prev, [key]: value } as FormDataState;
    });
  };

  const handleFileChange = (
    key: keyof FilesState,
    file: File | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      files: { ...prev.files, [key]: file },
      fileNames: {
        ...prev.fileNames,
        [key]: file ? file.name : "No file selected.",
      },
    }));
  };

  const populateReview = () => {
    return (
      <div className="space-y-6 text-sm">
        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Personal Information</h3>
          <div className="space-y-2 mt-3">
            {[{
              label: 'First Name', value: formData.firstName
            }, { label: 'Last Name', value: formData.lastName }, { label: 'Email Address', value: formData.email }, { label: 'Phone Number', value: formData.phoneNumber }, { label: 'Years of Professional Driving Experience', value: formData.experienceYears }].map((row) => (
              <div key={row.label} className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{row.label}:</span><span className="font-medium text-right">{row.value || 'N/A'}</span></div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Vehicle Details</h3>
          <div className="space-y-2 mt-3">
            {[{ label: 'Vehicle Make (e.g., Toyota)', value: formData.vehicle.make }, { label: 'Vehicle Model (e.g., Camry)', value: formData.vehicle.model }, { label: 'Model Year', value: formData.vehicle.year }, { label: 'License Plate Number', value: formData.vehicle.licensePlate }].map((row) => (
              <div key={row.label} className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{row.label}:</span><span className="font-medium text-right">{row.value || 'N/A'}</span></div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Uploaded Documents</h3>
          <div className="space-y-2 mt-3">
            {[{ label: "Driver's License", key: 'driversLicense' as const }, { label: 'LASDRI Card', key: 'lasdriCard' as const }, { label: 'Proof of Vehicle Ownership', key: 'proofOfOwnership' as const }].map((doc) => (
              <div key={doc.key} className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400">{doc.label}:</span><span className="font-medium text-right text-green-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{formData.fileNames[doc.key]}</span></div>
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
      console.log('[DriverRegister] submit start');
      // 1) Ensure we have an authenticated user matching the email
      let user = auth.currentUser;
      if (!user || user.email?.toLowerCase() !== formData.email.toLowerCase()) {
        try {
          const password = cryptoRandomString(16);
          console.log('[DriverRegister] creating user...');
          const cred = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            password,
          );
          user = cred.user;
          console.log('[DriverRegister] user created', user.uid);
          // Send a password reset email so the driver can set their own password
          try { await sendPasswordResetEmail(auth, formData.email); } catch (e) { console.warn('[DriverRegister] sendPasswordResetEmail failed', e); }
        } catch (e: unknown) {
          const code = typeof e === 'object' && e && 'code' in e ? String((e as { code?: string }).code) : undefined;
          if (code === 'auth/email-already-in-use') {
            console.warn('[DriverRegister] email already in use; sending password reset');
            try {
              await fetchSignInMethodsForEmail(auth, formData.email);
              await sendPasswordResetEmail(auth, formData.email);
            } catch (se) {
              console.warn('[DriverRegister] fetchSignInMethods/reset failed', se);
            }
            throw new Error('This email already has an account. We\'ve sent a password reset link. Please reset your password, sign in, then return and click Submit again.');
          }
          throw e;
        }
      } else {
        console.log('[DriverRegister] using existing signed-in user', user.uid);
      }

      // 2) Upload files to MongoDB via API (GridFS)
      const idToken = await user.getIdToken();
      const fd = new FormData();
      fd.append('driversLicense', formData.files.driversLicense!);
      fd.append('lasdriCard', formData.files.lasdriCard!);
      fd.append('vehicleRegistration', formData.files.proofOfOwnership!);
      console.log('[DriverRegister] uploading documents via /api/uploads/driver-docs');
      const upRes = await fetch('/api/uploads/driver-docs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
        body: fd,
      });
      if (!upRes.ok) {
        const data = await upRes.json().catch(() => null);
        throw new Error(data?.error || 'Failed to upload documents');
      }
      const {
        driversLicenseUrl,
        lasdriCardUrl,
        vehicleRegistrationUrl,
      }: { driversLicenseUrl: string; lasdriCardUrl: string; vehicleRegistrationUrl: string } = await upRes.json();

      // 3) Send to backend with ID token
      console.log('[DriverRegister] calling API /api/auth/register-driver');
      const res = await fetch('/api/auth/register-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          experienceYears: Number(formData.experienceYears),
          vehicle: {
            make: formData.vehicle.make,
            model: formData.vehicle.model,
            year: Number(formData.vehicle.year),
            licensePlate: formData.vehicle.licensePlate,
          },
          documents: {
            driversLicenseUrl,
            lasdriCardUrl,
            vehicleRegistrationUrl,
          }
        })
      });

      console.log('[DriverRegister] API response status', res.status);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to submit application');
      }

      // 4) Redirect to Thank You
      console.log('[DriverRegister] success, redirecting to /register/driver/thank-you');
      router.push('/register/driver/thank-you');
    } catch (err: unknown) {
      console.error('[DriverRegister] submit error', err);
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: string }).message) : 'Something went wrong.';
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
      <RevealOnScroll as="div" className="w-full max-w-3xl rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8 md:p-12" style={{ '--tw-enter-scale': 0.9, '--tw-enter-blur': '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0px 40px -10px rgba(0, 82, 155, 0.40)' } as CSSVars}>
        {/* Stepper */}
        <div className="flex items-start mb-10">
          {[1,2,3,4].map((s, idx) => (
            <React.Fragment key={s}>
              <div className="step-item flex-1 flex flex-col items-center text-center gap-2" data-step={s}>
                <div className={`step-circle w-9 h-9 flex items-center justify-center rounded-full font-semibold text-sm transition-all duration-300 border-2 ${s < step ? 'bg-green-600 text-white border-green-600' : s === step ? 'bg-green-600 text-white border-green-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                <p className={`step-text text-xs sm:text-sm font-medium transition-all duration-300 ${s <= step ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {s === 1 && 'Personal Info'}
                  {s === 2 && 'Vehicle Details'}
                  {s === 3 && 'Documents'}
                  {s === 4 && 'Review'}
                </p>
              </div>
              {idx < 3 && (
                <div className={`step-connector flex-1 mt-4 h-0.5 mx-2 transition-all duration-300 ${s < step ? 'bg-[#34A853]' : 'bg-slate-200 dark:bg-slate-700/50'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          className="overflow-hidden"
        >
          {/* Step 1 */}
          {step === 1 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText as="span" text="Personal Information" animateBy="words" direction="top" delay={120} />
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
                  <input type="text" placeholder="First Name" required value={formData.firstName} onChange={(e) => handleInput(e, ['firstName'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                  <input type="text" placeholder="Last Name" required value={formData.lastName} onChange={(e) => handleInput(e, ['lastName'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                </div>
                <input type="email" placeholder="Email Address" required value={formData.email} onChange={(e) => handleInput(e, ['email'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                <input type="tel" placeholder="Phone Number" required value={formData.phoneNumber} onChange={(e) => handleInput(e, ['phoneNumber'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                <input type="number" placeholder="Years of Professional Driving Experience" required value={formData.experienceYears} onChange={(e) => handleInput(e, ['experienceYears'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText as="span" text="Vehicle Details" animateBy="words" direction="top" delay={120} />
                </h2>
                <BlurText
                  as="p"
                  className="text-slate-500 dark:text-slate-400 mt-2"
                  text="Provide information about your vehicle."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input type="text" placeholder="Vehicle Make (e.g., Toyota)" required value={formData.vehicle.make} onChange={(e) => handleInput(e, ['vehicle','make'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                  <input type="text" placeholder="Vehicle Model (e.g., Camry)" required value={formData.vehicle.model} onChange={(e) => handleInput(e, ['vehicle','model'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input type="number" placeholder="Model Year" required value={formData.vehicle.year} onChange={(e) => handleInput(e, ['vehicle','year'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                  <input type="text" placeholder="License Plate Number" required value={formData.vehicle.licensePlate} onChange={(e) => handleInput(e, ['vehicle','licensePlate'])} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText as="span" text="Document Upload" animateBy="words" direction="top" delay={120} />
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
                {/* Driver&apos;s License */}
                <div className="file-upload-wrapper p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Driver&apos;s License</p>
                    <p className={`file-name text-xs ${formData.files.driversLicense ? 'text-green-600 dark:text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>{formData.fileNames.driversLicense}</p>
                  </div>
                  <label className="shrink-0 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#00529B' }}>
                    <UploadCloud className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Upload
                    <input type="file" required className="sr-only" onChange={(e) => handleFileChange('driversLicense', e.target.files?.[0] || null)} />
                  </label>
                </div>

                {/* LASDRI Card */}
                <div className="file-upload-wrapper p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300">LASDRI Card</p>
                    <p className={`file-name text-xs ${formData.files.lasdriCard ? 'text-green-600 dark:text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>{formData.fileNames.lasdriCard}</p>
                  </div>
                  <label className="shrink-0 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#00529B' }}>
                    <UploadCloud className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Upload
                    <input type="file" required className="sr-only" onChange={(e) => handleFileChange('lasdriCard', e.target.files?.[0] || null)} />
                  </label>
                </div>

                {/* Proof of Ownership */}
                <div className="file-upload-wrapper p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Proof of Vehicle Ownership</p>
                    <p className={`file-name text-xs ${formData.files.proofOfOwnership ? 'text-green-600 dark:text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>{formData.fileNames.proofOfOwnership}</p>
                  </div>
                  <label className="shrink-0 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#00529B' }}>
                    <UploadCloud className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Upload
                    <input type="file" required className="sr-only" onChange={(e) => handleFileChange('proofOfOwnership', e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="step-content">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  <BlurText as="span" text="Review & Submit" animateBy="words" direction="top" delay={120} />
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
            <button type="button" onClick={prevStep} disabled={step === 1} className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${step === 1 ? 'opacity-0 invisible' : ''}`}>
              Previous
            </button>

            {step < 4 ? (
              <button type="button" onClick={nextStep} disabled={!isStepValid} className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-green-500/20 dark:shadow-green-500/30 disabled:opacity-50" style={{ backgroundColor: '#34A853' }}>
                <BlurText as="span" text="Next Step" animateBy="words" direction="top" delay={60} />
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-green-500/20 dark:shadow-green-500/30 disabled:opacity-50" style={{ backgroundColor: '#34A853' }}>
                <BlurText as="span" text={submitting ? 'Submitting…' : 'Submit Application'} animateBy="words" direction="top" delay={60} />
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </form>
      </RevealOnScroll>

      {/* Page-specific styles to mimic reference */}
      <style jsx global>{`
        .step-content { transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out; }
        .file-upload-wrapper input[type="file"] { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }
      `}</style>
    </main>
  );

}

function cryptoRandomString(len: number) {
  // Generate a random base36 string, not cryptographically strong but fine for temp password.
  const arr = Array.from(crypto.getRandomValues(new Uint32Array(len)));
  return arr.map((x) => (x % 36).toString(36)).join("").slice(0, len) + "A1!";
}
