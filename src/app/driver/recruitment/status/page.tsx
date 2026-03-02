export const runtime = "nodejs";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import StatusPageClient, {
  FullTimeApplicationStatus,
} from "./StatusPageClient";

function normalizeStatus(input: unknown): FullTimeApplicationStatus {
  const s = String(input || "").trim();
  if (s === "pending_review") return "pending_review";
  if (s === "needs_more_info") return "needs_more_info";
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return "pending_review";
}

function normalizeKycStatus(
  input: unknown,
): "pending" | "verified" | "failed" | "not_started" {
  const s = String(input || "")
    .trim()
    .toLowerCase();
  if (s === "verified" || s === "valid") return "verified";
  if (s === "failed" || s === "invalid") return "failed";
  if (s === "pending") return "pending";
  return "not_started";
}

async function getAuthedUid(): Promise<{ uid: string }> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  let decoded: any | null = null;

  if (session) {
    decoded = await verifyRideOnSessionCookie(session);
  }

  if (!decoded) {
    const h = await headers();
    const authHeader = h.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      redirect(
        `/login?next=${encodeURIComponent("/full-time-driver/application/status")}`,
      );
    }
    decoded = await adminAuth.verifyIdToken(token);
  }

  return { uid: decoded.uid as string };
}

export default async function DriverRecruitmentStatusPage() {
  const { uid } = await getAuthedUid();

  let status: FullTimeApplicationStatus = "not_applied";
  let rejectionReason: string | null = null;
  let needsMoreInfoReason: string | null = null;
  let createdAt: string | null = null;
  let updatedAt: string | null = null;
  let errorMessage: string | null = null;
  let kycData:
    | {
        ninStatus: "pending" | "verified" | "failed" | "not_started";
        bvnStatus: "pending" | "verified" | "failed" | "not_started";
        overallStatus: "pending" | "verified" | "failed" | "not_started";
        lastRunAt?: string | null;
      }
    | undefined;

  try {
    const snap = await adminDb
      .collection("full_time_driver_applications")
      .doc(uid)
      .get();
    if (!snap.exists) {
      status = "not_applied";
    } else {
      const d = snap.data() as any;
      status = normalizeStatus(d?.status);
      rejectionReason =
        typeof d?.rejectionReason === "string" ? d.rejectionReason : null;
      needsMoreInfoReason =
        typeof d?.needsMoreInfoReason === "string"
          ? d.needsMoreInfoReason
          : null;
      createdAt = d?.createdAt?.toDate?.()?.toISOString?.() ?? null;
      updatedAt = d?.updatedAt?.toDate?.()?.toISOString?.() ?? null;

      // Extract KYC data
      const kyc = d?.kyc || {};
      const ninStatus = normalizeKycStatus(kyc?.nin?.status);
      const bvnStatus = normalizeKycStatus(kyc?.bvn?.status);
      const overallStatus = normalizeKycStatus(kyc?.overall);
      const lastRunAt = kyc?.lastRunAt?.toDate?.()?.toISOString?.() ?? null;

      kycData = { ninStatus, bvnStatus, overallStatus, lastRunAt };
    }
  } catch (e) {
    console.error(
      "[driver/recruitment/status] Failed to load full-time application:",
      e,
    );
    errorMessage = "Unable to load your application status right now.";
  }

  return (
    <StatusPageClient
      status={status}
      rejectionReason={rejectionReason}
      needsMoreInfoReason={needsMoreInfoReason}
      createdAt={createdAt}
      updatedAt={updatedAt}
      errorMessage={errorMessage}
      kycData={kycData}
    />
  );
}
