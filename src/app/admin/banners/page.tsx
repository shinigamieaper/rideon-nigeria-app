"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Globe,
  Car as CarIcon,
  Users,
  Building2,
  Briefcase,
  Clock,
  ArrowUpDown,
  ExternalLink,
  Eye,
} from "lucide-react";
import {
  ActionModal,
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components";
import type { BannerPortal, BannerStatus } from "@/types/brandBanner";
import { PORTAL_LABELS } from "@/types/brandBanner";

interface BannerRow {
  id: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaLink: string;
  portals: BannerPortal[];
  status: BannerStatus;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  dismissible: boolean;
  dismissForHours: number;
  createdAt: string | null;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string;
}

const EMPTY_FORM: Omit<
  BannerRow,
  "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
> = {
  title: "",
  message: "",
  ctaLabel: "",
  ctaLink: "",
  portals: [],
  status: "draft",
  priority: 0,
  startAt: null,
  endAt: null,
  dismissible: true,
  dismissForHours: 24,
};

const STATUS_STYLES: Record<BannerStatus, string> = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  active:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  archived:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
};

const PORTAL_ICONS: Record<BannerPortal, React.ElementType> = {
  public: Globe,
  customer: CarIcon,
  driver_on_demand: Users,
  driver_full_time: Briefcase,
  partner: Building2,
};

/** Convert a UTC ISO string to an Africa/Lagos datetime-local input value */
function utcToLagos(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    return "";
  }
}

/** Convert an Africa/Lagos datetime-local value back to a UTC ISO string */
function lagosToUtc(local: string): string | null {
  if (!local) return null;
  try {
    // Build a date in Africa/Lagos by temporarily treating the local string as UTC,
    // then adjusting by the offset difference.
    const naive = new Date(local + ":00Z"); // treat as UTC
    const lagosOffset = getLagosOffset(naive);
    const utc = new Date(naive.getTime() - lagosOffset);
    return utc.toISOString();
  } catch {
    return null;
  }
}

