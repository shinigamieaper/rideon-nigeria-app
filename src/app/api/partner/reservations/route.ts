import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toIsoDateMaybe(v: any): string | null {
  try {
    if (!v) return null;
    if (typeof v === "string") {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    const asDate = v?.toDate?.();
    if (asDate instanceof Date && !isNaN(asDate.getTime()))
      return asDate.toISOString();
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;

    const url = new URL(req.url);
    const statusFilter = String(url.searchParams.get("status") || "").trim();
    const limitParam = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(100, Math.round(limitParam)))
      : 50;

    // Partner reservations are bookings whose listingId is one of this partner's vehicles.
    const vehiclesSnap = await adminDb
      .collection("vehicles")
      .where("partnerId", "==", ctx.partnerId)
      .limit(300)
      .get();
    const vehicleIds = vehiclesSnap.docs.map((d) => d.id).filter(Boolean);

    if (vehicleIds.length === 0) {
      return NextResponse.json(
        { reservations: [], counts: { total: 0 } },
        { status: 200 },
      );
    }

    const statuses = statusFilter ? [statusFilter] : [];

    const results: any[] = [];

    // Firestore 'in' supports up to 10 items.
    const idChunks = chunk(vehicleIds, 10);
    for (const ids of idChunks) {
      let q: FirebaseFirestore.Query = adminDb
        .collection("bookings")
        .where("listingId", "in", ids);
      if (statuses.length === 1) {
        q = q.where("status", "==", statuses[0]);
      }

      let snap: FirebaseFirestore.QuerySnapshot;
      try {
        snap = await q.orderBy("createdAt", "desc").limit(limit).get();
      } catch {
        snap = await q.limit(limit).get();
      }

      snap.forEach((doc) => {
        const d = doc.data() as any;
        results.push({
          id: doc.id,
          status: d?.status || "requested",
          listingId: d?.listingId ?? null,
          city: d?.city ?? null,
          rentalUnit: d?.rentalUnit ?? null,
          startDate: d?.startDate ?? null,
          endDate: d?.endDate ?? null,
          startTime: d?.startTime ?? null,
          endTime: d?.endTime ?? null,
          scheduledPickupTime:
            d?.scheduledPickupTime?.toDate?.()?.toISOString?.() ?? null,
          pickupAddress: d?.pickupAddress ?? "",
          dropoffAddress: d?.dropoffAddress ?? "",
          fareNgn: d?.fareNgn ?? null,
          paymentStatus: d?.payment?.status ?? "pending",
          createdAt: toIsoDateMaybe(d?.createdAt),
          partnerDriverId: d?.partnerDriverId ?? null,
          partnerDriverInfo: d?.partnerDriverInfo ?? null,
          partnerDispatchStatus: d?.partnerDispatchStatus ?? null,
        });
      });
    }

    // De-dupe and sort (since multiple chunk queries can overlap ordering).
    const uniq = new Map<string, any>();
    for (const r of results) {
      if (!uniq.has(r.id)) uniq.set(r.id, r);
    }

    const reservations = Array.from(uniq.values())
      .sort((a, b) => {
        const ta = a?.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
        const tb = b?.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
        return tb - ta;
      })
      .slice(0, limit);

    return NextResponse.json(
      { reservations, counts: { total: reservations.length } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching partner reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations." },
      { status: 500 },
    );
  }
}
