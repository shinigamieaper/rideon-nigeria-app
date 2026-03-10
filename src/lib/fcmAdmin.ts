/**
 * Firebase Cloud Messaging - Admin SDK utilities
 * For sending push notifications from the server
 */

import {
  getMessaging,
  type Message,
  type MulticastMessage,
} from "firebase-admin/messaging";
import { getApps, getApp } from "firebase-admin/app";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

/**
 * Get the Admin FCM Messaging instance
 */
function getAdminMessaging() {
  const app = getApps().length ? getApp() : null;
  if (!app) {
    throw new Error("Firebase Admin app not initialized");
  }
  return getMessaging(app);
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION LOGGING FOR ADMIN VISIBILITY
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationLogEntry {
  type: string;
  targetType: "customer" | "driver" | "admin" | "partner";
  targetId: string;
  status: "sent" | "failed" | "skipped" | "no_tokens";
  sentCount: number;
  failedCount: number;
  skippedByPrefs: boolean;
  payload: { title: string; body: string };
  metadata?: Record<string, string>;
  error?: string;
  createdAt: FirebaseFirestore.FieldValue;
}

/**
 * Log a notification attempt to Firestore for admin visibility
 * Non-blocking - errors are logged but don't affect notification delivery
 */
async function logNotification(
  entry: Omit<NotificationLogEntry, "createdAt">,
): Promise<void> {
  try {
    await adminDb.collection("notification_logs").add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Log but don't throw - notification logging should never block delivery
    console.error("[FCM Admin] Failed to log notification:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREFERENCE CHECKING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationPrefs {
  enabled: boolean;
  [category: string]: any;
}

/**
 * Get notification preferences for a driver
 * Returns default preferences if none are found
 */
async function getDriverNotificationPrefs(
  driverId: string,
): Promise<NotificationPrefs> {
  try {
    const driverDoc = await adminDb.collection("drivers").doc(driverId).get();
    if (!driverDoc.exists) {
      return { enabled: true }; // Default to enabled
    }
    const data = driverDoc.data();
    return data?.notificationPreferences || { enabled: true };
  } catch (error) {
    console.warn(
      "[FCM Admin] Failed to fetch driver prefs, using defaults:",
      error,
    );
    return { enabled: true };
  }
}

/**
 * Get notification preferences for a customer
 * Returns default preferences if none are found
 */
async function getCustomerNotificationPrefs(
  customerId: string,
): Promise<NotificationPrefs> {
  try {
    const prefsDoc = await adminDb
      .collection("users")
      .doc(customerId)
      .collection("settings")
      .doc("notifications")
      .get();

    if (!prefsDoc.exists) {
      return { enabled: true }; // Default to enabled
    }
    return (prefsDoc.data() as NotificationPrefs) || { enabled: true };
  } catch (error) {
    console.warn(
      "[FCM Admin] Failed to fetch customer prefs, using defaults:",
      error,
    );
    return { enabled: true };
  }
}

async function getPartnerNotificationPrefs(
  partnerId: string,
): Promise<NotificationPrefs> {
  try {
    const prefsDoc = await adminDb
      .collection("partner_applications")
      .doc(partnerId)
      .collection("settings")
      .doc("notifications")
      .get();

    if (!prefsDoc.exists) {
      return {
        enabled: true,
        fleet: {
          booking_requests: { push: true, email: true, sms: false },
        },
      };
    }

    return (prefsDoc.data() as NotificationPrefs) || { enabled: true };
  } catch (error) {
    console.warn(
      "[FCM Admin] Failed to fetch partner prefs, using defaults:",
      error,
    );
    return {
      enabled: true,
      fleet: {
        booking_requests: { push: true, email: true, sms: false },
      },
    };
  }
}

function isPartnerNotificationEnabled(
  prefs: NotificationPrefs,
  category: string,
  notificationType: string,
  channel: "push" | "email",
): boolean {
  if (!prefs.enabled) return false;

  const categoryPrefs = prefs[category];
  if (!categoryPrefs) return true;

  const typePrefs = (categoryPrefs as any)?.[notificationType];
  if (!typePrefs) return true;

  return (typePrefs as any)?.[channel] !== false;
}

/**
 * Check if a specific notification type is enabled for a driver
 * @param prefs - The driver's notification preferences
 * @param category - The category (e.g., 'trips', 'earnings')
 * @param notificationType - The specific notification type (e.g., 'trip_assigned')
 * @param channel - The channel ('push' or 'email')
 */
function isDriverNotificationEnabled(
  prefs: NotificationPrefs,
  category: string,
  notificationType: string,
  channel: "push" | "email",
): boolean {
  // If master toggle is off, all notifications are disabled
  if (!prefs.enabled) return false;

  // Check specific category and type
  const categoryPrefs = prefs[category];
  if (!categoryPrefs) return true; // Default to enabled if no specific prefs

  const typePrefs = categoryPrefs[notificationType];
  if (!typePrefs) return true; // Default to enabled if no specific prefs

  // Check the specific channel
  return typePrefs[channel] !== false; // Default to true unless explicitly false
}

/**
 * Check if a specific notification type is enabled for a customer
 * @param prefs - The customer's notification preferences
 * @param category - The category (e.g., 'my_trips', 'general')
 * @param notificationType - The specific notification type (e.g., 'driver_assigned')
 * @param channel - The channel ('push' or 'email')
 */
function isCustomerNotificationEnabled(
  prefs: NotificationPrefs,
  category: string,
  notificationType: string,
  channel: "push" | "email",
): boolean {
  // If master toggle is off, all notifications are disabled
  if (!prefs.enabled) return false;

  // Check specific category and type
  const categoryPrefs = prefs[category];
  if (!categoryPrefs) return true; // Default to enabled if no specific prefs

  const typePrefs = categoryPrefs[notificationType];
  if (!typePrefs) return true; // Default to enabled if no specific prefs

  // Check the specific channel
  return typePrefs[channel] !== false; // Default to true unless explicitly false
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  /** Custom data to include with the notification */
  data?: Record<string, string>;
  /** URL to open when notification is clicked */
  clickAction?: string;
}

/**
 * Send a push notification to a specific driver
 *
 * @param driverId - The driver's UID
 * @param payload - The notification content
 * @returns Success status and any errors
 */
export async function sendNotificationToDriver(
  driverId: string,
  payload: NotificationPayload,
): Promise<{ success: boolean; sentCount: number; failedTokens: string[] }> {
  try {
    // Get driver's FCM tokens
    const driverDoc = await adminDb.collection("drivers").doc(driverId).get();
    if (!driverDoc.exists) {
      console.warn(`[FCM Admin] Driver ${driverId} not found`);
      return { success: false, sentCount: 0, failedTokens: [] };
    }

    const driverData = driverDoc.data();
    const tokens: string[] = driverData?.fcmTokens || [];

    if (tokens.length === 0) {
      console.info(`[FCM Admin] No FCM tokens for driver ${driverId}`);

      // Log no-token case for visibility
      await logNotification({
        type: payload.data?.type || "generic",
        targetType: "driver",
        targetId: driverId,
        status: "no_tokens",
        sentCount: 0,
        failedCount: 0,
        skippedByPrefs: false,
        payload: { title: payload.title, body: payload.body },
        metadata: payload.data,
      });

      return { success: true, sentCount: 0, failedTokens: [] };
    }

    const messaging = getAdminMessaging();

    // Build the message
    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icons/driver/icon-192.png",
          badge: payload.badge || "/icons/driver/icon-192.png",
          requireInteraction: true,
        },
        fcmOptions: {
          link: payload.clickAction || "/driver/bookings/new",
        },
      },
      data: {
        ...payload.data,
        clickAction: payload.clickAction || "/driver/bookings/new",
      },
    };

    // Send to all tokens
    const response = await messaging.sendEachForMulticast(message);

    console.info(
      `[FCM Admin] Sent to driver ${driverId}: ${response.successCount} success, ${response.failureCount} failed`,
    );

    // Collect failed tokens for cleanup
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.warn(
          `[FCM Admin] Failed token for ${driverId}:`,
          resp.error?.message,
        );
        // Check if token is invalid/unregistered
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      await cleanupInvalidTokens(driverId, failedTokens);
    }

    // Log the notification attempt
    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "driver",
      targetId: driverId,
      status: response.successCount > 0 ? "sent" : "failed",
      sentCount: response.successCount,
      failedCount: response.failureCount,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
    });

    return {
      success: response.successCount > 0,
      sentCount: response.successCount,
      failedTokens,
    };
  } catch (error) {
    console.error(`[FCM Admin] Error sending to driver ${driverId}:`, error);

    // Log failed attempt
    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "driver",
      targetId: driverId,
      status: "failed",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, sentCount: 0, failedTokens: [] };
  }
}

