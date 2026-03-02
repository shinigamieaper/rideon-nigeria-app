"use client";

import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFCMToken,
  saveDriverFCMToken,
  onForegroundMessage,
} from "@/lib/fcm";

export type PushStatus =
  | "loading"
  | "unsupported"
  | "prompt"
  | "granted"
  | "denied"
  | "error";

export interface UsePushNotificationsResult {
  /** Current status of push notifications */
  status: PushStatus;
  /** Whether push is available and permission is granted */
  isEnabled: boolean;
  /** Request permission and register for push notifications */
  enablePush: () => Promise<boolean>;
  /** Error message if any */
  error: string | null;
}

// VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

/**
 * Hook to manage push notifications for drivers
 * Handles permission requests, token registration, and foreground message handling
 */
export function usePushNotifications(): UsePushNotificationsResult {
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
      // Show a toast or in-app notification for foreground messages
      const title = payload.notification?.title || "New Notification";
      const body = payload.notification?.body || "";

      // You could integrate with a toast library here
      // For now, show a native notification if the app is in focus
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icons/driver/icon-192.png" });
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
          await saveDriverFCMToken(token);
        }
      } catch (err) {
        console.error("[usePushNotifications] Failed to register token:", err);
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

      // Request permission
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

      // Get and save token
      const token = await getFCMToken(VAPID_KEY);
      if (!token) {
        setStatus("error");
        setError("Failed to get notification token");
        return false;
      }

      const saved = await saveDriverFCMToken(token);
      if (!saved) {
        setStatus("error");
        setError("Failed to save notification token");
        return false;
      }

      setStatus("granted");
      return true;
    } catch (err) {
      console.error("[usePushNotifications] enablePush failed:", err);
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

export default usePushNotifications;
