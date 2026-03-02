export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

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

async function safeCount(
  q: FirebaseFirestore.Query,
  ms: number,
  label: string,
): Promise<number> {
  try {
    const snap = await withTimeout(q.count().get(), ms, label);
    return snap.data().count;
  } catch (err) {
    console.error(`${label}:`, err);
    return 0;
  }
}

function inferService(d: any): "chauffeur" | "rental" | "drive_my_car" {
  const s = String(d?.service || "").trim();
  if (s === "drive_my_car") return "drive_my_car";
  if (s === "rental") return "rental";
  if (s === "chauffeur") return "chauffeur";
  if (d?.listingId && (d?.rentalUnit === "day" || d?.rentalUnit === "4h"))
    return "rental";
  if (d?.driveMyCar) return "drive_my_car";
  return "chauffeur";
}

const DEFAULTS = {
  reservationsTodayTotal: 0,
  reservationsTodayChauffeur: 0,
  reservationsTodayRental: 0,
  reservationsTodayDriveMyCar: 0,
  activeTrips: 0,
  needsReassignmentCount: 0,
  pendingOnDemandDriverApprovals: 0,
  pendingPartnerApplications: 0,
  pendingVehicleSubmissions: 0,
  pendingPartnerDriverSubmissions: 0,
  pendingFullTimeDriverApplications: 0,
  pendingInterviews: 0,
  placementHireRequestsOpen: 0,
  placementInterviewRequestsOpen: 0,
  paymentSuccessRate24h: 100,
};

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin(request);
    if (response) return response;

    const TO = 4_000;

    // ── Reservations today (split by service) ──
    let rTotal = 0,
      rChauffeur = 0,
      rRental = 0,
      rDMC = 0;
    try {
      const snap = await withTimeout(
        adminDb
          .collection("bookings")
          .orderBy("createdAt", "desc")
          .limit(150)
          .get(),
        TO,
        "[summary] bookings today",
      );
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      for (const doc of snap.docs) {
        const d = doc.data();
        const created = d.createdAt?.toDate?.();
        if (!created || created < todayStart) continue;
        rTotal++;
        const svc = inferService(d);
        if (svc === "chauffeur") rChauffeur++;
        else if (svc === "rental") rRental++;
        else rDMC++;
      }
    } catch (err) {
      console.error("[summary] bookings today:", err);
    }

    // ── Active trips + Ops queue ──
    const [activeTrips, needsReassignmentCount] = await Promise.all([
      safeCount(
        adminDb.collection("bookings").where("status", "==", "in_progress"),
        TO,
        "[summary] active trips",
      ),
      safeCount(
        adminDb
          .collection("bookings")
          .where("status", "==", "needs_reassignment"),
        TO,
        "[summary] needs_reassignment",
      ),
    ]);

    // ── Pipeline counts (all parallel) ──
    const [
      pendingOnDemandDriverApprovals,
      pendingPartnerApplications,
      pendingVehicleSubmissions,
      pendingPartnerDriverSubmissions,
      pendingFullTimeDriverApplications,
      pendingInterviews,
      placementHireRequestsOpen,
      placementInterviewRequestsOpen,
    ] = await Promise.all([
      safeCount(
        adminDb.collection("drivers").where("status", "==", "pending_review"),
        TO,
        "[summary] pending drivers",
      ),
      safeCount(
        adminDb.collection("partners").where("status", "==", "pending_review"),
        TO,
        "[summary] pending partners",
      ),
      safeCount(
        adminDb
          .collection("partner_vehicle_submissions")
          .where("status", "==", "pending_review"),
        TO,
        "[summary] pending vehicles",
      ),
      safeCount(
        adminDb
          .collection("partner_driver_submissions")
          .where("status", "==", "pending_review"),
        TO,
        "[summary] pending partner drivers",
      ),
      safeCount(
        adminDb
          .collection("full_time_driver_applications")
          .where("status", "==", "pending_review"),
        TO,
        "[summary] pending ft drivers",
      ),
      safeCount(
        adminDb.collection("contracts").where("status", "==", "offer_pending"),
        TO,
        "[summary] pending interviews",
      ),
      safeCount(
        adminDb
          .collection("placement_hire_requests")
          .where("status", "==", "requested"),
        TO,
        "[summary] placement hire",
      ),
      safeCount(
        adminDb
          .collection("placement_interview_requests")
          .where("status", "==", "requested"),
        TO,
        "[summary] placement interview",
      ),
    ]);

    // ── Payment success rate (24h) ──
    let paymentSuccessRate24h = 100;
    try {
      const snap = await withTimeout(
        adminDb
          .collection("bookings")
          .orderBy("createdAt", "desc")
          .limit(60)
          .get(),
        TO,
        "[summary] payment rate",
      );
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let total = 0,
        succeeded = 0;
      for (const doc of snap.docs) {
        const d = doc.data();
        const c = d.createdAt?.toDate?.();
        if (!c || c < cutoff || !d.payment?.status) continue;
        total++;
        if (d.payment.status === "succeeded") succeeded++;
      }
      if (total > 0)
        paymentSuccessRate24h = Math.round((succeeded / total) * 100);
    } catch (err) {
      console.error("[summary] payment rate:", err);
    }

    return NextResponse.json(
      {
        reservationsTodayTotal: rTotal,
        reservationsTodayChauffeur: rChauffeur,
        reservationsTodayRental: rRental,
        reservationsTodayDriveMyCar: rDMC,
        activeTrips,
        needsReassignmentCount,
        pendingOnDemandDriverApprovals,
        pendingPartnerApplications,
        pendingVehicleSubmissions,
        pendingPartnerDriverSubmissions,
        pendingFullTimeDriverApplications,
        pendingInterviews,
        placementHireRequestsOpen,
        placementInterviewRequestsOpen,
        paymentSuccessRate24h,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching admin dashboard summary:", error);
    return NextResponse.json(DEFAULTS, { status: 200 });
  }
}