/**
 * Remove invalid FCM tokens from a driver's document
 */
async function cleanupInvalidTokens(
  driverId: string,
  invalidTokens: string[],
): Promise<void> {
  try {
    const driverRef = adminDb.collection("drivers").doc(driverId);
    const driverDoc = await driverRef.get();

    if (!driverDoc.exists) return;

    const currentTokens: string[] = driverDoc.data()?.fcmTokens || [];
    const validTokens = currentTokens.filter((t) => !invalidTokens.includes(t));

    await driverRef.update({ fcmTokens: validTokens });
    console.info(
      `[FCM Admin] Cleaned up ${invalidTokens.length} invalid tokens for driver ${driverId}`,
    );
  } catch (error) {
    console.error(
      `[FCM Admin] Failed to cleanup tokens for ${driverId}:`,
      error,
    );
  }
}

/**
 * Send a new booking offer notification to a driver
 * Respects driver's notification preferences
 */
export async function sendNewBookingOfferNotification(
  driverId: string,
  bookingDetails: {
    bookingId: string;
    city?: string;
    pickupAddress?: string;
    scheduledTime?: string;
    payout?: number;
  },
): Promise<{ success: boolean; sentCount: number; skippedByPrefs?: boolean }> {
  const { city, pickupAddress, scheduledTime, payout, bookingId } =
    bookingDetails;

  // Check driver's notification preferences
  const prefs = await getDriverNotificationPrefs(driverId);
  if (!isDriverNotificationEnabled(prefs, "trips", "trip_assigned", "push")) {
    console.info(
      `[FCM Admin] Skipping new booking notification for driver ${driverId} - disabled by preferences`,
    );

    // Log skipped notification
    await logNotification({
      type: "new_booking_offer",
      targetType: "driver",
      targetId: driverId,
      status: "skipped",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: true,
      payload: {
        title: "New Booking Request",
        body: "Skipped by user preferences",
      },
      metadata: { bookingId },
    });

    return { success: true, sentCount: 0, skippedByPrefs: true };
  }

  // Build notification text
  let body = "You have a new booking request.";
  if (city && scheduledTime) {
    body = `New trip in ${city} at ${scheduledTime}`;
    if (payout) {
      body += ` • ₦${payout.toLocaleString()}`;
    }
  } else if (pickupAddress) {
    body = `Pickup: ${pickupAddress}`;
    if (payout) {
      body += ` • ₦${payout.toLocaleString()}`;
    }
  }

  const result = await sendNotificationToDriver(driverId, {
    title: "🚗 New Booking Request",
    body,
    data: {
      type: "new_booking_offer",
      bookingId,
    },
    clickAction: "/driver/bookings/new",
  });

  return { success: result.success, sentCount: result.sentCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a push notification to a customer
 */
export async function sendNotificationToCustomer(
  customerId: string,
  payload: NotificationPayload,
): Promise<{ success: boolean; sentCount: number; failedTokens: string[] }> {
  try {
    // Get customer's FCM tokens from users collection
    const userDoc = await adminDb.collection("users").doc(customerId).get();
    if (!userDoc.exists) {
      console.warn(`[FCM Admin] Customer ${customerId} not found`);
      return { success: false, sentCount: 0, failedTokens: [] };
    }

    const userData = userDoc.data();
    const tokens: string[] = userData?.fcmTokens || [];

    if (tokens.length === 0) {
      console.info(`[FCM Admin] No FCM tokens for customer ${customerId}`);

      // Log no-token case for visibility
      await logNotification({
        type: payload.data?.type || "generic",
        targetType: "customer",
        targetId: customerId,
        status: "no_tokens",
        sentCount: 0,
        failedCount: 0,
        skippedByPrefs: false,
        payload: { title: payload.title, body: payload.body },
        metadata: payload.data,
      });

      return { success: true, sentCount: 0, failedTokens: [] };
    }

    const messaging = getAdminMessaging();

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icons/app/icon-192.png",
          badge: payload.badge || "/icons/app/icon-192.png",
        },
        fcmOptions: {
          link: payload.clickAction || "/app/reservations",
        },
      },
      data: {
        ...payload.data,
        clickAction: payload.clickAction || "/app/reservations",
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    console.info(
      `[FCM Admin] Sent to customer ${customerId}: ${response.successCount} success, ${response.failureCount} failed`,
    );

    // Collect failed tokens for cleanup
    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      await cleanupCustomerInvalidTokens(customerId, failedTokens);
    }

    // Log the notification attempt
    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "customer",
      targetId: customerId,
      status: response.successCount > 0 ? "sent" : "failed",
      sentCount: response.successCount,
      failedCount: response.failureCount,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
    });

    return {
      success: response.successCount > 0,
      sentCount: response.successCount,
      failedTokens,
    };
  } catch (error) {
    console.error(
      `[FCM Admin] Error sending to customer ${customerId}:`,
      error,
    );

    // Log failed attempt
    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "customer",
      targetId: customerId,
      status: "failed",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, sentCount: 0, failedTokens: [] };
  }
}

