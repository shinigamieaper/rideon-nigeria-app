import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/users/me/places
// Returns { home, work, favorites } where each place: { id?, label, coords?: [lon, lat] }
export async function GET(req: Request) {
  try {
    return NextResponse.json(
      { error: "Saved Places feature has been removed." },
      { status: 410 },
    );
  } catch (error) {
    console.error("Saved Places GET error:", error);
    return NextResponse.json(
      { error: "Failed to handle saved places." },
      { status: 500 },
    );
  }
}

// PUT /api/users/me/places
// Body may include any of: { home?: place|null, work?: place|null, favorites?: place[] }
// Replaces provided fields; omits unspecified.
export async function PUT(req: Request) {
  try {
    return NextResponse.json(
      { error: "Saved Places feature has been removed." },
      { status: 410 },
    );
  } catch (error) {
    console.error("Saved Places PUT error:", error);
    return NextResponse.json(
      { error: "Failed to handle saved places." },
      { status: 500 },
    );
  }
}
