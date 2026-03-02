import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/drivers/[driverId]/testimonials
// Public endpoint: returns published testimonials for a driver
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ driverId: string }> },
) {
  try {
    const { driverId } = await ctx.params;
    if (!driverId) {
      return NextResponse.json({ error: "Missing driverId." }, { status: 400 });
    }

    const snap = await adminDb
      .collection("driver_testimonials")
      .where("driverId", "==", driverId)
      .where("status", "==", "published")
      .limit(100)
      .get();

    const testimonials: Array<{
      id: string;
      comment: string;
      compliments: string[];
      customerName: string;
      customerInitial: string;
      createdAt: string | null;
    }> = [];
    snap.forEach((doc) => {
      const d = doc.data() as Record<string, unknown>;
      testimonials.push({
        id: doc.id,
        comment: typeof d.comment === "string" ? d.comment : "",
        compliments: Array.isArray(d.compliments) ? d.compliments : [],
        customerName:
          typeof d.customerName === "string" ? d.customerName : "Customer",
        customerInitial:
          typeof d.customerInitial === "string" ? d.customerInitial : "C",
        createdAt: typeof d.createdAt === "string" ? d.createdAt : null,
      });
    });

    // Sort in-memory by createdAt desc (ISO string sorts lexicographically)
    testimonials.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || ""),
    );

    return NextResponse.json({ testimonials }, { status: 200 });
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials." },
      { status: 500 },
    );
  }
}
