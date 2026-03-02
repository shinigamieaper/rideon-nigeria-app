"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { waitForUser } from "@/lib/firebase";
import { StickyBanner } from "@/components";
import {
  Bell,
  BellOff,
  Car,
  Wallet,
  Briefcase,
  MessageSquare,
  Mail,
  Smartphone,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DriverNotificationTogglesProps
  extends React.ComponentPropsWithoutRef<"div"> {}

// Driver-specific notification spec
const SPEC = [
  {
    key: "trips",
    title: "Reservations & Assignments",
    icon: Car,
    items: [
      {
        key: "trip_assigned",
        title: "Reservation Assigned",
        desc: "New reservation has been assigned to you.",
        channels: { push: true, email: false },
      },
      {
        key: "trip_reminder",
        title: "Pickup Reminder",
        desc: "Reminder 30 minutes before pickup.",
        channels: { push: true, email: false },
      },
      {
        key: "booking_cancelled",
        title: "Booking Cancelled",
        desc: "Customer cancelled a booking.",
        channels: { push: true, email: true },
      },
      {
        key: "trip_completed",
        title: "Reservation Completed",
        desc: "Reservation marked as completed.",
        channels: { push: false, email: false },
      },
    ],
  },
  {
    key: "earnings",
    title: "Earnings & Payments",
    icon: Wallet,
    items: [
      {
        key: "payout_processed",
        title: "Payout Processed",
        desc: "Weekly payout has been processed.",
        channels: { push: true, email: true },
      },
      {
        key: "earnings_milestone",
        title: "Earnings Milestone",
        desc: "You've reached an earnings milestone.",
        channels: { push: true, email: false },
      },
      {
        key: "contract_payment_received",
        title: "Contract Payment Received",
        desc: "Monthly contract payment received.",
        channels: { push: false, email: true },
      },
    ],
  },
  {
    key: "general",
    title: "General & Messages",
    icon: MessageSquare,
    items: [
      {
        key: "new_message",
        title: "New Message",
        desc: "Message from a client or support.",
        channels: { push: true, email: true },
      },
      {
        key: "platform_updates",
        title: "Platform Updates",
        desc: "Important news about RideOn.",
        channels: { push: false, email: true },
      },
      {
        key: "rating_received",
        title: "Rating Received",
        desc: "Customer rated your service.",
        channels: { push: true, email: false },
      },
    ],
  },
] as const;

/** Reusable toggle switch component */
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

export default function DriverNotificationToggles({
  className,
  ...rest
}: DriverNotificationTogglesProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [prefs, setPrefs] = React.useState<Prefs>(() => defaultsFromSpec());

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const user = await waitForUser();
        const token = await user.getIdToken();
        const res = await fetch("/api/drivers/me/notifications", {
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
      const res = await fetch("/api/drivers/me/notifications", {
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

  const [saving, setSaving] = React.useState(false);

  async function saveWithFeedback(updated: Prefs) {
    setSaving(true);
    await save(updated);
    setSaving(false);
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

      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-[#00529B] px-4 py-2 text-sm text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {/* Master toggle */}
          <motion.div
            className={cn(
              "relative overflow-hidden rounded-2xl backdrop-blur-lg border shadow-lg p-5",
              prefs.enabled
                ? "bg-gradient-to-r from-[#00529B]/10 to-[#0077E6]/10 border-[#00529B]/30"
                : "bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/60",
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{
              y: -2,
              boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Background decoration */}
            <motion.div
              className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#00529B]/8 to-[#0077E6]/8 pointer-events-none"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 6, repeat: Infinity }}
            />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                    prefs.enabled
                      ? "bg-[#00529B]/20"
                      : "bg-slate-200/70 dark:bg-slate-800/70",
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                >
                  <AnimatePresence mode="wait">
                    {prefs.enabled ? (
                      <motion.div
                        key="bell-on"
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 30 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Bell className="h-6 w-6 text-[#00529B]" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="bell-off"
                        initial={{ scale: 0, rotate: 30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -30 }}
                        transition={{ duration: 0.2 }}
                      >
                        <BellOff className="h-6 w-6 text-slate-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {prefs.enabled
                      ? "Notifications Enabled"
                      : "Notifications Disabled"}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {prefs.enabled
                      ? "Stay updated on your assignments and earnings"
                      : "Turn on to receive important updates"}
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
          </motion.div>

          {/* Category sections */}
          {SPEC.map((cat, catIndex) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.key}
                className={cn(
                  "relative overflow-hidden rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-opacity",
                  !prefs.enabled && "opacity-60",
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + catIndex * 0.08 }}
                whileHover={{
                  y: -2,
                  boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.1)",
                }}
              >
                {/* Category header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  <motion.div
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00529B]/10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      delay: 0.15 + catIndex * 0.08,
                    }}
                  >
                    <Icon className="h-5 w-5 text-[#00529B]" />
                  </motion.div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {cat.title}
                  </h3>
                </div>

                {/* Items */}
                <div className="px-5 pb-2">
                  {cat.items.map((item, idx) => {
                    const row = (prefs as any)[cat.key]?.[item.key] || {};
                    const isLast = idx === cat.items.length - 1;
                    const hasChannels =
                      item.channels.push || item.channels.email;

                    if (!hasChannels) return null; // Skip items with no channels

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
              </motion.div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {/* Master toggle skeleton */}
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

          {/* Category skeletons */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg overflow-hidden animate-pulse"
            >
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
          ))}
        </div>
      )}
    </div>
  );
}
