import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/driver/ratings
// Returns driver's thumbsUp/thumbsDown counts and recent feedback
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token" },
        { status: 401 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }
    const uid = decoded.uid;

    // Fetch driver stats
    const driverSnap = await adminDb.collection("drivers").doc(uid).get();
    const driverData = driverSnap.exists
      ? (driverSnap.data() as Record<string, unknown>)
      : {};

    const thumbsUp =
      typeof driverData.thumbsUp === "number" ? driverData.thumbsUp : 0;
    const thumbsDown =
      typeof driverData.thumbsDown === "number" ? driverData.thumbsDown : 0;
    const totalRatings =
      typeof driverData.totalRatings === "number" ? driverData.totalRatings : 0;

    // Fetch recent feedback from testimonials (positive only - public)
    const testimonialSnap = await adminDb
      .collection("driver_testimonials")
      .where("driverId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const positiveFeedback: Array<{
      id: string;
      liked: true;
      compliments: string[];
      comment: string;
      customerName: string;
      customerInitial: string;
      createdAt: string;
    }> = [];

    testimonialSnap.forEach((doc) => {
      const d = doc.data() as Record<string, unknown>;
      positiveFeedback.push({
        id: doc.id,
        liked: true,
        compliments: Array.isArray(d.compliments) ? d.compliments : [],
        comment: typeof d.comment === "string" ? d.comment : "",
        customerName:
          typeof d.customerName === "string" ? d.customerName : "Customer",
        customerInitial:
          typeof d.customerInitial === "string" ? d.customerInitial : "C",
        createdAt: typeof d.createdAt === "string" ? d.createdAt : "",
      });
    });

    // Fetch recent negative feedback (private - only visible to driver)
    const issuesSnap = await adminDb
      .collection("driver_feedback_issues")
      .where("driverId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const negativeFeedback: Array<{
      id: string;
      liked: false;
      issues: string[];
      createdAt: string;
    }> = [];

    issuesSnap.forEach((doc) => {
      const d = doc.data() as Record<string, unknown>;
      negativeFeedback.push({
        id: doc.id,
        liked: false,
        issues: Array.isArray(d.issues) ? d.issues : [],
        createdAt: typeof d.createdAt === "string" ? d.createdAt : "",
      });
    });

    // Merge and sort all feedback by date
    const allFeedback = [...positiveFeedback, ...negativeFeedback]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 10);

    return NextResponse.json(
      {
        stats: {
          thumbsUp,
          thumbsDown,
          totalRatings,
        },
        recentFeedback: allFeedback,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching driver ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings." },
      { status: 500 },
    );
  }
}
