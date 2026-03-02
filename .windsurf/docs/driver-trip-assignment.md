# Driver Trip Assignment System

## Architecture Overview

RideOn Nigeria uses a **batch-oriented, predictable assignment system** rather than real-time on-demand matching. This aligns with the brand promise of reliability and pre-booked service.

## Assignment Flow

### 1. Driver Availability
- Drivers set their working hours in **My Schedule** (future feature)
- Drivers toggle **"Go Online"** to make themselves visible to the assignment algorithm
- `drivers.online = true` in Firestore

### 2. Batch Processing (Scheduled Job)
Instead of instant matching, a **backend batch job** runs periodically (e.g., every hour):

```
Query bookings where:
  - status = 'requested'
  - scheduledPickupTime >= now
  - scheduledPickupTime <= now + 24 hours

Query drivers where:
  - online = true
  - status = 'approved'
  - schedule overlaps with booking times

Run assignment algorithm:
  - Match drivers to bookings based on:
    * Proximity to pickup location
    * Schedule availability
    * Vehicle type compatibility
  
For each match:
  - Update booking.driverId = matched_driver_uid
  - Update booking.status = 'driver_assigned'
  - Update booking.assignedAt = serverTimestamp()
  - Copy driver info into booking (denormalized)
```

### 3. Driver Acceptance/Rejection
Drivers receive **pending booking requests** in their portal:

**New Bookings Queue** (`/driver/bookings/new`):
- Shows all bookings where `status = 'driver_assigned'` and `driverId = current_driver`
- Driver can:
  - **Accept**: Move booking to `status = 'confirmed'`, appears in driver's schedule
  - **Reject**: Reset booking to `status = 'requested'`, clear `driverId`, trigger reassignment

API Routes:
- `POST /api/driver/bookings/[bookingId]/accept` → status: 'confirmed'
- `POST /api/driver/bookings/[bookingId]/reject` → status: 'requested', driverId: null

### 4. Trip Lifecycle After Acceptance

```
requested → driver_assigned → confirmed → in_progress → completed
                    ↓
              (driver rejects)
                    ↓
                requested (reassign)
```

Driver Actions:
- **Start Trip** (`/api/driver/trips/[tripId]/start`): confirmed → in_progress
- **Complete Trip** (`/api/driver/trips/[tripId]/complete`): in_progress → completed

## Components & Pages

### Driver Portal Pages
- `/driver/bookings/new` - New booking requests (accept/reject queue)
- `/driver/trips` - All accepted trips (upcoming & past)
- `/driver/trips/[tripId]` - Driver-specific trip details with Start/Complete actions

### Components
- `DriverTripDetailClient` - Driver view of trip details (components/driver/TripDetailClient)
- `PendingBookingCard` - Card for new booking requests with Accept/Decline buttons
- `UpNextCard` - Updated with map preview and Google Maps navigation link

### API Routes
**Driver Trips:**
- `GET /api/driver/trips` - List all driver trips
- `GET /api/driver/trips/[tripId]` - Get trip details (driver-specific)
- `POST /api/driver/trips/[tripId]/start` - Start a trip
- `POST /api/driver/trips/[tripId]/complete` - Complete a trip

**Driver Bookings (Assignment):**
- `GET /api/driver/bookings/pending` - Get pending assignment requests
- `POST /api/driver/bookings/[bookingId]/accept` - Accept assigned trip
- `POST /api/driver/bookings/[bookingId]/reject` - Reject assigned trip

## Key Design Decisions

### 1. Separation of Concerns
- **Customer trip details** → `/app/trips/[bookingId]` (TripDetailClient)
- **Driver trip details** → `/driver/trips/[tripId]` (DriverTripDetailClient)
- Different UX, different actions (customers cancel, drivers start/complete)

### 2. Denormalized Data in Bookings
Booking documents include:
- `customerInfo { name, phone, profileImageUrl }`
- `driverInfo { name, phone, profileImageUrl }`
- `vehicleInfo { make, model, licensePlate, color }`

This avoids N+1 queries when listing trips and enables efficient read-heavy operations.

### 3. Map Preview & Navigation
`UpNextCard` now includes:
- Static map preview using MapTiler Static API
- "Navigate" button → opens Google Maps with turn-by-turn directions
- Coordinates stored as `pickupCoords: [lon, lat]`, `dropoffCoords: [lon, lat]`

### 4. Admin-Driven Assignment
The batch assignment algorithm will be run by:
- **Scheduled Cloud Function** (Firebase Functions, runs every hour)
- **Manual Admin Trigger** (admin can force reassignment via admin panel)
- **Event-Driven** (when new booking created, queue for next batch cycle)

## Future Enhancements

### Near-term
- [ ] Implement My Schedule page for drivers to set availability
- [ ] Build admin panel to manually assign/reassign trips
- [ ] Add push notifications when new booking is assigned
- [ ] Implement time-limited acceptance (driver must accept within X minutes or auto-reject)

### Medium-term
- [ ] Build the batch assignment algorithm (Cloud Function)
- [ ] Add driver location tracking during trips
- [ ] Implement earnings calculation and payout tracking
- [ ] Add driver performance metrics (acceptance rate, completion rate, avg rating)

### Long-term
- [ ] Smart assignment algorithm with ML-based optimization
- [ ] Dynamic pricing based on driver availability
- [ ] Multi-day chauffeur service assignment
- [ ] Corporate contract assignment (placement track)

## Database Schema Updates Needed

Add to `bookings` collection:
```typescript
{
  assignedAt?: Timestamp,           // When driver was assigned
  driverAcceptedAt?: Timestamp,     // When driver accepted
  driverRejectedAt?: Timestamp,     // When driver rejected
  driverRejectionReason?: string,   // Why driver rejected
  actualPickupTime?: Timestamp,     // When trip started
  completionTime?: Timestamp,       // When trip completed
}
```

Add to `drivers` collection:
```typescript
{
  online: boolean,                  // Currently available for trips
  lastOnlineAt?: Timestamp,
  schedule?: {                       // Future: structured availability
    monday: { start: string, end: string }[],
    // ... other days
  }
}
```

## Firestore Indexes Required

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "driverId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledPickupTime", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledPickupTime", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Testing Checklist

### Driver Flow
- [ ] Driver can view pending booking requests at `/driver/bookings/new`
- [ ] Driver can accept a booking → moves to confirmed, appears in /driver/trips
- [ ] Driver can reject a booking → removed from queue, booking reset to requested
- [ ] Driver can view trip details at `/driver/trips/[tripId]`
- [ ] Driver can start a confirmed trip → status changes to in_progress
- [ ] Driver can complete an in-progress trip → status changes to completed
- [ ] Map preview renders correctly in UpNextCard
- [ ] Google Maps navigation link opens correctly
- [ ] Empty states show when no bookings/trips

### API Security
- [ ] All driver routes require valid Firebase ID token
- [ ] Driver role claim is enforced on all driver routes
- [ ] Drivers can only access their own trips
- [ ] Trip actions validate current status before updating

### Error Handling
- [ ] API errors return standardized 500 JSON response
- [ ] Client shows user-friendly error messages via StickyBanner
- [ ] Loading states render glassmorphic skeletons
- [ ] Auto-refresh on New Bookings page works correctly

---

**Status**: Core infrastructure complete. Admin assignment algorithm and Cloud Functions pending.
