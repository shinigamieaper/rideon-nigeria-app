import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// POST /api/trips/[bookingId]/rating
// Body: { score: number (1..5), comment?: string }
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bookingId: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { bookingId } = await ctx.params;
    if (!bookingId)
      return NextResponse.json(
        { error: "Missing bookingId." },
        { status: 400 },
      );

    const body = await req.json().catch(() => ({}) as any);
    const score = Number(body?.score);
    const comment =
      typeof body?.comment === "string"
        ? String(body.comment).slice(0, 1000)
        : undefined;
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "Invalid score." }, { status: 400 });
    }

    const ref = adminDb.collection("bookings").doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    const data = snap.data() as any;
    if (data.uid !== uid)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    await ref.set(
      { rating: { customerToDriver: score, customerComment: comment ?? "" } },
      { merge: true },
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json(
      { error: "Failed to submit rating." },
      { status: 500 },
    );
  }
}
