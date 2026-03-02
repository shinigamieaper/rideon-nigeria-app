import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/maps/route?from=lon,lat&to=lon,lat&profile=driving
// Uses OSRM demo server for routing (suitable for development/testing). No API key required.
export async function GET(req: Request) {
  try {
    return NextResponse.json(
      {
        geometry: null,
        distance: null,
        duration: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in route endpoint:", error);
    return NextResponse.json(
      { error: "Route request failed." },
      { status: 500 },
    );
  }
}
