export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminRbac";

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    return NextResponse.json(
      { error: "Auto-assignment has been removed." },
      { status: 410 },
    );
  } catch (error: any) {
    console.error(
      "Error handling deprecated assignment run-now endpoint:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 },
    );
  }
}
