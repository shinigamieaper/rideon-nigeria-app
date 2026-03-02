"use client";

import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getFCMToken,
  getNotificationPermission,
  isPushSupported,
  onForegroundMessage,
  requestNotificationPermission,
  saveAdminFCMToken,
} from "@/lib/fcm";

export type PushStatus =
  | "loading"
  | "unsupported"
  | "prompt"
  | "granted"
  | "denied"
  | "error";

export interface UseAdminPushNotificationsResult {
  status: PushStatus;
  isEnabled: boolean;
  enablePush: () => Promise<boolean>;
  error: string | null;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

export function useAdminPushNotifications(): UseAdminPushNotificationsResult {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (status !== "granted") return;

    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || "RideOn Admin";
      const body = payload.notification?.body || "";

      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icons/app/icon-192.png" });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [status]);

  useEffect(() => {
    if (status !== "granted" || !VAPID_KEY) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const token = await getFCMToken(VAPID_KEY);
        if (token) {
          const idToken = await user.getIdToken();
          await saveAdminFCMToken(token, idToken);
        }
      } catch (err) {
        console.error(
          "[useAdminPushNotifications] Failed to register token:",
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

      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : undefined;
      const saved = await saveAdminFCMToken(token, idToken);
      if (!saved) {
        setStatus("error");
        setError("Failed to save notification token");
        return false;
      }

      setStatus("granted");
      return true;
    } catch (err) {
      console.error("[useAdminPushNotifications] enablePush failed:", err);
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

export default useAdminPushNotifications;
