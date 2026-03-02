export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendPlacementStatusEmail } from "@/lib/placementStatusEmails";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { requestId } = await params;
    if (!requestId) {
      return NextResponse.json(
        { error: "Missing requestId." },
        { status: 400 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }

    const driverId = decoded.uid;

    const body = await req.json().catch(() => ({}) as any);
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const nextStatus =
      action === "accept" ? "accepted" : action === "decline" ? "declined" : "";

    if (!nextStatus) {
      return NextResponse.json(
        { error: 'Invalid action. Use "accept" or "decline".' },
        { status: 400 },
      );
    }

    const ref = adminDb
      .collection("placement_interview_requests")
      .doc(requestId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Interview request not found." },
        { status: 404 },
      );
    }

    const data = snap.data() as any;
    if (String(data?.driverId || "") !== driverId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const prev = String(data?.status || "requested");
    if (prev !== "requested") {
      return NextResponse.json(
        { error: `Cannot respond to interview request with status: ${prev}` },
        { status: 400 },
      );
    }

    await ref.update({
      status: nextStatus,
      respondedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const conversationId = String(data?.conversationId || "").trim();
    if (conversationId) {
      try {
        await adminDb.collection("conversations").doc(conversationId).update({
          "context.placementContactStatus": nextStatus,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn(
          "[interview-requests/respond] Failed to update placement conversation context",
          e,
        );
      }
    }

    const customerId = String(data?.customerId || "").trim();
    if (customerId) {
      try {
        const title =
          nextStatus === "accepted"
            ? "Interview accepted"
            : "Interview declined";
        const message =
          nextStatus === "accepted"
            ? "Your interview request was accepted. You can now chat and call the driver from your messages."
            : "Your interview request was declined.";

        await adminDb
          .collection("users")
          .doc(customerId)
          .collection("notifications")
          .add({
            type: "placement_interview_request_update",
            title,
            message,
            portal: "app",
            unread: true,
            createdAt: FieldValue.serverTimestamp(),
          });
      } catch (e) {
        console.warn(
          "[interview-requests/respond] Failed to notify customer",
          e,
        );
      }

      try {
        await sendPlacementStatusEmail({
          customerId,
          kind: "interview",
          status: nextStatus,
          conversationId: conversationId || undefined,
        });
      } catch (e) {
        console.warn(
          "[interview-requests/respond] Failed to email customer",
          e,
        );
      }
    }

    return NextResponse.json(
      { success: true, status: nextStatus },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "[POST /api/driver/placement/interview-requests/[requestId]] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to respond to interview request." },
      { status: 500 },
    );
  }
}
