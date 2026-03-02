"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFCMToken,
  saveCustomerFCMToken,
  onForegroundMessage,
} from "@/lib/fcm";

export type PushStatus =
  | "loading"
  | "unsupported"
  | "prompt"
  | "granted"
  | "denied"
  | "error";

export interface UseCustomerPushNotificationsResult {
  /** Current status of push notifications */
  status: PushStatus;
  /** Whether push is available and permission is granted */
  isEnabled: boolean;
  /** Request permission and register for push notifications */
  enablePush: () => Promise<boolean>;
  /** Error message if any */
  error: string | null;
}

// VAPID key from Firebase Console
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

/**
 * Hook to manage push notifications for customers
 */
export function useCustomerPushNotifications(): UseCustomerPushNotificationsResult {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Check initial permission status
  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }

    const permission = getNotificationPermission();
    if (permission === "unsupported") {
      setStatus("unsupported");
    } else if (permission === "granted") {
      setStatus("granted");
    } else if (permission === "denied") {
      setStatus("denied");
    } else {
      setStatus("prompt");
    }
  }, []);

  // Set up foreground message handler when granted
  useEffect(() => {
    if (status !== "granted") return;

    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || "RideOn";
      const body = payload.notification?.body || "";

      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icons/app/icon-192.png" });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [status]);

  // Register token when user is authenticated and permission is granted
  useEffect(() => {
    if (status !== "granted" || !VAPID_KEY) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const token = await getFCMToken(VAPID_KEY);
        if (token) {
          await saveCustomerFCMToken(token);
        }
      } catch (err) {
        console.error(
          "[useCustomerPushNotifications] Failed to register token:",
          err,
        );
      }
    });

    return () => unsubscribe();
  }, [status]);

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      setError("Push notifications are not supported in this browser");
      return false;
    }

    if (!VAPID_KEY) {
      setStatus("error");
      setError("Push notifications are not configured");
      return false;
    }

    try {
      setStatus("loading");
      setError(null);

      const permission = await requestNotificationPermission();

      if (permission === "denied") {
        setStatus("denied");
        setError(
          "Notification permission was denied. Enable it in browser settings.",
        );
        return false;
      }

      if (permission !== "granted") {
        setStatus("prompt");
        return false;
      }

      const token = await getFCMToken(VAPID_KEY);
      if (!token) {
        setStatus("error");
        setError("Failed to get notification token");
        return false;
      }

      const saved = await saveCustomerFCMToken(token);
      if (!saved) {
        setStatus("error");
        setError("Failed to save notification token");
        return false;
      }

      setStatus("granted");
      return true;
    } catch (err) {
      console.error("[useCustomerPushNotifications] enablePush failed:", err);
      setStatus("error");
      setError("An error occurred while enabling notifications");
      return false;
    }
  }, []);

  return {
    status,
    isEnabled: status === "granted",
    enablePush,
    error,
  };
}

export default useCustomerPushNotifications;
