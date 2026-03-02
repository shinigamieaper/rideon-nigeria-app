import { NextResponse } from "next/server";

export const runtime = "nodejs";

// POST /api/bookings
// Body: booking object from client
export async function POST(req: Request) {
  try {
    return NextResponse.json(
      {
        error:
          "This endpoint is disabled. Please use Paystack checkout via /api/payments/paystack/init to create a reservation.",
      },
      { status: 410 },
    );
  } catch (error) {
    console.error("[api/bookings] Error:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 },
    );
  }
}
