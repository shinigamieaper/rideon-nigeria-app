import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ reservationId: string }> },
) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;
    if (!canWrite(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { reservationId } = await context.params;
    const bookingId = String(reservationId || "").trim();
    if (!bookingId) {
      return NextResponse.json(
        { error: "Missing reservationId" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const vehicleId =
      typeof body?.vehicleId === "string" ? body.vehicleId.trim() : "";

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 },
      );
    }

    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const vehicleRef = adminDb.collection("vehicles").doc(vehicleId);

    const now = FieldValue.serverTimestamp();

    let assignedPartnerDriverId: string | null = null;

    await adminDb.runTransaction(async (tx) => {
      const [bSnap, vSnap] = await Promise.all([
        tx.get(bookingRef),
        tx.get(vehicleRef),
      ]);
      if (!bSnap.exists) throw new Error("Reservation not found");
      if (!vSnap.exists) throw new Error("Vehicle not found");

      const booking = bSnap.data() as any;
      const vehicle = vSnap.data() as any;

      if (vehicle?.partnerId !== ctx.partnerId) throw new Error("Forbidden.");

      // Ensure reservation is actually a partner reservation (listing belongs to partner)
      const currentListingId = String(booking?.listingId || "").trim();
      if (currentListingId !== vehicleId) {
        // We are intentionally strict: partner can only dispatch reservations already assigned to their fleet listing.
        throw new Error("Reservation is not assigned to this vehicle listing.");
      }

      // Enforce there is an active 1:1 link for this vehicle
      const linkSnap = await tx.get(
        adminDb
          .collection("partner_vehicle_driver_links")
          .where("partnerId", "==", ctx.partnerId)
          .where("status", "==", "active")
          .where("vehicleId", "==", vehicleId)
          .limit(1),
      );
      if (linkSnap.empty) {
        throw new Error(
          "No active driver link for this vehicle. Assign a driver first.",
        );
      }

      const link = linkSnap.docs[0].data() as any;
      const partnerDriverId = String(link?.driverId || "").trim();
      if (!partnerDriverId) {
        throw new Error("Invalid link: missing driverId");
      }

      const driverDoc = await tx.get(
        adminDb.collection("partner_drivers").doc(partnerDriverId),
      );
      if (!driverDoc.exists) throw new Error("Linked driver not found");
      const d = driverDoc.data() as any;
      if (d?.partnerId !== ctx.partnerId) throw new Error("Forbidden.");
      if (String(d?.status || "") !== "approved")
        throw new Error("Linked driver is not approved");

      assignedPartnerDriverId = partnerDriverId;

      // IMPORTANT: Partner drivers are not the same as app drivers (drivers collection).
      // So we store partner assignment separately without touching driverId or driver workflow.
      tx.set(
        bookingRef,
        {
          partnerDriverId: partnerDriverId,
          partnerDriverInfo: {
            name:
              `${d?.firstName || ""} ${d?.lastName || ""}`.trim() || "Driver",
            phone: d?.phone || "",
            email: d?.email || "",
            city: d?.city || "",
          },
          partnerDispatchStatus: "dispatched",
          partnerAssignedAt: now,
          partnerAssignedBy: ctx.actorUid,
          updatedAt: now,
        },
        { merge: true },
      );
    });

    return NextResponse.json(
      { success: true, partnerDriverId: assignedPartnerDriverId },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error assigning partner reservation:", error);
    const message = (error as any)?.message;
    if (typeof message === "string" && message) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to assign reservation." },
      { status: 500 },
    );
  }
}
