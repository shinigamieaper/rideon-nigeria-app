import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/maps/place-details?provider=google&place_id=...
export async function GET(req: Request) {
  try {
    return NextResponse.json(
      { id: null, label: "", coords: null, provider: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in place-details endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch place details." },
      { status: 500 },
    );
  }
}
