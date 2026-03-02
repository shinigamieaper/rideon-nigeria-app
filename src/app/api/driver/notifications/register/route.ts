import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * POST /api/driver/notifications/register
 * Register an FCM token for the authenticated driver
 *
 * Body: { token: string }
 */
export async function POST(req: Request) {
  try {
    // Authenticate driver
    const c = await cookies();
    const session = c.get("rideon_session")?.value || "";

    let uid: string | null = null;

    if (session) {
      const decoded = await verifyRideOnSessionCookie(session);
      uid = decoded?.uid || null;
    }

    if (!uid) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (token) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          uid = decoded.uid;
        } catch {
          uid = null;
        }
      }
    }

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const fcmToken = body.token;

    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid token" },
        { status: 400 },
      );
    }

    // Verify this is a driver
    const driverDoc = await adminDb.collection("drivers").doc(uid).get();
    if (!driverDoc.exists) {
      return NextResponse.json(
        { error: "Driver profile not found" },
        { status: 403 },
      );
    }

    // Save FCM token to driver document
    // Use arrayUnion to avoid duplicates, and store with metadata
    await adminDb
      .collection("drivers")
      .doc(uid)
      .update({
        fcmTokens: FieldValue.arrayUnion(fcmToken),
        lastFcmTokenUpdate: FieldValue.serverTimestamp(),
      });

    console.info(
      "[notifications/register] FCM token registered for driver:",
      uid,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications/register] Error:", error);
    return NextResponse.json(
      { error: "Failed to register token" },
      { status: 500 },
    );
  }
}
