export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Public-safe feature flags (no auth required)
const PUBLIC_FLAGS = [
  "maintenanceMode",
  "inAppMessaging",
  "supportChatEnabled",
  "pushNotifications",
  "driverRatings",
  "multiCitySupport",
  "instantBooking",
  "scheduledBookingOnly",
  "driverTips",
];

// Default values for public flags
const DEFAULT_PUBLIC_FLAGS: Record<string, boolean> = {
  maintenanceMode: false,
  inAppMessaging: true,
  supportChatEnabled: true,
  pushNotifications: true,
  driverRatings: true,
  multiCitySupport: true,
  instantBooking: false,
  scheduledBookingOnly: true,
  driverTips: false,
};

let firestoreOutageUntil = 0;

function isFirestoreInOutage(): boolean {
  return Date.now() < firestoreOutageUntil;
}

function markFirestoreOutage(ms: number) {
  firestoreOutageUntil = Math.max(firestoreOutageUntil, Date.now() + ms);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

/**
 * GET /api/config/feature-flags
 *
 * Public endpoint to fetch feature flags for client-side gating.
 * No authentication required.
 * Only returns public-safe flags.
 */
export async function GET() {
  try {
    if (isFirestoreInOutage()) {
      return NextResponse.json(
        { flags: DEFAULT_PUBLIC_FLAGS },
        { status: 200 },
      );
    }

    const docRef = adminDb.collection("config").doc("feature_flags");
    const doc = await withTimeout(docRef.get(), 2_500, "[feature-flags] doc");

    const data = doc.exists ? doc.data() || {} : {};

    // Build response with only public flags
    const flags: Record<string, boolean> = {};
    for (const key of PUBLIC_FLAGS) {
      flags[key] =
        data[key] !== undefined
          ? Boolean(data[key])
          : DEFAULT_PUBLIC_FLAGS[key];
    }

    return NextResponse.json(
      { flags },
      {
        status: 200,
        headers: {
          // Cache for 1 minute to reduce Firestore reads
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching public feature flags:", error);
    markFirestoreOutage(30_000);
    // Return defaults on error
    return NextResponse.json({ flags: DEFAULT_PUBLIC_FLAGS }, { status: 200 });
  }
}
