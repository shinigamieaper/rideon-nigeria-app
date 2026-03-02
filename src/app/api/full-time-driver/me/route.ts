import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

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

function isFirestoreConnectivityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (msg.includes("EHOSTUNREACH")) return true;
  if (msg.includes("ECONNREFUSED")) return true;
  if (msg.includes("ETIMEDOUT")) return true;
  if (msg.toLowerCase().includes("unavailable")) return true;
  if (msg.includes("RST_STREAM")) return true;
  return false;
}

function normalizeCloudinaryDocUrl(url: any, ownerUid: string): any {
  if (typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed) return url;
  if (trimmed.startsWith("/api/files/")) return trimmed;

  if (
    trimmed.startsWith("https://res.cloudinary.com/") ||
    trimmed.startsWith("http://res.cloudinary.com/")
  ) {
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean);
      const resourceType = ["image", "raw", "video"].includes(parts[1])
        ? parts[1]
        : "raw";
      const uploadIdx = parts.findIndex(
        (p) => p === "upload" || p === "authenticated",
      );
      if (uploadIdx === -1 || uploadIdx + 1 >= parts.length) return url;

      const deliveryType =
        parts[uploadIdx] === "authenticated" ? "authenticated" : "upload";
      const versionAndRest = parts.slice(uploadIdx + 1);
      const versionIdx = versionAndRest.findIndex((p) => /^v\d+$/.test(p));
      const withoutVersion =
        versionIdx >= 0 ? versionAndRest.slice(versionIdx + 1) : versionAndRest;
      const publicIdWithExt = withoutVersion.join("/");
      if (!publicIdWithExt) return url;

      const lastDot = publicIdWithExt.lastIndexOf(".");
      const publicId =
        lastDot > 0 ? publicIdWithExt.slice(0, lastDot) : publicIdWithExt;
      const ext = lastDot > 0 ? publicIdWithExt.slice(lastDot + 1) : "";

      const descriptor = {
        provider: "cloudinary",
        ownerUid,
        publicId,
        resourceType,
        deliveryType,
        ...(ext ? { format: ext } : {}),
      };
      const encoded = Buffer.from(JSON.stringify(descriptor), "utf8").toString(
        "base64",
      );
      return `/api/files/${encodeURIComponent(encoded)}`;
    } catch {
      return url;
    }
  }

  return url;
}

export const runtime = "nodejs";

