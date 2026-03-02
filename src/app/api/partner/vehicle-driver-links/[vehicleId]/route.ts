import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ vehicleId: string }> },
) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;
    if (!canWrite(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { vehicleId } = await context.params;
    const vId = String(vehicleId || "").trim();
    if (!vId) {
      return NextResponse.json({ error: "Missing vehicleId" }, { status: 400 });
    }

    const vehicleRef = adminDb.collection("vehicles").doc(vId);
    const now = FieldValue.serverTimestamp();

    let deleted = false;

    await adminDb.runTransaction(async (tx) => {
      const vSnap = await tx.get(vehicleRef);
      if (!vSnap.exists) throw new Error("Vehicle not found");
      const v = vSnap.data() as any;
      if (v?.partnerId !== ctx.partnerId) throw new Error("Forbidden.");

      const linkSnap = await tx.get(
        adminDb
          .collection("partner_vehicle_driver_links")
          .where("partnerId", "==", ctx.partnerId)
          .where("status", "==", "active")
          .where("vehicleId", "==", vId)
          .limit(1),
      );

      if (linkSnap.empty) {
        return;
      }

      const linkRef = linkSnap.docs[0].ref;
      tx.set(
        linkRef,
        {
          status: "inactive",
          updatedAt: now,
          endedAt: now,
        },
        { merge: true },
      );
      deleted = true;
    });

    return NextResponse.json({ success: true, deleted }, { status: 200 });
  } catch (error) {
    console.error("Error detaching driver from vehicle:", error);
    const message = (error as any)?.message;
    if (typeof message === "string" && message) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to detach driver from vehicle." },
      { status: 500 },
    );
  }
}
