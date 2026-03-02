export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";

type VehicleExperience = {
  categories: string[];
  notes: string;
};

type DriverDetailResponse = {
  id: string;
  firstName: string;
  lastNameInitial: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  preferredCity: string | null;
  servedCities: string[];
  experienceYears: number;
  salaryExpectationNgn: number | null;
  salaryExpectationMinNgn: number | null;
  salaryExpectationMaxNgn: number | null;
  placementStatus: string;
  available: boolean;
  hasAccess: boolean;
  accessExpiresAt: string | null;
  phoneNumber: string | null;
  professionalSummary: string | null;
  languages: string[];
  hobbies: string[];
  vehicleExperience: VehicleExperience | null;
  familyFitTags: string[];
  familyFitNotes: string | null;
  fullTimePreferences: {
    willingToTravel: boolean | null;
    preferredClientType: string | null;
  } | null;
};

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
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

function experienceFromDriverDoc(d: any): number {
  const rp =
    d?.recruitmentProfile && typeof d.recruitmentProfile === "object"
      ? d.recruitmentProfile
      : null;
  const v = nf(rp?.experienceYears) ?? nf(d?.experienceYears) ?? 0;
  const n = Math.max(0, Math.min(80, Math.round(v)));
  return n;
}

function normalizePlacementStatus(d: any): string {
  const raw = String(d?.placementStatus || "available");
  if (raw === "on_contract") return "on_contract";
  const pool = d?.recruitmentPool === true;
  const visible = d?.recruitmentVisible === true;
  if (!pool || !visible) return "unavailable";
  return raw || "available";
}

function safeStringArray(raw: unknown, maxItems = 12, maxLen = 40): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .slice(0, maxItems)
    .map((v) => (v.length > maxLen ? v.slice(0, maxLen) : v));
}

function isAcceptedPlacementStatus(status: string): boolean {
  const s = String(status || "").trim();
  return s === "accepted" || s === "scheduled" || s === "admin_approved";
}

