# Feature Flags System

This document describes all feature flags available in the admin panel (`/admin/config`) and their effects on the application.

## Overview

Feature flags are stored in Firestore at `config/feature_flags` and can be toggled via the Admin Config page. Changes take effect within 1 minute (due to client-side caching).

### API Endpoints

- **Admin API (authenticated)**: `GET/PUT /api/admin/config/feature-flags` - Full flag management
- **Public API (no auth)**: `GET /api/config/feature-flags` - Returns public-safe flags only, cached for 1 minute

### Client Hook

```typescript
import { useFeatureFlags } from '@/hooks';

const { flags, loading, error, refetch } = useFeatureFlags();

if (flags.inAppMessaging) {
  // Show messaging UI
}
```

---

## Feature Flags Reference

### 🔴 `maintenanceMode`

**Default:** `false`  
**Category:** Operations  
**Danger:** Yes (red highlight in admin)

**Effect when ON:**
- Shows a maintenance banner in the existing `StickyBanner` via `BannerSwitcher` across public, customer, and driver portals
- Communicates that some actions may be unavailable during maintenance

**Effect when OFF:**
- No maintenance banner from this flag (any manually configured marketing banner still works as usual)

---

### 💬 `inAppMessaging`

**Default:** `true`  
**Category:** Communication

**Effect when ON:**
- "Message Driver" button visible in TripDetailClient
- "Message Driver" button visible in ReservationDetailClient
- `/api/messages/contact-driver` accepts new conversations

**Effect when OFF:**
- "Message Driver" buttons hidden from trip/reservation details
- `/api/messages/contact-driver` returns 503 with code `MESSAGING_DISABLED`
- Existing conversations remain accessible

**Files involved:**
- `components/app/TripDetailClient/index.tsx`
- `components/app/ReservationDetailClient/index.tsx`
- `src/app/api/messages/contact-driver/route.ts`

---

### 🎧 `supportChatEnabled`

**Default:** `true`  
**Category:** Communication

**Effect when ON:**
- Customer support page shows chat form (`/app/profile/support`)
- Driver support page shows chat form (`/driver/profile/support`)
- `/api/messages/contact-support` accepts new conversations

**Effect when OFF:**
- Support pages show alternative contact methods (phone, email, WhatsApp)
- `/api/messages/contact-support` returns 503 with code `SUPPORT_CHAT_DISABLED`
- Existing support conversations remain accessible

**Files involved:**
- `src/app/app/profile/support/page.tsx`
- `src/app/driver/profile/support/page.tsx`
- `src/app/api/messages/contact-support/route.ts`

---

### ⭐ `driverRatings`

**Default:** `true`  
**Category:** Customer Experience

**Effect when ON:**
- Rate Driver modal auto-prompts after completed trips
- `/api/trips/[bookingId]/feedback` accepts ratings
- Driver testimonials are created for positive feedback

**Effect when OFF:**
- Rate Driver modal never auto-prompts
- `/api/trips/[bookingId]/feedback` returns 503 with code `RATINGS_DISABLED`
- No new ratings or testimonials can be submitted

**Files involved:**
- `components/app/TripDetailClient/index.tsx`
- `src/app/api/trips/[bookingId]/feedback/route.ts`

---

### 📣 `promotionalBanners`

**Default:** `true`  
**Category:** Marketing

**Effect when ON:**
- **TODO:** Show promotional banners in apps

**Effect when OFF:**
- **TODO:** Hide promotional banners

---

### 🔔 `pushNotifications`

**Default:** `true`  
**Category:** Communication

**Effect when ON:**
- Customer and driver notification permission cards are visible:
  - `CustomerNotificationPermissionCard` on customer dashboard
  - `NotificationPermissionCard` on driver dashboard
- Existing `useCustomerPushNotifications` / `usePushNotifications` hooks remain active

**Effect when OFF:**
- Notification permission cards are completely hidden (no prompt to enable push)
- Hooks are still present in code but no UI entrypoint is shown

---

### 🔍 `advancedFilters`

**Default:** `false`  
**Category:** Features

**Effect when ON:**
- Currently **no runtime effect**. Flag is stored in Firestore and visible in `/admin/config`, reserved for future advanced search/filter UI.

**Effect when OFF:**
- Same behavior as ON today (standard filtering only). Safe to toggle without side effects.

---

### 🌍 `multiCitySupport`

**Default:** `true`  
**Category:** Operations

**Effect when ON:**
- Current behavior: all configured cities remain available for booking (existing logic already assumes multi-city).

**Effect when OFF:**
- Currently **no additional restriction is enforced by code**. Reserved for a future pass that would hard-enforce a single-city mode.

---

### ⚡ `instantBooking`

**Default:** `false`  
**Category:** Booking Flow

**Effect when ON:**
- Currently **no separate instant-booking flow is wired**. All bookings still follow the existing rental / scheduled flow.

**Effect when OFF:**
- Same behavior as ON today. Reserved for a future instant-booking implementation.

---

### 📅 `scheduledBookingOnly`

**Default:** `true`  
**Category:** Booking Flow

**Effect when ON:**
- Matches the current rental-first booking experience (all flows are effectively scheduled already).

**Effect when OFF:**
- Currently **no relaxed behavior is implemented**. Flag is stored but does not alter booking rules yet.

---

### 💰 `driverTips`

**Default:** `false`  
**Category:** Payments

**Effect when ON:**
- Reserved for a future tipping experience (no tipping UI is rendered yet).

**Effect when OFF:**
- No tipping UI (matches current implementation). Safe to toggle without side effects.

---

### 🏢 `corporateAccounts`

**Default:** `false`  
**Category:** Enterprise

**Effect when ON:**
- **No current runtime effect.** This flag is a placeholder for a future corporate accounts feature set and should be treated as non-functional for now.

**Effect when OFF:**
- Same behavior as ON (no corporate flows exist yet). This matches your requirement that corporate accounts are not being built yet.

---

### 🚀 `newBookingFlow`

**Default:** `true`  
**Category:** UX

**Effect when ON:**
- Aligns with the current rental-first booking experience that is already live.

**Effect when OFF:**
- Currently **no legacy flow fallback is wired**; the app still uses the same booking UX. Reserved for a future split-testing or rollback path.

---

## Implementation Notes

### Adding a New Flag

1. Add to `DEFAULT_FLAGS` in:
   - `src/app/api/admin/config/feature-flags/route.ts`
   - `src/app/api/config/feature-flags/route.ts` (if public)
   - `src/hooks/useFeatureFlags.ts` (if client-side)

2. Add to admin config page:
   - `src/app/admin/config/page.tsx` - Add to `FeatureFlags` interface, `defaultFlags`, and `FLAG_CONFIG`

3. Implement the flag check:
   - **Client:** Use `const { flags } = useFeatureFlags()` and check `flags.yourFlag`
   - **API:** Fetch from Firestore `config/feature_flags` doc

### Best Practices

- Always default to a safe/enabled state when flag fetch fails
- Use 503 status with descriptive error codes when blocking API operations
- Log flag check failures but don't crash
- Cache flags client-side (1 minute TTL) to reduce Firestore reads
- Document the exact effect of each flag state
