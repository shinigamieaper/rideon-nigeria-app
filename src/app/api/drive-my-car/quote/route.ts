import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getOnDemandDriverPricingConfig } from "@/lib/onDemandDriverPricing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await adminAuth.verifyIdToken(token);

    const body = await req.json().catch(() => ({}) as any);

    const city = String(body?.city || "").trim();
    const hoursRaw = Number(
      body?.blockHours ?? body?.hours ?? body?.driveMyCarHours,
    );
    const hours = Math.round(hoursRaw);

    if (!city || !Number.isFinite(hoursRaw)) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    const pricing = await getOnDemandDriverPricingConfig();
    if (!pricing.enabled) {
      return NextResponse.json(
        { error: "Hire a Driver is currently unavailable." },
        { status: 503 },
      );
    }

    const allowed = new Set(
      Array.isArray(pricing?.blockHours) ? pricing.blockHours : [],
    );

    if (!allowed.has(hours)) {
      return NextResponse.json(
        { error: "Unsupported duration." },
        { status: 400 },
      );
    }

    const cityRates = pricing?.cityBlockRatesNgn?.[city];
    const unitRateNgn = cityRates
      ? Number((cityRates as any)[String(hours)])
      : 0;

    if (!unitRateNgn || !Number.isFinite(unitRateNgn) || unitRateNgn <= 0) {
      return NextResponse.json(
        {
          error:
            "Hire a Driver pricing is not configured for this city/duration.",
        },
        { status: 400 },
      );
    }

    const totalNgn = Math.round(unitRateNgn);

    return NextResponse.json(
      {
        currency: "NGN",
        service: "drive_my_car",
        city,
        blockHours: hours,
        subtotalNgn: totalNgn,
        vat: {
          enabled: false,
          rateBps: 0,
          amountNgn: 0,
        },
        totalNgn,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating Hire a Driver quote:", error);
    return NextResponse.json(
      { error: "Failed to generate Hire a Driver quote." },
      { status: 500 },
    );
  }
}
