/**
 * Test Script: Test the driver assignment service locally
 *
 * This script creates test data and runs the assignment process to verify
 * that the service is working correctly.
 *
 * Usage:
 *   npx ts-node scripts/test-assignment-service.ts
 */

// Environment variables are loaded by dotenv-cli before this script runs
import { adminDb } from "@/lib/firebaseAdmin";

interface TestStats {
  existingBookings: number;
  existingDrivers: number;
  testBookingsCreated: number;
  testDriversCreated: number;
  assignmentsCompleted: number;
}

async function runAssignmentProcess(): Promise<{
  success: boolean;
  assignedCount: number;
  errors: string[];
}> {
  return {
    success: false,
    assignedCount: 0,
    errors: ["Auto-assignment has been removed."],
  };
}

async function createTestBooking(customerId: string, index: number) {
  const bookingRef = await adminDb.collection("bookings").add({
    customerId: customerId,
    status: "confirmed",
    driverId: null,
    pickupLocation: {
      lat: 6.5244 + Math.random() * 0.1, // Lagos area
      lng: 3.3792 + Math.random() * 0.1,
    },
    dropoffLocation: {
      lat: 6.5244 + Math.random() * 0.1,
      lng: 3.3792 + Math.random() * 0.1,
    },
    pickupAddress: `Test Pickup Address ${index}, Ikeja, Lagos`,
    dropoffAddress: `Test Dropoff Address ${index}, Victoria Island, Lagos`,
    scheduledPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    fare: 5000 + Math.floor(Math.random() * 5000),
    customerInfo: {
      name: "Test Customer",
      profileImageUrl: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`  Created test booking: ${bookingRef.id}`);
  return bookingRef.id;
}

async function createTestDriver(index: number) {
  // Create user first
  const userRef = await adminDb.collection("users").add({
    role: "driver",
    firstName: `TestDriver${index}`,
    lastName: `User${index}`,
    email: `testdriver${index}@rideon.test`,
    phoneNumber: `+234800000${String(index).padStart(4, "0")}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const userId = userRef.id;

  // Create driver
  const driverRef = await adminDb.collection("drivers").add({
    userId: userId,
    status: "approved",
    onlineStatus: true,
    placementStatus: "available",
    vehicle: {
      make: "Toyota",
      model: "Camry",
      year: 2020,
      licensePlate: `TEST-${index}`,
      color: "Black",
    },
    currentLocation: {
      lat: 6.5244 + Math.random() * 0.05,
      lng: 3.3792 + Math.random() * 0.05,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create availability schedule (available all day, every day)
  await adminDb
    .collection("driver_availability")
    .doc(userId)
    .set({
      schedule: [
        { dayOfWeek: 0, startTime: "00:00", endTime: "23:59" },
        { dayOfWeek: 1, startTime: "00:00", endTime: "23:59" },
        { dayOfWeek: 2, startTime: "00:00", endTime: "23:59" },
        { dayOfWeek: 3, startTime: "00:00", endTime: "23:59" },
        { dayOfWeek: 4, startTime: "00:00", endTime: "23:59" },
        { dayOfWeek: 5, startTime: "00:00", endTime: "23:59" },
        { dayOfWeek: 6, startTime: "00:00", endTime: "23:59" },
      ],
    });

  console.log(`  Created test driver: ${driverRef.id} (userId: ${userId})`);
  return { driverId: driverRef.id, userId };
}

async function cleanupTestData(
  testBookingIds: string[],
  testUserIds: string[],
) {
  console.log("\n[Cleanup] Removing test data...");

  const batch = adminDb.batch();

  // Delete test bookings
  for (const bookingId of testBookingIds) {
    batch.delete(adminDb.collection("bookings").doc(bookingId));
  }

  // Delete test drivers and users
  for (const userId of testUserIds) {
    // Find and delete driver
    const driverSnapshot = await adminDb
      .collection("drivers")
      .where("userId", "==", userId)
      .get();
    driverSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete user
    batch.delete(adminDb.collection("users").doc(userId));

    // Delete availability
    batch.delete(adminDb.collection("driver_availability").doc(userId));
  }

  await batch.commit();
  console.log("[Cleanup] ✓ Test data removed successfully");
}

async function testAssignmentService() {
  if (process.env.RUN_DEPRECATED_ASSIGNMENT_SERVICE_TEST !== "true") {
    console.error(
      "Auto-assignment has been removed. This script is deprecated.",
    );
    process.exitCode = 1;
    return;
  }

  const stats: TestStats = {
    existingBookings: 0,
    existingDrivers: 0,
    testBookingsCreated: 0,
    testDriversCreated: 0,
    assignmentsCompleted: 0,
  };

  const testBookingIds: string[] = [];
  const testUserIds: string[] = [];

  try {
    console.log("=".repeat(60));
    console.log("Driver Assignment Service - Test Run");
    console.log("=".repeat(60));

    // Check existing data
    console.log("\n[Step 1] Checking existing data...");
    const existingBookingsSnapshot = await adminDb
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("driverId", "==", null)
      .get();
    stats.existingBookings = existingBookingsSnapshot.size;

    const existingDriversSnapshot = await adminDb
      .collection("drivers")
      .where("status", "==", "approved")
      .where("onlineStatus", "==", true)
      .get();
    stats.existingDrivers = existingDriversSnapshot.size;

    console.log(`  Existing unassigned bookings: ${stats.existingBookings}`);
    console.log(`  Existing available drivers: ${stats.existingDrivers}`);

    // Create test data
    console.log("\n[Step 2] Creating test data...");

    // Create 3 test bookings
    const testCustomerId = "test_customer_" + Date.now();
    for (let i = 1; i <= 3; i++) {
      const bookingId = await createTestBooking(testCustomerId, i);
      testBookingIds.push(bookingId);
      stats.testBookingsCreated++;
    }

    // Create 2 test drivers
    for (let i = 1; i <= 2; i++) {
      const { userId } = await createTestDriver(i);
      testUserIds.push(userId);
      stats.testDriversCreated++;
    }

    console.log(`\n  ✓ Created ${stats.testBookingsCreated} test bookings`);
    console.log(`  ✓ Created ${stats.testDriversCreated} test drivers`);

    // Run the assignment process
    console.log("\n[Step 3] Running assignment process...");
    console.log("-".repeat(60));

    const result = await runAssignmentProcess();

    console.log("-".repeat(60));
    console.log("\n[Step 4] Assignment Results:");
    console.log(`  Success: ${result.success}`);
    console.log(`  Assigned: ${result.assignedCount} bookings`);

    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
      result.errors.forEach((err, idx) => {
        console.log(`    ${idx + 1}. ${err}`);
      });
    }

    stats.assignmentsCompleted = result.assignedCount;

    // Verify assignments
    console.log("\n[Step 5] Verifying assignments...");
    for (const bookingId of testBookingIds) {
      const bookingDoc = await adminDb
        .collection("bookings")
        .doc(bookingId)
        .get();
      const bookingData = bookingDoc.data();

      if (bookingData?.driverId) {
        console.log(
          `  ✓ Booking ${bookingId} assigned to driver ${bookingData.driverId}`,
        );
        console.log(`    - Driver: ${bookingData.driverInfo?.name || "N/A"}`);
        console.log(
          `    - Vehicle: ${bookingData.vehicleInfo?.make} ${bookingData.vehicleInfo?.model} (${bookingData.vehicleInfo?.licensePlate})`,
        );
      } else {
        console.log(`  ✗ Booking ${bookingId} was NOT assigned`);
      }
    }

    // Cleanup
    const shouldCleanup = process.argv.includes("--no-cleanup") ? false : true;

    if (shouldCleanup) {
      await cleanupTestData(testBookingIds, testUserIds);
    } else {
      console.log("\n[Info] Skipping cleanup (--no-cleanup flag detected)");
      console.log("  Test booking IDs:", testBookingIds);
      console.log("  Test user IDs:", testUserIds);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Test Summary");
    console.log("=".repeat(60));
    console.log(`Existing unassigned bookings: ${stats.existingBookings}`);
    console.log(`Existing available drivers:   ${stats.existingDrivers}`);
    console.log(`Test bookings created:        ${stats.testBookingsCreated}`);
    console.log(`Test drivers created:         ${stats.testDriversCreated}`);
    console.log(`Assignments completed:        ${stats.assignmentsCompleted}`);
    console.log("=".repeat(60));

    if (result.success && stats.assignmentsCompleted > 0) {
      console.log("\n✓ Test PASSED: Assignment service is working correctly!");
      process.exit(0);
    } else if (result.success && stats.assignmentsCompleted === 0) {
      console.log(
        "\n⚠ Test INCOMPLETE: Service ran but no assignments were made.",
      );
      console.log(
        "  This may be expected if drivers were unavailable or had conflicts.",
      );
      process.exit(0);
    } else {
      console.log("\n✗ Test FAILED: Assignment service encountered errors.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n✗ Test FAILED with exception:", error);

    // Attempt cleanup on failure
    try {
      await cleanupTestData(testBookingIds, testUserIds);
    } catch (cleanupError) {
      console.error("Failed to cleanup test data:", cleanupError);
    }

    process.exit(1);
  }
}

// Run the test
testAssignmentService();