/**
 * Remove invalid FCM tokens from a customer's document
 */
async function cleanupCustomerInvalidTokens(
  customerId: string,
  invalidTokens: string[],
): Promise<void> {
  try {
    const userRef = adminDb.collection("users").doc(customerId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return;

    const currentTokens: string[] = userDoc.data()?.fcmTokens || [];
    const validTokens = currentTokens.filter((t) => !invalidTokens.includes(t));

    await userRef.update({ fcmTokens: validTokens });
    console.info(
      `[FCM Admin] Cleaned up ${invalidTokens.length} invalid tokens for customer ${customerId}`,
    );
  } catch (error) {
    console.error(
      `[FCM Admin] Failed to cleanup tokens for customer ${customerId}:`,
      error,
    );
  }
}

export async function sendNotificationToAdminUser(
  adminUid: string,
  payload: NotificationPayload,
): Promise<{ success: boolean; sentCount: number; failedTokens: string[] }> {
  try {
    const userDoc = await adminDb.collection("users").doc(adminUid).get();
    if (!userDoc.exists) {
      console.warn(`[FCM Admin] Admin user ${adminUid} not found`);
      return { success: false, sentCount: 0, failedTokens: [] };
    }

    const userData = userDoc.data();
    const tokens: string[] = userData?.adminFcmTokens || [];

    if (tokens.length === 0) {
      await logNotification({
        type: payload.data?.type || "generic",
        targetType: "admin",
        targetId: adminUid,
        status: "no_tokens",
        sentCount: 0,
        failedCount: 0,
        skippedByPrefs: false,
        payload: { title: payload.title, body: payload.body },
        metadata: payload.data,
      });

      return { success: true, sentCount: 0, failedTokens: [] };
    }

    const messaging = getAdminMessaging();

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icons/app/icon-192.png",
          badge: payload.badge || "/icons/app/icon-192.png",
          requireInteraction: true,
        },
        fcmOptions: {
          link: payload.clickAction || "/admin/notifications",
        },
      },
      data: {
        ...payload.data,
        clickAction: payload.clickAction || "/admin/notifications",
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      try {
        const currentTokens: string[] = userDoc.data()?.adminFcmTokens || [];
        const validTokens = currentTokens.filter(
          (t) => !failedTokens.includes(t),
        );
        await adminDb
          .collection("users")
          .doc(adminUid)
          .set({ adminFcmTokens: validTokens }, { merge: true });
      } catch (e) {
        console.error(
          `[FCM Admin] Failed to cleanup admin tokens for ${adminUid}:`,
          e,
        );
      }
    }

    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "admin",
      targetId: adminUid,
      status: response.successCount > 0 ? "sent" : "failed",
      sentCount: response.successCount,
      failedCount: response.failureCount,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
    });

    return {
      success: response.successCount > 0,
      sentCount: response.successCount,
      failedTokens,
    };
  } catch (error) {
    console.error(`[FCM Admin] Error sending to admin ${adminUid}:`, error);

    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "admin",
      targetId: adminUid,
      status: "failed",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, sentCount: 0, failedTokens: [] };
  }
}

