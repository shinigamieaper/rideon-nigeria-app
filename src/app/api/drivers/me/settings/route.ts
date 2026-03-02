import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// GET /api/drivers/me/settings
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    const [userSnap, driverSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb.collection("drivers").doc(uid).get(),
    ]);

    if (!driverSnap.exists) {
      return NextResponse.json(
        { error: "Driver profile not found." },
        { status: 404 },
      );
    }

    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const driverData = driverSnap.data() as any;

    const placementOptIn = driverData?.placementOptIn === true;
    const fleetOptIn = true;
    const fleetOnboardingStatus = null;
    const rideOnVerified = driverData?.rideOnVerified === true;

    const rawTrack = userData?.driverTrack as string | undefined;
    const normalized = rawTrack === "placement_only" ? "placement" : rawTrack;
    const driverTrack =
      normalized === "fleet" ||
      normalized === "placement" ||
      normalized === "both"
        ? normalized
        : "fleet";

    return NextResponse.json(
      {
        placementOptIn,
        fleetOptIn,
        fleetOnboardingStatus,
        driverTrack,
        rideOnVerified,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching driver settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings." },
      { status: 500 },
    );
  }
}

// PUT /api/drivers/me/settings
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Driver marketplace settings are no longer configurable." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error updating driver settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings." },
      { status: 500 },
    );
  }
}
