export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";

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

type DriverListItem = {
  id: string;
  firstName: string;
  lastNameInitial: string | null;
  profileImageUrl: string | null;
  preferredCity: string | null;
  experienceYears: number;
  salaryExpectationNgn: number | null;
  salaryExpectationMinNgn: number | null;
  salaryExpectationMaxNgn: number | null;
  placementStatus: string;
};

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeCity(raw: string | null): string {
  return (raw || "").trim();
}

function parseAccessExpiresAt(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof (raw as any)?.toDate === "function") {
    try {
      return (raw as any).toDate();
    } catch {
      return null;
    }
  }
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function preferredCityFromDriverDoc(d: any): string {
  const rp =
    d?.recruitmentProfile && typeof d.recruitmentProfile === "object"
      ? d.recruitmentProfile
      : null;
  const pp =
    d?.placementProfile && typeof d.placementProfile === "object"
      ? d.placementProfile
      : null;

  const fromRp =
    typeof rp?.preferredCity === "string" ? rp.preferredCity.trim() : "";
  const fromPp =
    typeof pp?.preferredCity === "string" ? pp.preferredCity.trim() : "";
  const fromTop =
    typeof d?.preferredCity === "string" ? String(d.preferredCity).trim() : "";
  return fromRp || fromPp || fromTop;
}

