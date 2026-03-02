export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const DOC_ID = "service_pricing";

const DEFAULT_PRICING = {
  chauffeur: {
    roadFactor: 1.3,
    vatEnabled: false,
    vatRateBps: 0,
    baseFeeNgn: 0,
    minimumFareNgn: 0,
    defaultPerKmRatesNgn: {
      "Rider Economy": 450,
      "Rider General": 550,
      "Rider Coffee": 600,
      "Rider Dogon": 700,
      "Executive SUV": 950,
      "Group Van": 1100,
    } as Record<string, number>,
    cityPerKmRatesNgn: {} as Record<string, Record<string, number>>,
  },
  driveMyCar: {
    blockHours: [2, 4, 8] as number[],
    cityBlockRatesNgn: {} as Record<string, Record<string, number>>,
  },
  fullTimeAccess: {
    tiers: [
      { days: 7, priceNgn: 0, enabled: true },
      { days: 14, priceNgn: 0, enabled: true },
      { days: 21, priceNgn: 0, enabled: true },
    ] as { days: number; priceNgn: number; enabled: boolean }[],
  },
};

export async function GET() {
  try {
    const docRef = adminDb.collection("config").doc(DOC_ID);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { pricing: DEFAULT_PRICING },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }

    const data = snap.data() || {};

    const pricing = {
      chauffeur: {
        ...DEFAULT_PRICING.chauffeur,
        ...(data as any).chauffeur,
      },
      driveMyCar: {
        ...DEFAULT_PRICING.driveMyCar,
        ...(data as any).driveMyCar,
      },
      fullTimeAccess: {
        ...DEFAULT_PRICING.fullTimeAccess,
        ...(data as any).fullTimeAccess,
      },
    };

    return NextResponse.json(
      { pricing },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching service pricing config:", error);
    return NextResponse.json(
      { error: "Failed to fetch service pricing config." },
      { status: 500 },
    );
  }
}
