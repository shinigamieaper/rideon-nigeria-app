"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import {
  Megaphone,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Bell,
  MessageSquare,
  Headphones,
  Users,
  Filter,
  MapPin,
  Zap,
  Calendar,
  DollarSign,
  Building,
  AlertTriangle,
} from "lucide-react";

interface FeatureFlags {
  maintenanceMode: boolean;
  newBookingFlow: boolean;
  driverRatings: boolean;
  promotionalBanners: boolean;
  pushNotifications: boolean;
  inAppMessaging: boolean;
  supportChatEnabled: boolean;
  advancedFilters: boolean;
  multiCitySupport: boolean;
  instantBooking: boolean;
  scheduledBookingOnly: boolean;
  driverTips: boolean;
  corporateAccounts: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

const defaultFlags: FeatureFlags = {
  maintenanceMode: false,
  newBookingFlow: true,
  driverRatings: true,
  promotionalBanners: true,
  pushNotifications: true,
  inAppMessaging: true,
  supportChatEnabled: true,
  advancedFilters: false,
  multiCitySupport: true,
  instantBooking: false,
  scheduledBookingOnly: true,
  driverTips: false,
  corporateAccounts: false,
};

const FLAG_CONFIG = [
  {
    key: "maintenanceMode",
    label: "Maintenance Mode",
    description: "Show maintenance message to all users",
    icon: AlertTriangle,
    danger: true,
  },
  {
    key: "newBookingFlow",
    label: "New Booking Flow",
    description: "Enable the updated booking experience",
    icon: Zap,
  },
  {
    key: "driverRatings",
    label: "Driver Ratings",
    description: "Allow customers to rate drivers",
    icon: Users,
  },
  {
    key: "promotionalBanners",
    label: "Promotional Banners",
    description: "Show promotional content across apps",
    icon: Megaphone,
  },
  {
    key: "pushNotifications",
    label: "Push Notifications",
    description: "Enable push notification delivery",
    icon: Bell,
  },
  {
    key: "inAppMessaging",
    label: "In-App Messaging",
    description: "Allow driver-customer chat",
    icon: MessageSquare,
  },
  {
    key: "supportChatEnabled",
    label: "Support Chat",
    description: "Allow customers/drivers to chat with support",
    icon: Headphones,
  },
  {
    key: "advancedFilters",
    label: "Advanced Filters",
    description: "Enable advanced search filters",
    icon: Filter,
  },
  {
    key: "multiCitySupport",
    label: "Multi-City Support",
    description: "Allow bookings across cities",
    icon: MapPin,
  },
  {
    key: "instantBooking",
    label: "Instant Booking",
    description: "Enable immediate ride requests",
    icon: Zap,
  },
  {
    key: "scheduledBookingOnly",
    label: "Scheduled Only",
    description: "Restrict to advance bookings",
    icon: Calendar,
  },
  {
    key: "driverTips",
    label: "Driver Tips",
    description: "Allow customers to tip drivers",
    icon: DollarSign,
  },
  {
    key: "corporateAccounts",
    label: "Corporate Accounts",
    description: "Enable business account features",
    icon: Building,
  },
];

export default function ConfigPage() {
  // Feature flags state
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flagsSaving, setFlagsSaving] = useState(false);
  const [flagsSuccess, setFlagsSuccess] = useState(false);
  const [flagsError, setFlagsError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setFlagsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/config/feature-flags", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch feature flags");
        return;
      }

      const data = await res.json();
      if (data.flags) {
        setFlags(data.flags);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFlagsLoading(false);
    }
  }, []);

  const saveFlags = useCallback(async () => {
    try {
      setFlagsSaving(true);
      setFlagsSuccess(false);
      setFlagsError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/config/feature-flags", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(flags),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save flags");
      }

      setFlagsSuccess(true);
      setTimeout(() => setFlagsSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save flags";
      setFlagsError(message);
    } finally {
      setFlagsSaving(false);
    }
  }, [flags]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchFlags();
      }
    });
    return () => unsubscribe();
  }, [fetchFlags]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Config & Content
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Feature flags
              </p>
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Feature Flags
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Toggle features across all platforms
              </p>
            </div>
            <button
              onClick={saveFlags}
              disabled={flagsSaving || flagsLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50"
            >
              {flagsSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : flagsSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {flagsSuccess ? "Saved!" : "Save Changes"}
            </button>
          </div>

          {flagsError && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{flagsError}</span>
            </div>
          )}

          {flagsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Maintenance Mode - Special Warning */}
              {flags.maintenanceMode && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <strong>Maintenance Mode is ON.</strong> Users will see a
                    maintenance message and cannot access the app.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FLAG_CONFIG.map((flagConfig) => {
                  const Icon = flagConfig.icon;
                  const isEnabled = flags[
                    flagConfig.key as keyof FeatureFlags
                  ] as boolean;
                  const isDanger = flagConfig.danger;

                  return (
                    <div
                      key={flagConfig.key}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isDanger && isEnabled
                          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                          : isEnabled
                            ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isDanger && isEnabled
                              ? "bg-red-100 dark:bg-red-900/30"
                              : isEnabled
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-slate-100 dark:bg-slate-800"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              isDanger && isEnabled
                                ? "text-red-600 dark:text-red-400"
                                : isEnabled
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-slate-500 dark:text-slate-400"
                            }`}
                          />
                        </div>
                        <div>
                          <p
                            className={`font-medium text-sm ${
                              isDanger && isEnabled
                                ? "text-red-700 dark:text-red-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {flagConfig.label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {flagConfig.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setFlags({ ...flags, [flagConfig.key]: !isEnabled })
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isDanger && isEnabled
                            ? "bg-red-500"
                            : isEnabled
                              ? "bg-green-500"
                              : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            isEnabled ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Last Updated */}
              {flags.updatedAt && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-right mt-4">
                  Last updated: {new Date(flags.updatedAt).toLocaleString()} by{" "}
                  {flags.updatedBy}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
