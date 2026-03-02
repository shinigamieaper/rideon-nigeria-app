import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  computeVatAmountNgn,
  resolveVehiclePricingSnapshot,
} from "@/lib/pricing";
import { getOnDemandDriverPricingConfig } from "@/lib/onDemandDriverPricing";
import { computeChauffeurQuote } from "@/lib/servicePricing";
import { FieldValue } from "firebase-admin/firestore";
import { randomInt } from "crypto";

export const runtime = "nodejs";

// POST /api/payments/paystack/init
// Initializes a Paystack transaction and creates a pending booking
export async function POST(req: Request) {
  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const emailFromToken = (decoded as any)?.email as string | undefined;

    const body = await req.json().catch(() => ({}));

    const service = String(body?.service || "").trim();

    const pickupAddress = (body?.pickupAddress || "").trim();
    const dropoffAddress = (body?.dropoffAddress || "").trim();
    const pickupCoords = Array.isArray(body?.pickupCoords)
      ? body.pickupCoords
      : undefined;
    const dropoffCoords = Array.isArray(body?.dropoffCoords)
      ? body.dropoffCoords
      : undefined;
    const vehicleClass = (body?.vehicleClass || "").trim();
    const listingId = (body?.listingId || "").trim();
    const rentalUnit = (body?.rentalUnit || "").trim();
    const city = (body?.city || "").trim();

    const isDriveMyCar = service === "drive_my_car";

    const isRental = listingId && (rentalUnit === "day" || rentalUnit === "4h");

    // Resolve customer email (required by Paystack)
    let customerEmail = emailFromToken;
    if (!customerEmail) {
      try {
        const u = await adminAuth.getUser(uid);
        customerEmail = u.email ?? undefined;
      } catch {
        // ignore, handled below if still missing
      }
    }
    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required for payment." },
        { status: 400 },
      );
    }

    const nowTs = FieldValue.serverTimestamp();
    let amountKobo = 0;

    let computedFareNgn: number | null = null;
    let pricingBreakdown: any = null;
    let normalizedDriveMyCarPickupCoords: [number, number] | null = null;
    if (isDriveMyCar) {
      const hours = Number(
        body?.blockHours ?? body?.hours ?? body?.driveMyCarHours,
      );
      const startDate = String(body?.startDate || "").trim();
      const startTime = String(body?.startTime || "").trim();
      if (
        !pickupAddress ||
        !city ||
        !Number.isFinite(hours) ||
        !startDate ||
        !startTime
      ) {
        return NextResponse.json(
          { error: "Missing required fields." },
          { status: 400 },
        );
      }

      if (pickupCoords) {
        const normalizedPickup: [number, number] = [
          Number((pickupCoords as any)[0]),
          Number((pickupCoords as any)[1]),
        ];
        if (
          !Number.isFinite(normalizedPickup[0]) ||
          !Number.isFinite(normalizedPickup[1])
        ) {
          return NextResponse.json(
            { error: "Invalid pickupCoords." },
            { status: 400 },
          );
        }
        normalizedDriveMyCarPickupCoords = normalizedPickup;
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
      const roundedHours = Math.round(hours);
      if (!allowed.has(roundedHours)) {
        return NextResponse.json(
          { error: "Unsupported duration." },
          { status: 400 },
        );
      }

      const cityRates = pricing?.cityBlockRatesNgn?.[city];
      const unitRateNgn = cityRates
        ? Number((cityRates as any)[String(roundedHours)])
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

      computedFareNgn = Math.round(unitRateNgn);
      pricingBreakdown = {
        service: "drive_my_car",
        city,
        blockHours: roundedHours,
        subtotalNgn: computedFareNgn,
        vat: {
          enabled: false,
          rateBps: 0,
          amountNgn: 0,
        },
        totalNgn: computedFareNgn,
      };

      amountKobo = Math.max(100, Math.round(computedFareNgn * 100));
    } else if (isRental) {
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
          { status: 400 },
        );
      }

      const pricing = resolveVehiclePricingSnapshot(d);
      const dayRate = pricing.dayRateNgn;
      const block4hRate = pricing.block4hRateNgn;

      function toLocalDate(yyyy_mm_dd?: string | null, hh_mm?: string | null) {
        if (!yyyy_mm_dd) return null;
        const [y, m, dd] = String(yyyy_mm_dd)
          .split("-")
          .map((n) => parseInt(n, 10));
        const [hh, mm] = String(hh_mm || "00:00")
          .split(":")
          .map((n) => parseInt(n, 10));
        const dt = new Date(
          y || 1970,
          (m || 1) - 1,
          dd || 1,
          hh || 0,
          mm || 0,
          0,
          0,
        );
        return isNaN(dt.getTime()) ? null : dt;
      }

      let quantity = 1;
      if (rentalUnit === "day") {
        const sd = (body?.startDate || "").trim();
        const ed = (body?.endDate || "").trim();
        if (sd && ed) {
          const a = toLocalDate(sd, "00:00")!;
          const b = toLocalDate(ed, "00:00")!;
          const diff =
            Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          quantity = Math.max(1, isFinite(diff) ? diff : 1);
        }
        if (dayRate == null)
          return NextResponse.json(
            { error: "Day rate not available for this listing." },
            { status: 400 },
          );
        const subtotalNgn = Math.round((dayRate as number) * quantity);
        const vatAmountNgn = computeVatAmountNgn({
          subtotalNgn,
          vatEnabled: pricing.vatEnabled,
          vatRateBps: pricing.vatRateBps,
        });
        const totalNgn = subtotalNgn + vatAmountNgn;
        computedFareNgn = totalNgn;
        pricingBreakdown = {
          rentalUnit,
          quantity,
          unitRateNgn: dayRate,
          subtotalNgn,
          vat: {
            enabled: pricing.vatEnabled,
            rateBps: pricing.vatRateBps,
            amountNgn: vatAmountNgn,
          },
          totalNgn,
        };
      } else {
        const explicitBlocks = Number(body?.blocks);
        if (isFinite(explicitBlocks) && explicitBlocks > 0) {
          quantity = Math.max(1, Math.floor(explicitBlocks));
        } else {
          const sd = (body?.startDate || "").trim();
          const st = (body?.startTime || "").trim();
          const et = (body?.endTime || "").trim();
          const start = toLocalDate(sd || undefined, st || "08:00");
          const end = toLocalDate(sd || undefined, et || "12:00");
          let hours =
            start && end
              ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
              : 4;
          if (!isFinite(hours) || hours <= 0) hours = 4;
          quantity = Math.max(1, Math.ceil(hours / 4));
        }
        if (block4hRate == null)
          return NextResponse.json(
            { error: "4-hour block rate not available for this listing." },
            { status: 400 },
          );
        const subtotalNgn = Math.round((block4hRate as number) * quantity);
        const vatAmountNgn = computeVatAmountNgn({
          subtotalNgn,
          vatEnabled: pricing.vatEnabled,
          vatRateBps: pricing.vatRateBps,
        });
        const totalNgn = subtotalNgn + vatAmountNgn;
        computedFareNgn = totalNgn;
        pricingBreakdown = {
          rentalUnit,
          quantity,
          unitRateNgn: block4hRate,
          subtotalNgn,
          vat: {
            enabled: pricing.vatEnabled,
            rateBps: pricing.vatRateBps,
            amountNgn: vatAmountNgn,
          },
          totalNgn,
        };
      }

      amountKobo = Math.max(100, Math.round((computedFareNgn as number) * 100));
    } else {
      if (
        !pickupAddress ||
        !dropoffAddress ||
        !pickupCoords ||
        !dropoffCoords ||
        !vehicleClass
      ) {
        return NextResponse.json(
          { error: "Missing required fields." },
          { status: 400 },
        );
      }

      const normalizedPickup: [number, number] = [
        Number((pickupCoords as any)[0]),
        Number((pickupCoords as any)[1]),
      ];
      const normalizedDropoff: [number, number] = [
        Number((dropoffCoords as any)[0]),
        Number((dropoffCoords as any)[1]),
      ];

      if (
        !Number.isFinite(normalizedPickup[0]) ||
        !Number.isFinite(normalizedPickup[1]) ||
        !Number.isFinite(normalizedDropoff[0]) ||
        !Number.isFinite(normalizedDropoff[1])
      ) {
        return NextResponse.json(
          { error: "Invalid pickupCoords or dropoffCoords." },
          { status: 400 },
        );
      }

      const quote = await computeChauffeurQuote({
        pickupCoords: normalizedPickup,
        dropoffCoords: normalizedDropoff,
        vehicleClass,
        city: city || null,
        startDate: typeof body?.startDate === "string" ? body.startDate : null,
        endDate: typeof body?.endDate === "string" ? body.endDate : null,
      });

      computedFareNgn = quote.totalNgn;
      pricingBreakdown = {
        service: "chauffeur",
        city: city || null,
        vehicleClass,
        distanceKm: quote.distanceKm,
        days: quote.days,
        perKmRateNgn: quote.perKmRateNgn,
        baseFeeNgn: quote.baseFeeNgn,
        subtotalNgn: quote.subtotalNgn,
        vat: quote.vat,
        totalNgn: quote.totalNgn,
      };

      amountKobo = Math.max(100, Math.round(quote.totalNgn * 100));
    }

    // Compute scheduled pickup time (store as Firestore Timestamp via JS Date)
    function toLocalDate(yyyy_mm_dd?: string | null, hh_mm?: string | null) {
      if (!yyyy_mm_dd) return null;
      const [y, m, d] = yyyy_mm_dd
        .split("-")
        .map((n: string) => parseInt(n, 10));
      const [hh, mm] = (hh_mm || "00:00")
        .split(":")
        .map((n: string) => parseInt(n, 10));
      const dt = new Date(
        y || 1970,
        (m || 1) - 1,
        d || 1,
        hh || 0,
        mm || 0,
        0,
        0,
      );
      return isNaN(dt.getTime()) ? null : dt;
    }
    const scheduledPickupTime = toLocalDate(
      body?.startDate || null,
      body?.startTime || null,
    );

    if (isDriveMyCar && !scheduledPickupTime) {
      return NextResponse.json(
        { error: "Missing or invalid startDate/startTime." },
        { status: 400 },
      );
    }

    const computedEnd = (() => {
      if (!isDriveMyCar)
        return {
          endDate: body?.endDate || null,
          endTime: body?.endTime || null,
        };
      const hours = Math.round(
        Number(body?.blockHours ?? body?.hours ?? body?.driveMyCarHours) || 0,
      );
      const sd = String(body?.startDate || "").trim();
      const st = String(body?.startTime || "").trim();
      if (!sd || !st || !hours) return { endDate: null, endTime: null };
      const start = toLocalDate(sd, st);
      if (!start) return { endDate: null, endTime: null };
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      const yyyy = end.getFullYear();
      const mm = String(end.getMonth() + 1).padStart(2, "0");
      const dd = String(end.getDate()).padStart(2, "0");
      const hh = String(end.getHours()).padStart(2, "0");
      const min = String(end.getMinutes()).padStart(2, "0");
      return { endDate: `${yyyy}-${mm}-${dd}`, endTime: `${hh}:${min}` };
    })();

    const baseBooking: any = {
      uid,
      customerId: uid,
      startDate: body?.startDate || null,
      endDate: computedEnd.endDate,
      startTime: body?.startTime || null,
      endTime: computedEnd.endTime,
      scheduledPickupTime,
      notes: body?.notes || "",
      createdAt: nowTs,
      updatedAt: nowTs,
      status: "requested",
      source: "web",
      payment: {
        provider: "paystack",
        status: "pending",
        amountKobo,
        currency: "NGN",
      },
    };

    let bookingDoc: any;
    if (isDriveMyCar) {
      const pickupPin = String(randomInt(1000, 10000));
      bookingDoc = {
        ...baseBooking,
        service: "drive_my_car",
        city: city || null,
        pickupAddress,
        pickupCoords: normalizedDriveMyCarPickupCoords || null,
        driveMyCar: {
          blockHours: Math.round(
            Number(body?.blockHours ?? body?.hours ?? body?.driveMyCarHours) ||
              0,
          ),
          pickupPin,
        },
        fareNgn: computedFareNgn,
        pricing: pricingBreakdown,
      };
    } else if (isRental) {
      bookingDoc = {
        ...baseBooking,
        service: "rental",
        rentalUnit,
        listingId,
        city: city || null,
        pickupAddress: pickupAddress || null,
        returnAddress: body?.returnAddress
          ? String(body.returnAddress).trim()
          : null,
        pickupCoords: pickupCoords || null,
        fareNgn: computedFareNgn,
        pricing: pricingBreakdown,
      };
    } else {
      bookingDoc = {
        ...baseBooking,
        service: "chauffeur",
        pickupAddress,
        dropoffAddress,
        pickupCoords,
        dropoffCoords,
        city: city || null,
        vehicleClass,
        passengers: Number.isFinite(body?.passengers)
          ? Number(body.passengers)
          : 1,
        distanceKm: (pricingBreakdown as any)?.distanceKm ?? null,
        fareNgn: computedFareNgn,
        pricing: pricingBreakdown,
      };
    }

    const ref = await adminDb.collection("bookings").add(bookingDoc);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";
    const callback_url = `${baseUrl.replace(/\/$/, "")}/app/payment/callback`;

    const reference = `rideon_${ref.id}_${Date.now()}`;

    const initResp = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountKobo,
          email: customerEmail,
          reference,
          callback_url,
          currency: "NGN",
          metadata: {
            bookingId: ref.id,
            uid,
            service: isDriveMyCar
              ? "drive_my_car"
              : isRental
                ? "rental"
                : "chauffeur",
          },
        }),
      },
    );

    const initJson = await initResp.json().catch(() => null);
    if (!initResp.ok || !initJson?.status) {
      // Update booking to reflect failed init
      try {
        await adminDb
          .collection("bookings")
          .doc(ref.id)
          .set(
            {
              payment: {
                provider: "paystack",
                status: "init_failed",
                amountKobo,
                currency: "NGN",
              },
              status: "requested",
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      } catch (_) {}

      const message = initJson?.message || "Failed to initialize payment.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const authorization_url = initJson.data.authorization_url as string;
    const psReference = initJson.data.reference as string;

    await adminDb
      .collection("bookings")
      .doc(ref.id)
      .set(
        {
          payment: {
            provider: "paystack",
            status: "pending",
            amountKobo,
            currency: "NGN",
            reference: psReference,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json(
      { authorization_url, reference: psReference, bookingId: ref.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error initializing Paystack payment:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment." },
      { status: 500 },
    );
  }
}