function getLagosOffset(refDate: Date): number {
  // Africa/Lagos is always WAT (UTC+1), no DST.
  return 60 * 60 * 1000; // +1h
}

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Preview
  const [previewId, setPreviewId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch("/api/admin/banners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch banners");
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) fetchBanners();
    });
    return () => unsub();
  }, [fetchBanners]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setSaveSuccess(false);
    setFormOpen(true);
  };

  const openEdit = (b: BannerRow) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      message: b.message,
      ctaLabel: b.ctaLabel,
      ctaLink: b.ctaLink,
      portals: [...b.portals],
      status: b.status,
      priority: b.priority,
      startAt: b.startAt,
      endAt: b.endAt,
      dismissible: b.dismissible,
      dismissForHours: b.dismissForHours,
    });
    setFormError(null);
    setSaveSuccess(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    setSaveSuccess(false);

    try {
      const token = await getToken();
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/admin/banners/${editingId}`
        : "/api/admin/banners";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save banner");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        closeForm();
        fetchBanners();
      }, 800);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save banner";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeletingId(null);
      fetchBanners();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const togglePortal = (portal: BannerPortal) => {
    setForm((prev) => ({
      ...prev,
      portals: prev.portals.includes(portal)
        ? prev.portals.filter((p) => p !== portal)
        : [...prev.portals, portal],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Brand Banners
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage announcement banners across all portals
              </p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Banner
          </Button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Banner List */}
        {banners.length === 0 ? (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-12 text-center">
            <Megaphone className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No banners yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Create your first brand banner to display announcements across
              portals.
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create Banner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((b) => (
              <div
                key={b.id}
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5 transition-all hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                        {b.title || "(No title)"}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[b.status]}`}
                      >
                        {b.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <ArrowUpDown className="h-3 w-3" />
                        Priority {b.priority}
                      </span>
                    </div>

                    {b.message && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-2">
                        {b.message}
                      </p>
                    )}

                    {/* Portal badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {b.portals.map((portal) => {
                        const Icon = PORTAL_ICONS[portal];
                        return (
                          <span
                            key={portal}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium"
                          >
                            <Icon className="h-3 w-3" />
                            {PORTAL_LABELS[portal]}
                          </span>
                        );
                      })}
                    </div>

                    {/* Schedule */}
                    {(b.startAt || b.endAt) && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {b.startAt && (
                          <span>{utcToLagos(b.startAt).replace("T", " ")}</span>
                        )}
                        {b.startAt && b.endAt && <span>→</span>}
                        {b.endAt && (
                          <span>{utcToLagos(b.endAt).replace("T", " ")}</span>
                        )}
                        <span className="text-slate-400">(WAT)</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() =>
                        setPreviewId(previewId === b.id ? null : b.id)
                      }
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(b)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(b.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Inline preview */}
                {previewId === b.id && (
                  <div className="mt-4 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white px-4 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <p className="truncate text-xs font-medium sm:text-sm">
                          {b.title && (
                            <span className="font-semibold">{b.title}</span>
                          )}
                          {b.title && b.message && (
                            <span className="mx-1 text-blue-200/80">•</span>
                          )}
                          {b.message && (
                            <span className="text-blue-100">{b.message}</span>
                          )}
                        </p>
                        {b.ctaLabel && (
                          <span className="flex-none text-xs font-medium underline whitespace-nowrap sm:text-sm">
                            {b.ctaLabel}{" "}
                            <ExternalLink className="inline h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingId ? "Edit Banner" : "Create Banner"}
        className="max-w-2xl max-h-[calc(100dvh-6rem)] overflow-y-auto"
      >
        {formError && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {formError}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Holiday Special!"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Message
            </label>
            <textarea
              rows={2}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Enter the banner message..."
              maxLength={500}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                CTA Label
              </label>
              <Input
                type="text"
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="e.g., Learn More"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                CTA Link
              </label>
              <Input
                type="text"
                value={form.ctaLink}
                onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                placeholder="e.g., /promo or https://..."
                maxLength={200}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Target Portals <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(PORTAL_LABELS) as BannerPortal[]).map((portal) => {
                const Icon = PORTAL_ICONS[portal];
                const checked = form.portals.includes(portal);
                return (
                  <label
                    key={portal}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 px-3 py-2"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => togglePortal(portal)}
                    />
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {PORTAL_LABELS[portal]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as BannerStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Priority (higher = shows first)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Start Date/Time{" "}
                <span className="text-xs text-slate-400">(WAT)</span>
              </label>
              <Input
                type="datetime-local"
                value={utcToLagos(form.startAt)}
                onChange={(e) =>
                  setForm({ ...form, startAt: lagosToUtc(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                End Date/Time{" "}
                <span className="text-xs text-slate-400">(WAT)</span>
              </label>
              <Input
                type="datetime-local"
                value={utcToLagos(form.endAt)}
                onChange={(e) =>
                  setForm({ ...form, endAt: lagosToUtc(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.dismissible}
                onCheckedChange={(next) =>
                  setForm({ ...form, dismissible: next })
                }
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Dismissible
              </span>
            </div>
            {form.dismissible && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Dismiss for (hours)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={form.dismissForHours}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dismissForHours: Number(e.target.value) || 24,
                    })
                  }
                />
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Live Preview
            </p>
            {form.title || form.message ? (
              <div className="rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white px-4 py-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="truncate text-xs font-medium sm:text-sm">
                      {form.title && (
                        <span className="font-semibold">{form.title}</span>
                      )}
                      {form.title && form.message && (
                        <span className="mx-1 text-blue-200/80">•</span>
                      )}
                      {form.message && (
                        <span className="text-blue-100">{form.message}</span>
                      )}
                    </p>
                    {form.ctaLabel && (
                      <span className="flex-none text-xs font-medium underline whitespace-nowrap sm:text-sm">
                        {form.ctaLabel}{" "}
                        <ExternalLink className="inline h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                Enter a title or message to see the preview
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || form.portals.length === 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saveSuccess
              ? "Saved!"
              : editingId
                ? "Update Banner"
                : "Create Banner"}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ActionModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Delete Banner?"
        description={
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This action cannot be undone. The banner will be permanently
            removed.
          </p>
        }
        confirmText="Delete"
        confirmVariant="destructive"
        loading={deleteLoading}
        confirmDisabled={!deletingId}
        onConfirm={() => {
          if (!deletingId) return;
          return handleDelete(deletingId);
        }}
      />
    </div>
  );
}
