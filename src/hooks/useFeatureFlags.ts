"use client";

import { useState, useEffect, useCallback } from "react";

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 2500;
  const { timeoutMs: _timeoutMs, ...rest } = init || {};

  if ((rest as any).signal) {
    return await fetch(input, rest);
  }

  const controller = new AbortController();
  const t = setTimeout(() => {
    try {
      controller.abort(
        new DOMException(`Timed out after ${timeoutMs}ms`, "TimeoutError"),
      );
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Feature flags returned by the public endpoint.
 * These are safe to expose to the client and control UI/UX behavior.
 */
export interface FeatureFlags {
  /** Show maintenance banner and block operations */
  maintenanceMode: boolean;
  /** Enable in-app messaging between customers and drivers */
  inAppMessaging: boolean;
  /** Enable support chat feature */
  supportChatEnabled: boolean;
  /** Enable push notification prompts and registration */
  pushNotifications: boolean;
  /** Allow customers to rate drivers */
  driverRatings: boolean;
  /** Enable multi-city booking support */
  multiCitySupport: boolean;
  /** Enable instant (on-demand) booking */
  instantBooking: boolean;
  /** Restrict to scheduled/pre-booked only */
  scheduledBookingOnly: boolean;
  /** Allow customers to tip drivers */
  driverTips: boolean;
}

export interface UseFeatureFlagsResult {
  /** Current feature flags */
  flags: FeatureFlags;
  /** Whether flags are still loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refetch flags */
  refetch: () => Promise<void>;
}

// Default flags to use before fetch completes or on error
const DEFAULT_FLAGS: FeatureFlags = {
  maintenanceMode: false,
  inAppMessaging: true,
  supportChatEnabled: true,
  pushNotifications: true,
  driverRatings: true,
  multiCitySupport: true,
  instantBooking: false,
  scheduledBookingOnly: true,
  driverTips: false,
};

// In-memory cache to avoid refetching on every component mount
let cachedFlags: FeatureFlags | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60_000; // 1 minute cache

/**
 * Hook to fetch and use feature flags.
 * Caches flags in memory for 1 minute to reduce API calls.
 * Falls back to safe defaults on error.
 */
export function useFeatureFlags(): UseFeatureFlagsResult {
  const [flags, setFlags] = useState<FeatureFlags>(
    cachedFlags ?? DEFAULT_FLAGS,
  );
  const [loading, setLoading] = useState(
    !cachedFlags || Date.now() - cacheTimestamp > CACHE_TTL_MS,
  );
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    // Check cache first
    if (cachedFlags && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      setFlags(cachedFlags);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetchWithTimeout("/api/config/feature-flags", {
        cache: "no-store",
        timeoutMs: 2500,
      });

      if (!res.ok) {
        throw new Error("Failed to fetch feature flags");
      }

      const data = await res.json();
      const fetchedFlags: FeatureFlags = {
        maintenanceMode:
          data.flags?.maintenanceMode ?? DEFAULT_FLAGS.maintenanceMode,
        inAppMessaging:
          data.flags?.inAppMessaging ?? DEFAULT_FLAGS.inAppMessaging,
        supportChatEnabled:
          data.flags?.supportChatEnabled ?? DEFAULT_FLAGS.supportChatEnabled,
        pushNotifications:
          data.flags?.pushNotifications ?? DEFAULT_FLAGS.pushNotifications,
        driverRatings: data.flags?.driverRatings ?? DEFAULT_FLAGS.driverRatings,
        multiCitySupport:
          data.flags?.multiCitySupport ?? DEFAULT_FLAGS.multiCitySupport,
        instantBooking:
          data.flags?.instantBooking ?? DEFAULT_FLAGS.instantBooking,
        scheduledBookingOnly:
          data.flags?.scheduledBookingOnly ??
          DEFAULT_FLAGS.scheduledBookingOnly,
        driverTips: data.flags?.driverTips ?? DEFAULT_FLAGS.driverTips,
      };

      // Update cache
      cachedFlags = fetchedFlags;
      cacheTimestamp = Date.now();

      setFlags(fetchedFlags);
    } catch (err) {
      console.warn(
        "[useFeatureFlags] Failed to fetch flags, using defaults",
        err,
      );
      setError(err instanceof Error ? err.message : "Unknown error");
      // Keep using cached or default flags
      setFlags(cachedFlags ?? DEFAULT_FLAGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  return {
    flags,
    loading,
    error,
    refetch: fetchFlags,
  };
}
