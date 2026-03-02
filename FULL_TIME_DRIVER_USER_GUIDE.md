# Full‑Time Driver (Placement) — How the App Works (Current Code)

This document explains, in simple terms, how the **full‑time driver placement flow currently works in this project**.

- This is an **“as‑built” walkthrough** (what the code does today).
- It is written like you’re explaining it to a **15‑year‑old**.
- It covers the journey from **starting an application** to **getting approved** and then **using the driver app to receive and accept trip offers**.

---

## 1) The two “places” a driver uses in the app

In the current codebase, a driver experience is split into two main areas:

### A) Full‑Time Driver Portal

This is the area with URLs that start with:

- `/full-time-driver/...`

It includes screens like:

- `/full-time-driver` (Home)
- `/full-time-driver/application/apply` (Apply)
- `/full-time-driver/application/documents` (Documents)
- `/full-time-driver/application/status` (Application Status)
- `/full-time-driver/messages` (Messages)
- `/full-time-driver/profile` (Profile & Settings)

This portal has a bottom navigation with:

- Home
- Apply
- Documents
- Messages
- Profile

### B) Driver App (Driver Dashboard)

This is the area with URLs that start with:

- `/driver/...`

It includes screens like:

- `/driver` (Driver dashboard)
- `/driver/bookings/new` (New booking requests)
- `/driver/trips` (Your trips list)
- `/driver/trips/[tripId]` (Trip details)
- `/driver/bookings/availability` (Availability / service settings)
- `/driver/schedule` (Schedule)
- `/driver/messages` (Driver messages)

This is where drivers actually **see trip offers** and **accept/decline** them.

---

## 2) How a full‑time application starts (what screens exist)

In the current project, there are **two different application entry screens** in the code:

### Option 1: Full‑Time Driver Registration Form

- **Screen:** `/register/driver/full-time`

This is a multi‑step form that:

- Collects personal info (name, email, phone, experience)
- Collects full‑time placement info (preferred city, salary expectation, summary)
- Collects **references** (names/emails/phone/relationship)
- Collects **consents** (background + KYC consent)
- Uploads required documents (Driver’s License, Government ID, LASDRI card optional)

When you press **Submit**, the app sends your information to:

- **API:** `POST /api/auth/apply-full-time-driver`

After a successful submit, it takes you to:

- **Screen:** `/register/driver/full-time/thank-you`

### Option 2: “Apply” inside the Full‑Time Driver Portal

- **Screen:** `/full-time-driver/application/apply`

This page is implemented by re‑using the same UI as:

- `/driver/recruitment/apply`

This version of the application:

- Stores your draft while you fill it out (so you can come back)
- Has multiple steps (Step 1/2/3)
- Lets you upload a wider list of documents (passport photo, guarantor, police report, medical report, eye test, etc.)

It also uses the same backend submit endpoint:

- **API:** `POST /api/auth/apply-full-time-driver`

It can pre‑fill some fields from:

- `GET /api/users/me`
- `GET /api/full-time-driver/me`

---

## 3) What happens when you press “Submit Application”

When you submit the full‑time driver application, the backend does these things:

### A) It saves your application

It creates/updates a Firestore document in:

- `full_time_driver_applications` (document id = your user id)

Your application is stored with a status of:

- `pending_review`

### B) It saves your basic user profile

It creates/updates a Firestore document in:

- `users`

### C) It triggers reference checks (emails)

If you added references, the backend generates a unique token for each reference and creates a document in:

- `reference_requests` (document id = the token)

Then it attempts to send emails to your references. Each email includes a link like:

- `/references/[token]`

### D) What the reference person sees

When your reference clicks the email link, they land on:

- **Screen:** `/references/[token]`

That screen:

- Shows who the reference is for
- Asks a simple question: **“Would you recommend this person?”**
- Lets them add optional comments

When they submit, it calls:

- **API:** `POST /api/reference-requests/[token]`

That API will:

- Mark the reference request as `submitted`
- Increment a counter on your application document so the app can show progress like `1/2`, `2/2`, etc.

### E) The “references completed” counter

Your application stores a summary like:

