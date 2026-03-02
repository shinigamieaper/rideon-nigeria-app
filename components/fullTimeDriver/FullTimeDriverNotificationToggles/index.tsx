"use client";

import React from "react";
import { StickyBanner } from "@/components";
import { waitForUser } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  Bell,
  BellOff,
  Briefcase,
  Mail,
  Smartphone,
  Loader2,
} from "lucide-react";

export interface FullTimeDriverNotificationTogglesProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SPEC = [
  {
    key: "application",
    title: "Application Updates",
    icon: Briefcase,
    items: [
      {
        key: "application_approved",
        title: "Application Approved",
        desc: "When your full-time driver application is approved.",
        channels: { push: true, email: true },
      },
      {
        key: "application_needs_more_info",
        title: "Action Required",
        desc: "When we need more information to continue reviewing your application.",
        channels: { push: true, email: true },
      },
      {
        key: "application_rejected",
        title: "Application Rejected",
        desc: "When your full-time driver application is rejected.",
        channels: { push: true, email: true },
      },
    ],
  },
] as const;

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
  const sizes = {
    sm: {
      track: "w-8 h-5",
      thumb: "h-3.5 w-3.5",
      translate: "peer-checked:translate-x-3",
    },
    md: {
      track: "w-11 h-6",
      thumb: "h-4 w-4",
      translate: "peer-checked:translate-x-5",
    },
  };
  const s = sizes[size];

  return (
    <label
      className={cn(
        "inline-flex items-center",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span
        className={cn(
          s.track,
          "bg-slate-300 peer-checked:bg-[#00529B] dark:bg-slate-700 dark:peer-checked:bg-[#00529B] rounded-full relative transition-colors duration-200",
        )}
      >
        <span
          className={cn(
            s.thumb,
            s.translate,
            "absolute left-1 top-1 bg-white rounded-full transition-transform duration-200 shadow-sm",
          )}
        />
      </span>
    </label>
  );
}

type Prefs = {
  enabled: boolean;
  [category: string]: any;
};

function defaultsFromSpec(): Prefs {
  const prefs: Prefs = { enabled: true };
  for (const cat of SPEC) {
    const catObj: Record<string, { push?: boolean; email?: boolean }> = {};
    for (const item of cat.items) {
      catObj[item.key] = {
        ...(item.channels.push ? { push: true } : {}),
        ...(item.channels.email ? { email: true } : {}),
      };
    }
    (prefs as any)[cat.key] = catObj;
  }
  return prefs;
}

export default function FullTimeDriverNotificationToggles({
  className,
  ...rest
}: FullTimeDriverNotificationTogglesProps) {
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
        const res = await fetch("/api/full-time-driver/me/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            j?.error || "Failed to load notification preferences",
          );
        if (!cancelled) setPrefs(j);
      } catch (e: any) {
        console.error(e);
        if (!cancelled)
          setError(e?.message || "Failed to load notification preferences.");
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
      const res = await fetch("/api/full-time-driver/me/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j?.error || "Failed to save notification preferences");
      setPrefs(j);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save notification preferences.");
    }
  }

  async function saveWithFeedback(updated: Prefs) {
    setSaving(true);
    await save(updated);
    setSaving(false);
  }

  function updateChannel(
    catKey: string,
    itemKey: string,
    channel: "push" | "email",
    value: boolean,
  ) {
    setPrefs((p) => {
      const next: Prefs = JSON.parse(JSON.stringify(p));
      if (!next[catKey]) (next as any)[catKey] = {};
      if (!next[catKey][itemKey]) (next as any)[catKey][itemKey] = {};
      (next as any)[catKey][itemKey][channel] = value;
      return next;
    });
  }

  return (
    <div className={cn("mx-auto max-w-3xl pb-24", className)} {...rest}>
      {error && (
        <StickyBanner className="z-50 mb-4">
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
                      ? "Get updates about your full-time application"
                      : "Turn on to receive important application updates"}
                  </p>
                </div>
              </div>
              <Toggle
                checked={!!prefs.enabled}
                onChange={(v) => {
                  const next = { ...prefs, enabled: v };
                  setPrefs(next);
                  saveWithFeedback(next);
                }}
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
                    const row = (prefs as any)[cat.key]?.[item.key] || {};
                    const isLast = idx === cat.items.length - 1;

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
                                  updateChannel(cat.key, item.key, "push", v);
                                  saveWithFeedback({
                                    ...prefs,
                                    [cat.key]: {
                                      ...(prefs as any)[cat.key],
                                      [item.key]: { ...row, push: v },
                                    },
                                  });
                                }}
                                disabled={!prefs.enabled}
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
                                  updateChannel(cat.key, item.key, "email", v);
                                  saveWithFeedback({
                                    ...prefs,
                                    [cat.key]: {
                                      ...(prefs as any)[cat.key],
                                      [item.key]: { ...row, email: v },
                                    },
                                  });
                                }}
                                disabled={!prefs.enabled}
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
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="flex-1">
                <div className="h-4 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="mt-2 h-3 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="w-11 h-6 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg overflow-hidden animate-pulse">
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              <div className="h-9 w-9 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-4 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="px-5 pb-4 space-y-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center gap-4 py-3">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="h-3 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <div className="w-8 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