function salaryFromDriverDoc(d: any): number | null {
  const rp =
    d?.recruitmentProfile && typeof d.recruitmentProfile === "object"
      ? d.recruitmentProfile
      : null;
  const pp =
    d?.placementProfile && typeof d.placementProfile === "object"
      ? d.placementProfile
      : null;

  const fromRp = nf(rp?.salaryExpectation);
  const fromPp = nf(pp?.salaryExpectation);
  const fromTop = nf(d?.salaryExpectation);

  const v = fromRp ?? fromPp ?? fromTop;
  if (v == null) return null;
  const n = Math.round(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function salaryRangeFromDriverDoc(d: any): { min: number; max: number } | null {
  const rp =
    d?.recruitmentProfile && typeof d.recruitmentProfile === "object"
      ? d.recruitmentProfile
      : null;
  const pp =
    d?.placementProfile && typeof d.placementProfile === "object"
      ? d.placementProfile
      : null;

  const legacy = salaryFromDriverDoc(d);

  const fromRpMin = nf(rp?.salaryExpectationMinNgn);
  const fromRpMax = nf(rp?.salaryExpectationMaxNgn);
  const fromPpMin = nf(pp?.salaryExpectationMinNgn);
  const fromPpMax = nf(pp?.salaryExpectationMaxNgn);
  const fromTopMin = nf(d?.salaryExpectationMinNgn);
  const fromTopMax = nf(d?.salaryExpectationMaxNgn);

  let min = Math.round(fromRpMin ?? fromPpMin ?? fromTopMin ?? legacy ?? 0);
  let max = Math.round(fromRpMax ?? fromPpMax ?? fromTopMax ?? legacy ?? 0);

  if (!Number.isFinite(min) || min <= 0) min = 0;
  if (!Number.isFinite(max) || max <= 0) max = 0;
  if (min > 0 && max <= 0) max = min;
  if (max > 0 && min <= 0) min = max;
  if (min <= 0 || max <= 0) return null;
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  return { min, max };
}

function matchesSalaryFilter(args: {
  driverRange: { min: number; max: number } | null;
  minBudget: number | null;
  maxBudget: number | null;
}): boolean {
  const { driverRange, minBudget, maxBudget } = args;
  if (minBudget == null && maxBudget == null) return true;
  if (!driverRange) return false;

  const dMin = driverRange.min;
  const dMax = driverRange.max;

  if (minBudget != null && maxBudget != null) {
    return dMin <= maxBudget && dMax >= minBudget;
  }
  if (minBudget != null) {
    return dMax >= minBudget;
  }
  return dMin <= (maxBudget as number);
}

function experienceFromDriverDoc(d: any): number {
  const rp =
    d?.recruitmentProfile && typeof d.recruitmentProfile === "object"
      ? d.recruitmentProfile
      : null;
  const v = nf(rp?.experienceYears) ?? nf(d?.experienceYears) ?? 0;
  const n = Math.max(0, Math.min(80, Math.round(v)));
  return n;
}

async function getCustomerUid(req: Request): Promise<string | null> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  if (session) {
    const decoded = await verifyRideOnSessionCookie(session);
    if (decoded?.uid) return decoded.uid;
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  try {
    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[GET /api/customer/placement/drivers] verifyIdToken",
    );
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const uid = await getCustomerUid(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const city = normalizeCity(url.searchParams.get("city"));

    if (isFirestoreInOutage()) {
      return NextResponse.json(
        {
          city: city || null,
          hasAccess: false,
          accessExpiresAt: null,
          savedDriverIds: [],
          drivers: [],
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    const limitRaw = nf(Number(url.searchParams.get("limit") || ""));
    const limit =
      limitRaw == null ? 60 : Math.max(1, Math.min(200, Math.round(limitRaw)));

    const minExperienceYearsRaw = nf(
      Number(url.searchParams.get("minExperienceYears") || ""),
    );
    const minExperienceYears =
      minExperienceYearsRaw == null
        ? null
        : Math.max(0, Math.min(80, Math.round(minExperienceYearsRaw)));

    const minSalaryExpectationRaw = nf(
      Number(url.searchParams.get("minSalaryExpectationNgn") || ""),
    );
    const minSalaryExpectationNgn =
      minSalaryExpectationRaw == null
        ? null
        : Math.max(0, Math.round(minSalaryExpectationRaw));

    const maxSalaryExpectationRaw = nf(
      Number(url.searchParams.get("maxSalaryExpectationNgn") || ""),
    );
    const maxSalaryExpectationNgn =
      maxSalaryExpectationRaw == null
        ? null
        : Math.max(0, Math.round(maxSalaryExpectationRaw));

    const savedOnly =
      String(url.searchParams.get("savedOnly") || "").trim() === "true";

    const userSnap = await withTimeout(
      adminDb.collection("users").doc(uid).get(),
      2_500,
      "[GET /api/customer/placement/drivers] user doc",
    );
    const userData = userSnap.exists ? (userSnap.data() as any) : {};

    const placementAccess =
      userData?.placementAccess && typeof userData.placementAccess === "object"
        ? userData.placementAccess
        : {};
    const expiresAt = parseAccessExpiresAt(placementAccess?.accessExpiresAt);
    const hasAccess = Boolean(expiresAt && expiresAt.getTime() > Date.now());

    const savedDriverIds = Array.isArray(userData?.savedDriverIds)
      ? (userData.savedDriverIds as unknown[]).filter(
          (x) => typeof x === "string",
        )
      : [];

    const base: Array<{ id: string; d: any }> = [];

    if (savedOnly) {
      if (savedDriverIds.length === 0) {
        return NextResponse.json(
          {
            city: city || null,
            hasAccess,
            accessExpiresAt: expiresAt ? expiresAt.toISOString() : null,
            savedDriverIds,
            drivers: [] as DriverListItem[],
          },
          { status: 200 },
        );
      }

      const driverRefs = savedDriverIds
        .slice(0, 300)
        .map((id) => adminDb.collection("drivers").doc(id));
      const driverSnaps = await withTimeout(
        adminDb.getAll(...driverRefs),
        2_500,
        "[GET /api/customer/placement/drivers] saved drivers getAll",
      );
      for (const s of driverSnaps) {
        if (!s.exists) continue;
        const d = s.data() as any;
        if (String(d?.status || "") !== "approved") continue;
        if (d?.recruitmentPool !== true) continue;
        if (d?.recruitmentVisible !== true) continue;
        if (String(d?.placementStatus || "") === "on_contract") continue;

        const preferredCity = preferredCityFromDriverDoc(d);
        const servedCities = Array.isArray(d?.servedCities)
          ? d.servedCities.filter((c: any) => typeof c === "string")
          : [];
        const cities =
          servedCities.length > 0
            ? servedCities
            : preferredCity
              ? [preferredCity]
              : [];
        if (city && !cities.includes(city)) continue;

        const experienceYears = experienceFromDriverDoc(d);
        if (minExperienceYears != null && experienceYears < minExperienceYears)
          continue;

        const salaryRange = salaryRangeFromDriverDoc(d);
        if (
          !matchesSalaryFilter({
            driverRange: salaryRange,
            minBudget: minSalaryExpectationNgn,
            maxBudget: maxSalaryExpectationNgn,
          })
        ) {
          continue;
        }

        base.push({ id: s.id, d });
      }
    } else {
      const snap = await withTimeout(
        adminDb
          .collection("drivers")
          .where("status", "==", "approved")
          .limit(800)
          .get(),
        2_500,
        "[GET /api/customer/placement/drivers] drivers query",
      );

      for (const doc of snap.docs) {
        const d = doc.data() as any;

        if (d?.recruitmentPool !== true) continue;
        if (d?.recruitmentVisible !== true) continue;
        if (String(d?.placementStatus || "") === "on_contract") continue;

        const id = doc.id;

        const preferredCity = preferredCityFromDriverDoc(d);
        const servedCities = Array.isArray(d?.servedCities)
          ? d.servedCities.filter((c: any) => typeof c === "string")
          : [];
        const cities =
          servedCities.length > 0
            ? servedCities
            : preferredCity
              ? [preferredCity]
              : [];

        if (city) {
          if (!cities.includes(city)) continue;
        }

        const experienceYears = experienceFromDriverDoc(d);
        if (minExperienceYears != null && experienceYears < minExperienceYears)
          continue;

        const salaryRange = salaryRangeFromDriverDoc(d);
        if (
          !matchesSalaryFilter({
            driverRange: salaryRange,
            minBudget: minSalaryExpectationNgn,
            maxBudget: maxSalaryExpectationNgn,
          })
        ) {
          continue;
        }

        base.push({ id, d });
      }
    }

    const userRefs = base.map((x) => adminDb.collection("users").doc(x.id));
    const userSnaps = userRefs.length
      ? await withTimeout(
          adminDb.getAll(...userRefs),
          2_500,
          "[GET /api/customer/placement/drivers] users getAll",
        )
      : [];
    const userById = new Map<string, any>();
    for (const s of userSnaps) {
      if (!s.exists) continue;
      userById.set(s.id, s.data() as any);
    }

    const drivers: DriverListItem[] = base.map(({ id, d }) => {
      const u = userById.get(id) || {};
      const firstName =
        typeof u?.firstName === "string" ? u.firstName.trim() : "";
      const lastName = typeof u?.lastName === "string" ? u.lastName.trim() : "";
      const lastNameInitial = lastName
        ? lastName.slice(0, 1).toUpperCase()
        : null;
      const profileImageUrl =
        typeof u?.profileImageUrl === "string" && u.profileImageUrl.trim()
          ? u.profileImageUrl.trim()
          : null;

      const preferredCity = preferredCityFromDriverDoc(d);
      const experienceYears = experienceFromDriverDoc(d);
      const salaryRange = salaryRangeFromDriverDoc(d);
      const salaryExpectationNgn = salaryRange ? salaryRange.max : null;

      return {
        id,
        firstName: firstName || "Driver",
        lastNameInitial,
        profileImageUrl,
        preferredCity: preferredCity || null,
        experienceYears,
        salaryExpectationNgn,
        salaryExpectationMinNgn: salaryRange ? salaryRange.min : null,
        salaryExpectationMaxNgn: salaryRange ? salaryRange.max : null,
        placementStatus: String(d?.placementStatus || "available"),
      };
    });

    drivers.sort((a, b) => {
      const ax = a.placementStatus === "available" ? 0 : 1;
      const bx = b.placementStatus === "available" ? 0 : 1;
      if (ax !== bx) return ax - bx;
      return a.experienceYears - b.experienceYears;
    });

    const limited = drivers.slice(0, limit);

    return NextResponse.json(
      {
        city: city || null,
        hasAccess,
        accessExpiresAt: expiresAt ? expiresAt.toISOString() : null,
        savedDriverIds,
        drivers: limited,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/customer/placement/drivers] Error:", error);
    markFirestoreOutage(60_000);
    const url = new URL(req.url);
    const city = normalizeCity(url.searchParams.get("city"));
    return NextResponse.json(
      {
        city: city || null,
        hasAccess: false,
        accessExpiresAt: null,
        savedDriverIds: [],
        drivers: [],
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
