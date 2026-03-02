export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminRbac";

function normalizeTimestamp(ts: unknown): string | undefined {
  if (typeof ts === "string") return ts;
  if (ts && typeof (ts as any).toDate === "function") {
    return (ts as any).toDate().toISOString();
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId") || "";

    if (!conversationId.trim()) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 },
      );
    }

    const [interviewSnap, hireSnap] = await Promise.all([
      adminDb
        .collection("placement_interview_requests")
        .where("conversationId", "==", conversationId)
        .limit(1)
        .get(),
      adminDb
        .collection("placement_hire_requests")
        .where("conversationId", "==", conversationId)
        .limit(1)
        .get(),
    ]);

    const interviewRequest = !interviewSnap.empty
      ? (() => {
          const doc = interviewSnap.docs[0];
          const v = doc.data() as any;
          return {
            id: doc.id,
            conversationId: String(v?.conversationId || conversationId),
            driverId: String(v?.driverId || ""),
            customerId: String(v?.customerId || ""),
            customerName:
              typeof v?.customerName === "string" ? v.customerName : "Customer",
            customerAvatarUrl:
              typeof v?.customerAvatarUrl === "string"
                ? v.customerAvatarUrl
                : null,
            status: String(v?.status || "requested"),
            interviewType: String(v?.interviewType || "google_meet_video"),
            notes: typeof v?.notes === "string" ? v.notes : undefined,
            createdAt: normalizeTimestamp(v?.createdAt),
            updatedAt: normalizeTimestamp(v?.updatedAt),
            respondedAt: normalizeTimestamp(v?.respondedAt),
          };
        })()
      : null;

    const hireRequest = !hireSnap.empty
      ? (() => {
          const doc = hireSnap.docs[0];
          const v = doc.data() as any;
          return {
            id: doc.id,
            conversationId: String(v?.conversationId || conversationId),
            driverId: String(v?.driverId || ""),
            customerId: String(v?.customerId || ""),
            customerName:
              typeof v?.customerName === "string" ? v.customerName : "Customer",
            customerAvatarUrl:
              typeof v?.customerAvatarUrl === "string"
                ? v.customerAvatarUrl
                : null,
            status: String(v?.status || "requested"),
            notes: typeof v?.notes === "string" ? v.notes : undefined,
            createdAt: normalizeTimestamp(v?.createdAt),
            updatedAt: normalizeTimestamp(v?.updatedAt),
            respondedAt: normalizeTimestamp(v?.respondedAt),
          };
        })()
      : null;

    return NextResponse.json(
      {
        conversationId,
        interviewRequest,
        hireRequest,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/admin/placement/requests] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch placement request metadata." },
      { status: 500 },
    );
  }
}
