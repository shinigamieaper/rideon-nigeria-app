import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/maps/reverse?lon=...&lat=...&provider=maptiler
export async function GET(req: Request) {
  try {
    return NextResponse.json(
      { error: "Reverse geocoding is disabled." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in reverse endpoint:", error);
    return NextResponse.json(
      { error: "Reverse geocoding failed." },
      { status: 500 },
    );
  }
}
