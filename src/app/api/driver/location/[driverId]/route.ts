import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// GET /api/driver/location/[driverId]
// Returns latest known coordinates for a driver as { coords: [lon, lat], heading?: number, ts?: string }
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ driverId: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    // We don't strictly check uid vs driverId here; customers can poll their assigned driver's location.
    // Authorization is validated at the booking level on the detailed trip page.
    await adminAuth.verifyIdToken(token);

    const { driverId } = await ctx.params;
    if (!driverId)
      return NextResponse.json({ error: "Missing driverId." }, { status: 400 });

    const doc = await adminDb
      .collection("driver_locations")
      .doc(driverId)
      .get();
    if (!doc.exists) {
      // Graceful empty payload to avoid noisy errors during development
      return NextResponse.json({ coords: null }, { status: 200 });
    }
    const d = doc.data() as any;
    const lon = Number(Array.isArray(d.coords) ? d.coords[0] : d.lon);
    const lat = Number(Array.isArray(d.coords) ? d.coords[1] : d.lat);

    if (!isFinite(lon) || !isFinite(lat)) {
      return NextResponse.json({ coords: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        coords: [lon, lat],
        heading: typeof d.heading === "number" ? d.heading : undefined,
        ts:
          typeof d.ts === "string"
            ? d.ts
            : d.ts?.toDate?.()
              ? d.ts.toDate().toISOString()
              : undefined,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching driver location:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver location." },
      { status: 500 },
    );
  }
}
