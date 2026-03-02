import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const now = new Date();

    // Fetch a reasonable slice and filter in memory to avoid composite index complexities
    const qSnap = await adminDb
      .collection("bookings")
      .where("customerId", "==", uid)
      .limit(50)
      .get();

    const okStatuses = new Set([
      "confirmed",
      "driver_assigned",
      "en_route",
      "in_progress",
    ]);
    const rows = qSnap.docs
      .map((doc) => {
        const data = doc.data() as any;
        const t =
          data.scheduledPickupTime?.toDate?.() ??
          data.scheduledPickupTime ??
          null;
        const ts = t ? new Date(t) : null;
        return { id: doc.id, data, ts } as const;
      })
      .filter((r) => {
        const isFuture = r.ts && r.ts >= now;
        const status = String(r.data?.status || "requested");
        const paid =
          String(r.data?.payment?.status || "pending") === "succeeded";
        return !!isFuture && okStatuses.has(status) && paid;
      })
      .sort((a, b) => a.ts!.getTime() - b.ts!.getTime());

    if (rows.length === 0) {
      return NextResponse.json({ booking: null }, { status: 200 });
    }

    const first = rows[0];
    const booking = {
      _id: first.id,
      pickupAddress: first.data.pickupAddress ?? "",
      dropoffAddress: first.data.dropoffAddress ?? "",
      scheduledPickupTime: first.ts!,
    };

    return NextResponse.json({ booking }, { status: 200 });
  } catch (error) {
    console.error("Error fetching upcoming trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming trip." },
      { status: 500 },
    );
  }
}