- `referencesSummary.required`
- `referencesSummary.completed`

And the portal can display it.

---

## 4) The “Thank You / Status” screen after you apply

### A) If you applied via `/register/driver/full-time`

After submitting, you go to:

- **Screen:** `/register/driver/full-time/thank-you`

This page:

- Shows your current application status
- Lets you refresh the status
- Shows how many references are completed

It checks your current application using:

- **API:** `GET /api/full-time-driver/me`

### B) The status values you can see

In the code, the main status values used for the full‑time application are:

- `not_applied`
- `pending_review`
- `approved`
- `rejected`

### C) What happens when you’re approved (on the Thank‑You screen)

If your application status becomes `approved`, the thank‑you page shows a link to:

- `/driver` (Enter Driver App)

---

## 5) The Full‑Time Driver Portal “Home” screen

- **Screen:** `/full-time-driver`

This screen is basically your **overview dashboard** for the placement application.

What it shows:

- A welcome message (“Welcome back …”)
- Your **Application Status** badge
- Buttons like:
  - **Start Application** (if you haven’t applied)
  - **View Status** (if you already applied)
  - **Upload / Update Documents** (if you already applied)
- A **Checklist**, including:
  - Application details submitted
  - Documents uploaded
  - References confirmed (`completed/required`)

To load the data, it calls:

- `GET /api/full-time-driver/me` (application details)
- `GET /api/drivers/me` (driver’s first name, etc.)

---

## 6) “Application Status” screen in the portal

- **Screen:** `/full-time-driver/application/status`

This screen is a status tracker.

It shows:

- Whether your application is:
  - Not Applied
  - Pending Review
  - Approved
  - Rejected
- A simple step tracker (Submit → Review → Decision)
- Dates like created/updated (when available)
- A rejection reason if the backend stored one

This screen reads from the `full_time_driver_applications` document.

---

## 7) “Documents” screen in the portal

- **Screen:** `/full-time-driver/application/documents`

This screen is used to upload/replace documents for your full‑time application.

Important detail in the current implementation:

- It uses a **draft stored on the device** (session storage). If you don’t have a draft yet, it redirects you back to the Apply screen.

It can pre‑fill some document URLs using:

- `GET /api/drivers/me/documents`

When you submit the documents for the application, it sends them through the same full‑time application submit API:

- `POST /api/auth/apply-full-time-driver`

---

## 8) Messages and Support (in the full‑time portal)

### A) Messages list

- **Screen:** `/full-time-driver/messages`

This shows a list of conversations.

### B) Opening a chat

- **Screen:** `/full-time-driver/messages/[conversationId]`

This opens a chat window for that conversation.

### C) Contact support

- **Screen:** `/full-time-driver/profile/support`

This screen can work in two modes:

- If support chat is disabled by feature flags, it shows phone/email/WhatsApp links.
- If support chat is enabled, it lets you start a support chat.

When you start support chat, it calls:

- **API:** `POST /api/messages/contact-support`

That creates a new conversation document in `conversations` with a support member.

---

## 9) After approval: entering the Driver App

Once you are approved (status `approved`), the UI provides a route into:

- **Screen:** `/driver`

This is the driver dashboard.

On that dashboard, the code shows:

- A greeting
- An online/offline toggle
- A banner if you have new booking requests waiting
- A “Full‑Time Placement” section that links you back to the full‑time placement application pages

---

## 10) How a driver receives and accepts job offers (bookings)

In the current driver app, new offers show up as **pending booking requests**.

### A) Where pending job offers appear

- **Dashboard banner:** On `/driver`, if there are pending offers, you see a banner linking to:
  - `/driver/bookings/new`

### B) The “New booking requests” screen

- **Screen:** `/driver/bookings/new`

This screen lists booking requests assigned to you and waiting for you to respond.

Each card shows things like:

- Pickup time
- Payout
- Pickup and dropoff
- Notes

It loads data from:

- `GET /api/driver/bookings/pending`

### C) Accepting a booking (from the list)

On a pending booking card, there is an **Accept** button.

That calls:

- `POST /api/driver/bookings/[bookingId]/accept`

