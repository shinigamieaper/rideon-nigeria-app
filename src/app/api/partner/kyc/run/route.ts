import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { dojahGetJson, redactLargeFields, namesMatch } from "@/lib/dojah";

export const runtime = "nodejs";

type KycStatus = "pending" | "passed" | "failed";

function maskId(raw: string): string {
  const s = String(raw || "").trim();
  if (s.length <= 4) return "****";
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

function isLikelyDigits(s: string): boolean {
  return /^\d+$/.test(s);
}

async function runCacBasic(cacNumber: string, businessName: string) {
  const params: Record<string, string> = {};
  if (cacNumber) params.rc_number = cacNumber;
  if (businessName) params.company_name = businessName;
  return dojahGetJson("/api/v1/kyc/cac/basic", params);
}

async function runCacAdvance(cacNumber: string, businessName: string) {
  const params: Record<string, string> = {};
  if (cacNumber) params.rc_number = cacNumber;
  if (businessName) params.company_name = businessName;
  return dojahGetJson("/api/v1/kyc/cac/advance", params);
}

async function runBvnValidate(
  bvn: string,
  firstName: string,
  lastName: string,
) {
  return dojahGetJson("/api/v1/kyc/bvn", {
    bvn,
    first_name: firstName,
    last_name: lastName,
  });
}

async function runNinLookup(nin: string) {
  return dojahGetJson("/api/v1/kyc/nin", {
    nin,
  });
}

function deriveBvnStatus(payload: any): { status: KycStatus; details?: any } {
  const entity = payload?.entity;
  const bvnOk = entity?.bvn?.status === true;
  const firstOk = entity?.first_name?.status === true;
  const lastOk = entity?.last_name?.status === true;
  const status: KycStatus = bvnOk && firstOk && lastOk ? "passed" : "failed";
  return {
    status,
    details: {
      bvn: entity?.bvn?.status ?? null,
      firstName: entity?.first_name?.status ?? null,
      lastName: entity?.last_name?.status ?? null,
      firstNameConfidence: entity?.first_name?.confidence_value ?? null,
      lastNameConfidence: entity?.last_name?.confidence_value ?? null,
    },
  };
}

function deriveNinMatchStatus(
  payload: any,
  firstName: string,
  lastName: string,
): { status: KycStatus; details?: any } {
  const entity = payload?.entity;
  const fn = String(entity?.first_name || "");
  const ln = String(entity?.last_name || "");
  const ok = namesMatch(fn, firstName) && namesMatch(ln, lastName);
  return {
    status: ok ? "passed" : "failed",
    details: {
      firstName: fn,
      lastName: ln,
      matched: ok,
    },
  };
}

function deriveCacStatus(payload: any): { status: KycStatus; details?: any } {
  const entity = payload?.entity;
  const hasCompanyName =
    typeof entity?.company_name === "string" && entity.company_name.trim();
  const hasRc =
    typeof entity?.rc_number === "string" && entity.rc_number.trim();
  const ok = !!(hasCompanyName || hasRc);
  return {
    status: ok ? "passed" : "failed",
    details: {
      companyName: entity?.company_name || "",
      rcNumber: entity?.rc_number || "",
      status: entity?.status || "",
      typeOfCompany: entity?.type_of_company || "",
    },
  };
}

function deriveDirectorMatchStatus(
  payload: any,
  directorName: string,
): { status: KycStatus; details?: any } {
  const entity = payload?.entity;
  const affiliates = Array.isArray(entity?.affiliates) ? entity.affiliates : [];

  const name = String(directorName || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  const last = parts.length >= 2 ? parts[parts.length - 1] : "";

  let matched = false;
  for (const a of affiliates) {
    const afn = String(a?.first_name || "");
    const aln = String(a?.last_name || "");
    if (first && last) {
      if (namesMatch(afn, first) && namesMatch(aln, last)) {
        matched = true;
        break;
      }
    } else if (name) {
      const full = `${afn} ${aln}`.trim();
      if (full && namesMatch(full, name)) {
        matched = true;
        break;
      }
    }
  }

  return {
    status: matched ? "passed" : "failed",
    details: {
      matched,
      affiliatesCount: affiliates.length,
      directorName: name,
    },
  };
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "partner_applicant" && role !== "partner") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const uid = decoded.uid;
    const appRef = adminDb.collection("partner_applications").doc(uid);
    const snap = await appRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const d = snap.data() as any;
    const rawPartnerType = String(d?.partnerType || "individual");
    const partnerType =
      rawPartnerType === "business" ? "business" : "individual";
    const firstName = String(d?.firstName || "");
    const lastName = String(d?.lastName || "");
    const businessName = String(d?.businessName || "");
    const cacNumber = String(d?.cacNumber || "");

    const kycUpdates: Record<string, any> = {
      "kyc.provider": "dojah",
      "kyc.lastRunAt": FieldValue.serverTimestamp(),
      "kyc.updatedAt": FieldValue.serverTimestamp(),
    };

    // CAC
    const cacRes =
      partnerType === "business"
        ? await runCacAdvance(cacNumber, businessName)
        : await runCacBasic(cacNumber, businessName);

    const cacPayload = redactLargeFields(cacRes.json);
    const cacDerived = deriveCacStatus(cacPayload);

    kycUpdates["kyc.cac"] = {
      status: cacDerived.status,
      checkedAt: FieldValue.serverTimestamp(),
      input: { rcNumber: cacNumber, businessName },
      details: cacDerived.details,
      responseStatus: cacRes.status,
      payload: cacPayload,
    };

    // Individual: BVN or NIN
    if (partnerType === "individual") {
      const idNumber = String(d?.bvnOrNin || "").trim();
      const digitsOnly = idNumber && isLikelyDigits(idNumber);

      let idStatus: KycStatus = "failed";
      let idMethod: "bvn" | "nin" | "unknown" = "unknown";
      let idDetails: any = {};
      let idPayload: any = null;
      let idResponseStatus: number | null = null;

      if (digitsOnly) {
        // Try BVN first (common verification requirement)
        const bvnRes = await runBvnValidate(idNumber, firstName, lastName);
        idResponseStatus = bvnRes.status;
        idPayload = redactLargeFields(bvnRes.json);

        if (bvnRes.ok && idPayload && idPayload.entity) {
          idMethod = "bvn";
          const b = deriveBvnStatus(idPayload);
          idStatus = b.status;
          idDetails = b.details;
        } else {
          // Fallback to NIN lookup & name match
          const ninRes = await runNinLookup(idNumber);
          idResponseStatus = ninRes.status;
          idPayload = redactLargeFields(ninRes.json);
          idMethod = "nin";
          const n = deriveNinMatchStatus(idPayload, firstName, lastName);
          idStatus = n.status;
          idDetails = n.details;
        }
      }

      kycUpdates["kyc.individualId"] = {
        status: idStatus,
        checkedAt: FieldValue.serverTimestamp(),
        input: { id: maskId(idNumber), method: idMethod },
        details: idDetails,
        responseStatus: idResponseStatus,
        payload: idPayload,
      };
    }

    // Business: director match via CAC advance affiliates
    if (partnerType === "business") {
      const directorName = String(d?.directorName || "").trim();
      const directorDerived = deriveDirectorMatchStatus(
        cacPayload,
        directorName,
      );
      kycUpdates["kyc.director"] = {
        status: directorDerived.status,
        checkedAt: FieldValue.serverTimestamp(),
        input: { directorName },
        details: directorDerived.details,
      };
    }

    // Overall
    const requiredCacPassed =
      (kycUpdates["kyc.cac"]?.status as KycStatus) === "passed";

    let overall: KycStatus = requiredCacPassed ? "passed" : "failed";

    if (partnerType === "individual") {
      const idStatus =
        (kycUpdates["kyc.individualId"]?.status as KycStatus) || "failed";
      if (!requiredCacPassed || idStatus !== "passed") overall = "failed";
    }

    if (partnerType === "business") {
      const dirStatus =
        (kycUpdates["kyc.director"]?.status as KycStatus) || "failed";
      if (!requiredCacPassed || dirStatus !== "passed") overall = "failed";
    }

    kycUpdates["kyc.overallStatus"] = overall;

    await appRef.set(kycUpdates, { merge: true });

    return NextResponse.json(
      {
        success: true,
        overallStatus: overall,
        cac: kycUpdates["kyc.cac"]?.status,
        individualId: kycUpdates["kyc.individualId"]?.status,
        director: kycUpdates["kyc.director"]?.status,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error running partner KYC:", error);
    return NextResponse.json(
      { error: "Failed to run partner KYC verification." },
      { status: 500 },
    );
  }
}
