import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { zodErrorToFieldMap } from "@/lib/validation/errors";

export const runtime = "nodejs";

const LOCATION_RATE_WINDOW_MS = Number(
  process.env.LOCATION_RATE_WINDOW_MS || 2000,
);
const locationRateStore = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    const json = await req.json().catch(() => ({}));
    const schema = z
      .object({
        lat: z.coerce.number().finite(),
        lng: z.coerce.number().finite(),
        heading: z.coerce.number().finite().optional(),
      })
      .strict();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request.",
          details: zodErrorToFieldMap(parsed.error),
        },
        { status: 400 },
      );
    }
    const { lat, lng, heading } = parsed.data;

    const now = Date.now();
    const last = locationRateStore.get(uid) || 0;
    if (now - last < LOCATION_RATE_WINDOW_MS) {
      return NextResponse.json(
        { error: "Too many location updates. Please try again later." },
        { status: 429 },
      );
    }
    locationRateStore.set(uid, now);

    await adminDb.collection("drivers").doc(uid).set(
      {
        currentLocation: { lat, lng },
        lastLocationAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const locationPayload: Record<string, unknown> = {
      coords: [lng, lat],
      lon: lng,
      lat,
      ts: FieldValue.serverTimestamp(),
    };
    if (typeof heading === "number") {
      locationPayload.heading = heading;
    }
    await adminDb
      .collection("driver_locations")
      .doc(uid)
      .set(locationPayload, { merge: true });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error updating driver location:", error);
    return NextResponse.json(
      { error: "Failed to update driver location." },
      { status: 500 },
    );
  }
}
