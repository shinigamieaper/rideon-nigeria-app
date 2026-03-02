import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// POST /api/trips/[bookingId]/feedback
// Body: { liked: boolean; compliments?: string[]; comment?: string; issues?: string[]; note?: string }
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ bookingId: string }> },
) {
  try {
    // Check if driver ratings are enabled via feature flag
    try {
      const flagsDoc = await adminDb
        .collection("config")
        .doc("feature_flags")
        .get();
      const flagsData = flagsDoc.exists ? flagsDoc.data() : {};
      const driverRatings = flagsData?.driverRatings !== false; // Default to true

      if (!driverRatings) {
        return NextResponse.json(
          {
            error: "Driver ratings are currently disabled.",
            code: "RATINGS_DISABLED",
          },
          { status: 503 },
        );
      }
    } catch (flagError) {
      console.warn(
        "[feedback] Failed to check feature flag, allowing by default",
        flagError,
      );
    }

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
    const liked = Boolean(body?.liked);
    const compliments: string[] = Array.isArray(body?.compliments)
      ? body.compliments.slice(0, 10).map(String)
      : [];
    const comment: string | undefined =
      typeof body?.comment === "string"
        ? String(body.comment).slice(0, 1000)
        : undefined;
    const issues: string[] = Array.isArray(body?.issues)
      ? body.issues.slice(0, 10).map(String)
      : [];
    const note: string | undefined =
      typeof body?.note === "string"
        ? String(body.note).slice(0, 1000)
        : undefined;

    const ref = adminDb.collection("bookings").doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    const data = snap.data() as any;
    if (data.uid !== uid)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    // Check if feedback already submitted (prevent double-voting)
    if (data.feedback?.createdAt) {
      return NextResponse.json(
        { error: "Feedback already submitted for this trip." },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const driverId: string | undefined = data.driverId || data.driverInfo?.id;

    // Fetch customer info for testimonial
    let customerName = "Customer";
    let customerInitial = "C";
    try {
      const userSnap = await adminDb.collection("users").doc(uid).get();
      if (userSnap.exists) {
        const userData = userSnap.data() as any;
        const firstName = userData.firstName || "";
        const lastName = userData.lastName || "";
        customerName = firstName || "Customer";
        customerInitial = firstName ? firstName.charAt(0).toUpperCase() : "C";
        if (lastName) {
          customerName = `${firstName} ${lastName.charAt(0)}.`;
        }
      }
    } catch (e) {
      console.error("Error fetching customer info:", e);
    }

    const update: any = {
      feedback: {
        liked,
        compliments,
        issues,
        comment: comment || "",
        note: note || "",
        createdAt: nowIso,
      },
    };

    // Create public testimonial for thumbs up with compliments or comment
    let testimonialId: string | null = null;
    if (liked && driverId && (compliments.length > 0 || comment)) {
      const tDoc = await adminDb.collection("driver_testimonials").add({
        driverId,
        customerId: uid,
        customerName,
        customerInitial,
        bookingId,
        comment: comment || "",
        compliments,
        createdAt: nowIso,
        status: "published",
      });
      testimonialId = tDoc.id;
      update.feedback.testimonialId = testimonialId;
    }

    // Store negative feedback for internal review (not public)
    if (!liked && driverId && (issues.length > 0 || note)) {
      await adminDb.collection("driver_feedback_issues").add({
        driverId,
        customerId: uid,
        bookingId,
        issues,
        note: note || "",
        createdAt: nowIso,
        status: "pending_review",
      });
    }

    await ref.set(update, { merge: true });

    // Update driver thumbsUp/thumbsDown counts
    if (driverId) {
      const driverRef = adminDb.collection("drivers").doc(driverId);
      const incrementField = liked ? "thumbsUp" : "thumbsDown";
      await driverRef.set(
        {
          [incrementField]: FieldValue.increment(1),
          totalRatings: FieldValue.increment(1),
          lastFeedbackAt: nowIso,
        },
        { merge: true },
      );
    }

    return NextResponse.json({ ok: true, testimonialId }, { status: 201 });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback." },
      { status: 500 },
    );
  }
}
