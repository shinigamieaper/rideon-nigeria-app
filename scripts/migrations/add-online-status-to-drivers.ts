/**
 * Migration Script: Add onlineStatus field to all drivers
 *
 * This script adds the new `onlineStatus` field to all existing driver documents.
 * The field is required by the driver assignment service to determine which drivers
 * are available for trip assignments.
 *
 * Usage:
 *   npx ts-node scripts/migrations/add-online-status-to-drivers.ts
 *
 * Or add to package.json:
 *   "scripts": {
 *     "migrate:driver-online-status": "ts-node scripts/migrations/add-online-status-to-drivers.ts"
 *   }
 */

// Environment variables are loaded by dotenv-cli before this script runs
import { adminDb } from "@/lib/firebaseAdmin";

async function addOnlineStatusToDrivers() {
  try {
    console.log(
      "[Migration] Starting migration: Add onlineStatus to drivers...",
    );

    // Fetch all driver documents
    const driversSnapshot = await adminDb.collection("drivers").get();

    if (driversSnapshot.empty) {
      console.log("[Migration] No drivers found. Nothing to migrate.");
      return;
    }

    console.log(`[Migration] Found ${driversSnapshot.size} drivers to update.`);

    // Batch update all drivers
    const batch = adminDb.batch();
    let updateCount = 0;

    driversSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Only update if onlineStatus doesn't exist
      if (!("onlineStatus" in data)) {
        batch.update(doc.ref, {
          onlineStatus: true, // Default to true for existing drivers
          updatedAt: new Date(),
        });
        updateCount++;
      }
    });

    if (updateCount === 0) {
      console.log(
        "[Migration] All drivers already have onlineStatus field. No updates needed.",
      );
      return;
    }

    // Commit the batch
    await batch.commit();

    console.log(
      `[Migration] ✓ Successfully updated ${updateCount} drivers with onlineStatus field.`,
    );
    console.log("[Migration] Migration completed successfully.");
  } catch (error) {
    console.error("[Migration] ✗ Migration failed:", error);
    throw error;
  }
}

// Run the migration
addOnlineStatusToDrivers()
  .then(() => {
    console.log("[Migration] Exiting...");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Migration] Fatal error:", error);
    process.exit(1);
  });
