import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

/**
 * POST /api/dev/seed-reservation
 * Disabled in production.
 *
 * Body (optional): {
 *   customerEmail?: string,
 *   password?: string,
 *   listingId?: string,
 *   rentalUnit?: 'day' | '4h',
 *   city?: string,
 *   startDate?: string, // yyyy-mm-dd
 *   endDate?: string,   // yyyy-mm-dd (for 'day')
 *   startTime?: string, // HH:mm
 *   endTime?: string,   // HH:mm
 *   driverId?: string
 * }
 *
 * Ensures a dev customer exists (creates if needed), then creates a paid/confirmed
 * reservation (booking) for that customer using an available vehicle listing.
 */
export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}) as any);
    const customerEmail = (
      body?.customerEmail || "dev-customer@example.com"
    ).trim();
    const password = (body?.password || "DevCustomer#12345").trim();

    // Ensure customer auth user exists
    let userRecord: import("firebase-admin/auth").UserRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(customerEmail);
      // Keep password up-to-date in dev
      await adminAuth.updateUser(userRecord.uid, { password });
    } catch {
      userRecord = await adminAuth.createUser({
        email: customerEmail,
        password,
        emailVerified: true,
        disabled: false,
      });
    }

    const uid = userRecord.uid;

    // Set role=customer custom claim
    const existingClaims = (await adminAuth.getUser(uid)).customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: "customer",
    });

    // Upsert users doc (basic profile)
    const userRef = adminDb.collection("users").doc(uid);
    await userRef.set(
      {
        _id: uid,
        role: "customer",
        firstName: "Dev",
        lastName: "Customer",
        email: customerEmail,
        phoneNumber: "+2348000000999",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Resolve listing
    const listingIdInput: string | undefined =
      typeof body?.listingId === "string" && body.listingId.trim()
        ? body.listingId.trim()
        : undefined;
    let listingDoc:
      | FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>
      | undefined;
    if (listingIdInput) {
      listingDoc = await adminDb
        .collection("vehicles")
        .doc(listingIdInput)
        .get();
      if (!listingDoc.exists) {
        return NextResponse.json(
          {
            error:
              "Provided listingId not found. Seed vehicles or choose a valid listingId.",
          },
          { status: 400 },
        );
      }
    } else {
      const listSnap = await adminDb
        .collection("vehicles")
        .where("status", "==", "available")
        .limit(1)
        .get();
      if (listSnap.empty) {
        return NextResponse.json(
          {
            error:
              "No vehicles found. Seed vehicles via /api/dev/seed-vehicles first.",
          },
          { status: 400 },
        );
      }
      listingDoc = listSnap.docs[0];
    }

    const listing = listingDoc!.data() as any;
    const listingId = listingDoc!.id;

    // Optional driver assignment (pick any driver if not provided)
    let driverId: string | undefined =
      typeof body?.driverId === "string" && body.driverId.trim()
        ? String(body.driverId).trim()
        : undefined;
    if (!driverId) {
      const drv = await adminDb.collection("drivers").limit(1).get();
      if (!drv.empty) driverId = drv.docs[0].id;
    }

    // Minimal driver and vehicle info (best-effort)
    let driverInfo: any = undefined;
    if (driverId) {
      try {
        const prof = await adminDb.collection("users").doc(driverId).get();
        const d = prof.data() as any;
        const name = [d?.firstName, d?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        driverInfo = { name: name || "Assigned" };
      } catch {}
    }

    const vehicleInfo: any = {
      make: listing?.make || "Vehicle",
      model: listing?.model || "",
      licensePlate: (listing?.licensePlate as string | undefined) || undefined,
    };

    // Schedule defaults: tomorrow 06:00-10:00 for 4h; tomorrow only for day
    const rentalUnit: "day" | "4h" =
      body?.rentalUnit === "day" || body?.rentalUnit === "4h"
        ? body.rentalUnit
        : "4h";
    const now = new Date();
    const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yyyy = tmr.getFullYear();
    const mm = String(tmr.getMonth() + 1).padStart(2, "0");
    const dd = String(tmr.getDate()).padStart(2, "0");

    const startDate = (body?.startDate || `${yyyy}-${mm}-${dd}`).trim();
    const startTime = (
      body?.startTime || (rentalUnit === "4h" ? "06:00" : "09:00")
    ).trim();
    const endDate =
      rentalUnit === "day"
        ? (body?.endDate || `${yyyy}-${mm}-${dd}`).trim()
        : undefined;
    const endTime =
      (
        body?.endTime || (rentalUnit === "4h" ? "10:00" : undefined)
      )?.trim?.() || undefined;

    // Compute fare similar to quote (add 5% fee)
    const dayRate =
      typeof listing?.dayRateNgn === "number" ? listing.dayRateNgn : null;
    const block4hRate =
      typeof listing?.block4hRateNgn === "number"
        ? listing.block4hRateNgn
        : null;

    let quantity = 1;
    if (rentalUnit === "day") {
      quantity = 1;
    } else {
      // 4h
      const [sh, sm] = startTime.split(":").map((n: string) => parseInt(n, 10));
      const [eh, em] = (endTime || "10:00")
        .split(":")
        .map((n: string) => parseInt(n, 10));
      const sdt = new Date(
        `${startDate}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`,
      );
      const edt = new Date(
        `${startDate}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`,
      );
      let hours = Math.ceil((edt.getTime() - sdt.getTime()) / (1000 * 60 * 60));
      if (!isFinite(hours) || hours <= 0) hours = 4;
      quantity = Math.max(1, Math.ceil(hours / 4));
    }

    const baseRate = rentalUnit === "day" ? dayRate : block4hRate;
    if (baseRate == null) {
      return NextResponse.json(
        { error: `Missing rate for rentalUnit ${rentalUnit} on listing.` },
        { status: 400 },
      );
    }
    const subtotal = Math.round((baseRate as number) * quantity);
    const serviceFee = Math.round(subtotal * 0.05);
    const total = subtotal + serviceFee;

    // Build booking doc
    function toLocalDate(dateStr?: string | null, timeStr?: string | null) {
      if (!dateStr) return null;
      const [y, m, d] = String(dateStr)
        .split("-")
        .map((n: string) => parseInt(n, 10));
      const [hh, mm2] = String(timeStr || "00:00")
        .split(":")
        .map((n: string) => parseInt(n, 10));
      const dt = new Date(
        y || 1970,
        (m || 1) - 1,
        d || 1,
        hh || 0,
        mm2 || 0,
        0,
        0,
      );
      return isNaN(dt.getTime()) ? null : dt;
    }

    const scheduledPickupTime = toLocalDate(startDate, startTime);

    const bookingDoc: any = {
      uid,
      customerId: uid,
      rentalUnit,
      listingId,
      city: (body?.city || listing?.city || "Lagos").trim(),
      startDate,
      endDate: endDate || null,
      startTime,
      endTime: endTime || null,
      scheduledPickupTime,
      pickupAddress: "Lekki Phase 1, Lagos",
      returnAddress: undefined,
      driverId: driverId || null,
      driverInfo: driverInfo || null,
      vehicleInfo,
      fareNgn: total,
      status: "confirmed",
      source: "dev_seed",
      payment: {
        provider: "paystack",
        status: "succeeded",
        amountKobo: Math.round(total * 100),
        currency: "NGN",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection("bookings").add(bookingDoc);

    return NextResponse.json(
      {
        reservationId: ref.id,
        customer: { email: customerEmail, password },
        listingId,
        rentalUnit,
        totalNgn: total,
        viewUrl: `/app/reservations/${ref.id}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in dev/seed-reservation:", error);
    return NextResponse.json(
      { error: "Failed to seed reservation." },
      { status: 500 },
    );
  }
}
