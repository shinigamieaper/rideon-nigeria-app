"use client";

import React from "react";
import { waitForUser } from "@/lib/firebase";
import { StickyBanner } from "@/components";
import { Switch } from "@/components";
import {
  Bell,
  BellOff,
  Users,
  Wallet,
  Gift,
  Mail,
  Smartphone,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PartnerNotificationTogglesProps =
  React.ComponentPropsWithoutRef<"div"> & {
    readOnly?: boolean;
  };

type ChannelSpec = { push: boolean; email: boolean; sms: boolean };

type SpecItem = {
  key: string;
  title: string;
  desc: string;
  channels: Partial<ChannelSpec>;
};

type SpecCategory = {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SpecItem[];
};

function getErrorFromJson(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  if (!("error" in input)) return null;
  const v = (input as { error?: unknown }).error;
  return typeof v === "string" && v.trim() ? v : null;
}

const SPEC: SpecCategory[] = [
  {
    key: "fleet",
    title: "Fleet & Requests",
    icon: Users,
    items: [
      {
        key: "submission_updates",
        title: "Vehicle/Driver Submission Updates",
        desc: "Approval, rejection, and document review updates.",
        channels: { push: true, email: true, sms: true },
      },
      {
        key: "booking_requests",
        title: "New Booking Requests",
        desc: "Alerts when a new reservation request is created.",
        channels: { push: true, email: true, sms: true },
      },
    ],
  },
  {
    key: "earnings",
    title: "Earnings & Payouts",
    icon: Wallet,
    items: [
      {
        key: "payout_processed",
        title: "Payout Processed",
        desc: "Your payout has been processed and sent to your bank.",
        channels: { push: true, email: true, sms: false },
      },
      {
        key: "payout_failed",
        title: "Payout Failed",
        desc: "We couldn’t complete a payout. Action may be required.",
        channels: { push: true, email: true, sms: true },
      },
    ],
  },
  {
    key: "general",
    title: "General",
    icon: Gift,
    items: [
      {
        key: "platform_updates",
        title: "Platform Updates",
        desc: "Important news about RideOn.",
        channels: { push: false, email: true, sms: false },
      },
    ],
  },
];

function Toggle({
  checked,
  onChange,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      size={size}
      className={cn(disabled ? "opacity-50" : undefined)}
    />
  );
}

type Prefs = {
  enabled: boolean;
  [category: string]: unknown;
};

function coercePrefs(input: unknown): Prefs {
  const defaults = defaultsFromSpec();
  if (!input || typeof input !== "object") return defaults;

  const obj = input as Record<string, unknown>;
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : true;

  const next: Prefs = { ...defaults, enabled };
  for (const cat of SPEC) {
    const v = obj[cat.key];
    if (v && typeof v === "object") {
      next[cat.key] = v;
    }
  }

  return next;
}

function defaultsFromSpec(): Prefs {
  const prefs: Prefs = { enabled: true };
  for (const cat of SPEC) {
    const catObj: Record<
      string,
      { push?: boolean; email?: boolean; sms?: boolean }
    > = {};
    for (const item of cat.items) {
      catObj[item.key] = {
        ...(item.channels.push ? { push: true } : {}),
        ...(item.channels.email ? { email: true } : {}),
        ...(item.channels.sms ? { sms: true } : {}),
      };
    }
    prefs[cat.key] = catObj;
  }
  return prefs;
}

export default function PartnerNotificationToggles({
  className,
  readOnly = false,
  ...rest
}: PartnerNotificationTogglesProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [prefs, setPrefs] = React.useState<Prefs>(() => defaultsFromSpec());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const user = await waitForUser();
        const token = await user.getIdToken();
        const res = await fetch("/api/partner/me/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j: unknown = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            getErrorFromJson(j) || "Failed to load notification preferences",
          );
        if (!cancelled) setPrefs(coercePrefs(j));
      } catch (e: unknown) {
        console.error(e);
        const msg =
          e instanceof Error
            ? e.message
            : "Failed to load notification preferences.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(updated: Prefs) {
    try {
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch("/api/partner/me/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      const j: unknown = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          getErrorFromJson(j) || "Failed to save notification preferences",
        );
      setPrefs(coercePrefs(j));
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to save notification preferences.";
      setError(msg);
    }
  }

  async function saveWithFeedback(updated: Prefs) {
    if (readOnly) return;
    setSaving(true);
    await save(updated);
    setSaving(false);
  }

  function updateChannel(
    catKey: string,
    itemKey: string,
    channel: "push" | "email" | "sms",
    value: boolean,
  ) {
    setPrefs((p) => {
      const next = JSON.parse(JSON.stringify(p)) as Prefs;
      const cat = ((next[catKey] as Record<string, unknown>) || {}) as Record<
        string,
        unknown
      >;
      const row = ((cat[itemKey] as Record<string, unknown>) || {}) as Record<
        string,
        unknown
      >;
      row[channel] = value;
      cat[itemKey] = row;
      next[catKey] = cat;
      return next;
    });
  }

  return (
    <div className={cn("space-y-4", className)} {...rest}>
      {error && (
        <StickyBanner className="z-50">
          <div className="rounded-xl bg-red-50/90 dark:bg-red-900/30 border border-red-200/80 dark:border-red-800/60 px-4 py-2.5 text-sm text-red-700 dark:text-red-300 shadow-lg flex items-center gap-2">
            <BellOff className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        </StickyBanner>
      )}

      {saving && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-[#00529B] px-4 py-2 text-sm text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          <div
            className={cn(
              "rounded-2xl backdrop-blur-lg border shadow-lg p-5 transition-all duration-300",
              prefs.enabled
                ? "bg-gradient-to-r from-[#00529B]/10 to-[#0077E6]/10 border-[#00529B]/30"
                : "bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/60",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                    prefs.enabled
                      ? "bg-[#00529B]/20"
                      : "bg-slate-200/70 dark:bg-slate-800/70",
                  )}
                >
                  {prefs.enabled ? (
                    <Bell className="h-6 w-6 text-[#00529B]" />
                  ) : (
                    <BellOff className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {prefs.enabled
                      ? "Notifications Enabled"
                      : "Notifications Disabled"}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {prefs.enabled
                      ? "Get updates about your fleet and payouts"
                      : "Turn on to receive important updates"}
                  </p>
                </div>
              </div>
              <Toggle
                checked={!!prefs.enabled}
                onChange={(v) => {
                  if (readOnly) return;
                  const next = { ...prefs, enabled: v };
                  setPrefs(next);
                  saveWithFeedback(next);
                }}
                disabled={readOnly}
              />
            </div>
          </div>

          {SPEC.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.key}
                className={cn(
                  "rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg overflow-hidden transition-opacity",
                  !prefs.enabled && "opacity-60",
                )}
              >
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00529B]/10">
                    <Icon className="h-5 w-5 text-[#00529B]" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {cat.title}
                  </h3>
                </div>

                <div className="px-5 pb-2">
                  {cat.items.map((item, idx) => {
                    const catPrefs = ((prefs[cat.key] as Record<
                      string,
                      unknown
                    >) || {}) as Record<string, unknown>;
                    const row = ((catPrefs[item.key] as Record<
                      string,
                      unknown
                    >) || {}) as Record<string, unknown>;
                    const isLast = idx === cat.items.length - 1;
                    const hasChannels = !!(
                      item.channels.push ||
                      item.channels.email ||
                      item.channels.sms
                    );
                    if (!hasChannels) return null;

                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "py-4 flex items-center gap-4",
                          !isLast &&
                            "border-b border-slate-200/60 dark:border-slate-800/40",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.desc}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {item.channels.push && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Smartphone className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Push</span>
                              </div>
                              <Toggle
                                size="sm"
                                checked={!!row.push}
                                onChange={(v) => {
                                  if (readOnly) return;
                                  updateChannel(cat.key, item.key, "push", v);
                                  saveWithFeedback({
                                    ...prefs,
                                    [cat.key]: {
                                      ...catPrefs,
                                      [item.key]: { ...row, push: v },
                                    },
                                  });
                                }}
                                disabled={!prefs.enabled || readOnly}
                              />
                            </div>
                          )}

                          {item.channels.email && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Email</span>
                              </div>
                              <Toggle
                                size="sm"
                                checked={!!row.email}
                                onChange={(v) => {
                                  if (readOnly) return;
                                  updateChannel(cat.key, item.key, "email", v);
                                  saveWithFeedback({
                                    ...prefs,
                                    [cat.key]: {
                                      ...catPrefs,
                                      [item.key]: { ...row, email: v },
                                    },
                                  });
                                }}
                                disabled={!prefs.enabled || readOnly}
                              />
                            </div>
                          )}

                          {item.channels.sms && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">SMS</span>
                              </div>
                              <Toggle
                                size="sm"
                                checked={!!row.sms}
                                onChange={(v) => {
                                  if (readOnly) return;
                                  updateChannel(cat.key, item.key, "sms", v);
                                  saveWithFeedback({
                                    ...prefs,
                                    [cat.key]: {
                                      ...catPrefs,
                                      [item.key]: { ...row, sms: v },
                                    },
                                  });
                                }}
                                disabled={!prefs.enabled || readOnly}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Loading notification preferences…</p>
          </div>
        </div>
      )}
    </div>
  );
}
