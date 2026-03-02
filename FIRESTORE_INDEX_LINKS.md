# Firestore Index Creation Links

Click these links to create the required indexes for the assignment service in Firebase Console.

## Required Indexes for Assignment Service

### 1. Bookings Index (status + driverId + scheduledPickupTime)
**Purpose**: Query for unassigned bookings (status='confirmed', driverId=null)

**Click this link to create**:
```
https://console.firebase.google.com/v1/r/project/rideon-e06da/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9yaWRlb24tZTA2ZGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Jvb2tpbmdzL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGgwKCGRyaXZlcklkEAEaFwoTc2NoZWR1bGVkUGlja3VwVGltZRABGgwKCF9fbmFtZV9fEAE
```

**Fields**:
- `status` (Ascending)
- `driverId` (Ascending)
- `scheduledPickupTime` (Ascending)

---

### 2. Drivers Index (status + onlineStatus)
**Purpose**: Query for available drivers (status='approved', onlineStatus=true)

**Try this direct link**:
https://console.firebase.google.com/project/rideon-e06da/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9yaWRlb24tZTA2ZGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2RyaXZlcnMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDgoKb25saW5lU3RhdHVzEAEaDAoIX19uYW1lX18QAQ

**Alternative link format**:
https://console.firebase.google.com/v1/r/project/rideon-e06da/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9yaWRlb24tZTA2ZGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2RyaXZlcnMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDgoKb25saW5lU3RhdHVzEAEaDAoIX19uYW1lX18QAQ

**Fields**:
- `status` (Ascending)
- `onlineStatus` (Ascending)

---

### 3. Conversations Index (memberIds + lastMessageAt)
**Purpose**: Query conversations for a user sorted by recent messages

**Direct link (try this first)**:
https://console.firebase.google.com/project/rideon-e06da/firestore/indexes?create_composite=ClJwcm9qZWN0cy9yaWRlb24tZTA2ZGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NvbnZlcnNhdGlvbnMvaW5kZXhlcy9fEAEaDAoIbWVtYmVySWRzGAEaDQoJbGFzdE1lc3NhZ2VBdBACGgwKCF9fbmFtZV9fEAI

**Alternative format**:
```
https://console.firebase.google.com/v1/r/project/rideon-e06da/firestore/indexes?create_composite=ClJwcm9qZWN0cy9yaWRlb24tZTA2ZGEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NvbnZlcnNhdGlvbnMvaW5kZXhlcy9fEAEaDAoIbWVtYmVySWRzGAEaDQoJbGFzdE1lc3NhZ2VBdBACGgwKCF9fbmFtZV9fEAI
```

**Fields**:
- `memberIds` (Array Contains)
- `lastMessageAt` (Descending)

---

## Instructions

1. **Click each link above** (they will open in your browser)
2. You'll be taken to Firebase Console with the index pre-configured
3. **Click "Create Index"** button
4. Wait for the index to build (usually takes a few seconds to minutes)
5. Once both indexes show status "Enabled", you're ready!

## After Creating Indexes

Once all indexes are created and enabled, run the test again:

```bash
npm run test:assignment-service
```

This time it should complete successfully! ✅

---

## Alternative: Use Firebase CLI

If the links don't work, you can deploy the indexes using Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

This will read from `firestore.indexes.json` and create all indexes automatically.

---

## Verify Indexes

To check if your indexes are ready:

1. Go to [Firebase Console](https://console.firebase.google.com/project/rideon-e06da/firestore/indexes)
2. Look for these indexes under "Composite" tab:
   - ✅ `bookings` → status, driverId, scheduledPickupTime
   - ✅ `drivers` → status, onlineStatus
   - ✅ `conversations` → memberIds, lastMessageAt
3. All should show status "Enabled" (green checkmark)

---

**Current Status**: Indexes need to be created before the assignment service can run.  
**Next Step**: Click the links above to create the indexes! 🚀
