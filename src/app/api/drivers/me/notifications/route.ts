import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Default notification preferences for drivers
function getDefaultPreferences() {
  return {
    enabled: true,
    trips: {
      trip_assigned: { push: true },
      trip_reminder: { push: true },
      booking_cancelled: { push: true, email: true },
      trip_completed: {},
    },
    earnings: {
      payout_processed: { push: true, email: true },
      earnings_milestone: { push: true },
      contract_payment_received: { email: true },
    },
    general: {
      new_message: { push: true, email: true },
      platform_updates: { email: true },
      rating_received: { push: true },
    },
  };
}

// GET /api/drivers/me/notifications
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

    const driverSnap = await adminDb.collection("drivers").doc(uid).get();
    if (!driverSnap.exists) {
      return NextResponse.json(
        { error: "Driver profile not found." },
        { status: 404 },
      );
    }

    const data = driverSnap.data() as any;
    const prefs = data?.notificationPreferences || getDefaultPreferences();

    return NextResponse.json(prefs, { status: 200 });
  } catch (error) {
    console.error("Error fetching driver notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences." },
      { status: 500 },
    );
  }
}

// PUT /api/drivers/me/notifications
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
    const uid = decoded.uid;

    const body = await req.json();

    // Update driver notification preferences
    const driverRef = adminDb.collection("drivers").doc(uid);
    await driverRef.update({
      notificationPreferences: body,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("Error updating driver notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences." },
      { status: 500 },
    );
  }
}
