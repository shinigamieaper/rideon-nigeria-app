export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  message: string;
  lastCheck: string;
  details?: Record<string, any>;
}

/**
 * GET /api/admin/system/health
 * Check system health metrics
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, ["super_admin"]);
    if (response) return response;

    const checks: HealthCheck[] = [];
    const now = new Date().toISOString();

    // 1. Database (Firestore) health check
    try {
      const testDoc = await adminDb
        .collection("system")
        .doc("health_check")
        .get();
      // If we can read, Firestore is healthy
      checks.push({
        name: "Database",
        status: "healthy",
        message: "Firestore is operational",
        lastCheck: now,
      });
    } catch (error) {
      checks.push({
        name: "Database",
        status: "down",
        message: "Failed to connect to Firestore",
        lastCheck: now,
      });
    }

    // 2. Assignment cron job health check
    checks.push({
      name: "Assignment Engine",
      status: "healthy",
      message: "Auto-assignment has been removed",
      lastCheck: now,
    });

    // 3. Authentication health check
    try {
      // If we got this far, auth is working
      checks.push({
        name: "Authentication",
        status: "healthy",
        message: "Firebase Auth is operational",
        lastCheck: now,
      });
    } catch (error) {
      checks.push({
        name: "Authentication",
        status: "down",
        message: "Authentication service unavailable",
        lastCheck: now,
      });
    }

    // 4. Notifications check (check if we can access notifications collection)
    try {
      // Quick query to see if notifications collection is accessible
      const notifQuery = await adminDb
        .collection("notifications")
        .limit(1)
        .get();

      checks.push({
        name: "Notifications",
        status: "healthy",
        message: "Notification system operational",
        lastCheck: now,
      });
    } catch (error) {
      checks.push({
        name: "Notifications",
        status: "degraded",
        message: "Could not verify notification system",
        lastCheck: now,
      });
    }

    // Calculate overall health
    const hasDown = checks.some((c) => c.status === "down");
    const hasDegraded = checks.some((c) => c.status === "degraded");
    const overallStatus = hasDown
      ? "down"
      : hasDegraded
        ? "degraded"
        : "healthy";

    return NextResponse.json(
      {
        status: overallStatus,
        checks,
        timestamp: now,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error checking system health:", error);
    return NextResponse.json(
      { error: "Failed to check system health." },
      { status: 500 },
    );
  }
}
