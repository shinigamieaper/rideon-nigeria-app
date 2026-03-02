export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

interface Activity {
  id: string;
  type:
    | "driver_application"
    | "booking"
    | "payment"
    | "system"
    | "partner_application"
    | "vehicle_submission"
    | "partner_driver_submission"
    | "ft_driver_application"
    | "ops_queue"
    | "placement";
  title: string;
  description?: string;
  timestamp: string;
  link: string;
  status?: "success" | "warning" | "error" | "info";
}

function ts(d: any): string | null {
  try {
    const dt = d?.toDate?.() ?? d;
    if (dt instanceof Date && !isNaN(dt.getTime())) return dt.toISOString();
    if (typeof d === "string") return new Date(d).toISOString();
  } catch {}
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin(request);
    if (response) return response;

    const activities: Activity[] = [];

    // ── 1. Pending on-demand driver applications ──
    try {
      const snap = await adminDb
        .collection("drivers")
        .where("status", "==", "pending_review")
        .limit(8)
        .get();
      snap.forEach((doc) => {
        const d = doc.data();
        const name =
          `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Driver";
        const t = ts(d.createdAt) || ts(d.updatedAt);
        if (!t) return;
        activities.push({
          id: `driver-${doc.id}`,
          type: "driver_application",
          title: `New driver application from ${name}`,
          description: "Awaiting review",
          timestamp: t,
          link: `/admin/drivers/${doc.id}`,
          status: "info",
        });
      });
    } catch (err) {
      console.error("[recent-activity] drivers:", err);
    }

    // ── 2. Recent bookings ──
    try {
      const snap = await adminDb
        .collection("bookings")
        .orderBy("createdAt", "desc")
        .limit(12)
        .get();
      snap.forEach((doc) => {
        const data = doc.data() as any;
        const customerName = data.customerInfo?.name || "Customer";
        const status = data.status as string | undefined;
        const createdAt = data.createdAt?.toDate?.() ?? data.createdAt;
        const updatedAt = data.updatedAt?.toDate?.() ?? data.updatedAt;
        const completionTime =
          data.completionTime?.toDate?.() ?? data.completionTime;
        let eventTs: Date | undefined;
        if (status === "completed")
          eventTs = completionTime || updatedAt || createdAt;
        else if (status === "requested") eventTs = createdAt || updatedAt;
        else eventTs = updatedAt || createdAt;
        if (!eventTs) return;
        const pickup = data.pickupAddress || "";
        const dropoff = data.dropoffAddress || "";
        const routeText =
          pickup && dropoff
            ? `${pickup} → ${dropoff}`
            : pickup || dropoff || "";
        let title = "Booking update";
        let activityStatus: Activity["status"] = "info";
        switch (status) {
          case "requested":
            title = `New booking by ${customerName}`;
            break;
          case "confirmed":
            title = `Booking confirmed for ${customerName}`;
            break;
          case "driver_assigned":
            title = `Driver assigned to ${customerName}`;
            break;
          case "en_route":
            title = "Driver en route to pickup";
            break;
          case "in_progress":
            title = `Trip in progress for ${customerName}`;
            break;
          case "completed":
            title = `Trip completed for ${customerName}`;
            activityStatus = "success";
            break;
          case "needs_reassignment":
            title = `Reservation needs reassignment`;
            activityStatus = "warning";
            break;
          case "cancelled_by_customer":
          case "cancelled_by_driver":
            title = `Booking cancelled (${(status || "").replace("cancelled_by_", "")})`;
            activityStatus = "warning";
            break;
          default:
            title = `Booking update for ${customerName}`;
        }
        const desc = [
          status ? `Status: ${status}` : undefined,
          routeText || undefined,
        ]
          .filter(Boolean)
          .join(" • ");
        activities.push({
          id: `booking-${doc.id}`,
          type: "booking",
          title,
          description: desc,
          timestamp: new Date(eventTs).toISOString(),
          link: `/admin/reservations`,
          status: activityStatus,
        });
      });
    } catch (err) {
      console.error("[recent-activity] bookings:", err);
    }

    // ── 3. Partner applications pending review ──
    try {
      const snap = await adminDb
        .collection("partners")
        .where("status", "==", "pending_review")
        .limit(6)
        .get();
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const name = d.businessName || d.contactName || "Partner";
        const t = ts(d.createdAt) || ts(d.updatedAt);
        if (!t) return;
        activities.push({
          id: `partner-${doc.id}`,
          type: "partner_application",
          title: `New partner application: ${name}`,
          description: "Awaiting review",
          timestamp: t,
          link: `/admin/partners`,
          status: "info",
        });
      });
    } catch (err) {
      console.error("[recent-activity] partners:", err);
    }

    // ── 4. Vehicle submissions pending review ──
    try {
      const snap = await adminDb
        .collection("partner_vehicle_submissions")
        .where("status", "==", "pending_review")
        .limit(6)
        .get();
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const label = [d.make, d.model].filter(Boolean).join(" ") || "Vehicle";
        const t = ts(d.createdAt) || ts(d.updatedAt);
        if (!t) return;
        activities.push({
          id: `vsub-${doc.id}`,
          type: "vehicle_submission",
          title: `Vehicle submission: ${label}`,
          description: "Pending review",
          timestamp: t,
          link: `/admin/vehicle-submissions`,
          status: "info",
        });
      });
    } catch (err) {
      console.error("[recent-activity] vehicle subs:", err);
    }

    // ── 5. Partner driver submissions pending review ──
    try {
      const snap = await adminDb
        .collection("partner_driver_submissions")
        .where("status", "==", "pending_review")
        .limit(6)
        .get();
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const name =
          `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Driver";
        const t = ts(d.createdAt) || ts(d.updatedAt);
        if (!t) return;
        activities.push({
          id: `pdsub-${doc.id}`,
          type: "partner_driver_submission",
          title: `Partner driver submission: ${name}`,
          description: "Pending review",
          timestamp: t,
          link: `/admin/partner-driver-submissions`,
          status: "info",
        });
      });
    } catch (err) {
      console.error("[recent-activity] partner driver subs:", err);
    }

    // ── 6. Full-time driver applications pending review ──
    try {
      const snap = await adminDb
        .collection("full_time_driver_applications")
        .where("status", "==", "pending_review")
        .limit(6)
        .get();
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const name =
          `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Applicant";
        const t = ts(d.createdAt) || ts(d.updatedAt);
        if (!t) return;
        activities.push({
          id: `ftapp-${doc.id}`,
          type: "ft_driver_application",
          title: `Full-time driver application: ${name}`,
          description: "Pending review",
          timestamp: t,
          link: `/admin/full-time-driver-applications`,
          status: "info",
        });
      });
    } catch (err) {
      console.error("[recent-activity] ft driver apps:", err);
    }

    // ── 7. Placement hire requests (open) ──
    try {
      const snap = await adminDb
        .collection("placement_hire_requests")
        .where("status", "==", "requested")
        .limit(5)
        .get();
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const t = ts(d.createdAt) || ts(d.updatedAt);
        if (!t) return;
        activities.push({
          id: `phire-${doc.id}`,
          type: "placement",
          title: "New placement hire request",
          description: d.city ? `City: ${d.city}` : "Customer hire request",
          timestamp: t,
          link: `/admin/messages`,
          status: "info",
        });
      });
    } catch (err) {
      console.error("[recent-activity] placement hire:", err);
    }

    // ── 8. Placement interview requests (open) ──
    try {
      const snap = await adminDb
        .collection("placement_interview_requests")
        .where("status", "==", "requested")
        .limit(5)
        .get();
      snap.forEach((doc) => {
        const d = doc.data() as any;
        const t = ts(d.createdAt) || ts(d.updatedAt);
        if (!t) return;
        activities.push({
          id: `pinterview-${doc.id}`,
          type: "placement",
          title: "New placement interview request",
          description: d.city
            ? `City: ${d.city}`
            : "Customer interview request",
          timestamp: t,
          link: `/admin/messages`,
          status: "info",
        });
      });
    } catch (err) {
      console.error("[recent-activity] placement interview:", err);
    }

    // Sort all activities by timestamp (most recent first) and cap at 25
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const recentActivities = activities.slice(0, 25);

    return NextResponse.json({ activities: recentActivities }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      { activities: [], error: error.message || "Partial data load failure" },
      { status: 200 },
    );
  }
}
