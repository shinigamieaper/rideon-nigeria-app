import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/adminRbac";

export const runtime = "nodejs";

interface HealthMetrics {
  /** Total registered FCM tokens across all users */
  totalTokens: {
    customers: number;
    drivers: number;
  };
  /** Notifications in last 24 hours */
  last24h: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    noTokens: number;
    successRate: number;
  };
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Human-readable status message */
  message: string;
  /** Any active issues */
  issues: string[];
}

/**
 * GET /api/admin/notifications/health
 * Returns push notification system health metrics
 */
export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    const issues: string[] = [];

    // Count FCM tokens
    let customerTokenCount = 0;
    let driverTokenCount = 0;

    try {
      // Sample customers with tokens (limit query to avoid full scan)
      const customersWithTokens = await adminDb
        .collection("users")
        .where("fcmTokens", "!=", [])
        .limit(500)
        .select("fcmTokens")
        .get();

      customersWithTokens.forEach((doc) => {
        const tokens = doc.data()?.fcmTokens || [];
        customerTokenCount += tokens.length;
      });

      // Sample drivers with tokens
      const driversWithTokens = await adminDb
        .collection("drivers")
        .where("fcmTokens", "!=", [])
        .limit(500)
        .select("fcmTokens")
        .get();

      driversWithTokens.forEach((doc) => {
        const tokens = doc.data()?.fcmTokens || [];
        driverTokenCount += tokens.length;
      });
    } catch (err) {
      console.warn("[Health Check] Failed to count tokens:", err);
      // Continue with zeros
    }

    // Get notification stats for last 24h
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let total = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let noTokens = 0;

    try {
      const logsSnapshot = await adminDb
        .collection("notification_logs")
        .where("createdAt", ">=", Timestamp.fromDate(yesterday))
        .orderBy("createdAt", "desc")
        .limit(1000)
        .get();

      logsSnapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        switch (data.status) {
          case "sent":
            sent++;
            break;
          case "failed":
            failed++;
            break;
          case "skipped":
            skipped++;
            break;
          case "no_tokens":
            noTokens++;
            break;
        }
      });
    } catch (err) {
      console.warn("[Health Check] Failed to fetch notification logs:", err);
      // Continue with zeros
    }

    // Calculate success rate (exclude skipped as they're intentional)
    const attemptedDeliveries = sent + failed + noTokens;
    const successRate =
      attemptedDeliveries > 0 ? (sent / attemptedDeliveries) * 100 : 100;

    // Determine health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    let message = "Push notifications are operating normally.";

    // Check for issues
    if (customerTokenCount + driverTokenCount === 0) {
      issues.push(
        "No FCM tokens registered - users may not have enabled notifications",
      );
    }

    if (failed > 10 && successRate < 80) {
      issues.push(
        `High failure rate: ${failed} failures in last 24h (${successRate.toFixed(1)}% success)`,
      );
      status = "degraded";
    }

    if (successRate < 50) {
      status = "unhealthy";
      message = "Push notification delivery is significantly degraded.";
    } else if (successRate < 80 && attemptedDeliveries > 5) {
      status = "degraded";
      message = "Some push notifications are failing to deliver.";
    }

    if (noTokens > total * 0.5 && total > 10) {
      issues.push(
        "Many users have no FCM tokens - check if permission prompts are working",
      );
    }

    const health: HealthMetrics = {
      totalTokens: {
        customers: customerTokenCount,
        drivers: driverTokenCount,
      },
      last24h: {
        total,
        sent,
        failed,
        skipped,
        noTokens,
        successRate: Math.round(successRate * 10) / 10,
      },
      status,
      message,
      issues,
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("[Admin Notifications Health] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification health metrics." },
      { status: 500 },
    );
  }
}
