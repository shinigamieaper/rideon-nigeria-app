import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// POST /api/driver/availability
// Supports two modes:
// 1. Day-specific slots: { date: 'YYYY-MM-DD', slots: Array<{ start: 'HH:MM', end: 'HH:MM' }> }
// 2. General preferences: { online?, workingHours?, workingDays?, maxPickupRadiusKm?, servedCities? }
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";
    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const nowIso = new Date().toISOString();

    // Mode 1: Day-specific availability slots
    if (body?.date) {
      const date = (body.date || "").trim(); // YYYY-MM-DD
      const slots = Array.isArray(body?.slots) ? body.slots : [];

      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
        return NextResponse.json(
          { error: "Invalid or missing date (YYYY-MM-DD)." },
          { status: 400 },
        );
      }
      if (!slots.length) {
        return NextResponse.json(
          { error: "At least one time slot is required." },
          { status: 400 },
        );
      }
      // Basic validation: strings HH:MM and start < end
      for (const s of slots) {
        if (typeof s?.start !== "string" || typeof s?.end !== "string") {
          return NextResponse.json(
            { error: "Each slot must include start and end strings." },
            { status: 400 },
          );
        }
        if (!(s.start.length === 5 && s.end.length === 5 && s.start < s.end)) {
          return NextResponse.json(
            { error: "Invalid slot times." },
            { status: 400 },
          );
        }
      }

      const id = `${uid}_${date}`;
      await adminDb.collection("driver_availability").doc(id).set(
        {
          uid,
          date,
          slots,
          updatedAt: nowIso,
          createdAt: nowIso,
        },
        { merge: true },
      );

      await adminDb
        .collection("drivers")
        .doc(uid)
        .set(
          { hasDaySpecificAvailability: true, updatedAt: nowIso },
          { merge: true },
        );

      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Mode 2: General preferences (update driver document)
    const updates: Record<string, unknown> = { updatedAt: nowIso };

    // Online status
    if (typeof body.online === "boolean") {
      updates.online = body.online;
      updates.onlineStatus = body.online;
    }

    // Working hours
    if (body.workingHours && typeof body.workingHours === "object") {
      const { start, end } = body.workingHours;
      if (typeof start === "string" && typeof end === "string") {
        updates.workingHours = { start, end };
      }
    }

    // Working days
    if (Array.isArray(body.workingDays)) {
      updates.workingDays = body.workingDays.filter(
        (d: unknown) => typeof d === "string",
      );
    }

    // Max pickup radius
    if (
      typeof body.maxPickupRadiusKm === "number" &&
      body.maxPickupRadiusKm > 0
    ) {
      updates.maxPickupRadiusKm = body.maxPickupRadiusKm;
    }

    // Served cities
    if (Array.isArray(body.servedCities)) {
      updates.servedCities = body.servedCities.filter(
        (c: unknown) => typeof c === "string",
      );
    }

    // Only update if there's something to save
    if (Object.keys(updates).length > 1) {
      await adminDb
        .collection("drivers")
        .doc(uid)
        .set(updates, { merge: true });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error saving availability:", error);
    return NextResponse.json(
      { error: "Failed to save availability." },
      { status: 500 },
    );
  }
}

// GET /api/driver/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";
    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }
    const uid = decoded.uid;

    const start = (searchParams.get("start") || "").trim();
    const end = (searchParams.get("end") || "").trim();

    if (
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(start) ||
      !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(end)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing start/end (YYYY-MM-DD)." },
        { status: 400 },
      );
    }

    const snap = await adminDb
      .collection("driver_availability")
      .where("uid", "==", uid)
      .where("date", ">=", start)
      .where("date", "<=", end)
      .get();

    const data = snap.docs.map((d) => {
      const v = d.data() as any;
      return { date: v.date, slots: Array.isArray(v.slots) ? v.slots : [] };
    });

    return NextResponse.json({ availability: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability." },
      { status: 500 },
    );
  }
}
