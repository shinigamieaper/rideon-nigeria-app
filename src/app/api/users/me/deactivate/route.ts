import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// POST /api/users/me/deactivate
// Marks the user's account as deactivated (placeholder; does not delete data)
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const nowIso = new Date().toISOString();
    await adminDb
      .collection("users")
      .doc(uid)
      .set(
        { deactivated: true, deactivatedAt: nowIso, updatedAt: nowIso },
        { merge: true },
      );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error deactivating account:", error);
    return NextResponse.json(
      { error: "Failed to deactivate account." },
      { status: 500 },
    );
  }
}
