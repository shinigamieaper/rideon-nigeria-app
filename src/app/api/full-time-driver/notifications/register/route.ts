import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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

    const body = await req.json().catch(() => ({}));
    const fcmToken = (body as any)?.token;

    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid token" },
        { status: 400 },
      );
    }

    const appRef = adminDb.collection("full_time_driver_applications").doc(uid);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Full-time driver application not found" },
        { status: 403 },
      );
    }

    await appRef.set(
      {
        fcmTokens: FieldValue.arrayUnion(fcmToken),
        lastFcmTokenUpdate: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[full-time-driver/notifications/register] Error:", error);
    return NextResponse.json(
      { error: "Failed to register token" },
      { status: 500 },
    );
  }
}
