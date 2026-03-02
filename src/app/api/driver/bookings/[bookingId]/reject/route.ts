export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/driver/bookings/[bookingId]/reject
 * Driver rejects an assigned booking
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    // Verify driver auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const driverId = decoded.uid;
    const role = decoded?.role ?? decoded?.claims?.role;

    if (role !== "driver") {
      return NextResponse.json(
        { error: "Forbidden: driver role required" },
        { status: 403 },
      );
    }

    // Parse request body for optional rejection reason
    let rejectionReason = "";
    try {
      const body = await req.json();
      rejectionReason = body?.reason || "";
    } catch {
      // No body is fine
    }

    const nowMs = Date.now();
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const offerRef = adminDb
      .collection("booking_offers")
      .doc(`${bookingId}_${driverId}`);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const [offerSnap, bookingSnap] = await Promise.all([
        tx.get(offerRef),
        tx.get(bookingRef),
      ]);

      if (!offerSnap.exists) {
        return {
          ok: false as const,
          status: 404,
          error: "Offer not found for this booking.",
        };
      }

      const offer = offerSnap.data() as any;
      const expiresAtMs = Number(offer?.expiresAtMs || 0);
      if (expiresAtMs && expiresAtMs <= nowMs) {
        if (String(offer?.status || "") === "pending") {
          tx.update(offerRef, {
            status: "expired",
            respondedAt: FieldValue.serverTimestamp(),
            respondedAtMs: nowMs,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { ok: true as const, status: "expired" as const };
      }

      const currentStatus = String(offer?.status || "");
      if (currentStatus !== "pending") {
        return { ok: true as const, status: currentStatus as any };
      }

      if (bookingSnap.exists) {
        const b = bookingSnap.data() as any;
        if (b?.driverId && String(b.driverId) !== driverId) {
          tx.update(offerRef, {
            status: "expired",
            respondedAt: FieldValue.serverTimestamp(),
            respondedAtMs: nowMs,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return { ok: true as const, status: "expired" as const };
        }

        tx.set(
          bookingRef,
          {
            rejectedDriverIds: FieldValue.arrayUnion(driverId),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      tx.update(offerRef, {
        status: "rejected",
        rejectionReason: rejectionReason || "Driver declined",
        respondedAt: FieldValue.serverTimestamp(),
        respondedAtMs: nowMs,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { ok: true as const, status: "rejected" as const };
    });

    if (!(txResult as any)?.ok) {
      return NextResponse.json(
        { error: (txResult as any)?.error || "Failed to reject booking" },
        { status: (txResult as any)?.status || 400 },
      );
    }

    console.info(
      `[driver/bookings/reject] Offer rejected for booking ${bookingId} by driver ${driverId}: ${rejectionReason}`,
    );

    return NextResponse.json(
      { success: true, status: (txResult as any)?.status || "rejected" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(
      "[POST /api/driver/bookings/[bookingId]/reject] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to reject booking" },
      { status: 500 },
    );
  }
}
