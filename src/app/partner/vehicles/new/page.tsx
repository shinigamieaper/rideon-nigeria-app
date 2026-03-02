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
  multiple,
  disabled,
  busy,
  selectedLabel,
  onPick,
}: {
  label: string;
  hint?: string;
  accept: string;
  multiple?: boolean;
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
        multiple={multiple}
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
          {busy ? "Uploading…" : multiple ? "Choose files" : "Choose file"}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {selectedLabel || "No file selected."}
        </p>
      </div>
    </div>
  );
}

export default function PartnerNewVehiclePage() {
  const router = useRouter();

  const { isTeamMember, teamRole } = usePartnerTeam();
  const isReadOnlyTeam =
    isTeamMember && teamRole !== "admin" && teamRole !== "manager";

  const [creating, setCreating] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [city, setCity] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [make, setMake] = React.useState("");
  const [model, setModel] = React.useState("");
  const [seats, setSeats] = React.useState("");
  const [partnerBaseDayRateNgn, setPartnerBaseDayRateNgn] = React.useState("");
  const [partnerBaseBlock4hRateNgn, setPartnerBaseBlock4hRateNgn] =
    React.useState("");
  const [photoFrontUrl, setPhotoFrontUrl] = React.useState("");
  const [photoBackUrl, setPhotoBackUrl] = React.useState("");
  const [photoPlateUrl, setPhotoPlateUrl] = React.useState("");
  const [extraPhotoUrls, setExtraPhotoUrls] = React.useState<string[]>([]);
  const [documents, setDocuments] = React.useState<
    { type: string; url: string }[]
  >([]);
  const [description, setDescription] = React.useState("");

  const [uploading, setUploading] = React.useState<Record<string, boolean>>({});
  const [selectedFileLabel, setSelectedFileLabel] = React.useState<
    Record<string, string>
  >({});

  const buildPayload = () => {
    const images = [photoFrontUrl, photoBackUrl, photoPlateUrl]
      .filter(Boolean)
      .concat(extraPhotoUrls.filter(Boolean));

    return {
      city,
      category,
      make,
      model,
      seats: seats ? Number(seats) : null,
      partnerBaseDayRateNgn: partnerBaseDayRateNgn
        ? Number(partnerBaseDayRateNgn)
        : null,
      partnerBaseBlock4hRateNgn: partnerBaseBlock4hRateNgn
        ? Number(partnerBaseBlock4hRateNgn)
        : null,
      images,
      documents,
      description,
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
        fd.append("kind", "partner_vehicle");
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
    setDocuments((prev) => prev.filter((d) => d.type !== type));
  };

  const getDocUrl = (type: string) =>
    documents.find((d) => d.type === type)?.url || "";

  const createDraft = async () => {
    if (isReadOnlyTeam) return null;
    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return null;
    }

    let token = await user.getIdToken();
    const doCreate = async (t: string) =>
      fetch("/api/partner/vehicles/submissions", {
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
    if (creating) return;
    setCreating(true);
    setErr(null);

    try {
      const created = await createDraft();
      if (!created) return;
      router.push(
        `/partner/vehicles/submissions/${encodeURIComponent(created.id)}`,
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
    if (creating) return;
    setCreating(true);
    setErr(null);

    try {
      const created = await createDraft();
      if (!created) return;

      const doSubmit = async (t: string) =>
        fetch(
          `/api/partner/vehicles/submissions/${encodeURIComponent(created.id)}/submit`,
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
        `/partner/vehicles/submissions/${encodeURIComponent(created.id)}`,
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
              href="/partner/vehicles"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Add vehicle
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create a submission, then submit for admin approval.
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
              <p className="text-sm">{err}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              City
            </label>
            <input
              disabled={creating || isReadOnlyTeam}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="e.g. Lagos"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category
            </label>
            <input
              disabled={creating || isReadOnlyTeam}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="e.g. Executive"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Make
            </label>
            <input
              disabled={creating || isReadOnlyTeam}
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="e.g. Toyota"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Model
            </label>
            <input
              disabled={creating || isReadOnlyTeam}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="e.g. Camry"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Seats
            </label>
            <input
              disabled={creating || isReadOnlyTeam}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              inputMode="numeric"
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="e.g. 4"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Base day rate (NGN)
            </label>
            <input
              disabled={creating || isReadOnlyTeam}
              value={partnerBaseDayRateNgn}
              onChange={(e) => setPartnerBaseDayRateNgn(e.target.value)}
              inputMode="numeric"
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="e.g. 120000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Base 4h rate (NGN) (optional)
            </label>
            <input
              disabled={creating || isReadOnlyTeam}
              value={partnerBaseBlock4hRateNgn}
              onChange={(e) => setPartnerBaseBlock4hRateNgn(e.target.value)}
              inputMode="numeric"
              className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="e.g. 60000"
            />
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Section: Vehicle Photos */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Vehicle Photos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Upload clear photos of the front, back, and license plate.{" "}
                <span className="text-red-500 font-medium">Required</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <UploadField
                    label="Front photo"
                    accept="image/*"
                    disabled={creating || isReadOnlyTeam}
                    busy={Boolean(uploading.photo_front)}
                    selectedLabel={selectedFileLabel.photo_front || null}
                    onPick={async (files) => {
                      const f = files[0];
                      if (!f) return;
                      setSelectedFileLabel((s) => ({
                        ...s,
                        photo_front: f.name,
                      }));
                      try {
                        const url = await uploadOne("photo_front", f);
                        if (url) setPhotoFrontUrl(url);
                      } catch (ex: unknown) {
                        const message = ex instanceof Error ? ex.message : null;
                        setErr(message || "Failed to upload.");
                      }
                    }}
                  />
                  {photoFrontUrl ? (
                    <a
                      href={photoFrontUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-xs text-blue-600 underline"
                    >
                      View front photo
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      No file uploaded yet.
                    </p>
                  )}
                  {photoFrontUrl ? (
                    <button
                      type="button"
                      disabled={isReadOnlyTeam}
                      className="mt-2 text-xs text-red-600 underline disabled:opacity-50"
                      onClick={() => {
                        if (isReadOnlyTeam) return;
                        setPhotoFrontUrl("");
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div>
                  <UploadField
                    label="Back photo"
                    accept="image/*"
                    disabled={creating || isReadOnlyTeam}
                    busy={Boolean(uploading.photo_back)}
                    selectedLabel={selectedFileLabel.photo_back || null}
                    onPick={async (files) => {
                      const f = files[0];
                      if (!f) return;
                      setSelectedFileLabel((s) => ({
                        ...s,
                        photo_back: f.name,
                      }));
                      try {
                        const url = await uploadOne("photo_back", f);
                        if (url) setPhotoBackUrl(url);
                      } catch (ex: unknown) {
                        const message = ex instanceof Error ? ex.message : null;
                        setErr(message || "Failed to upload.");
                      }
                    }}
                  />
                  {photoBackUrl ? (
                    <a
                      href={photoBackUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-xs text-blue-600 underline"
                    >
                      View back photo
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      No file uploaded yet.
                    </p>
                  )}
                  {photoBackUrl ? (
                    <button
                      type="button"
                      disabled={isReadOnlyTeam}
                      className="mt-2 text-xs text-red-600 underline disabled:opacity-50"
                      onClick={() => {
                        if (isReadOnlyTeam) return;
                        setPhotoBackUrl("");
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div>
                  <UploadField
                    label="Plate close-up"
                    accept="image/*"
                    disabled={creating || isReadOnlyTeam}
                    busy={Boolean(uploading.photo_plate)}
                    selectedLabel={selectedFileLabel.photo_plate || null}
                    onPick={async (files) => {
                      const f = files[0];
                      if (!f) return;
                      setSelectedFileLabel((s) => ({
                        ...s,
                        photo_plate: f.name,
                      }));
                      try {
                        const url = await uploadOne("photo_plate", f);
                        if (url) setPhotoPlateUrl(url);
                      } catch (ex: unknown) {
                        const message = ex instanceof Error ? ex.message : null;
                        setErr(message || "Failed to upload.");
                      }
                    }}
                  />
                  {photoPlateUrl ? (
                    <a
                      href={photoPlateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-xs text-blue-600 underline"
                    >
                      View plate photo
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      No file uploaded yet.
                    </p>
                  )}
                  {photoPlateUrl ? (
                    <button
                      type="button"
                      disabled={isReadOnlyTeam}
                      className="mt-2 text-xs text-red-600 underline disabled:opacity-50"
                      onClick={() => {
                        if (isReadOnlyTeam) return;
                        setPhotoPlateUrl("");
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Section: Documents */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Documents
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Upload vehicle documents. Insurance is optional but helps
                attract more customers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <UploadField
                    label="Vehicle Registration"
                    hint="Required"
                    accept="image/*,application/pdf"
                    disabled={creating || isReadOnlyTeam}
                    busy={Boolean(uploading.vehicle_registration)}
                    selectedLabel={
                      selectedFileLabel.vehicle_registration || null
                    }
                    onPick={async (files) => {
                      const f = files[0];
                      if (!f) return;
                      setSelectedFileLabel((s) => ({
                        ...s,
                        vehicle_registration: f.name,
                      }));
                      try {
                        const url = await uploadOne("vehicle_registration", f);
                        if (url) upsertDoc("vehicle_registration", url);
                      } catch (ex: unknown) {
                        const message = ex instanceof Error ? ex.message : null;
                        setErr(message || "Failed to upload.");
                      }
                    }}
                  />
                  {getDocUrl("vehicle_registration") ? (
                    <div className="mt-2">
                      <a
                        href={getDocUrl("vehicle_registration")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        View registration
                      </a>
                      <button
                        type="button"
                        disabled={isReadOnlyTeam}
                        className="ml-3 text-xs text-red-600 underline disabled:opacity-50"
                        onClick={() => {
                          if (isReadOnlyTeam) return;
                          removeDoc("vehicle_registration");
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
                  <UploadField
                    label="Insurance"
                    hint="Optional – adds 'Insured' badge"
                    accept="image/*,application/pdf"
                    disabled={creating || isReadOnlyTeam}
                    busy={Boolean(uploading.insurance)}
                    selectedLabel={selectedFileLabel.insurance || null}
                    onPick={async (files) => {
                      const f = files[0];
                      if (!f) return;
                      setSelectedFileLabel((s) => ({
                        ...s,
                        insurance: f.name,
                      }));
                      try {
                        const url = await uploadOne("insurance", f);
                        if (url) upsertDoc("insurance", url);
                      } catch (ex: unknown) {
                        const message = ex instanceof Error ? ex.message : null;
                        setErr(message || "Failed to upload.");
                      }
                    }}
                  />
                  {getDocUrl("insurance") ? (
                    <div className="mt-2">
                      <a
                        href={getDocUrl("insurance")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        View insurance
                      </a>
                      <button
                        type="button"
                        disabled={isReadOnlyTeam}
                        className="ml-3 text-xs text-red-600 underline disabled:opacity-50"
                        onClick={() => {
                          if (isReadOnlyTeam) return;
                          removeDoc("insurance");
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

            {/* Section: Extra Photos */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/20">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Extra Photos{" "}
                <span className="font-normal text-slate-500">(Optional)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Add more angles or interior shots to showcase your vehicle.
              </p>
              <UploadField
                label="Extra photos (optional)"
                accept="image/*"
                multiple
                disabled={creating || isReadOnlyTeam}
                busy={Boolean(uploading.extra_photos)}
                selectedLabel={selectedFileLabel.extra_photos || null}
                onPick={async (picked) => {
                  const files = Array.from(picked);
                  if (files.length === 0) return;
                  setSelectedFileLabel((s) => ({
                    ...s,
                    extra_photos: `${files.length} file(s) selected`,
                  }));
                  try {
                    setUploading((s) => ({ ...s, extra_photos: true }));
                    const urls: string[] = [];
                    for (const f of files) {
                      const url = await uploadOne(
                        `extra_photo_${Date.now()}`,
                        f,
                      );
                      if (url) urls.push(url);
                    }
                    if (urls.length > 0)
                      setExtraPhotoUrls((prev) => prev.concat(urls));
                  } catch (ex: unknown) {
                    const message = ex instanceof Error ? ex.message : null;
                    setErr(message || "Failed to upload.");
                  } finally {
                    setUploading((s) => ({ ...s, extra_photos: false }));
                  }
                }}
              />
              {extraPhotoUrls.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {extraPhotoUrls.map((u, idx) => (
                    <div key={u} className="flex items-center gap-3">
                      <a
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline truncate"
                      >
                        Extra photo {idx + 1}
                      </a>
                      <button
                        type="button"
                        disabled={isReadOnlyTeam}
                        className="text-xs text-red-600 underline disabled:opacity-50"
                        onClick={() => {
                          if (isReadOnlyTeam) return;
                          setExtraPhotoUrls((prev) =>
                            prev.filter((x) => x !== u),
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  No extra photos uploaded.
                </p>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              disabled={creating || isReadOnlyTeam}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full min-h-[120px] px-3 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
              placeholder="Add a short description and key features."
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={creating || isReadOnlyTeam}
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
            disabled={creating || isReadOnlyTeam}
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
