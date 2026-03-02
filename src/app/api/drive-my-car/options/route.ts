import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { getOnDemandDriverPricingConfig } from "@/lib/onDemandDriverPricing";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await adminAuth.verifyIdToken(token);

    const pricing = await getOnDemandDriverPricingConfig();
    if (!pricing.enabled) {
      return NextResponse.json(
        { error: "Hire a Driver is currently unavailable." },
        { status: 503 },
      );
    }

    const blockHours = Array.isArray(pricing?.blockHours)
      ? pricing.blockHours
      : [];

    const cityRates = pricing?.cityBlockRatesNgn || {};

    const cityDurations: Record<string, number[]> = {};

    for (const [city, rates] of Object.entries(cityRates)) {
      if (!city || typeof city !== "string") continue;
      if (!rates || typeof rates !== "object") continue;

      const hoursForCity = blockHours
        .map((h) => Math.round(Number(h)))
        .filter((h) => Number.isFinite(h) && h > 0)
        .filter((h) => {
          const v = Number((rates as any)[String(h)]);
          return Number.isFinite(v) && v > 0;
        });

      if (hoursForCity.length > 0) {
        cityDurations[city] = Array.from(new Set(hoursForCity)).sort(
          (a, b) => a - b,
        );
      }
    }

    const cities = Object.keys(cityDurations).sort((a, b) =>
      a.localeCompare(b),
    );

    return NextResponse.json(
      {
        service: "drive_my_car",
        blockHours: Array.from(
          new Set(blockHours.map((h) => Math.round(Number(h)))),
        )
          .filter((h) => Number.isFinite(h) && h > 0)
          .sort((a, b) => a - b),
        cities,
        cityDurations,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching Hire a Driver options:", error);
    return NextResponse.json(
      { error: "Failed to fetch Hire a Driver options." },
      { status: 500 },
    );
  }
}
