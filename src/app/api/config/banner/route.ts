export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import type { BannerPortal } from "@/types/brandBanner";

const OLD_BANNER_DOC_ID = "brand_banner";
const LEGACY_BANNER_FALLBACK_ENABLED =
  String(process.env.BANNER_LEGACY_FALLBACK || "")
    .trim()
    .toLowerCase() === "true";

type Portal = BannerPortal;

const VALID_PORTALS: Portal[] = [
  "public",
  "customer",
  "driver_on_demand",
  "driver_full_time",
  "partner",
];

// Map new portal names to old Firestore `enabled` keys for backward compat
const PORTAL_TO_OLD_KEY: Record<Portal, string> = {
  public: "public",
  customer: "customer",
  driver_on_demand: "driver",
  driver_full_time: "driver",
  partner: "partner",
};

type BannerJson = {
  id?: string;
  show: boolean;
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaLink?: string;
  dismissible?: boolean;
  dismissForHours?: number;
};

type SystemMode = "email_verification";

const CACHE_TTL_MS = 60_000;
const CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
} as const;

let memoryCache: {
  expiresAt: number;
  byPortal: Partial<Record<Portal, BannerJson>>;
} | null = null;

let firestoreOutageUntil = 0;

function isFirestoreInOutage(): boolean {
  return Date.now() < firestoreOutageUntil;
}

