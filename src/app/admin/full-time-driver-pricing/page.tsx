"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  BadgeDollarSign,
  Check,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  UserPlus,
  AlertCircle,
} from "lucide-react";

interface AccessTier {
  durationDays: number;
  priceNgn: number;
  label: string;
}

interface PricingConfigResponse {
  enabled: boolean;
  accessTiers: AccessTier[];
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
}

const defaultConfig: PricingConfigResponse = {
  enabled: false,
  accessTiers: [
    { durationDays: 7, priceNgn: 0, label: "Starter" },
    { durationDays: 12, priceNgn: 0, label: "Standard" },
    { durationDays: 30, priceNgn: 0, label: "Extended" },
  ],
  updatedAt: null,
  updatedBy: null,
  updatedByEmail: null,
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  const v = Math.round(n);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function formatNgn(amount: number) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₦${Math.round(amount).toLocaleString()}`;
  }
}

export default function FullTimeDriverPricingPage() {
  const [config, setConfig] = useState<PricingConfigResponse>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adminRole, setAdminRole] = useState<string | null>(null);

  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState(12);
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  const tiers = useMemo(() => {
    return Array.isArray(config.accessTiers) ? config.accessTiers : [];
  }, [config.accessTiers]);

  const canSavePricing = useMemo(() => {
    return adminRole === "super_admin" || adminRole === "product_admin";
  }, [adminRole]);

  const canGrantAccess = useMemo(() => {
    return (
      adminRole === "super_admin" ||
      adminRole === "product_admin" ||
      adminRole === "admin" ||
      adminRole === "ops_admin"
    );
  }, [adminRole]);

  const fetchConfig = useCallback(async () => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/placement/pricing", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to fetch pricing config");
      }

      const data = (await res.json()) as PricingConfigResponse;
      setConfig({
        enabled: Boolean(data.enabled),
        accessTiers: Array.isArray(data.accessTiers)
          ? data.accessTiers
          : defaultConfig.accessTiers,
        updatedAt: data.updatedAt ?? null,
        updatedBy: data.updatedBy ?? null,
        updatedByEmail: data.updatedByEmail ?? null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load pricing config";
      setError(message);
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        user
          .getIdTokenResult()
          .then((r) => {
            const claims: any = r?.claims || {};
            const role =
              typeof claims.adminRole === "string"
                ? claims.adminRole
                : typeof claims.role === "string"
                  ? claims.role
                  : null;
            setAdminRole(role);
          })
          .catch(() => {
            setAdminRole(null);
          });
        fetchConfig();
      }
    });
    return () => unsubscribe();
  }, [fetchConfig]);

  const saveConfig = useCallback(async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      setError(null);

      if (!canSavePricing) {
        setError("You do not have permission to edit pricing.");
        return;
      }

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/placement/pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: Boolean(config.enabled),
          accessTiers: [...tiers]
            .sort((a, b) => a.durationDays - b.durationDays)
            .map((t) => ({
              durationDays: clampInt(Number(t.durationDays), 1, 365),
              priceNgn: clampInt(Number(t.priceNgn), 0, 50_000_000),
              label: String(t.label || "").trim(),
            })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to save pricing");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchConfig();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save pricing";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [canSavePricing, config.enabled, fetchConfig, tiers]);

  const addTier = () => {
    const current = Array.isArray(config.accessTiers) ? config.accessTiers : [];
    const nextDays =
      current.length > 0
        ? Math.max(...current.map((t) => t.durationDays || 0)) + 1
        : 7;
    setConfig((prev) => ({
      ...prev,
      accessTiers: [
        ...(Array.isArray(prev.accessTiers) ? prev.accessTiers : []),
        {
          durationDays: clampInt(nextDays, 1, 365),
          priceNgn: 0,
          label: "New Tier",
        },
      ],
    }));
  };

  const removeTier = (index: number) => {
    setConfig((prev) => {
      const tiers = Array.isArray(prev.accessTiers)
        ? [...prev.accessTiers]
        : [];
      tiers.splice(index, 1);
      return { ...prev, accessTiers: tiers };
    });
  };

  const updateTier = (index: number, patch: Partial<AccessTier>) => {
    setConfig((prev) => {
      const tiers = Array.isArray(prev.accessTiers)
        ? [...prev.accessTiers]
        : [];
      const current = tiers[index] || {
        durationDays: 7,
        priceNgn: 0,
        label: "",
      };
      tiers[index] = { ...current, ...patch };
      return { ...prev, accessTiers: tiers };
    });
  };

  const submitGrant = useCallback(async () => {
    try {
      setGranting(true);
      setGrantSuccess(null);
      setGrantError(null);

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const email = grantEmail.trim().toLowerCase();
      if (!email) {
        setGrantError("Enter a customer email.");
        return;
      }

      const days = clampInt(Number(grantDays), 1, 365);

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/placement/grant-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          durationDays: days,
          reason: grantReason.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to grant access");
      }

      const expires =
        typeof data?.accessExpiresAt === "string" ? data.accessExpiresAt : null;
      setGrantSuccess(
        expires
          ? `Access granted until ${new Date(expires).toLocaleString()}`
          : "Access granted",
      );
      setGrantEmail("");
      setGrantReason("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to grant access";
      setGrantError(message);
    } finally {
      setGranting(false);
    }
  }, [grantDays, grantEmail, grantReason]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <BadgeDollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Full-Time Driver Pricing
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Configure placement access tiers and grant manual access
              </p>
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving || !canSavePricing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 mb-8">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Placement Access
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Turn on/off the paid access feature and set tier prices.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                config.enabled
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            >
              <Shield
                className={`h-4 w-4 ${config.enabled ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}
              />
              {config.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Access Tiers
            </p>
            <button
              type="button"
              onClick={addTier}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition"
            >
              <Plus className="h-4 w-4" />
              Add Tier
            </button>
          </div>

          <div className="space-y-3">
            {tiers.map((tier, idx) => (
              <div
                key={`${tier.durationDays}-${idx}`}
                className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/20"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Label
                    </label>
                    <input
                      value={tier.label}
                      onChange={(e) => {
                        updateTier(idx, { label: e.target.value });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="e.g., Standard"
                      maxLength={40}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Duration (days)
                    </label>
                    <input
                      type="number"
                      value={tier.durationDays}
                      onChange={(e) => {
                        updateTier(idx, {
                          durationDays: clampInt(
                            Number(e.target.value),
                            1,
                            365,
                          ),
                        });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      min={1}
                      max={365}
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Price (NGN)
                    </label>
                    <input
                      type="number"
                      value={tier.priceNgn}
                      onChange={(e) => {
                        updateTier(idx, {
                          priceNgn: clampInt(
                            Number(e.target.value),
                            0,
                            50_000_000,
                          ),
                        });
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      min={0}
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatNgn(Number(tier.priceNgn) || 0)}
                    </p>
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        removeTier(idx);
                      }}
                      className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition"
                      aria-label="Remove tier"
                      title="Remove tier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {tiers.length === 0 && (
              <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/20 text-sm text-slate-600 dark:text-slate-400">
                No tiers configured.
              </div>
            )}
          </div>

          {config.updatedAt && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Last updated: {new Date(config.updatedAt).toLocaleString()}
              {config.updatedByEmail ? ` by ${config.updatedByEmail}` : ""}
            </p>
          )}
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Manual Access Grant
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Grant or extend access for a customer by email.
              </p>
            </div>
          </div>

          {grantError && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {grantError}
            </div>
          )}

          {grantSuccess && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm">
              <Check className="h-4 w-4 flex-shrink-0" />
              {grantSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Customer Email
              </label>
              <input
                type="email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Duration (days)
              </label>
              <input
                type="number"
                value={grantDays}
                onChange={(e) =>
                  setGrantDays(clampInt(Number(e.target.value), 1, 365))
                }
                min={1}
                max={365}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="button"
                onClick={submitGrant}
                disabled={granting || !canGrantAccess}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {granting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Grant Access
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Reason (optional)
            </label>
            <input
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="e.g., VIP customer / support compensation"
              maxLength={200}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
