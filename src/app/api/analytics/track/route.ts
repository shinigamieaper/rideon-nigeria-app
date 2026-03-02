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
      uid = decoded?.uid ? (decoded.uid as string) : null;
    }

    if (!uid) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (token) {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid as string;
      }
    }

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}) as any);
    const event = typeof body?.event === "string" ? body.event.trim() : "";
    const label =
      typeof body?.label === "string" ? body.label.slice(0, 120) : undefined;
    const page =
      typeof body?.page === "string" ? body.page.slice(0, 200) : undefined;

    if (!event) {
      return NextResponse.json({ error: "Missing event." }, { status: 400 });
    }

    await adminDb.collection("analytics_events").add({
      uid,
      event,
      label,
      page,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to track analytics event:", error);
    return NextResponse.json(
      { error: "Failed to track analytics event." },
      { status: 500 },
    );
  }
}
