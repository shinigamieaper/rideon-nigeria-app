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
    const uid = decoded.uid;

    const appRef = adminDb.collection("full_time_driver_applications").doc(uid);
    const snap = await appRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const d = snap.data() as any;
    const firstName = String(d?.firstName || "").trim();
    const lastName = String(d?.lastName || "").trim();
    const nin = String(d?.nin || "").trim();
    const bvn = String(d?.bvn || "").trim();
    const kycConsent = d?.kycConsent === true;

    if (!kycConsent) {
      return NextResponse.json(
        { error: "KYC consent is required." },
        { status: 400 },
      );
    }

    if (!nin) {
      return NextResponse.json(
        { error: "NIN is required for verification." },
        { status: 400 },
      );
    }

    const kycUpdates: Record<string, any> = {
      "kyc.provider": "dojah",
      "kyc.lastRunAt": FieldValue.serverTimestamp(),
      "kyc.updatedAt": FieldValue.serverTimestamp(),
    };

    const ninRes = await runNinLookup(nin);
    const ninPayload = redactLargeFields(ninRes.json);
    const ninDerived = ninRes.ok
      ? deriveNinMatchStatus(ninPayload, firstName, lastName)
      : { status: "failed" as KycStatus };

    kycUpdates["kyc.nin"] = {
      status: ninDerived.status,
      checkedAt: FieldValue.serverTimestamp(),
      input: { nin: maskId(nin) },
      details: ninDerived.details,
      responseStatus: ninRes.status,
      payload: ninPayload,
    };

    let bvnStatus: KycStatus = "pending";

    if (bvn) {
      const bvnRes = await runBvnValidate(bvn, firstName, lastName);
      const bvnPayload = redactLargeFields(bvnRes.json);
      const bvnDerived = bvnRes.ok
        ? deriveBvnStatus(bvnPayload)
        : { status: "failed" as KycStatus };

      bvnStatus = bvnDerived.status;

      kycUpdates["kyc.bvn"] = {
        status: bvnDerived.status,
        checkedAt: FieldValue.serverTimestamp(),
        input: { bvn: maskId(bvn) },
        details: bvnDerived.details,
        responseStatus: bvnRes.status,
        payload: bvnPayload,
      };
    }

    const ninStatus = (kycUpdates["kyc.nin"]?.status as KycStatus) || "failed";

    let overall: KycStatus = "failed";
    if (ninStatus === "passed") {
      if (!bvn) overall = "pending";
      else overall = bvnStatus === "passed" ? "passed" : "failed";
    }

    kycUpdates["kyc.overallStatus"] = overall;

    await appRef.set(kycUpdates, { merge: true });

    return NextResponse.json(
      {
        success: true,
        overallStatus: overall,
        nin: ninStatus,
        bvn: bvn ? bvnStatus : "pending",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error running full-time driver KYC:", error);
    return NextResponse.json(
      { error: "Failed to run full-time driver KYC verification." },
      { status: 500 },
    );
  }
}
