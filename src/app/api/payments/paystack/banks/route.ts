import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// In-memory cache for bank list
let cachedBanks: Array<{ code: string; name: string }> | null = null;
let cacheTimestamp: number | null = null;

// Fallback bank list (current hardcoded list)
const FALLBACK_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Parallex Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

// GET: Fetch list of Nigerian banks from Paystack
export async function GET() {
  try {
    // Check cache validity
    const now = Date.now();
    if (
      cachedBanks &&
      cacheTimestamp &&
      now - cacheTimestamp < CACHE_DURATION
    ) {
      console.log("[paystack/banks] Returning cached banks");
      return NextResponse.json(
        { banks: cachedBanks, source: "cache" },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "public, s-maxage=86400, stale-while-revalidate=43200",
          },
        },
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.warn(
        "[paystack/banks] PAYSTACK_SECRET_KEY not configured, using fallback",
      );
      return NextResponse.json(
        { banks: FALLBACK_BANKS, source: "fallback" },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=3600",
          },
        },
      );
    }

    // Fetch from Paystack API
    const response = await fetch(
      "https://api.paystack.co/bank?country=nigeria&perPage=500",
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error("[paystack/banks] Paystack API failed:", response.status);
      return NextResponse.json(
        { banks: FALLBACK_BANKS, source: "fallback" },
        { status: 200 },
      );
    }

    const data = await response.json();

    if (!data.status || !data.data || !Array.isArray(data.data)) {
      console.error("[paystack/banks] Invalid response structure");
      return NextResponse.json(
        { banks: FALLBACK_BANKS, source: "fallback" },
        { status: 200 },
      );
    }

    // Map to our format
    const banks = data.data
      .map((bank: any) => ({
        code: bank.code,
        name: bank.name,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Update cache
    cachedBanks = banks;
    cacheTimestamp = now;

    console.log(`[paystack/banks] Fetched ${banks.length} banks from Paystack`);

    return NextResponse.json(
      { banks, source: "paystack" },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      },
    );
  } catch (error) {
    console.error("[paystack/banks] Error fetching banks:", error);
    return NextResponse.json(
      { banks: FALLBACK_BANKS, source: "fallback" },
      { status: 200 },
    );
  }
}
