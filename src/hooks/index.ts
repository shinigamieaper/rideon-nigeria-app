// Hooks barrel file

// Feature flags
export { useFeatureFlags } from "./useFeatureFlags";
export type { FeatureFlags, UseFeatureFlagsResult } from "./useFeatureFlags";

// Driver push notifications
export { usePushNotifications } from "./usePushNotifications";
export type {
  UsePushNotificationsResult,
  PushStatus,
} from "./usePushNotifications";

// Customer push notifications
export { useCustomerPushNotifications } from "./useCustomerPushNotifications";
export type { UseCustomerPushNotificationsResult } from "./useCustomerPushNotifications";

// Full-time driver push notifications
export { useFullTimeDriverPushNotifications } from "./useFullTimeDriverPushNotifications";
export type { UseFullTimeDriverPushNotificationsResult } from "./useFullTimeDriverPushNotifications";

// Admin push notifications
export { useAdminPushNotifications } from "./useAdminPushNotifications";
export type { UseAdminPushNotificationsResult } from "./useAdminPushNotifications";

// Partner push notifications
export { usePartnerPushNotifications } from "./usePartnerPushNotifications";
export type { UsePartnerPushNotificationsResult } from "./usePartnerPushNotifications";

// Partner team
export { usePartnerTeam } from "./usePartnerTeam";
export type { PartnerTeamRole, UsePartnerTeamResult } from "./usePartnerTeam";
