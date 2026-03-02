import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

type LinkStatus = "active" | "inactive";

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;

    const [vehiclesSnap, driversSnap, linksSnap] = await Promise.all([
      adminDb
        .collection("vehicles")
        .where("partnerId", "==", ctx.partnerId)
        .limit(300)
        .get(),
      adminDb
        .collection("partner_drivers")
        .where("partnerId", "==", ctx.partnerId)
        .where("status", "==", "approved")
        .limit(300)
        .get(),
      adminDb
        .collection("partner_vehicle_driver_links")
        .where("partnerId", "==", ctx.partnerId)
        .where("status", "==", "active")
        .limit(500)
        .get(),
    ]);

    const vehicles = vehiclesSnap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        make: d?.make || "",
        model: d?.model || "",
        category: d?.category || "",
        city: d?.city || "",
        seats: typeof d?.seats === "number" ? d.seats : null,
        status: d?.status || null,
      };
    });

    const drivers = driversSnap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        firstName: d?.firstName || "",
        lastName: d?.lastName || "",
        phone: d?.phone || "",
        email: d?.email || "",
        city: d?.city || "",
      };
    });

    const links = linksSnap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        status: (d?.status as LinkStatus) || "active",
        vehicleId: d?.vehicleId || "",
        driverId: d?.driverId || "",
        createdAt: d?.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: d?.updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return NextResponse.json({ vehicles, drivers, links }, { status: 200 });
  } catch (error) {
    console.error("Error fetching partner vehicle-driver links:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle-driver links." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;
    if (!canWrite(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const vehicleId =
      typeof body?.vehicleId === "string" ? body.vehicleId.trim() : "";
    const driverId =
      typeof body?.driverId === "string" ? body.driverId.trim() : "";

    if (!vehicleId || !driverId) {
      return NextResponse.json(
        { error: "vehicleId and driverId are required." },
        { status: 400 },
      );
    }

    const vehicleRef = adminDb.collection("vehicles").doc(vehicleId);
    const driverRef = adminDb.collection("partner_drivers").doc(driverId);

    const now = FieldValue.serverTimestamp();

    let linkId: string | null = null;

    await adminDb.runTransaction(async (tx) => {
      const [vSnap, dSnap] = await Promise.all([
        tx.get(vehicleRef),
        tx.get(driverRef),
      ]);

      if (!vSnap.exists) throw new Error("Vehicle not found");
      if (!dSnap.exists) throw new Error("Driver not found");

      const v = vSnap.data() as any;
      const d = dSnap.data() as any;

      if (v?.partnerId !== ctx.partnerId) throw new Error("Forbidden.");
      if (d?.partnerId !== ctx.partnerId) throw new Error("Forbidden.");
      if (String(d?.status || "") !== "approved")
        throw new Error("Driver is not approved");

      // Enforce 1:1 mapping (within partner)
      const existingForVehicle = await tx.get(
        adminDb
          .collection("partner_vehicle_driver_links")
          .where("partnerId", "==", ctx.partnerId)
          .where("status", "==", "active")
          .where("vehicleId", "==", vehicleId)
          .limit(1),
      );

      if (!existingForVehicle.empty) {
        throw new Error("This vehicle already has a driver assigned.");
      }

      const existingForDriver = await tx.get(
        adminDb
          .collection("partner_vehicle_driver_links")
          .where("partnerId", "==", ctx.partnerId)
          .where("status", "==", "active")
          .where("driverId", "==", driverId)
          .limit(1),
      );

      if (!existingForDriver.empty) {
        throw new Error("This driver is already assigned to a vehicle.");
      }

      const linkRef = adminDb.collection("partner_vehicle_driver_links").doc();
      linkId = linkRef.id;

      tx.set(linkRef, {
        partnerId: ctx.partnerId,
        vehicleId,
        driverId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    });

    return NextResponse.json({ success: true, id: linkId }, { status: 201 });
  } catch (error) {
    console.error("Error attaching driver to vehicle:", error);
    const message = (error as any)?.message;
    if (typeof message === "string" && message) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to attach driver to vehicle." },
      { status: 500 },
    );
  }
}
