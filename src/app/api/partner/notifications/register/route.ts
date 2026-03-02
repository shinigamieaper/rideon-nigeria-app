import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const fcmToken = body.token;

    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid token" },
        { status: 400 },
      );
    }

    const appRef = adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
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
    console.error("[partner/notifications/register] Error:", error);
    return NextResponse.json(
      { error: "Failed to register token." },
      { status: 500 },
    );
  }
}
