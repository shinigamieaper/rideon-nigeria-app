# Full-Time Placement Hub (Driver) — Plan

## 1) Goal
Build a “professional talent marketplace” experience for **full-time placement drivers** (Upwork-style driver portal) and make sure the **full-time driver application** captures rich, customer-relevant profile data.

Customer-side marketplace + subscription/paywall is **explicitly out of scope** for this plan and will be planned separately later.

## 2) Current State (what already exists in this repo)
- **Driver recruitment application flow (3-step apply + documents + status):**
  - **UI:** `src/app/driver/recruitment/apply/page.tsx`, `src/app/driver/recruitment/documents/page.tsx`, `src/app/driver/recruitment/status/page.tsx`
  - **Aliases:** `/full-time-driver/application/*` re-exports the above.
  - **Submit API:** `POST /api/auth/apply-full-time-driver` writes to `full_time_driver_applications/{uid}`.
- **Admin review + approval pipeline:**
  - On approval, driver is added to the “recruitment pool” in `drivers/{driverId}` with `recruitmentPool: true`, `recruitmentVisible: false` (default), and a `recruitmentProfile` snapshot.
- **Admin visibility control:**
  - Admin can list/unlist recruitment drivers via `recruitmentVisible`.
- **Driver profile/public-profile APIs exist:**
  - `GET/PUT` style endpoints already exist around `/api/drivers/me/public-profile` and `/api/drivers/me/settings`.

## 3) Key Gap
The current recruitment application captures the basics (experience, city, availability, salary, vehicle types) but **does not yet capture enough “nuanced” public profile information** that helps a parent/corporate client choose “the right driver” (languages, interests, kid-safety experience, vehicle history, etc.).

## 4) Product Direction (Driver-first)
### 4.1 Add “Professional Profile Depth” inputs
These are inputs that improve marketplace matching and trust.

- **[professional_summary]**
  - **Where:** Driver can set/update post-approval; also allow capturing during application.
  - **Why:** It’s the first thing clients read.

- **[spoken_languages]**
  - **Fields:** `languages: string[]` (e.g. `["English", "Yoruba"]`).
  - **UX:** multi-select + “add custom”.

- **[interests_and_personality]**
  - **Fields:** `interests: string[]` (or `hobbies: string[]` if that’s the existing naming).
  - **Purpose:** Helps clients (especially families) choose someone aligned with household values.

- **[vehicle_history_and_capability]**
  - **Fields (suggested minimal structure):**
    - `vehicleExperience: { categories: string[]; notes?: string }`
    - Keep existing `vehicleTypesHandled` as a simple string for backward compatibility.
  - **Examples:** Sedan/SUV/Van/Bus; automatic/manual; luxury/armored (if relevant).
  - **Default checkbox categories (v1):** Sedan, SUV, Van/Minivan, Bus, Pickup/Truck, Luxury, Manual, Automatic.

- **[family_and_safety_fit]**
  - **Fields (suggested):**
    - `familyExperience: { kidsSchoolRuns?: boolean; elderlyCare?: boolean; specialNeeds?: boolean; notes?: string }`
    - `safetyTraining: { defensiveDriving?: boolean; firstAid?: boolean; notes?: string }`
  - **UX:** structured checkboxes (shadcn/ui) + optional notes field.
  - **Default checkbox tags (v1):** Kids/School runs, Elderly care, Special needs experience, Executive/Corporate driving, Night driving, Long-distance/Interstate trips.

- **[full_time_preferences]**
  - **Fields:**
    - `fullTimePreferences: { willingToTravel?: boolean; preferredClientType?: 'personal' | 'corporate' | 'any' }`
  - **Why:** This was explicitly requested in your spec and matches Upwork-style “preferences”.

- **[availability_shape]** (optional, later)
  - `workMode?: 'live_in' | 'live_out' | 'either'`
  - `scheduleNotes?: string`

### 4.2 Where these fields should live (Firestore)
To keep concerns clean:

- **[application_record]** `full_time_driver_applications/{uid}`
  - Stores what’s needed for admin review + verification.
  - Should include the new fields **at least as a draft snapshot** so admin reviewers can see them.

- **[driver_profile_record]** `drivers/{uid}`
  - Stores “live” driver profile for marketplace.
  - After approval, the driver should be able to edit the public-safe subset (with guardrails).

- **[public_snapshot]** `drivers/{uid}.recruitmentProfile`
  - This is the customer-facing public profile snapshot.
  - It should be derived from `drivers/{uid}` (or from app at approval time) and include only safe-to-display fields.
  - Admin already controls whether it is visible (`recruitmentVisible`).

