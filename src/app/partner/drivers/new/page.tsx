"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Save,
  Send,
  UploadCloud,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { usePartnerTeam } from "@/hooks";

function UploadField({
  label,
  hint,
  accept,
  disabled,
  busy,
  selectedLabel,
  onPick,
}: {
  label: string;
  hint?: string;
  accept: string;
  disabled: boolean;
  busy: boolean;
  selectedLabel: string | null;
  onPick: (files: FileList) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
            ({hint})
          </span>
        )}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || busy}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;
          onPick(files);
          e.target.value = "";
        }}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-4 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          {busy ? "Uploading…" : "Choose file"}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {selectedLabel || "No file selected."}
        </p>
      </div>
    </div>
  );
}

interface DriverDoc {
  type: string;
  url: string;
}

export default function PartnerNewDriverPage() {
  const router = useRouter();

  const { isTeamMember, teamRole } = usePartnerTeam();
  const isReadOnlyTeam =
    isTeamMember && teamRole !== "admin" && teamRole !== "manager";

  const [creating, setCreating] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [showRequiredErrors, setShowRequiredErrors] = React.useState(false);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [city, setCity] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [documents, setDocuments] = React.useState<DriverDoc[]>([]);
  const [notes, setNotes] = React.useState("");

  const [uploading, setUploading] = React.useState<Record<string, boolean>>({});
  const [selectedFileLabel, setSelectedFileLabel] = React.useState<
    Record<string, string>
  >({});

  const formatErrors = React.useMemo(() => {
    const e: Record<string, string> = {};

    const phoneTrim = phone.trim();
    if (phoneTrim) {
      if (!/^[0-9+()\-\s]+$/.test(phoneTrim)) {
        e.phone = "Phone number can only contain numbers, spaces, and + ( ) -";
      } else {
        const digits = phoneTrim.replace(/\D/g, "");
        if (digits.length < 6) e.phone = "Phone number is too short.";
      }
    }

    const emailTrim = email.trim();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      e.email = "Enter a valid email address.";
    }

    return e;
  }, [phone, email]);

  const requiredErrors = React.useMemo(() => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!phone.trim()) e.phone = "Phone is required.";
    if (!city.trim()) e.city = "City is required.";

    if (!photoUrl.trim()) e.photo = "Driver photo is required.";
    if (!getDocUrl("drivers_license"))
      e.drivers_license = "Driver's license is required.";
    if (!getDocUrl("government_id"))
      e.government_id = "Government ID is required.";

    return e;
  }, [firstName, lastName, phone, city, photoUrl, documents]);

  const fieldErrors = React.useMemo(() => {
    return {
      ...formatErrors,
      ...(showRequiredErrors ? requiredErrors : {}),
    };
  }, [formatErrors, requiredErrors, showRequiredErrors]);

  const buildPayload = () => {
    return {
      firstName,
      lastName,
      phone,
      email,
      city,
      photoUrl,
      documents,
      notes,
    };
  };

  const uploadOne = async (key: string, file: File) => {
    if (isReadOnlyTeam) return null;
    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return null;
    }

    setUploading((s) => ({ ...s, [key]: true }));
    try {
      let token = await user.getIdToken();

      const doUpload = async (t: string) => {
        const fd = new FormData();
        fd.append("kind", "partner_driver");
        fd.append("key", key);
        fd.append("file", file);
        return fetch("/api/partner/uploads", {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
          body: fd,
        });
      };

      let res = await doUpload(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doUpload(token);
      }

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Upload failed");

      const url = String(j?.url || "").trim();
      if (!url) throw new Error("Upload succeeded but no URL returned.");
      return url;
    } finally {
      setUploading((s) => ({ ...s, [key]: false }));
    }
  };

  const upsertDoc = (type: string, url: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.type !== type);
      next.push({ type, url });
      return next;
    });
  };

  const removeDoc = (type: string) => {
    if (isReadOnlyTeam) return;
    setDocuments((prev) => prev.filter((d) => d.type !== type));
  };

  function getDocUrl(type: string) {
    return documents.find((d) => d.type === type)?.url || "";
  }

  const createDraft = async () => {
    if (isReadOnlyTeam) return null;
    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return null;
    }

    let token = await user.getIdToken();
    const doCreate = async (t: string) =>
      fetch("/api/partner/drivers/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(buildPayload()),
      });

    let res = await doCreate(token);
    if (res.status === 403) {
      token = await user.getIdToken(true);
      res = await doCreate(token);
    }

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || "Failed to create submission.");
    }

    const j = await res.json();
    const id = String(j?.id || "").trim();
    if (!id) throw new Error("Submission created but no id returned.");
    return { id, token };
  };

  const onSaveDraft = async () => {
    if (isReadOnlyTeam) return;
    if (Object.keys(formatErrors).length > 0) {
      setShowRequiredErrors(false);
      setErr("Please fix the highlighted fields before saving.");
      return;
    }
    if (creating) return;
    setCreating(true);
    setErr(null);

    try {
      const created = await createDraft();
      if (!created) return;
      router.push(
        `/partner/drivers/submissions/${encodeURIComponent(created.id)}`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to save draft.");
    } finally {
      setCreating(false);
    }
  };

  const onSubmit = async () => {
    if (isReadOnlyTeam) return;
    if (
      Object.keys(formatErrors).length > 0 ||
      Object.keys(requiredErrors).length > 0
    ) {
      setShowRequiredErrors(true);
      setErr(
        "Please complete the required fields and fix the highlighted inputs before submitting.",
      );
      return;
    }
    if (creating) return;
    setCreating(true);
    setErr(null);

    try {
      const created = await createDraft();
      if (!created) return;

      const doSubmit = async (t: string) =>
        fetch(
          `/api/partner/drivers/submissions/${encodeURIComponent(created.id)}/submit`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
          },
        );

      let res = await doSubmit(created.token);
      if (res.status === 403) {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const refreshed = await user.getIdToken(true);
        res = await doSubmit(refreshed);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to submit for review.");
      }

      router.push(
        `/partner/drivers/submissions/${encodeURIComponent(created.id)}`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to submit.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/partner/drivers"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Add driver
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create a submission, then submit for admin verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-red-200/80 dark:border-red-800/40 shadow-lg p-6">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Something went wrong</p>
              <p className="text-sm whitespace-pre-wrap">{err}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              First name
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={creating || isReadOnlyTeam}
              className={`mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm ${fieldErrors.firstName ? "border-red-300 dark:border-red-800/60" : ""}`}
              placeholder="e.g. Chinedu"
            />
            {fieldErrors.firstName ? (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.firstName}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Last name
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={creating || isReadOnlyTeam}
              className={`mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm ${fieldErrors.lastName ? "border-red-300 dark:border-red-800/60" : ""}`}
              placeholder="e.g. Okafor"
            />
            {fieldErrors.lastName ? (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.lastName}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={creating || isReadOnlyTeam}
              inputMode="tel"
              className={`mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm ${fieldErrors.phone ? "border-red-300 dark:border-red-800/60" : ""}`}
              placeholder="e.g. +234..."
            />
            {fieldErrors.phone ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email (optional)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={creating || isReadOnlyTeam}
              inputMode="email"
              className={`mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm ${fieldErrors.email ? "border-red-300 dark:border-red-800/60" : ""}`}
              placeholder="e.g. name@example.com"
            />
            {fieldErrors.email ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              City
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={creating || isReadOnlyTeam}
              className={`mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm ${fieldErrors.city ? "border-red-300 dark:border-red-800/60" : ""}`}
              placeholder="e.g. Lagos"
            />
            {fieldErrors.city ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>
            ) : null}
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Section: Driver Photo */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Driver Photo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Upload a clear headshot photo of the driver.{" "}
                <span className="text-red-500 font-medium">Required</span>
              </p>
              {fieldErrors.photo ? (
                <p className="-mt-2 mb-3 text-xs text-red-600">
                  {fieldErrors.photo}
                </p>
              ) : null}
              <UploadField
                label="Photo"
                hint="Required"
                accept="image/*"
                disabled={
                  creating ||
                  isReadOnlyTeam ||
                  Object.keys(formatErrors).length > 0
                }
                busy={Boolean(uploading.photo)}
                selectedLabel={selectedFileLabel.photo || null}
                onPick={async (files) => {
                  const f = files[0];
                  if (!f) return;
                  setSelectedFileLabel((s) => ({ ...s, photo: f.name }));
                  try {
                    const url = await uploadOne("photo", f);
                    if (url) setPhotoUrl(url);
                  } catch (ex: unknown) {
                    const message = ex instanceof Error ? ex.message : null;
                    setErr(message || "Failed to upload.");
                  }
                }}
              />
              {photoUrl ? (
                <div className="mt-2">
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 underline"
                  >
                    View photo
                  </a>
                  <button
                    type="button"
                    disabled={isReadOnlyTeam}
                    className="ml-3 text-xs text-red-600 underline disabled:opacity-50"
                    onClick={() => {
                      if (isReadOnlyTeam) return;
                      setPhotoUrl("");
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No photo uploaded yet.
                </p>
              )}
            </div>

            {/* Section: Documents */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Documents
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Upload the driver&apos;s license and a government-issued ID for
                verification.{" "}
                <span className="text-red-500 font-medium">Required</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  {fieldErrors.drivers_license ? (
                    <p className="mb-2 text-xs text-red-600">
                      {fieldErrors.drivers_license}
                    </p>
                  ) : null}
                  <UploadField
                    label="Driver's License"
                    hint="Required"
                    accept="image/*,application/pdf"
                    disabled={
                      creating ||
                      isReadOnlyTeam ||
                      Object.keys(formatErrors).length > 0
                    }
                    busy={Boolean(uploading.drivers_license)}
                    selectedLabel={selectedFileLabel.drivers_license || null}
                    onPick={async (files) => {
                      const f = files[0];
                      if (!f) return;
                      setSelectedFileLabel((s) => ({
                        ...s,
                        drivers_license: f.name,
                      }));
                      try {
                        const url = await uploadOne("drivers_license", f);
                        if (url) upsertDoc("drivers_license", url);
                      } catch (ex: unknown) {
                        const message = ex instanceof Error ? ex.message : null;
                        setErr(message || "Failed to upload.");
                      }
                    }}
                  />
                  {getDocUrl("drivers_license") ? (
                    <div className="mt-2">
                      <a
                        href={getDocUrl("drivers_license")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        View license
                      </a>
                      <button
                        type="button"
                        disabled={isReadOnlyTeam}
                        className="ml-3 text-xs text-red-600 underline disabled:opacity-50"
                        onClick={() => {
                          if (isReadOnlyTeam) return;
                          removeDoc("drivers_license");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      No file uploaded yet.
                    </p>
                  )}
                </div>

                <div>
                  {fieldErrors.government_id ? (
                    <p className="mb-2 text-xs text-red-600">
                      {fieldErrors.government_id}
                    </p>
                  ) : null}
                  <UploadField
                    label="Government ID"
                    hint="Required"
                    accept="image/*,application/pdf"
                    disabled={
                      creating ||
                      isReadOnlyTeam ||
                      Object.keys(formatErrors).length > 0
                    }
                    busy={Boolean(uploading.government_id)}
                    selectedLabel={selectedFileLabel.government_id || null}
                    onPick={async (files) => {
                      const f = files[0];
                      if (!f) return;
                      setSelectedFileLabel((s) => ({
                        ...s,
                        government_id: f.name,
                      }));
                      try {
                        const url = await uploadOne("government_id", f);
                        if (url) upsertDoc("government_id", url);
                      } catch (ex: unknown) {
                        const message = ex instanceof Error ? ex.message : null;
                        setErr(message || "Failed to upload.");
                      }
                    }}
                  />
                  {getDocUrl("government_id") ? (
                    <div className="mt-2">
                      <a
                        href={getDocUrl("government_id")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        View ID
                      </a>
                      <button
                        type="button"
                        disabled={isReadOnlyTeam}
                        className="ml-3 text-xs text-red-600 underline disabled:opacity-50"
                        onClick={() => {
                          if (isReadOnlyTeam) return;
                          removeDoc("government_id");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      No file uploaded yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={creating || isReadOnlyTeam}
              className="mt-2 w-full min-h-[120px] px-3 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="Any extra context for the admin reviewer."
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={
              creating || isReadOnlyTeam || Object.keys(formatErrors).length > 0
            }
            onClick={onSaveDraft}
            className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save draft
          </button>

          <button
            type="button"
            disabled={
              creating ||
              isReadOnlyTeam ||
              Object.keys(formatErrors).length > 0 ||
              (showRequiredErrors && Object.keys(requiredErrors).length > 0)
            }
            onClick={onSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#00529B" }}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit for review
          </button>
        </div>
      </div>
    </div>
  );
}
