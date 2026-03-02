"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  Save,
  Send,
  ArrowLeft,
  UploadCloud,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { usePartnerTeam } from "@/hooks";
import { SingleSelectCombobox } from "@/components";

type SubmissionStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

interface SubmissionDetail {
  id: string;
  status: SubmissionStatus;
  city: string;
  category: string;
  make: string;
  model: string;
  seats: number | null;
  images: string[];
  documents: { type: string; url: string }[];
  description: string;
  partnerBaseDayRateNgn: number | null;
  partnerBaseBlock4hRateNgn: number | null;
  changesRequestedMessage: string | null;
  rejectedReason: string | null;
  vehicleId: string | null;
  updatedAt: string | null;
}

interface ApprovedPartnerDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
}

interface ActiveVehicleDriverLink {
  id: string;
  status: "active" | "inactive";
  vehicleId: string;
  driverId: string;
}

function statusPill(status: SubmissionStatus) {
  const styles: Record<SubmissionStatus, string> = {
    draft: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
    pending_review:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    changes_requested:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    approved:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

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

export default function PartnerVehicleSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || "").trim();

  const { isTeamMember, teamRole } = usePartnerTeam();
  const isReadOnlyTeam =
    isTeamMember && teamRole !== "admin" && teamRole !== "manager";

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<SubmissionDetail | null>(null);

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

  const [driversLoading, setDriversLoading] = React.useState(false);
  const [driversErr, setDriversErr] = React.useState<string | null>(null);
  const [drivers, setDrivers] = React.useState<ApprovedPartnerDriver[]>([]);
  const [activeLink, setActiveLink] =
    React.useState<ActiveVehicleDriverLink | null>(null);
  const [selectedDriverId, setSelectedDriverId] = React.useState("");
  const [linkBusy, setLinkBusy] = React.useState(false);

  const canEdit =
    !isReadOnlyTeam &&
    (data?.status === "draft" || data?.status === "changes_requested");

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }

      let token = await user.getIdToken();
      const fetchOne = async (t: string) =>
        fetch(`/api/partner/vehicles/submissions/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });

      let res = await fetchOne(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await fetchOne(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to load submission.");
      }

      const j = (await res.json()) as SubmissionDetail;
      setData(j);
      setCity(j.city || "");
      setCategory(j.category || "");
      setMake(j.make || "");
      setModel(j.model || "");
      setSeats(j.seats != null ? String(j.seats) : "");
      setPartnerBaseDayRateNgn(
        j.partnerBaseDayRateNgn != null ? String(j.partnerBaseDayRateNgn) : "",
      );
      setPartnerBaseBlock4hRateNgn(
        j.partnerBaseBlock4hRateNgn != null
          ? String(j.partnerBaseBlock4hRateNgn)
          : "",
      );
      const imgs = Array.isArray(j.images) ? j.images : [];
      setPhotoFrontUrl(typeof imgs[0] === "string" ? imgs[0] : "");
      setPhotoBackUrl(typeof imgs[1] === "string" ? imgs[1] : "");
      setPhotoPlateUrl(typeof imgs[2] === "string" ? imgs[2] : "");
      setExtraPhotoUrls(imgs.slice(3).filter((x) => typeof x === "string"));
      setDocuments(Array.isArray(j.documents) ? j.documents : []);
      setDescription(j.description || "");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const loadDriversAndLink = React.useCallback(
    async (vehicleId: string) => {
      setDriversLoading(true);
      setDriversErr(null);
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace("/login");
          return;
        }

        let token = await user.getIdToken();
        const fetchData = async (t: string) =>
          fetch("/api/partner/vehicle-driver-links", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
          });

        let res = await fetchData(token);
        if (res.status === 403) {
          token = await user.getIdToken(true);
          res = await fetchData(token);
        }

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to load drivers.");
        }

        const j = await res.json();
        const nextDrivers = Array.isArray(j?.drivers)
          ? (j.drivers as ApprovedPartnerDriver[])
          : [];
        const nextLinks = Array.isArray(j?.links)
          ? (j.links as ActiveVehicleDriverLink[])
          : [];
        const link =
          nextLinks.find(
            (l) => l.vehicleId === vehicleId && l.status === "active",
          ) || null;

        setDrivers(nextDrivers);
        setActiveLink(link);
        setSelectedDriverId(link?.driverId || "");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : null;
        setDriversErr(message || "Failed to load drivers.");
      } finally {
        setDriversLoading(false);
      }
    },
    [router],
  );

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (data?.status === "approved" && data.vehicleId) {
      loadDriversAndLink(data.vehicleId);
    } else {
      setDrivers([]);
      setActiveLink(null);
      setSelectedDriverId("");
      setDriversErr(null);
      setDriversLoading(false);
    }
  }, [data?.status, data?.vehicleId, loadDriversAndLink]);

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

  const onSave = async () => {
    if (!id) return;
    if (!canEdit) return;
    if (isReadOnlyTeam) return;
    if (saving) return;

    setSaving(true);
    setErr(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let token = await user.getIdToken();
      const doPatch = async (t: string) =>
        fetch(`/api/partner/vehicles/submissions/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify(buildPayload()),
        });

      let res = await doPatch(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doPatch(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        let msg = j?.error || "Failed to save changes.";
        if (j?.details && typeof j.details === "object") {
          const lines = Object.entries(j.details as Record<string, string>).map(
            ([k, v]) => `- ${k}: ${String(v)}`,
          );
          if (lines.length > 0) msg += `\n${lines.join("\n")}`;
        }
        throw new Error(msg);
      }

      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async () => {
    if (!id) return;
    if (isReadOnlyTeam) return;
    if (submitting) return;

    setSubmitting(true);
    setErr(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      let token = await user.getIdToken();

      // Ensure latest draft changes are saved before submit
      if (canEdit) {
        const saveRes = await fetch(
          `/api/partner/vehicles/submissions/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(buildPayload()),
          },
        );
        if (saveRes.status === 403) {
          token = await user.getIdToken(true);
        }

        if (!saveRes.ok) {
          const j = await saveRes.json().catch(() => null);
          let msg = j?.error || "Failed to save changes before submit.";
          if (j?.details && typeof j.details === "object") {
            const lines = Object.entries(
              j.details as Record<string, string>,
            ).map(([k, v]) => `- ${k}: ${String(v)}`);
            if (lines.length > 0) msg += `\n${lines.join("\n")}`;
          }
          throw new Error(msg);
        }
      }

      const doSubmit = async (t: string) =>
        fetch(
          `/api/partner/vehicles/submissions/${encodeURIComponent(id)}/submit`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
          },
        );

      let res = await doSubmit(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doSubmit(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        let msg = j?.error || "Failed to submit.";
        if (j?.details && typeof j.details === "object") {
          const lines = Object.entries(j.details as Record<string, string>).map(
            ([k, v]) => `- ${k}: ${String(v)}`,
          );
          if (lines.length > 0) msg += `\n${lines.join("\n")}`;
        }
        throw new Error(msg);
      }

      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to submit.");
    } finally {
      setSubmitting(false);
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
                Vehicle submission
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ID: {id || "—"}
              </p>
            </div>
          </div>
        </div>

        {data ? (
          <div className="flex items-center gap-2">
            {statusPill(data.status)}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Loading submission…</p>
          </div>
        </div>
      ) : err ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-red-200/80 dark:border-red-800/40 shadow-lg p-6">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Something went wrong</p>
              <p className="text-sm whitespace-pre-wrap">{err}</p>
            </div>
          </div>
        </div>
      ) : !data ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Submission not found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.status === "approved" && data.vehicleId ? (
            <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Assigned driver
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Link an approved partner driver to this approved vehicle.
                  </p>
                </div>
              </div>

              {driversLoading ? (
                <div className="mt-4 flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Loading drivers…</p>
                </div>
              ) : driversErr ? (
                <div className="mt-4 flex items-start gap-3 text-red-600">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">
                      Couldn’t load drivers
                    </p>
                    <p className="text-sm">{driversErr}</p>
                  </div>
                </div>
              ) : drivers.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  No approved partner drivers found yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Driver
                    </label>
                    <div className="mt-2">
                      <SingleSelectCombobox
                        value={selectedDriverId}
                        onValueChange={setSelectedDriverId}
                        disabled={
                          Boolean(activeLink) || linkBusy || isReadOnlyTeam
                        }
                        placeholder="Select a driver…"
                        searchPlaceholder="Search drivers..."
                        options={drivers.map((d) => {
                          const name =
                            `${d.firstName} ${d.lastName}`.trim() || "Driver";
                          const meta = `${d.city || "—"} • ${d.phone || "—"}`;
                          return {
                            value: d.id,
                            label: `${name} (${meta})`,
                            keywords:
                              `${name} ${meta} ${d.phone || ""} ${d.email || ""}`.trim(),
                          };
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      disabled={
                        linkBusy ||
                        Boolean(activeLink) ||
                        !selectedDriverId ||
                        isReadOnlyTeam
                      }
                      onClick={async () => {
                        if (isReadOnlyTeam) return;
                        if (!data.vehicleId) return;
                        if (!selectedDriverId) return;
                        if (linkBusy) return;
                        setLinkBusy(true);
                        setDriversErr(null);
                        try {
                          const user = auth.currentUser;
                          if (!user) throw new Error("Not authenticated");
                          let token = await user.getIdToken();
                          const doAttach = async (t: string) =>
                            fetch("/api/partner/vehicle-driver-links", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${t}`,
                              },
                              body: JSON.stringify({
                                vehicleId: data.vehicleId,
                                driverId: selectedDriverId,
                              }),
                            });

                          let res = await doAttach(token);
                          if (res.status === 403) {
                            token = await user.getIdToken(true);
                            res = await doAttach(token);
                          }

                          if (!res.ok) {
                            const j = await res.json().catch(() => null);
                            throw new Error(
                              j?.error || "Failed to assign driver.",
                            );
                          }

                          await loadDriversAndLink(data.vehicleId);
                        } catch (e: unknown) {
                          const message = e instanceof Error ? e.message : null;
                          setDriversErr(message || "Failed to assign driver.");
                        } finally {
                          setLinkBusy(false);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "#00529B" }}
                    >
                      {linkBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Assign driver
                    </button>

                    <button
                      type="button"
                      disabled={linkBusy || !activeLink || isReadOnlyTeam}
                      onClick={async () => {
                        if (isReadOnlyTeam) return;
                        if (!data.vehicleId) return;
                        if (linkBusy) return;
                        setLinkBusy(true);
                        setDriversErr(null);
                        try {
                          const user = auth.currentUser;
                          if (!user) throw new Error("Not authenticated");
                          let token = await user.getIdToken();
                          const doDetach = async (t: string) =>
                            fetch(
                              `/api/partner/vehicle-driver-links/${encodeURIComponent(data.vehicleId!)}`,
                              {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${t}` },
                              },
                            );

                          let res = await doDetach(token);
                          if (res.status === 403) {
                            token = await user.getIdToken(true);
                            res = await doDetach(token);
                          }

                          if (!res.ok) {
                            const j = await res.json().catch(() => null);
                            throw new Error(
                              j?.error || "Failed to unassign driver.",
                            );
                          }

                          await loadDriversAndLink(data.vehicleId);
                        } catch (e: unknown) {
                          const message = e instanceof Error ? e.message : null;
                          setDriversErr(
                            message || "Failed to unassign driver.",
                          );
                        } finally {
                          setLinkBusy(false);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80 disabled:opacity-50"
                    >
                      {linkBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Unassign
                    </button>
                  </div>

                  {activeLink ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      A driver is currently assigned. Unassign before selecting
                      a different driver.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {data.status === "changes_requested" &&
          data.changesRequestedMessage ? (
            <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-900/10 backdrop-blur-lg border border-blue-200/60 dark:border-blue-800/40 shadow-lg p-6">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Changes requested
              </p>
              <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                {data.changesRequestedMessage}
              </p>
            </div>
          ) : null}

          {data.status === "rejected" && data.rejectedReason ? (
            <div className="rounded-2xl bg-red-50/70 dark:bg-red-900/10 backdrop-blur-lg border border-red-200/60 dark:border-red-800/40 shadow-lg p-6">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Rejected
              </p>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                {data.rejectedReason}
              </p>
              <p className="mt-3 text-xs text-red-700 dark:text-red-300">
                This submission is locked. To resubmit, create a new vehicle
                submission.
              </p>
              <Link
                href="/partner/vehicles/new"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90"
                style={{ backgroundColor: "#00529B" }}
              >
                Start new submission
              </Link>
            </div>
          ) : null}

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!canEdit}
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                  placeholder="e.g. Lagos"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!canEdit}
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                  placeholder="e.g. Executive"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Make
                </label>
                <input
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  disabled={!canEdit}
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                  placeholder="e.g. Toyota"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Model
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!canEdit}
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                  placeholder="e.g. Camry"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Seats
                </label>
                <input
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  disabled={!canEdit}
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
                  value={partnerBaseDayRateNgn}
                  onChange={(e) => setPartnerBaseDayRateNgn(e.target.value)}
                  disabled={!canEdit}
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
                  value={partnerBaseBlock4hRateNgn}
                  onChange={(e) => setPartnerBaseBlock4hRateNgn(e.target.value)}
                  disabled={!canEdit}
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
                        disabled={!canEdit}
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
                            const message =
                              ex instanceof Error ? ex.message : null;
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
                      {photoFrontUrl && canEdit ? (
                        <button
                          type="button"
                          className="mt-2 text-xs text-red-600 underline"
                          onClick={() => setPhotoFrontUrl("")}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div>
                      <UploadField
                        label="Back photo"
                        accept="image/*"
                        disabled={!canEdit}
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
                            const message =
                              ex instanceof Error ? ex.message : null;
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
                      {photoBackUrl && canEdit ? (
                        <button
                          type="button"
                          className="mt-2 text-xs text-red-600 underline"
                          onClick={() => setPhotoBackUrl("")}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div>
                      <UploadField
                        label="Plate close-up"
                        accept="image/*"
                        disabled={!canEdit}
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
                            const message =
                              ex instanceof Error ? ex.message : null;
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
                      {photoPlateUrl && canEdit ? (
                        <button
                          type="button"
                          className="mt-2 text-xs text-red-600 underline"
                          onClick={() => setPhotoPlateUrl("")}
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
                        disabled={!canEdit}
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
                            const url = await uploadOne(
                              "vehicle_registration",
                              f,
                            );
                            if (url) upsertDoc("vehicle_registration", url);
                          } catch (ex: unknown) {
                            const message =
                              ex instanceof Error ? ex.message : null;
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
                          {canEdit ? (
                            <button
                              type="button"
                              className="ml-3 text-xs text-red-600 underline"
                              onClick={() => removeDoc("vehicle_registration")}
                            >
                              Remove
                            </button>
                          ) : null}
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
                        disabled={!canEdit}
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
                            const message =
                              ex instanceof Error ? ex.message : null;
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
                          {canEdit ? (
                            <button
                              type="button"
                              className="ml-3 text-xs text-red-600 underline"
                              onClick={() => removeDoc("insurance")}
                            >
                              Remove
                            </button>
                          ) : null}
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
                    <span className="font-normal text-slate-500">
                      (Optional)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Add more angles or interior shots to showcase your vehicle.
                  </p>
                  <UploadField
                    label="Extra photos"
                    accept="image/*"
                    multiple
                    disabled={!canEdit}
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
                          {canEdit ? (
                            <button
                              type="button"
                              className="text-xs text-red-600 underline"
                              onClick={() =>
                                setExtraPhotoUrls((prev) =>
                                  prev.filter((x) => x !== u),
                                )
                              }
                            >
                              Remove
                            </button>
                          ) : null}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  className="mt-2 w-full min-h-[120px] px-3 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                  placeholder="Add a short description and key features."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={!canEdit || saving}
                onClick={onSave}
                className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </button>

              <button
                type="button"
                disabled={
                  data.status === "pending_review" ||
                  data.status === "approved" ||
                  submitting ||
                  isReadOnlyTeam
                }
                onClick={onSubmit}
                className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#00529B" }}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit for review
              </button>
            </div>

            {!canEdit ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Editing is available only for drafts and submissions where
                changes were requested.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
