export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

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

const DEFAULT_SERVICE_CITIES: { name: string; enabled: boolean }[] = [
  { name: "Lagos", enabled: true },
  { name: "Abuja", enabled: true },
  { name: "Port Harcourt", enabled: true },
  { name: "Ibadan", enabled: true },
];

/**
 * GET /api/config/service-cities
 *
 * Public endpoint to fetch configured service cities.
 * No authentication required.
 *
 * Returns both the full list (name + enabled) and a convenience
 * array of enabled city names for client pickers.
 */
export async function GET() {
  try {
    if (isFirestoreInOutage()) {
      const enabledCities = DEFAULT_SERVICE_CITIES.filter((c) => c.enabled).map(
        (c) => c.name,
      );
      return NextResponse.json(
        { cities: DEFAULT_SERVICE_CITIES, enabledCities },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
          },
        },
      );
    }

    const docRef = adminDb.collection("config").doc("service_cities");
    const snap = await withTimeout(docRef.get(), 2500, "[service-cities] doc");

    let cities = DEFAULT_SERVICE_CITIES;

    if (snap.exists) {
      const data = snap.data() || {};
      if (Array.isArray((data as any).cities)) {
        const rawCities = (data as any).cities as any[];
        const normalized = rawCities
          .map((c) => ({
            name: typeof c?.name === "string" ? c.name : "",
            enabled: typeof c?.enabled === "boolean" ? c.enabled : false,
          }))
          .filter((c) => c.name.trim().length > 0);

        if (normalized.length > 0) {
          cities = normalized;
        }
      }
    }

    const enabledCities = cities.filter((c) => c.enabled).map((c) => c.name);

    return NextResponse.json(
      { cities, enabledCities },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching service cities config:", error);
    markFirestoreOutage(30_000);
    const enabledCities = DEFAULT_SERVICE_CITIES.filter((c) => c.enabled).map(
      (c) => c.name,
    );
    return NextResponse.json(
      { cities: DEFAULT_SERVICE_CITIES, enabledCities },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
        },
      },
    );
  }
}
