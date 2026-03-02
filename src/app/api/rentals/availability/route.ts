import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/rentals/availability
 * Body: {
 *   listingId: string,
 *   rentalUnit: 'day' | '4h',
 *   startDate: string, // yyyy-mm-dd
 *   startTime?: string, // HH:mm (required for 4h if endTime absent)
 *   endDate?: string,   // yyyy-mm-dd (for multi-day day rentals)
 *   endTime?: string    // HH:mm (for 4h or specific end)
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as any);
    const listingId = String(body?.listingId || "").trim();
    const rentalUnit = String(body?.rentalUnit || "").trim();
    const startDate = String(body?.startDate || "").trim();

    if (
      !listingId ||
      !startDate ||
      (rentalUnit !== "day" && rentalUnit !== "4h")
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    // Basic sanity for listing
    const listingDoc = await adminDb
      .collection("vehicles")
      .doc(listingId)
      .get();
    if (!listingDoc.exists) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    const listingData = listingDoc.data() as any;
    if (
      listingData?.adminActive === false ||
      String(listingData?.status || "available") !== "available"
    ) {
      return NextResponse.json(
        { available: false, conflicts: 0, conflictIds: [] },
        { status: 200 },
      );
    }

    const toDateSafe = (dateStr?: string, timeStr?: string) => {
      if (!dateStr) return null;
      const ts = `${dateStr}T${timeStr || "00:00"}:00`;
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    };

    let reqStart: Date | null = null;
    let reqEnd: Date | null = null;

    if (rentalUnit === "day") {
      reqStart = toDateSafe(startDate, "00:00");
      const endDate = String(body?.endDate || "").trim();
      if (endDate) {
        // inclusive days
        const end = toDateSafe(endDate, "23:59");
        reqEnd = end || null;
      } else {
        reqEnd = toDateSafe(startDate, "23:59");
      }
    } else {
      // 4-hour block
      const st = String(body?.startTime || "").trim();
      const et = String(body?.endTime || "").trim();
      reqStart = toDateSafe(startDate, st || "08:00");
      if (et) {
        reqEnd = toDateSafe(startDate, et);
      } else if (reqStart) {
        reqEnd = new Date(reqStart.getTime() + 4 * 60 * 60 * 1000);
      }
    }

    if (!reqStart || !reqEnd || reqEnd.getTime() <= reqStart.getTime()) {
      return NextResponse.json(
        { error: "Invalid or incomplete date/time window." },
        { status: 400 },
      );
    }

    // Fetch existing bookings for this listing; filter in memory for overlap
    const snap = await adminDb
      .collection("bookings")
      .where("listingId", "==", listingId)
      .limit(200)
      .get();

    const blockingStatuses = new Set([
      "confirmed",
      "driver_assigned",
      "en_route",
      "in_progress",
      "pending",
    ]);

    const overlaps: string[] = [];

    snap.forEach((doc) => {
      const d = doc.data() as any;
      const status = String(d?.status || "confirmed");
      const paymentStatus = String(d?.payment?.status || "pending");

      const isBlockingStatus =
        blockingStatuses.has(status) ||
        (status === "requested" &&
          (paymentStatus === "pending" || paymentStatus === "succeeded"));

      if (!isBlockingStatus) return;

      const parseExisting = (): { s: Date; e: Date } | null => {
        try {
          // Prefer explicit start/end dates
          const sd = String(d?.startDate || "").trim();
          const ed = String(d?.endDate || "").trim();
          const st = String(d?.startTime || "").trim();
          const et = String(d?.endTime || "").trim();
          if (sd) {
            const s = toDateSafe(
              sd,
              st || (d?.rentalUnit === "4h" ? "08:00" : "00:00"),
            );
            let e: Date | null = null;
            if (ed) {
              e = toDateSafe(
                ed,
                et || (d?.rentalUnit === "4h" ? "12:00" : "23:59"),
              );
            } else if (et) {
              e = toDateSafe(sd, et);
            } else if (s) {
              e =
                d?.rentalUnit === "4h"
                  ? new Date(s.getTime() + 4 * 60 * 60 * 1000)
                  : toDateSafe(sd, "23:59");
            }
            if (s && e && e.getTime() > s.getTime()) return { s, e };
          }
        } catch {}
        return null;
      };

      const interval = parseExisting();
      if (!interval) return;

      const sA = reqStart.getTime();
      const eA = reqEnd.getTime();
      const sB = interval.s.getTime();
      const eB = interval.e.getTime();

      // Standard interval overlap check
      if (sA < eB && sB < eA) {
        overlaps.push(doc.id);
      }
    });

    const available = overlaps.length === 0;

    return NextResponse.json(
      { available, conflicts: overlaps.length, conflictIds: overlaps },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error checking rental availability:", error);
    return NextResponse.json(
      { error: "Failed to check rental availability." },
      { status: 500 },
    );
  }
}
