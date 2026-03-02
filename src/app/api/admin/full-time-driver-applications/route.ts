export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

function toIsoOrNull(ts: any): string | null {
  return ts?.toDate?.()?.toISOString?.() || null;
}

export async function GET(req: Request) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "driver_admin",
    ]);
    if (response) return response;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "100", 10),
      200,
    );

    const snap = await adminDb
      .collection("full_time_driver_applications")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    let applications = snap.docs.map((doc) => {
      const d = doc.data() as any;
      const kyc = (d?.kyc || {}) as Record<string, unknown>;
      return {
        id: doc.id,
        status: String(d?.status || "pending_review"),
        firstName: String(d?.firstName || ""),
        lastName: String(d?.lastName || ""),
        email: String(d?.email || ""),
        phoneNumber: String(d?.phoneNumber || ""),
        nin: String(d?.nin || ""),
        bvn: String(d?.bvn || ""),
        kycSummary: {
          overallStatus: String(kyc?.overallStatus || "pending"),
          nin: String(
            ((kyc?.nin as Record<string, unknown>) || {})?.status || "pending",
          ),
          bvn: String(
            ((kyc?.bvn as Record<string, unknown>) || {})?.status || "pending",
          ),
          lastRunAt: toIsoOrNull(kyc?.lastRunAt),
        },
        preferredCity: String(d?.preferredCity || ""),
        salaryExpectation: Number(d?.salaryExpectation || 0),
        salaryExpectationMinNgn:
          typeof d?.salaryExpectationMinNgn === "number"
            ? Number(d.salaryExpectationMinNgn)
            : Number(d?.salaryExpectation || 0),
        salaryExpectationMaxNgn:
          typeof d?.salaryExpectationMaxNgn === "number"
            ? Number(d.salaryExpectationMaxNgn)
            : Number(d?.salaryExpectation || 0),
        referencesSummary:
          d?.referencesSummary && typeof d.referencesSummary === "object"
            ? {
                required: Number((d.referencesSummary as any)?.required) || 0,
                completed: Number((d.referencesSummary as any)?.completed) || 0,
              }
            : null,
        createdAt: toIsoOrNull(d?.createdAt),
        updatedAt: toIsoOrNull(d?.updatedAt),
      };
    });

    if (status && status !== "all") {
      applications = applications.filter((a) => a.status === status);
    }

    const counts: Record<string, number> = {
      all: 0,
      pending_review: 0,
      needs_more_info: 0,
      approved: 0,
      rejected: 0,
    };

    try {
      const allSnap = await adminDb
        .collection("full_time_driver_applications")
        .limit(500)
        .get();
      counts.all = allSnap.size;
      allSnap.forEach((doc) => {
        const s = String((doc.data() as any)?.status || "pending_review");
        if (s === "pending_review") counts.pending_review++;
        else if (s === "needs_more_info") counts.needs_more_info++;
        else if (s === "approved") counts.approved++;
        else if (s === "rejected") counts.rejected++;
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ applications, counts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching full-time driver applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch full-time driver applications." },
      { status: 500 },
    );
  }
}
