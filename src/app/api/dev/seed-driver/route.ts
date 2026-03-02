import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Dev-only seeding endpoint
export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" && body.email
        ? body.email
        : "dev-driver@example.com";
    const password =
      typeof body?.password === "string" && body.password
        ? body.password
        : "DevDriver#12345";
    const firstName =
      typeof body?.firstName === "string" && body.firstName
        ? body.firstName
        : "Dev";
    const lastName =
      typeof body?.lastName === "string" && body.lastName
        ? body.lastName
        : "Driver";
    const phoneNumber =
      typeof body?.phoneNumber === "string" && body.phoneNumber
        ? body.phoneNumber
        : "+2348000000000";
    // Normalize placement track naming; accept legacy 'placement_only'
    const rawTrack = body?.track as string | undefined;
    const track: "fleet" | "placement" =
      rawTrack === "fleet" ? "fleet" : "placement";
    const approved: boolean = !!body?.approved;
    // Only seed a booking when explicitly requested to avoid persistent fake assignments
    const seedBooking: boolean =
      track === "fleet" && body?.seedBooking === true;

    // Upsert auth user
    let userRecord: import("firebase-admin/auth").UserRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      // Ensure password is up-to-date in dev
      await adminAuth.updateUser(userRecord.uid, { password });
    } catch {
      userRecord = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        disabled: false,
      });
    }

    const uid = userRecord.uid;

    // Set custom claim role=driver (merge is not needed; this overwrites claims)
    const existingClaims = (await adminAuth.getUser(uid)).customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: "driver",
    });

    // Upsert Firestore documents
    const userRef = adminDb.collection("users").doc(uid);
    const driverRef = adminDb.collection("drivers").doc(uid);

    const userDoc = {
      _id: uid,
      role: "driver",
      firstName,
      lastName,
      email,
      phoneNumber,
      driverTrack: track,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    } as Record<string, unknown>;

    const driverDoc: Record<string, unknown> = {
      userId: uid,
      status: approved ? "approved" : "pending_review",
      placementStatus: "available",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };

    if (track === "fleet") {
      driverDoc["vehicle"] = {
        make: "Toyota",
        model: "Corolla",
        year: 2018,
        licensePlate: "DEV-123-XY",
      };
    } else {
      driverDoc["recruitmentPool"] = true;
      driverDoc["recruitmentVisible"] = true;
      driverDoc["servedCities"] = ["Lagos"];
      driverDoc["placementProfile"] = {
        preferredCity: "Lagos",
        salaryExpectation: 200000,
        salaryExpectationMinNgn: 150000,
        salaryExpectationMaxNgn: 250000,
        experienceYears: 7,
        profileSummary: "Dev placement profile",
        backgroundConsent: true,
        reference: { name: "Ref Person", phone: "+2348000000001" },
      };
      driverDoc["recruitmentProfile"] = {
        preferredCity: "Lagos",
        salaryExpectationMinNgn: 150000,
        salaryExpectationMaxNgn: 250000,
        experienceYears: 7,
        profileImageUrl: "",
        languages: ["English"],
        familyFitTags: ["Reliable"],
      };
    }

    await userRef.set(userDoc, { merge: true });
    await driverRef.set(driverDoc, { merge: true });

    // Optionally seed an upcoming booking for fleet track
    let bookingId: string | undefined;
    if (seedBooking) {
      const dt = new Date(Date.now() + 60 * 60 * 1000); // +1h
      const bRef = adminDb.collection("bookings").doc();
      await bRef.set({
        driverId: uid,
        pickupAddress: "Lekki Phase 1",
        dropoffAddress: "Victoria Island",
        scheduledPickupTime: dt,
        status: "confirmed",
        pickupLocation: { type: "Point", coordinates: [3.4725, 6.4433] }, // [lng, lat]
        dropoffLocation: { type: "Point", coordinates: [3.421, 6.4281] },
        fare: 7500,
        payment: { status: "succeeded" },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      bookingId = bRef.id;
    }

    return NextResponse.json(
      { uid, email, password, track, approved, bookingId },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in dev/seed-driver:", error);
    return NextResponse.json(
      { error: "Failed to seed driver." },
      { status: 500 },
    );
  }
}
