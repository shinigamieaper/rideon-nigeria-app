import { NextResponse } from "next/server";

/**
 * GET /api/admin/dashboard/charts/assignment-success
 * Returns driver assignment success rate data over time
 */
export async function GET(request: Request) {
  try {
    return NextResponse.json(
      { error: "Auto-assignment has been removed." },
      { status: 410 },
    );
  } catch (error) {
    console.error("Error fetching assignment success data:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment success data" },
      { status: 500 },
    );
  }
}
