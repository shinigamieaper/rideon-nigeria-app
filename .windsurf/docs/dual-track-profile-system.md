# Dual-Track Driver Profile System

## Overview

The driver portal implements a sophisticated dual-track system to support two distinct driver career paths:

1. **Fleet Track (Drive With Us)** - Pre-booked ride drivers
2. **Placement Track (Get Hired)** - Full-time employment marketplace drivers

This document explains how the profile system works, access control, and the verification flow.

---

## Architecture

### Data Structure

#### Users Collection (`users/{uid}`)
```typescript
{
  _id: string;              // Firebase UID
  role: 'driver';
  driverTrack: 'fleet' | 'placement';  // Set at registration
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Drivers Collection (`drivers/{uid}`)
```typescript
{
  userId: string;           // References users._id
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended';
  placementStatus: 'available' | 'interviewing' | 'on_contract';
  placementOptIn: boolean;  // Fleet: false by default; Placement: true always
  rideOnVerified: boolean;  // Admin-controlled; gates marketplace visibility
  experienceYears: number;
  professionalSummary: string;  // Public profile content
  
  // Fleet-specific
  vehicle?: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
  documents?: {
    driversLicenseUrl: string;
    lasdriCardUrl: string;
    vehicleRegistrationUrl: string;
  };
  
  // Placement-specific
  placementPreferences?: {
    preferredCity: string;
    salaryExpectation: number;
    backgroundConsent: boolean;
    reference?: { name: string; phone: string; };
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Registration Flows

### Fleet Track Registration

**Route:** `/register/driver` (default) or `/register/driver?track=fleet`

**Flow:**
1. Step 1: Personal Information (name, email, phone, experience)
2. Step 2: Vehicle Details (make, model, year, license plate)
3. Step 3: Document Upload (license, LASDRI card, proof of ownership)
4. Step 4: Review & Submit

**API:** `POST /api/auth/register-driver`

**Data Created:**
- `users/{uid}` with `driverTrack: 'fleet'`
- `drivers/{uid}` with:
  - `placementOptIn: false`
  - `rideOnVerified: false`
  - `professionalSummary: ''`
  - Vehicle + documents data

**Dashboard Access:** Fleet-focused (trips, earnings, online toggle)

---

### Placement Track Registration

**Route:** `/register/driver?track=placement`

**Flow:**
1. Step 1: Personal Information (same as fleet)
2. Step 2: Profile Details (preferred city, salary, professional summary)
3. Step 3: Consent & Reference (background check consent, optional reference)
4. Step 4: Review & Submit

**API:** `POST /api/placement/apply`

**Data Created:**
- `users/{uid}` with `driverTrack: 'placement'`
- `drivers/{uid}` with:
  - `placementOptIn: true` (automatic)
  - `rideOnVerified: false`
  - `professionalSummary: <from form>`
  - `placementPreferences: {...}`
  - No vehicle/documents

**Dashboard Access:** Placement-focused (application status, profile completeness)

---

## Public Profile System

### Purpose
The Public Profile is **exclusively a feature of the "Hire a Full-Time Driver" marketplace**. It serves as a driver's resume/storefront for potential clients.

### Access Control

#### Placement-Track Drivers
- **Access:** Immediate from day one
- **Content:** Pre-populated from registration (professional summary, experience)
- **Visibility:** Public profile becomes visible in marketplace **only after** admin verification (`rideOnVerified: true`)

#### Fleet-Track Drivers
- **Access:** Requires explicit opt-in
- **Opt-in Location:** `/driver/profile/settings`
- **Content:** Must be manually created after opting in
- **Visibility:** Same verification requirement as placement drivers

#### Enforcement
- **API:** `GET/PUT /api/drivers/me/public-profile` returns `403 Forbidden` for fleet drivers with `placementOptIn: false`
- **UI:** Shows informational banner with link to settings page

---

## Opt-In Mechanism (Fleet Drivers Only)

### Settings Page
**Route:** `/driver/profile/settings`

**Features:**
- Toggle switch for "Placement Marketplace Opt-In"
- Visual indicators:
  - Track badge (Fleet vs Placement)
  - Verification status badge (when opted-in)
  - Pending verification notice
- Link to manage public profile (when opted-in)

**API:** `PUT /api/drivers/me/settings`

**Behavior:**
- Placement-track drivers cannot toggle (always opted-in)
- Fleet drivers can toggle on/off anytime
- When enabled: grants access to `/driver/profile/public-profile`
- When disabled: revokes access, hides profile from marketplace

---

## Verification & Marketplace Visibility

### RideOn Verified Badge

**Purpose:** Trust signal that driver has passed platform vetting

**Criteria (managed by admins):**
- Background check completed
- Driver's license verified
- LASDRI card verified (if applicable)
- References checked (placement drivers)
- Professional summary approved

**Implementation:**
- Field: `drivers/{uid}.rideOnVerified: boolean`
- Set by: Admin panel (to be built)
- Initial state: `false` for all new drivers

### Marketplace Query Logic

**API:** `GET /api/drivers/available`

**Query:**
```typescript
db.collection('drivers')
  .where('placementOptIn', '==', true)      // Opted into marketplace
  .where('rideOnVerified', '==', true)      // Verified by RideOn
  .where('placementStatus', '==', 'available') // Not on contract
  .where('status', '==', 'approved')        // Admin approved
  .limit(50)
```

**Required Firestore Index:**
- Collection: `drivers`
- Fields: `placementOptIn ASC`, `rideOnVerified ASC`, `placementStatus ASC`, `status ASC`

**Result:** Only drivers who meet ALL criteria appear in public marketplace

---

## Dashboard Behavior

### Fleet Dashboard (`/driver`)

**Conditional Rendering:**
- If `placementOptIn: false`: Show fleet-only cards (trips, earnings, online toggle)
- If `placementOptIn: true`: Show fleet cards + PlacementCard component

**PlacementCard States:**
- `available`: "Looking for full-time work?" → Link to public profile
- `interviewing`: "New interview request!" → Link to opportunities
- `on_contract`: "Current Contract" → Link to contract details

### Placement Dashboard (`/driver`)

**Always Shows:**
- ApplicationStatusTracker (pending_review → approved flow)
- ProfileCompletenessCard (encourage profile optimization)
- PlacementCard (same states as above)

---

## User Flows

### Scenario 1: Fleet Driver Wants Full-Time Work

1. Driver registers via fleet track (`track=fleet`)
2. Completes vehicle/document upload
3. Works on pre-booked rides
4. Navigates to `/driver/profile/settings`
5. Toggles "Placement Marketplace Opt-In" to ON
6. System grants access to `/driver/profile/public-profile`
7. Driver creates professional summary and updates profile
8. Admin reviews application → sets `rideOnVerified: true`
9. Profile now visible in marketplace at `/app/hiring/discover`
10. Clients can request interviews

### Scenario 2: Placement-Only Applicant

1. Driver registers via placement track (`track=placement`)
2. Provides profile details, salary expectations, reference
3. Professional summary pre-populated from registration
4. Dashboard shows application status + profile completeness
5. `placementOptIn` is `true` by default (cannot be disabled)
6. Immediate access to `/driver/profile/public-profile`
7. Admin reviews application → sets `rideOnVerified: true`
8. Profile now visible in marketplace
9. Clients can request interviews

### Scenario 3: Fleet Driver Who Doesn't Want Full-Time Work

1. Driver registers via fleet track
2. Completes vehicle/document upload
3. Works on pre-booked rides
4. Navigates to `/driver/profile/public-profile` by mistake
5. Sees informational banner: "Enable Placement Marketplace"
6. Can ignore it and continue with fleet work
7. Profile remains invisible in marketplace
8. Never shows in `/app/hiring/discover` results

---

## Security & Privacy

### Access Control Rules

**Public Profile API:**
- Fleet drivers with `placementOptIn: false` → **403 Forbidden**
- All others → **200 OK** with profile data

**Marketplace Visibility:**
- Only drivers with `placementOptIn: true` AND `rideOnVerified: true` appear
- Anonymous personal details (first name + last initial)
- Full details revealed after client creates account + requests interview

**Settings API:**
- Only fleet drivers can toggle `placementOptIn`
- Placement drivers get **400 Bad Request** if they try

### Data Access Patterns

**Public Marketplace:**
- Anonymous users: See driver cards (first name + last initial only)
- Authenticated clients: See full profiles, can request interviews
- Admins: Full access for vetting and management

---

## Admin Requirements (To Be Built)

### Verification Workflow

**Location:** Admin panel (future)

**Actions:**
1. Review driver application
2. Verify documents (license, LASDRI, vehicle registration)
3. Run background check (placement drivers)
4. Contact references (placement drivers)
5. Review professional summary for quality
6. Toggle `rideOnVerified: true` when complete
7. Notify driver (email/in-app notification)

### Management Features

- View pending verification queue
- Approve/reject driver applications
- Revoke verification if issues arise
- Track verification status by track (fleet vs placement)

---

## Future Enhancements

1. **Professional photo upload** - Required for public profile
2. **Languages spoken** - Multi-select field
3. **Certifications** - Defensive driving, first aid, etc.
4. **Video introduction** - 30-second intro for profile
5. **Portfolio/testimonials** - Client reviews displayed on profile
6. **Availability calendar** - Show when driver is available for interviews
7. **Salary negotiation** - In-app messaging for contract terms
8. **E-signature** - Sign contracts directly in platform

---

## Testing Checklist

### Fleet Driver
- [ ] Register via `/register/driver` (default track)
- [ ] Complete vehicle + document upload
- [ ] Verify `driverTrack: 'fleet'` and `placementOptIn: false` in Firestore
- [ ] Navigate to `/driver/profile/public-profile` → See opt-in banner
- [ ] Go to `/driver/profile/settings` → Toggle placement opt-in ON
- [ ] Verify `placementOptIn: true` in Firestore
- [ ] Navigate to `/driver/profile/public-profile` → Access granted
- [ ] Update professional summary
- [ ] Verify profile NOT in marketplace (rideOnVerified still false)
- [ ] Manually set `rideOnVerified: true` in Firestore (admin action)
- [ ] Verify profile appears in `/app/hiring/discover`

### Placement Driver
- [ ] Register via `/register/driver?track=placement`
- [ ] Complete profile details + consent
- [ ] Verify `driverTrack: 'placement'` and `placementOptIn: true` in Firestore
- [ ] Navigate to `/driver/profile/public-profile` → Access granted immediately
- [ ] Verify pre-populated professional summary
- [ ] Go to `/driver/profile/settings` → See "Placement Marketplace Active" message
- [ ] Try to toggle placement opt-in → Should be disabled/locked
- [ ] Verify profile NOT in marketplace (rideOnVerified still false)
- [ ] Manually set `rideOnVerified: true` in Firestore (admin action)
- [ ] Verify profile appears in `/app/hiring/discover`

### Marketplace
- [ ] Query `/api/drivers/available` with no verified drivers → Empty array
- [ ] Set `rideOnVerified: true` for a driver
- [ ] Query again → Driver appears
- [ ] Set `placementOptIn: false` for that driver
- [ ] Query again → Driver disappears
- [ ] Verify composite index is created (check Firebase console or deploy)

---

## API Reference

### Profile Management

#### `GET /api/drivers/me/public-profile`
- **Auth:** Bearer token required
- **Success:** `200 OK` with `{ professionalSummary, experienceYears, placementOptIn, driverTrack }`
- **Access Denied:** `403 Forbidden` if fleet driver without opt-in
- **Not Found:** `404 Not Found` if driver profile doesn't exist

#### `PUT /api/drivers/me/public-profile`
- **Auth:** Bearer token required
- **Body:** `{ professionalSummary: string, experienceYears: number }`
- **Success:** `200 OK` with `{ success: true }`
- **Access Denied:** `403 Forbidden` if fleet driver without opt-in
- **Validation Error:** `400 Bad Request` if experienceYears invalid

### Settings

#### `GET /api/drivers/me/settings`
- **Auth:** Bearer token required
- **Success:** `200 OK` with `{ placementOptIn, driverTrack, rideOnVerified }`

#### `PUT /api/drivers/me/settings`
- **Auth:** Bearer token required
- **Body:** `{ placementOptIn: boolean }`
- **Success:** `200 OK` with `{ success: true, placementOptIn }`
- **Invalid Track:** `400 Bad Request` if placement driver tries to toggle

### Marketplace

#### `GET /api/drivers/available`
- **Auth:** None (public endpoint)
- **Success:** `200 OK` with `{ drivers: Driver[] }`
- **Query:** Returns only verified, opted-in, available drivers
- **Limit:** 50 drivers per request

---

## File Locations

### API Routes
- `/src/app/api/auth/register-driver/route.ts` - Fleet registration
- `/src/app/api/placement/apply/route.ts` - Placement registration
- `/src/app/api/drivers/me/public-profile/route.ts` - Profile CRUD
- `/src/app/api/drivers/me/settings/route.ts` - Settings CRUD
- `/src/app/api/drivers/available/route.ts` - Marketplace query

### Pages
- `/src/app/register/driver/page.tsx` - Registration form
- `/src/app/driver/page.tsx` - Dashboard (track-aware)
- `/src/app/driver/profile/public-profile/page.tsx` - Profile editor
- `/src/app/driver/profile/settings/page.tsx` - Settings page

### Components
- `/components/driver/dashboard/PlacementCard/index.tsx` - Placement CTA card
- `/components/driver/dashboard/ApplicationStatusTracker/index.tsx` - Status stepper
- `/components/driver/dashboard/ProfileCompletenessCard/index.tsx` - Profile prompt

### Configuration
- `/firestore.indexes.json` - Firestore composite indexes

---

## Summary

The dual-track system ensures:

✅ **Clear separation** between fleet and placement drivers  
✅ **Progressive disclosure** - Fleet drivers opt-in when ready  
✅ **Trust & safety** - Admin verification gates marketplace visibility  
✅ **Flexibility** - Fleet drivers can pursue both tracks simultaneously  
✅ **Privacy** - Access control enforced at API and UI layers  
✅ **Scalability** - Query optimization via composite indexes  

This architecture supports the platform's "Safe, Reliable, Professional" brand promise by ensuring only vetted, consenting drivers appear in the public marketplace.