async function hasAcceptedPlacementConnection(args: {
  customerId: string;
  driverId: string;
}): Promise<boolean> {
  const { customerId, driverId } = args;

  async function checkCollection(
    name: "placement_interview_requests" | "placement_hire_requests",
  ): Promise<boolean> {
    try {
      const qs = await adminDb
        .collection(name)
        .where("customerId", "==", customerId)
        .where("driverId", "==", driverId)
        .limit(20)
        .get();
      return qs.docs.some((d) =>
        isAcceptedPlacementStatus(String((d.data() as any)?.status || "")),
      );
    } catch (e: any) {
      const msg = String(e?.message || "");
      const code = (e && (e.code ?? e.status)) as unknown;
      if (msg.includes("requires an index") || code === 9) {
        const qs = await adminDb
          .collection(name)
          .where("customerId", "==", customerId)
          .limit(50)
          .get();
        return qs.docs
          .map((d) => d.data() as any)
          .filter((v) => String(v?.driverId || "") === driverId)
          .some((v) => isAcceptedPlacementStatus(String(v?.status || "")));
      }
      return false;
    }
  }

  const [a, b] = await Promise.all([
    checkCollection("placement_interview_requests"),
    checkCollection("placement_hire_requests"),
  ]);
  return a || b;
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
    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const uid = await getCustomerUid(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const driverId = String(id || "").trim();
    if (!driverId) {
      return NextResponse.json(
        { error: "Missing driver id." },
        { status: 400 },
      );
    }

    const [userSnap, driverSnap, customerSnap] = await Promise.all([
      adminDb.collection("users").doc(driverId).get(),
      adminDb.collection("drivers").doc(driverId).get(),
      adminDb.collection("users").doc(uid).get(),
    ]);

    if (!driverSnap.exists) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

    const driverData = driverSnap.data() as any;
    if (String(driverData?.status || "") !== "approved") {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

    const customerData = customerSnap.exists
      ? (customerSnap.data() as any)
      : {};
    const placementAccess =
      customerData?.placementAccess &&
      typeof customerData.placementAccess === "object"
        ? customerData.placementAccess
        : {};
    const expiresAt = parseAccessExpiresAt(placementAccess?.accessExpiresAt);
    const hasAccess = Boolean(expiresAt && expiresAt.getTime() > Date.now());

    const placementStatus = normalizePlacementStatus(driverData);
    const available =
      placementStatus !== "on_contract" && placementStatus !== "unavailable";

    const acceptedConnection = hasAccess
      ? await hasAcceptedPlacementConnection({ customerId: uid, driverId })
      : false;

    const userData = userSnap.exists ? (userSnap.data() as any) : {};
    const firstName =
      typeof userData?.firstName === "string" ? userData.firstName.trim() : "";
    const lastName =
      typeof userData?.lastName === "string" ? userData.lastName.trim() : "";
    const lastNameInitial = lastName
      ? lastName.slice(0, 1).toUpperCase()
      : null;
    const profileImageUrl =
      typeof userData?.profileImageUrl === "string" &&
      userData.profileImageUrl.trim()
        ? userData.profileImageUrl.trim()
        : null;

    const rp =
      driverData?.recruitmentProfile &&
      typeof driverData.recruitmentProfile === "object"
        ? driverData.recruitmentProfile
        : null;
    const pp =
      driverData?.placementProfile &&
      typeof driverData.placementProfile === "object"
        ? driverData.placementProfile
        : null;
    const liveProfile = rp || pp || driverData;

    const professionalSummaryRaw =
      typeof (liveProfile as any)?.professionalSummary === "string"
        ? (liveProfile as any).professionalSummary
        : typeof (liveProfile as any)?.profileSummary === "string"
          ? (liveProfile as any).profileSummary
          : "";
    const professionalSummary = professionalSummaryRaw
      ? String(professionalSummaryRaw).trim().slice(0, 2000)
      : "";

    const servedCities = Array.isArray(driverData?.servedCities)
      ? driverData.servedCities
          .filter((c: any) => typeof c === "string")
          .map((c: string) => c.trim())
          .filter(Boolean)
      : [];

    const salaryRange = salaryRangeFromDriverDoc(driverData);

    const detail: DriverDetailResponse = {
      id: driverId,
      firstName: firstName || "Driver",
      lastNameInitial,
      lastName: hasAccess ? lastName || null : null,
      profileImageUrl,
      preferredCity: preferredCityFromDriverDoc(driverData) || null,
      servedCities,
      experienceYears: experienceFromDriverDoc(driverData),
      salaryExpectationNgn: salaryRange ? salaryRange.max : null,
      salaryExpectationMinNgn: salaryRange ? salaryRange.min : null,
      salaryExpectationMaxNgn: salaryRange ? salaryRange.max : null,
      placementStatus,
      available,
      hasAccess,
      accessExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      phoneNumber:
        hasAccess &&
        acceptedConnection &&
        available &&
        typeof userData?.phoneNumber === "string" &&
        userData.phoneNumber.trim()
          ? userData.phoneNumber.trim()
          : null,
      professionalSummary: hasAccess
        ? professionalSummary || null
        : professionalSummary
          ? professionalSummary.slice(0, 180)
          : null,
      languages: hasAccess
        ? safeStringArray((liveProfile as any)?.languages, 12, 30)
        : safeStringArray((liveProfile as any)?.languages, 4, 30),
      hobbies: hasAccess
        ? safeStringArray((liveProfile as any)?.hobbies, 12, 30)
        : [],
      vehicleExperience: (() => {
        const ve = (liveProfile as any)?.vehicleExperience;
        if (!ve || typeof ve !== "object") return null;
        const categories = safeStringArray(
          (ve as any).categories,
          hasAccess ? 12 : 4,
          40,
        );
        const notesRaw =
          typeof (ve as any).notes === "string"
            ? (ve as any).notes.trim().slice(0, 300)
            : "";
        return { categories, notes: hasAccess ? notesRaw : "" };
      })(),
      familyFitTags: hasAccess
        ? safeStringArray((liveProfile as any)?.familyFitTags, 12, 50)
        : safeStringArray((liveProfile as any)?.familyFitTags, 4, 50),
      familyFitNotes:
        hasAccess && typeof (liveProfile as any)?.familyFitNotes === "string"
          ? String((liveProfile as any).familyFitNotes)
              .trim()
              .slice(0, 300)
          : null,
      fullTimePreferences:
        hasAccess &&
        (liveProfile as any)?.fullTimePreferences &&
        typeof (liveProfile as any).fullTimePreferences === "object"
          ? {
              willingToTravel:
                typeof ((liveProfile as any).fullTimePreferences as any)
                  .willingToTravel === "boolean"
                  ? (((liveProfile as any).fullTimePreferences as any)
                      .willingToTravel as boolean)
                  : null,
              preferredClientType:
                typeof ((liveProfile as any).fullTimePreferences as any)
                  .preferredClientType === "string"
                  ? String(
                      ((liveProfile as any).fullTimePreferences as any)
                        .preferredClientType,
                    )
                  : null,
            }
          : null,
    };

    return NextResponse.json({ driver: detail }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/customer/placement/drivers/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver." },
      { status: 500 },
    );
  }
}