export async function sendNotificationToPartner(
  partnerId: string,
  payload: NotificationPayload,
): Promise<{ success: boolean; sentCount: number; failedTokens: string[] }> {
  try {
    const partnerRef = adminDb
      .collection("partner_applications")
      .doc(partnerId);
    const partnerDoc = await partnerRef.get();
    if (!partnerDoc.exists) {
      console.warn(`[FCM Admin] Partner ${partnerId} not found`);
      return { success: false, sentCount: 0, failedTokens: [] };
    }

    const partnerData = partnerDoc.data();
    const tokens: string[] = partnerData?.fcmTokens || [];

    if (tokens.length === 0) {
      await logNotification({
        type: payload.data?.type || "generic",
        targetType: "partner",
        targetId: partnerId,
        status: "no_tokens",
        sentCount: 0,
        failedCount: 0,
        skippedByPrefs: false,
        payload: { title: payload.title, body: payload.body },
        metadata: payload.data,
      });

      return { success: true, sentCount: 0, failedTokens: [] };
    }

    const messaging = getAdminMessaging();

    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icons/app/icon-192.png",
          badge: payload.badge || "/icons/app/icon-192.png",
          requireInteraction: true,
        },
        fcmOptions: {
          link: payload.clickAction || "/partner/reservations",
        },
      },
      data: {
        ...payload.data,
        clickAction: payload.clickAction || "/partner/reservations",
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    const failedTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      try {
        const currentTokens: string[] = partnerDoc.data()?.fcmTokens || [];
        const validTokens = currentTokens.filter(
          (t) => !failedTokens.includes(t),
        );
        await partnerRef.set({ fcmTokens: validTokens }, { merge: true });
      } catch (e) {
        console.error(
          `[FCM Admin] Failed to cleanup partner tokens for ${partnerId}:`,
          e,
        );
      }
    }

    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "partner",
      targetId: partnerId,
      status: response.successCount > 0 ? "sent" : "failed",
      sentCount: response.successCount,
      failedCount: response.failureCount,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
    });

    return {
      success: response.successCount > 0,
      sentCount: response.successCount,
      failedTokens,
    };
  } catch (error) {
    console.error(`[FCM Admin] Error sending to partner ${partnerId}:`, error);

    await logNotification({
      type: payload.data?.type || "generic",
      targetType: "partner",
      targetId: partnerId,
      status: "failed",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: false,
      payload: { title: payload.title, body: payload.body },
      metadata: payload.data,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { success: false, sentCount: 0, failedTokens: [] };
  }
}

export async function sendPartnerNewReservationRequestNotification(
  partnerId: string,
  details: {
    bookingId: string;
    city?: string | null;
    pickupAddress?: string | null;
    scheduledPickupTime?: string | null;
    fareNgn?: number | null;
  },
): Promise<{ success: boolean; sentCount: number; skippedByPrefs?: boolean }> {
  const prefs = await getPartnerNotificationPrefs(partnerId);
  if (
    !isPartnerNotificationEnabled(prefs, "fleet", "booking_requests", "push")
  ) {
    await logNotification({
      type: "partner_booking_request",
      targetType: "partner",
      targetId: partnerId,
      status: "skipped",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: true,
      payload: {
        title: "New reservation request",
        body: "Skipped by user preferences",
      },
      metadata: { bookingId: details.bookingId },
    });

    return { success: true, sentCount: 0, skippedByPrefs: true };
  }

  const city = String(details.city || "").trim();
  const pickup = String(details.pickupAddress || "").trim();

  let body = "A new reservation request is available.";
  if (city && pickup) {
    body = `New reservation in ${city} • ${pickup}`;
  } else if (city) {
    body = `New reservation in ${city}`;
  } else if (pickup) {
    body = `New reservation • ${pickup}`;
  }

  if (details.fareNgn && Number.isFinite(details.fareNgn)) {
    body += ` • ₦${Number(details.fareNgn).toLocaleString()}`;
  }

  const result = await sendNotificationToPartner(partnerId, {
    title: "New reservation request",
    body,
    data: {
      type: "partner_booking_request",
      bookingId: details.bookingId,
    },
    clickAction: "/partner/reservations",
  });

  return { success: result.success, sentCount: result.sentCount };
}

export async function sendPartnerSubmissionUpdateNotification(
  partnerId: string,
  details: {
    submissionType: "vehicle" | "driver";
    submissionId: string;
    action: "approved" | "rejected" | "changes_requested";
    title: string;
    message: string;
    clickAction: string;
  },
): Promise<{ success: boolean; sentCount: number; skippedByPrefs?: boolean }> {
  const prefs = await getPartnerNotificationPrefs(partnerId);
  if (
    !isPartnerNotificationEnabled(prefs, "fleet", "submission_updates", "push")
  ) {
    await logNotification({
      type: "partner_submission_update",
      targetType: "partner",
      targetId: partnerId,
      status: "skipped",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: true,
      payload: {
        title: details.title,
        body: "Skipped by user preferences",
      },
      metadata: {
        type: details.submissionType,
        submissionId: details.submissionId,
        action: details.action,
      },
    });
    return { success: true, sentCount: 0, skippedByPrefs: true };
  }

  const result = await sendNotificationToPartner(partnerId, {
    title: details.title,
    body: details.message,
    data: {
      type: "partner_submission_update",
      submissionType: details.submissionType,
      submissionId: details.submissionId,
      action: details.action,
    },
    clickAction: details.clickAction,
  });

  return { success: result.success, sentCount: result.sentCount };
}

/**
 * Send notification when driver is assigned to a booking
 * Respects customer's notification preferences
 */
export async function sendDriverAssignedNotification(
  customerId: string,
  details: {
    bookingId: string;
    driverName?: string;
    scheduledTime?: string;
  },
): Promise<{ success: boolean; sentCount: number; skippedByPrefs?: boolean }> {
  const { driverName, scheduledTime, bookingId } = details;

  // Check customer's notification preferences
  const prefs = await getCustomerNotificationPrefs(customerId);
  if (
    !isCustomerNotificationEnabled(prefs, "my_trips", "driver_assigned", "push")
  ) {
    console.info(
      `[FCM Admin] Skipping driver assigned notification for customer ${customerId} - disabled by preferences`,
    );

    // Log skipped notification
    await logNotification({
      type: "driver_assigned",
      targetType: "customer",
      targetId: customerId,
      status: "skipped",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: true,
      payload: {
        title: "Driver Assigned",
        body: "Skipped by user preferences",
      },
      metadata: { bookingId },
    });

    return { success: true, sentCount: 0, skippedByPrefs: true };
  }

  let body = "A driver has been assigned to your booking.";
  if (driverName) {
    body = `${driverName} has been assigned to your booking`;
    if (scheduledTime) {
      body += ` for ${scheduledTime}`;
    }
  }

  const result = await sendNotificationToCustomer(customerId, {
    title: "✅ Driver Assigned",
    body,
    data: {
      type: "driver_assigned",
      bookingId,
    },
    clickAction: `/app/reservations/${bookingId}`,
  });

  return { success: result.success, sentCount: result.sentCount };
}

/**
 * Send notification when driver is en route
 * Respects customer's notification preferences
 */
export async function sendDriverEnRouteNotification(
  customerId: string,
  details: {
    bookingId: string;
    driverName?: string;
    eta?: string;
  },
): Promise<{ success: boolean; sentCount: number; skippedByPrefs?: boolean }> {
  const { driverName, eta, bookingId } = details;

  // Check customer's notification preferences
  const prefs = await getCustomerNotificationPrefs(customerId);
  if (
    !isCustomerNotificationEnabled(prefs, "my_trips", "driver_en_route", "push")
  ) {
    console.info(
      `[FCM Admin] Skipping driver en route notification for customer ${customerId} - disabled by preferences`,
    );

    // Log skipped notification
    await logNotification({
      type: "driver_en_route",
      targetType: "customer",
      targetId: customerId,
      status: "skipped",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: true,
      payload: {
        title: "Driver En Route",
        body: "Skipped by user preferences",
      },
      metadata: { bookingId },
    });

    return { success: true, sentCount: 0, skippedByPrefs: true };
  }

  let body = "Your driver is on the way!";
  if (driverName) {
    body = `${driverName} is on the way`;
    if (eta) {
      body += ` • ETA: ${eta}`;
    }
  }

  const result = await sendNotificationToCustomer(customerId, {
    title: "🚗 Driver En Route",
    body,
    data: {
      type: "driver_en_route",
      bookingId,
    },
    clickAction: `/app/reservations/${bookingId}`,
  });

  return { success: result.success, sentCount: result.sentCount };
}

/**
 * Send notification when trip is completed
 * Respects customer's notification preferences
 * Note: Uses trip_confirmation preferences as trip_completed shares similar importance
 */
export async function sendTripCompletedNotification(
  customerId: string,
  details: {
    bookingId: string;
    fare?: number;
  },
): Promise<{ success: boolean; sentCount: number; skippedByPrefs?: boolean }> {
  const { fare, bookingId } = details;

  // Check customer's notification preferences
  // Using trip_confirmation preference as trip completion is equally important
  const prefs = await getCustomerNotificationPrefs(customerId);
  if (
    !isCustomerNotificationEnabled(
      prefs,
      "my_trips",
      "trip_confirmation",
      "push",
    )
  ) {
    console.info(
      `[FCM Admin] Skipping trip completed notification for customer ${customerId} - disabled by preferences`,
    );

    // Log skipped notification
    await logNotification({
      type: "trip_completed",
      targetType: "customer",
      targetId: customerId,
      status: "skipped",
      sentCount: 0,
      failedCount: 0,
      skippedByPrefs: true,
      payload: { title: "Trip Completed", body: "Skipped by user preferences" },
      metadata: { bookingId },
    });

    return { success: true, sentCount: 0, skippedByPrefs: true };
  }

  let body = "Your trip has been completed. Thank you for riding with RideOn!";
  if (fare) {
    body = `Trip completed • ₦${fare.toLocaleString()}. Rate your driver!`;
  }

  const result = await sendNotificationToCustomer(customerId, {
    title: "🎉 Trip Completed",
    body,
    data: {
      type: "trip_completed",
      bookingId,
    },
    clickAction: `/app/reservations/${bookingId}`,
  });

  return { success: result.success, sentCount: result.sentCount };
}
