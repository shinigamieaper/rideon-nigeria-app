import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/dev/seed-vehicles
 * Deprecated endpoint.
 *
 * Hardcoded sample seeding has been removed.
 */
export async function POST(req: Request) {
  try {
    void req;
    void adminDb;

    return NextResponse.json(
      {
        error:
          "Vehicle seed endpoint has been removed. Please create catalog vehicles via the partner/admin catalog flows.",
      },
      { status: 410 },
    );
  } catch (error) {
    console.error("Error in dev/seed-vehicles:", error);
    return NextResponse.json(
      { error: "Failed to seed vehicles." },
      { status: 500 },
    );
  }
}
