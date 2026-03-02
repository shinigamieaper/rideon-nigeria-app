export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { fetchAuditLogs } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

/**
 * GET /api/admin/audit-logs
 * Fetch recent audit log entries
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20", 10),
      100,
    );

    const logs = await fetchAuditLogs(limit);

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs." },
      { status: 500 },
    );
  }
}
