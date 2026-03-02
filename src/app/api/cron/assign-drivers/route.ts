import { NextRequest, NextResponse } from "next/server";
import { runOfferPublishingProcess } from "@/services/assignment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizeCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing CRON_SECRET server configuration." },
        { status: 500 },
      ),
    };
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  const ok = Boolean(token) && token === secret;
  return { ok, response: null as NextResponse | null };
}

/**
 * POST /api/cron/assign-drivers
 *
 * Cron job endpoint that triggers the driver assignment batch process.
 *
 * Security:
 * - This endpoint should be protected with a secret token to prevent unauthorized access
 * - In production, configure your cron service (e.g., Vercel Cron, GitHub Actions, or external service)
 *   to include the Authorization header: `Bearer YOUR_CRON_SECRET`
 *
 * Usage:
 * - Set CRON_SECRET in your .env.local
 * - Configure a cron service to POST to this endpoint every 5-15 minutes
 *
 * Example cron schedule (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/assign-drivers",
 *     "schedule": "*\\/10 * * * *"  // escaped to avoid closing this block comment
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeCron(request);
    if (auth.response) return auth.response;
    if (!auth.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runOfferPublishingProcess();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error("[Cron API] Error running assignment process:", error);
    return NextResponse.json(
      { error: "Failed to run assignment process." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron/assign-drivers
 *
 * Health check endpoint to verify the cron job is configured correctly.
 * Returns basic information about the assignment service.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeCron(request);
    if (auth.response) return auth.response;
    if (auth.ok) {
      const result = await runOfferPublishingProcess();
      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    return NextResponse.json(
      {
        service: "Driver Assignment Service",
        status: "ok",
        message: "Offer publishing enabled for drive_my_car.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Cron API] Error in health check:", error);

    return NextResponse.json(
      { error: "Failed to run health check." },
      { status: 500 },
    );
  }
}
