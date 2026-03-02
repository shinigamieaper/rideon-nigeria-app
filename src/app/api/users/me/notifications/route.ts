import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const DEFAULT_PREFS = {
  enabled: true,
  my_trips: {
    trip_confirmation: { push: true, email: true },
    trip_reminder: { push: true },
    driver_assigned: { push: true, email: true },
    driver_en_route: { push: true },
    trip_completed_receipt: { email: true },
  },
  hiring: {
    new_message: { push: true, email: true },
    interview_request_update: { push: true, email: true },
    offer_update: { push: true, email: true },
    contract_activated: { email: true },
    monthly_payment_reminder: { email: true },
  },
  general: {
    platform_updates: { email: true },
    special_offers: { email: true },
  },
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const doc = await adminDb
      .collection("users")
      .doc(uid)
      .collection("settings")
      .doc("notifications")
      .get();
    const prefs = doc.exists ? (doc.data() as any) : DEFAULT_PREFS;

    return NextResponse.json(prefs, { status: 200 });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));

    // Very light validation: ensure enabled is boolean and structure is object
    const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
    const payload: any = { enabled };

    for (const key of ["my_trips", "hiring", "general"] as const) {
      if (body[key] && typeof body[key] === "object") {
        payload[key] = body[key];
      }
    }

    await adminDb
      .collection("users")
      .doc(uid)
      .collection("settings")
      .doc("notifications")
      .set(payload, { merge: true });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences." },
      { status: 500 },
    );
  }
}