async function pickSystemBanner(
  portal: Portal,
  system: SystemMode,
): Promise<BannerJson | null> {
  const now = new Date();

  const snap = await withTimeout(
    adminDb
      .collection("brand_banners")
      .where("status", "==", "active")
      .where("portals", "array-contains", portal)
      .orderBy("priority", "desc")
      .limit(10)
      .get(),
    2_500,
    "[banner] brand_banners system query",
  );

  if (snap.empty) return null;

  for (const doc of snap.docs) {
    const d = doc.data();
    const startAt = d.startAt?.toDate?.() as Date | undefined;
    const endAt = d.endAt?.toDate?.() as Date | undefined;

    if (startAt && now < startAt) continue;
    if (endAt && now >= endAt) continue;

    const ctaLink = typeof d.ctaLink === "string" ? d.ctaLink.trim() : "";
    if (system === "email_verification") {
      if (!ctaLink.startsWith("/verify-email")) continue;
    }

    return {
      id: doc.id,
      show: true,
      title: d.title || "",
      message: d.message || "",
      ctaLabel: d.ctaLabel || "",
      ctaLink,
      dismissible: d.dismissible ?? true,
      dismissForHours: d.dismissForHours ?? 24,
    };
  }

  return null;
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
 * Pick the single highest-priority eligible banner from the new `brand_banners` collection.
 * Returns null if none are eligible.
 */
async function pickNewBanner(portal: Portal): Promise<BannerJson | null> {
  const now = new Date();

  // Query active banners that include this portal, ordered by priority desc
  const snap = await withTimeout(
    adminDb
      .collection("brand_banners")
      .where("status", "==", "active")
      .where("portals", "array-contains", portal)
      .orderBy("priority", "desc")
      .limit(10)
      .get(),
    2_500,
    "[banner] brand_banners query",
  );

  if (snap.empty) return null;

  // Filter by time window in-memory (Firestore can't do compound inequality on two fields)
  for (const doc of snap.docs) {
    const d = doc.data();
    const startAt = d.startAt?.toDate?.() as Date | undefined;
    const endAt = d.endAt?.toDate?.() as Date | undefined;

    if (startAt && now < startAt) continue;
    if (endAt && now >= endAt) continue;

    return {
      id: doc.id,
      show: true,
      title: d.title || "",
      message: d.message || "",
      ctaLabel: d.ctaLabel || "",
      ctaLink: d.ctaLink || "",
      dismissible: d.dismissible ?? true,
      dismissForHours: d.dismissForHours ?? 24,
    };
  }

  return null;
}

/**
 * Fallback: read the old single `config/brand_banner` doc.
 */
async function pickOldBanner(portal: Portal): Promise<BannerJson> {
  const doc = await withTimeout(
    adminDb.collection("config").doc(OLD_BANNER_DOC_ID).get(),
    2_500,
    "[banner] old banner doc",
  );

  if (!doc.exists) return { show: false };

  const data = doc.data()!;
  const enabled = (data as Record<string, unknown>).enabled as
    | Record<string, boolean>
    | undefined;
  const oldKey = PORTAL_TO_OLD_KEY[portal];

  if (!enabled || !enabled[oldKey]) return { show: false };

  return {
    show: true,
    title: ((data as Record<string, unknown>).title as string) || "",
    message: ((data as Record<string, unknown>).message as string) || "",
    ctaLabel: ((data as Record<string, unknown>).ctaLabel as string) || "",
    ctaLink: ((data as Record<string, unknown>).ctaLink as string) || "",
  };
}

// GET /api/config/banner?portal=public|customer|driver_on_demand|driver_full_time|partner
// Returns the single highest-priority active banner for the requested portal.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const portal = url.searchParams.get("portal") || "public";
    const systemRaw = (url.searchParams.get("system") || "").trim();
    const system: SystemMode | null =
      systemRaw === "email_verification" ? "email_verification" : null;

    if (!VALID_PORTALS.includes(portal as Portal)) {
      return NextResponse.json(
        { error: "Invalid portal type." },
        { status: 400 },
      );
    }

    const normalizedPortal = portal as Portal;

    if (system) {
      const systemBanner = await pickSystemBanner(normalizedPortal, system);
      return NextResponse.json(systemBanner || { show: false }, {
        status: 200,
        headers: CACHE_HEADERS,
      });
    }

    // Check memory cache
    if (memoryCache && Date.now() < memoryCache.expiresAt) {
      const cached = memoryCache.byPortal[normalizedPortal];
      if (cached) {
        return NextResponse.json(cached, {
          status: 200,
          headers: CACHE_HEADERS,
        });
      }
    }

    if (isFirestoreInOutage()) {
      return NextResponse.json(
        { show: false },
        { status: 200, headers: CACHE_HEADERS },
      );
    }

    // Check maintenanceMode feature flag first
    let maintenanceMode = false;
    try {
      const flagsDoc = await withTimeout(
        adminDb.collection("config").doc("feature_flags").get(),
        2_500,
        "[banner] feature_flags doc",
      );
      const flagsData = flagsDoc.exists ? flagsDoc.data() : {};
      maintenanceMode = !!(flagsData as Record<string, unknown>)
        ?.maintenanceMode;
    } catch (flagError) {
      markFirestoreOutage(60_000);
      console.warn(
        "[banner] Failed to read feature flags, ignoring maintenanceMode",
        flagError,
      );
    }

    if (maintenanceMode) {
      const fallbackTitle = "Scheduled maintenance in progress";
      const fallbackMessage =
        portal === "driver_on_demand" || portal === "driver_full_time"
          ? "The driver portal is currently undergoing maintenance. Some actions may be unavailable."
          : portal === "customer"
            ? "The app is currently undergoing maintenance. Some actions may be unavailable."
            : portal === "partner"
              ? "The partner portal is currently undergoing maintenance. Some actions may be unavailable."
              : "The site is currently undergoing maintenance. Some features may be unavailable.";

      const result: BannerJson = {
        show: true,
        title: fallbackTitle,
        message: fallbackMessage,
        ctaLabel: "",
        ctaLink: "",
      };

      updateCache(normalizedPortal, result);
      return NextResponse.json(result, { status: 200, headers: CACHE_HEADERS });
    }

    // Try new multi-banner system first, fall back to old single-banner doc
    let result = await pickNewBanner(normalizedPortal);

    if (!result && LEGACY_BANNER_FALLBACK_ENABLED) {
      const oldResult = await pickOldBanner(normalizedPortal);
      result = oldResult;
    }

    if (!result) {
      result = { show: false };
    }

    updateCache(normalizedPortal, result);
    return NextResponse.json(result, { status: 200, headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching banner config:", error);
    markFirestoreOutage(60_000);
    return NextResponse.json(
      { show: false },
      { status: 200, headers: CACHE_HEADERS },
    );
  }
}

function updateCache(portal: Portal, result: BannerJson) {
  if (!memoryCache || Date.now() >= memoryCache.expiresAt) {
    memoryCache = { expiresAt: Date.now() + CACHE_TTL_MS, byPortal: {} };
  }
  memoryCache.byPortal[portal] = result;
}
