import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/maps/geocode?q=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    return NextResponse.json({ items: [] }, { status: 200 });
  } catch (error) {
    console.error("Error in geocode endpoint:", error);
    return NextResponse.json(
      { error: "Failed to geocode address." },
      { status: 500 },
    );
  }
}