In the backend, that moves the booking from:

- `driver_assigned` → `confirmed`

### D) Rejecting a booking

On a pending booking card, there is a **Decline** button.

That calls:

- `POST /api/driver/bookings/[bookingId]/reject`

In the backend, that moves the booking back to a request state so it can be reassigned.

---

## 11) Viewing your trips/reservations after acceptance

### A) Trips list

- **Screen:** `/driver/trips`

This shows your trips (upcoming and past).

It loads from:

- `GET /api/driver/trips`

### B) Trip detail screen

- **Screen:** `/driver/trips/[tripId]`

This shows one trip in detail.

It loads from:

- `GET /api/driver/trips/[tripId]`

### C) Actions on the trip detail screen

Depending on the trip’s current status, the UI can show:

- **Accept Reservation (Go En Route)**
  - Calls: `POST /api/driver/trips/[tripId]/accept`
  - Backend changes: `driver_assigned` → `en_route`

- **Start Reservation**
  - Calls: `POST /api/driver/trips/[tripId]/start`
  - Backend requires current status to be `en_route`
  - Backend changes: `en_route` → `in_progress`

- **Complete Reservation**
  - Calls: `POST /api/driver/trips/[tripId]/complete`
  - Backend requires current status to be `in_progress`
  - Backend changes: `in_progress` → `completed`

The trip detail screen also includes:

- A “Navigate to Pickup” button (opens Google Maps)
- A “Call” button if the customer phone number exists
- A “Message” button that takes you to `/driver/messages`

---

## 12) Availability and schedule (driver settings)

### A) Availability / service settings screen

- **Screen:** `/driver/bookings/availability`

This is where a driver can manage things like:

- Online/offline status
- Working hours
- Working days
- Max pickup radius
- Served cities

This screen reads/writes to:

- `GET /api/driver/availability`
- `POST /api/driver/availability`
- `GET /api/drivers/me`
- `PATCH /api/drivers/me`

### B) Schedule screen

- **Screen:** `/driver/schedule`

This shows your schedule and availability (weekly calendar / agenda).

It uses:

- `GET /api/driver/availability`
- `POST /api/driver/availability`
- `GET /api/driver/bookings?start=...&end=...`

---

## 13) Placement hub and public profile editing (currently under `/driver`)

There is a placement‑related hub screen at:

- **Screen:** `/driver/placement`

This screen:

- Shows a “Placement Hub” layout with tabs like Interview Requests / Active Offers / My Contracts (these currently show empty states)
- Shows a preview of the driver’s “public recruitment profile”
- Can show a link to edit the public profile at:
  - `/driver/placement/profile/edit`

The public profile edit screen submits changes for admin review via:

- `PUT /api/drivers/me/public-profile`

(That public profile edit/approval flow is implemented on the `drivers` collection.)

---

## 14) Summary: the end‑to‑end flow in one short story

Here’s the flow, as the screens exist right now:

1. You fill out a full‑time application (either via `/register/driver/full-time` or via the portal’s `/full-time-driver/application/apply`).
2. When you submit, your application is saved as **Pending Review**.
3. Your references receive emails. They complete a short form at `/references/[token]`.
4. You can keep checking your status:
   - `/register/driver/full-time/thank-you` (status screen after submit)
   - `/full-time-driver/application/status` (status inside the full‑time portal)
5. When you become **Approved**, the UI provides a route into the driver dashboard at `/driver`.
6. Inside the driver app, you can receive trip offers (pending bookings) and accept/decline them.
7. For accepted work, you can manage the trip lifecycle (accept/en‑route, start, complete) and manage your availability and schedule.

---

## Appendix: “Where does the app read my full‑time application status from?”

The “full‑time application status” that the portal shows comes from:

- `GET /api/full-time-driver/me`

Which reads from:

- Firestore collection: `full_time_driver_applications`

And returns fields like:

- `status` (`not_applied`, `pending_review`, `approved`, `rejected`)
- name/contact fields
- experience and preferences
- references summary (`completed/required`)
- timestamps (`createdAt`, `updatedAt`)