### 4.3 Mapping rules (important)
- **[approval_snapshot_rule]** On approval, copy the “public safe” fields into `recruitmentProfile`.
- **[post_approval_edits_rule]** If a driver edits their public profile after approval:
  - **Required:** write changes to `recruitmentProfilePending` and require admin re-approval before updating `recruitmentProfile`.
  - **Admin notifications:** every submitted profile change should create an in-app notification for admins and send an email to all admin users.

Recommendation: implement admin approval (pending -> approved/rejected) with audit fields.

## 5) Driver UX Plan
### 5.1 Placement Hub (`/driver/placement`) — new
This is the driver’s “career portal” (Upwork-inspired).

#### A) Profile Management (top of page)
- **[profile_preview_card]**
  - Shows how the driver looks to clients.
  - Includes: headshot, full name, rating, “RideOn Verified”, key tags (languages, city, years).
  - CTA: **Edit Profile**.

- **[edit_profile_flow]**
  - Page: `/driver/placement/profile/edit` (or reuse `/api/drivers/me/public-profile` + a new UI)
  - Fields editable: the public-safe set from Section 4.1.

#### B) Opportunities & Engagements (tabbed)
Tabs:
- **[interview_requests_tab]**
  - List of “requests” (client initiated).
  - Actions: “View & Respond” (opens messaging), “Decline”.

- **[active_offers_tab]**
  - List of formal offers.
  - Actions: “Review & Sign Contract”, “Decline Offer”.

- **[my_contracts_tab]**
  - Shows current/past contracts.
  - Tapping navigates to contract details (terms, payment history, signed doc URL).

Implementation note: in the first iteration, these tabs can ship with **empty states** and wiring stubs, while we build the underlying collections.

### 5.2 Profile Hub (`/driver/profile`) — update
Right now `/driver/profile` explicitly says placement items were removed.

Plan:
- **[conditional_menu]** Re-introduce placement items *only when* driver is placement/recruitment eligible (e.g. `recruitmentPool === true` or `driverTrack === 'placement'`).
- Add menu items:
  - **[placement_hub_link]** “Full-Time Placement Hub” → `/driver/placement`
  - **[public_profile_link]** “Public Profile” → `/driver/placement/profile/edit`
  - Keep the existing list items for personal details, documents, banking, settings, support.

### 5.3 Application flow improvements (existing `/driver/recruitment/apply`)
Keep the 3-step structure, but extend Step 2 (or add Step 4) to capture profile depth.

- **[step_2_expand]** Add:
  - languages
  - interests
  - fullTimePreferences (willingToTravel, preferredClientType)
  - family/safety fit (checkboxes + notes)
  - vehicle experience structure (multi-select)

- **[copywriting_prompts]** Add prompt text so drivers know what to write (especially for professional summary).

## 6) Backend / API Plan
### 6.1 Application submit API (`POST /api/auth/apply-full-time-driver`)
- **[extend_validation]** Update `PlacementApplicationSchema` to accept the new fields.
- **[store_fields]** Write new fields into `full_time_driver_applications/{uid}` so admins can review.

### 6.2 Driver “public profile” API (edit + read)
- **[single_source_of_truth]** Decide the source of truth for the public profile:
  - Recommended: `drivers/{uid}` is the source of truth.
- **[update_endpoint]** Ensure there is a driver-authenticated endpoint that updates the public-safe fields.
- **[snapshot_update]** Driver edits should be stored as `recruitmentProfilePending` and must be approved by an admin before reflecting in `recruitmentProfile`.
- **[admin_alerting]** On submission of `recruitmentProfilePending`:
  - create an in-app notification for admins
  - send an email to all admin users

### 6.3 Admin review UI improvements (optional)
- **[review_surface_new_fields]** Extend admin application review page to display the new profile depth fields so the team can assess “family-fit”, languages, etc.

## 8) Sequencing (Minimal Incremental Milestones)
### Milestone A — Finish driver profile depth capture (no customer work)
- **[ui]** Update driver application UI to collect new fields.
- **[api]** Extend `PlacementApplicationSchema` + submit API to store them.
- **[admin]** Ensure admin can see them during review.

### Milestone B — Placement Hub (driver portal)
- **[page]** Create `/driver/placement` with Profile Preview + Tabs + empty states.
- **[edit_profile]** Implement “Edit Profile” UI backed by the existing driver public-profile API.

### Milestone C — Recruitment profile snapshot strategy
- **[sync]** Ensure `recruitmentProfile` contains the richer fields and stays updated.

## 9) Open Questions (need your confirmation)
- **[taxonomy_changes]** If we later find the checkbox lists are too small/too big, we can adjust them and keep old values as-is.

