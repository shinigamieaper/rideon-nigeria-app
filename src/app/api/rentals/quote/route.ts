import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  computeVatAmountNgn,
  resolveVehiclePricingSnapshot,
} from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * POST /api/rentals/quote
 * Body: {
 *   listingId: string,
 *   rentalUnit: 'day' | '4h',
 *   startDate?: string, // yyyy-mm-dd
 *   endDate?: string,   // yyyy-mm-dd (for multi-day)
 *   startTime?: string, // HH:mm
 *   endTime?: string,   // HH:mm
 *   blocks?: number     // explicit number of 4h blocks (optional)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as any);
    const listingId = String(body?.listingId || "").trim();
    const rentalUnit = String(body?.rentalUnit || "").trim();

    if (!listingId || (rentalUnit !== "day" && rentalUnit !== "4h")) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const doc = await adminDb.collection("vehicles").doc(listingId).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }
    const d = doc.data() as any;

    if (
      d?.adminActive === false ||
      String(d?.status || "available") !== "available"
    ) {
      return NextResponse.json(
        { error: "Listing not available." },
        { status: 404 },
      );
    }

    const pricing = resolveVehiclePricingSnapshot(d);
    const dayRate = pricing.dayRateNgn;
    const block4hRate = pricing.block4hRateNgn;

    let quantity = 1; // days or 4h blocks

    if (rentalUnit === "day") {
      const sd = String(body?.startDate || "").trim();
      const ed = String(body?.endDate || "").trim();
      if (sd && ed) {
        const a = new Date(sd + "T00:00:00");
        const b = new Date(ed + "T00:00:00");
        const diff =
          Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1; // inclusive
        quantity = Math.max(1, isFinite(diff) ? diff : 1);
      } else {
        quantity = 1;
      }
      if (dayRate == null) {
        return NextResponse.json(
          { error: "Day rate not available for this listing." },
          { status: 400 },
        );
      }
    } else {
      // 4-hour block unit
      const explicitBlocks = Number(body?.blocks);
      if (isFinite(explicitBlocks) && explicitBlocks > 0) {
        quantity = Math.max(1, Math.floor(explicitBlocks));
      } else {
        const sd = String(body?.startDate || "").trim();
        const st = String(body?.startTime || "").trim();
        const et = String(body?.endTime || "").trim();
        if (sd && st && et) {
          const start = new Date(`${sd}T${st}:00`);
          const end = new Date(`${sd}T${et}:00`);
          let hours = Math.ceil(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60),
          );
          if (!isFinite(hours) || hours <= 0) hours = 4;
          quantity = Math.max(1, Math.ceil(hours / 4));
        } else {
          quantity = 1;
        }
      }
      if (block4hRate == null) {
        return NextResponse.json(
          { error: "4-hour block rate not available for this listing." },
          { status: 400 },
        );
      }
    }

    const baseRate =
      rentalUnit === "day" ? (dayRate as number) : (block4hRate as number);
    const subtotal = Math.round(baseRate * quantity);
    const vatAmount = computeVatAmountNgn({
      subtotalNgn: subtotal,
      vatEnabled: pricing.vatEnabled,
      vatRateBps: pricing.vatRateBps,
    });
    const total = subtotal + vatAmount;

    const title =
      [d?.make, d?.model].filter(Boolean).join(" ") || d?.category || "Vehicle";

    return NextResponse.json(
      {
        currency: "NGN",
        rentalUnit,
        quantity,
        baseRateNgn: baseRate,
        subtotalNgn: subtotal,
        vat: {
          enabled: pricing.vatEnabled,
          rateBps: pricing.vatRateBps,
          amountNgn: vatAmount,
        },
        totalNgn: total,
        listing: {
          id: doc.id,
          title,
          city: d?.city || "",
          category: d?.category || "",
          seats: typeof d?.seats === "number" ? d.seats : null,
          image:
            Array.isArray(d?.images) && d.images.length > 0
              ? d.images[0]
              : null,
        },
        // Echo back for client confirmation
        startDate: body?.startDate || null,
        endDate: body?.endDate || null,
        startTime: body?.startTime || null,
        endTime: body?.endTime || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating rental quote:", error);
    return NextResponse.json(
      { error: "Failed to generate rental quote." },
      { status: 500 },
    );
  }
}
