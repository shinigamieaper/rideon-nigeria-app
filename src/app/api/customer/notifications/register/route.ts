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
 * POST /api/customer/notifications/register
 * Register an FCM token for the authenticated customer
 *
 * Body: { token: string }
 */
export async function POST(req: Request) {
  try {
    // Authenticate customer
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

    // Save FCM token to user document
    // Use arrayUnion to avoid duplicates
    await adminDb
      .collection("users")
      .doc(uid)
      .update({
        fcmTokens: FieldValue.arrayUnion(fcmToken),
        lastFcmTokenUpdate: FieldValue.serverTimestamp(),
      });

    console.info(
      "[customer/notifications/register] FCM token registered for user:",
      uid,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[customer/notifications/register] Error:", error);
    return NextResponse.json(
      { error: "Failed to register token" },
      { status: 500 },
    );
  }
}