const EMPTY_APP_RESPONSE = {
  status: "not_applied",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  nin: "",
  bvn: "",
  profileImageUrl: "",
  experienceYears: null,
  preferredCity: "",
  salaryExpectation: null,
  salaryExpectationMinNgn: null,
  salaryExpectationMaxNgn: null,
  vehicleTypesHandled: "",
  vehicleExperience: { categories: [], notes: "" },
  familyFitTags: [],
  familyFitNotes: "",
  languages: [],
  hobbies: [],
  fullTimePreferences: null,
  availabilityFullTime: null,
  additionalNotes: "",
  backgroundConsent: null,
  kycConsent: null,
  kycSummary: {
    overallStatus: "pending",
    nin: "pending",
    bvn: "pending",
    lastRunAt: null,
  },
  documents: null,
  references: [],
  referencesSummary: null,
  needsMoreInfoReason: null,
  needsMoreInfoAt: null,
  createdAt: null,
  updatedAt: null,
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[full-time-driver/me] verifyIdToken",
    );
    const uid = decoded.uid;

    const appSnap = await withTimeout(
      adminDb.collection("full_time_driver_applications").doc(uid).get(),
      3_000,
      "[full-time-driver/me] applications doc",
    );
    if (!appSnap.exists) {
      return NextResponse.json(EMPTY_APP_RESPONSE, { status: 200 });
    }

    const d = appSnap.data() as any;
    const required = Number(d?.referencesSummary?.required);
    const completed = Number(d?.referencesSummary?.completed);
    const referencesSummary =
      Number.isFinite(required) && Number.isFinite(completed)
        ? { required, completed }
        : null;

    const kyc = (d?.kyc || {}) as Record<string, unknown>;
    const kycSummary = {
      overallStatus: String(kyc?.overallStatus || "pending"),
      nin: String(
        ((kyc?.nin as Record<string, unknown>) || {})?.status || "pending",
      ),
      bvn: String(
        ((kyc?.bvn as Record<string, unknown>) || {})?.status || "pending",
      ),
      lastRunAt:
        (kyc?.lastRunAt as { toDate?: () => Date })
          ?.toDate?.()
          ?.toISOString?.() || null,
    };

    return NextResponse.json(
      {
        status: d?.status || "pending_review",
        firstName: d?.firstName || "",
        lastName: d?.lastName || "",
        email: d?.email || "",
        phoneNumber: d?.phoneNumber || "",
        nin: typeof d?.nin === "string" ? d.nin : "",
        bvn: typeof d?.bvn === "string" ? d.bvn : "",
        profileImageUrl: d?.profileImageUrl || "",
        experienceYears:
          typeof d?.experienceYears === "number" ? d.experienceYears : null,
        preferredCity: d?.preferredCity || "",
        salaryExpectation:
          typeof d?.salaryExpectation === "number" ? d.salaryExpectation : null,
        salaryExpectationMinNgn:
          typeof d?.salaryExpectationMinNgn === "number"
            ? d.salaryExpectationMinNgn
            : typeof d?.salaryExpectation === "number"
              ? d.salaryExpectation
              : null,
        salaryExpectationMaxNgn:
          typeof d?.salaryExpectationMaxNgn === "number"
            ? d.salaryExpectationMaxNgn
            : typeof d?.salaryExpectation === "number"
              ? d.salaryExpectation
              : null,
        vehicleTypesHandled:
          typeof d?.vehicleTypesHandled === "string"
            ? d.vehicleTypesHandled
            : "",
        vehicleExperience:
          d?.vehicleExperience && typeof d.vehicleExperience === "object"
            ? {
                categories: Array.isArray(
                  (d.vehicleExperience as any).categories,
                )
                  ? (d.vehicleExperience as any).categories
                  : [],
                notes:
                  typeof (d.vehicleExperience as any).notes === "string"
                    ? (d.vehicleExperience as any).notes
                    : "",
              }
            : { categories: [], notes: "" },
        familyFitTags: Array.isArray(d?.familyFitTags) ? d.familyFitTags : [],
        familyFitNotes:
          typeof d?.familyFitNotes === "string" ? d.familyFitNotes : "",
        languages: Array.isArray(d?.languages) ? d.languages : [],
        hobbies: Array.isArray(d?.hobbies) ? d.hobbies : [],
        fullTimePreferences:
          d?.fullTimePreferences && typeof d.fullTimePreferences === "object"
            ? {
                willingToTravel:
                  typeof (d.fullTimePreferences as any).willingToTravel ===
                  "boolean"
                    ? (d.fullTimePreferences as any).willingToTravel
                    : null,
                preferredClientType:
                  typeof (d.fullTimePreferences as any).preferredClientType ===
                  "string"
                    ? (d.fullTimePreferences as any).preferredClientType
                    : null,
              }
            : null,
        availabilityFullTime:
          typeof d?.availabilityFullTime === "boolean"
            ? d.availabilityFullTime
            : null,
        additionalNotes:
          typeof d?.additionalNotes === "string" ? d.additionalNotes : "",
        backgroundConsent:
          typeof d?.backgroundConsent === "boolean"
            ? d.backgroundConsent
            : null,
        kycConsent: typeof d?.kycConsent === "boolean" ? d.kycConsent : null,
        kycSummary,
        documents:
          d?.documents && typeof d.documents === "object"
            ? Object.fromEntries(
                Object.entries(d.documents as Record<string, any>).map(
                  ([k, v]) => [k, normalizeCloudinaryDocUrl(v, uid)],
                ),
              )
            : null,
        references: Array.isArray(d?.references) ? d.references : [],
        referencesSummary,
        needsMoreInfoReason:
          typeof d?.needsMoreInfoReason === "string"
            ? d.needsMoreInfoReason
            : null,
        needsMoreInfoAt:
          d?.needsMoreInfoAt?.toDate?.()?.toISOString?.() || null,
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isFirestoreConnectivityError(error)) {
      console.warn(
        "[GET /api/full-time-driver/me] Backend unreachable; returning empty application",
      );
      return NextResponse.json(
        { ...EMPTY_APP_RESPONSE, degraded: true },
        { status: 200 },
      );
    }
    console.error("Error fetching full-time driver application:", error);
    return NextResponse.json(
      { error: "Failed to fetch full-time driver application." },
      { status: 500 },
    );
  }
}
