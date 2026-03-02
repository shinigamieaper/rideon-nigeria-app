/**
 * Firebase Cloud Messaging (FCM) client utilities
 * For requesting push notification permissions and managing FCM tokens
 */

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as isMessagingSupported,
  type Messaging,
} from "firebase/messaging";
import { getApps, getApp } from "firebase/app";

let messaging: Messaging | null = null;
let messagingSupportCheck: Promise<boolean> | null = null;

async function isFirebaseMessagingSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!messagingSupportCheck) {
    messagingSupportCheck = isMessagingSupported().catch((error) => {
      console.warn("[FCM] Messaging support check failed:", error);
      return false;
    });
  }
  return messagingSupportCheck;
}

/**
 * Get the FCM Messaging instance (client-side only)
 */
function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (messaging) return messaging;

  try {
    const app = getApps().length ? getApp() : null;
    if (!app) {
      console.warn("[FCM] Firebase app not initialized");
      return null;
    }
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.warn("[FCM] Failed to get messaging instance:", error);
    return null;
  }
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permission from the user
 * Returns the permission result
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isPushSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("[FCM] Failed to request permission:", error);
    return "denied";
  }
}

/**
 * Get the FCM token for this device
 * Requires notification permission to be granted
 *
 * @param vapidKey - The VAPID public key from Firebase Console
 * @returns The FCM token or null if unavailable
 */
export async function getFCMToken(vapidKey: string): Promise<string | null> {
  if (!isPushSupported()) {
    console.warn("[FCM] Push notifications not supported");
    return null;
  }

  const supported = await isFirebaseMessagingSupported();
  if (!supported) {
    console.warn("[FCM] Firebase messaging reports unsupported environment");
    return null;
  }

  if (Notification.permission !== "granted") {
    console.warn("[FCM] Notification permission not granted");
    return null;
  }

  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) {
    console.warn("[FCM] Messaging instance not available");
    return null;
  }

  try {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.info("[FCM] Token obtained successfully");
      return token;
    } else {
      console.warn("[FCM] No token returned");
      return null;
    }
  } catch (error) {
    const err = error as { code?: string };
    if (err && err.code === "messaging/unsupported-browser") {
      console.warn("[FCM] Messaging is not supported in this browser");
    } else {
      console.error("[FCM] Failed to get token:", error);
    }
    return null;
  }
}

/**
 * Listen for foreground messages
 * Call this once in your app to handle messages when the app is in focus
 *
 * @param callback - Function to call when a message is received
 * @returns Unsubscribe function
 */
export function onForegroundMessage(
  callback: (payload: {
    notification?: { title?: string; body?: string };
    data?: Record<string, string>;
  }) => void,
): (() => void) | null {
  if (!isPushSupported()) return null;

  let unsubscribe: (() => void) | null = null;

  // Set up listener asynchronously once we know messaging is supported
  void (async () => {
    const supported = await isFirebaseMessagingSupported();
    if (!supported) {
      return;
    }

    const messagingInstance = getMessagingInstance();
    if (!messagingInstance) return;

    unsubscribe = onMessage(messagingInstance, (payload) => {
      console.info("[FCM] Foreground message received:", payload);
      callback(payload);
    });
  })();

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

/**
 * Save FCM token to server for a driver
 */
export async function saveDriverFCMToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("/api/driver/notifications/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.error(
        "[FCM] Failed to save driver token:",
        await response.text(),
      );
      return false;
    }

    console.info("[FCM] Driver token saved to server");
    return true;
  } catch (error) {
    console.error("[FCM] Failed to save driver token:", error);
    return false;
  }
}

/**
 * Save FCM token to server for a customer
 */
export async function saveCustomerFCMToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("/api/customer/notifications/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.error(
        "[FCM] Failed to save customer token:",
        await response.text(),
      );
      return false;
    }

    console.info("[FCM] Customer token saved to server");
    return true;
  } catch (error) {
    console.error("[FCM] Failed to save customer token:", error);
    return false;
  }
}

export async function saveFullTimeDriverFCMToken(
  token: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      "/api/full-time-driver/notifications/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      },
    );

    if (!response.ok) {
      console.error(
        "[FCM] Failed to save full-time driver token:",
        await response.text(),
      );
      return false;
    }

    console.info("[FCM] Full-time driver token saved to server");
    return true;
  } catch (error) {
    console.error("[FCM] Failed to save full-time driver token:", error);
    return false;
  }
}

export async function saveAdminFCMToken(
  token: string,
  idToken?: string,
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const response = await fetch("/api/admin/notifications/register", {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.error("[FCM] Failed to save admin token:", await response.text());
      return false;
    }

    console.info("[FCM] Admin token saved to server");
    return true;
  } catch (error) {
    console.error("[FCM] Failed to save admin token:", error);
    return false;
  }
}

export async function savePartnerFCMToken(
  token: string,
  idToken: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/partner/notifications/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      console.error(
        "[FCM] Failed to save partner token:",
        await response.text(),
      );
      return false;
    }

    console.info("[FCM] Partner token saved to server");
    return true;
  } catch (error) {
    console.error("[FCM] Failed to save partner token:", error);
    return false;
  }
}
