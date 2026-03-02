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

function normalizeCity(raw: string | null): string {
  return (raw || "").trim();
}

function preferredCityFromDriverDoc(d: any): string {
  const profile =
    d?.recruitmentProfile && typeof d.recruitmentProfile === "object"
      ? d.recruitmentProfile
      : null;
  const fromProfile =
    typeof profile?.preferredCity === "string"
      ? profile.preferredCity.trim()
      : "";
  const fromTop =
    typeof d?.preferredCity === "string" ? String(d.preferredCity).trim() : "";
  return fromProfile || fromTop;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const city = normalizeCity(url.searchParams.get("city"));

    if (isFirestoreInOutage()) {
      return NextResponse.json(
        {
          count: 0,
          ...(city ? { city } : { perCity: {} }),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    const snap = await withTimeout(
      adminDb
        .collection("drivers")
        .where("status", "==", "approved")
        .limit(1000)
        .get(),
      2_500,
      "[GET /api/customer/placement/drivers/count] drivers query",
    );

    let count = 0;
    const perCity: Record<string, number> = {};

    for (const doc of snap.docs) {
      const d = doc.data() as any;

      if (d?.recruitmentPool !== true) continue;
      if (d?.recruitmentVisible !== true) continue;
      if (String(d?.placementStatus || "") === "on_contract") continue;

      const servedCities = Array.isArray(d?.servedCities)
        ? d.servedCities.filter((c: any) => typeof c === "string")
        : [];
      const preferredCity = preferredCityFromDriverDoc(d);
      const cities =
        servedCities.length > 0
          ? servedCities
          : preferredCity
            ? [preferredCity]
            : [];

      if (city) {
        if (cities.includes(city)) count++;
      } else {
        count++;
        for (const c of cities) {
          perCity[c] = (perCity[c] || 0) + 1;
        }
      }
    }

    return NextResponse.json(
      {
        count,
        ...(city ? { city } : { perCity }),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/customer/placement/drivers/count] Error:", error);
    markFirestoreOutage(60_000);
    const url = new URL(req.url);
    const city = normalizeCity(url.searchParams.get("city"));
    return NextResponse.json(
      {
        count: 0,
        ...(city ? { city } : { perCity: {} }),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
