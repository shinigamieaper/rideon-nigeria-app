import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

/**
 * GET /api/admin/operations/rules
 * Fetch current assignment rules configuration
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    return NextResponse.json(
      { error: "Auto-assignment has been removed." },
      { status: 410 },
    );
  } catch (error) {
    console.error("Error fetching assignment rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment rules" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/operations/rules
 * Update assignment rules configuration
 */
export async function PUT(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    return NextResponse.json(
      { error: "Auto-assignment has been removed." },
      { status: 410 },
    );
  } catch (error) {
    console.error("Error updating assignment rules:", error);
    return NextResponse.json(
      { error: "Failed to update assignment rules" },
      { status: 500 },
    );
  }
}
