import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
      "driver_admin",
      "product_admin",
      "finance_admin",
    ]);
    if (response) return response;

    if (!caller?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    await adminDb
      .collection("users")
      .doc(caller.uid)
      .set(
        {
          adminFcmTokens: FieldValue.arrayUnion(fcmToken),
          lastAdminFcmTokenUpdate: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[admin/notifications/register] Error:", error);
    return NextResponse.json(
      { error: "Failed to register token." },
      { status: 500 },
    );
  }
}
