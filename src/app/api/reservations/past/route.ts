import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

function isFirestoreConnectivityError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || "");
  if (msg.includes("EHOSTUNREACH")) return true;
  if (msg.includes("ECONNREFUSED")) return true;
  if (msg.includes("ETIMEDOUT")) return true;
  if (msg.toLowerCase().includes("unavailable")) return true;
  return false;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitQ = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(50, parseInt(limitQ || "10", 10)));

    const serviceFilter = String(url.searchParams.get("service") || "").trim();

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = await withTimeout(
        adminAuth.verifyIdToken(token),
        2_500,
        "[reservations/past] verifyIdToken",
      );
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = decoded.uid;

    const now = new Date();
    async function fetchForField(whereField: "uid" | "customerId") {
      return withTimeout(
        adminDb
          .collection("bookings")
          .where(whereField, "==", uid)
          .limit(120)
          .get(),
        3_000,
        "[reservations/past] bookings query",
      );
    }

    const snaps = await Promise.allSettled([
      fetchForField("uid"),
      fetchForField("customerId"),
    ]);

    const docMap = new Map<string, any>();
    for (const s of snaps) {
      if (s.status !== "fulfilled") {
        continue;
      }
      for (const d of s.value.docs) {
        docMap.set(d.id, d);
      }
    }

    if (docMap.size === 0 && snaps.some((s) => s.status === "rejected")) {
      return NextResponse.json(
        { reservations: [], degraded: true },
        { status: 200 },
      );
    }

    const docs = Array.from(docMap.values());

    const results: any[] = [];

    const toDateMaybe = (val: any): Date | null => {
      try {
        const t = val?.toDate?.() ?? val ?? null;
        if (!t) return null;
        const d = new Date(t);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    const endFromRental = (d: any): Date | null => {
      try {
        const sd = String(d?.startDate || "").trim();
        const ed = String(d?.endDate || "").trim();
        const st = String(d?.startTime || "").trim();
        const et = String(d?.endTime || "").trim();
        if (!sd) return null;
        const start = new Date(`${sd}T${st || "08:00"}:00`);
        if (isNaN(start.getTime())) return null;
        if (ed) {
          const e = new Date(`${ed}T${et || "23:59"}:00`);
          return isNaN(e.getTime()) ? null : e;
        }
        if (et) {
          const e = new Date(`${sd}T${et}:00`);
          return isNaN(e.getTime()) ? null : e;
        }
        return d?.rentalUnit === "4h"
          ? new Date(start.getTime() + 4 * 60 * 60 * 1000)
          : new Date(`${sd}T23:59:00`);
      } catch {
        return null;
      }
    };

    const normalizeStatus = (s: any) =>
      String(s || "")
        .trim()
        .toLowerCase();
    const isCancelledStatus = (s: string) =>
      s === "cancelled" ||
      s.startsWith("cancelled") ||
      s === "canceled" ||
      s.startsWith("canceled");
    const isPastStatus = (s: string) =>
      [
        "completed",
        "canceled",
        "cancelled",
        "expired",
        "cancelled_by_customer",
        "cancelled_by_driver",
        "canceled_by_customer",
        "canceled_by_driver",
      ].includes(s) || isCancelledStatus(s);

    docs.forEach((doc) => {
      const d = doc.data() as any;
      const internalService =
        d?.service === "drive_my_car"
          ? "drive_my_car"
          : d?.listingId && d?.rentalUnit
            ? "rental"
            : "chauffeur";

      const service =
        internalService === "drive_my_car" ? "drive_my_car" : "chauffeur";

      if (serviceFilter) {
        const sf = serviceFilter;
        const isChauffeurFilter = sf === "chauffeur" || sf === "rental";
        if (isChauffeurFilter) {
          if (service !== "chauffeur") return;
        } else if (service !== sf) {
          return;
        }
      }
      const statusNorm = normalizeStatus(d.status || "confirmed");
      const paymentStatus: string = String(d?.payment?.status || "pending");
      const isPaid = paymentStatus === "succeeded";

      const sched = toDateMaybe(d.scheduledPickupTime);
      const end = endFromRental(d);
      const inPast = end
        ? end.getTime() < now.getTime()
        : sched
          ? sched.getTime() < now.getTime()
          : false;

      const include = (() => {
        if (isCancelledStatus(statusNorm) || isPastStatus(statusNorm))
          return true;
        if (inPast && isPaid) return true;
        return false;
      })();

      if (include) {
        results.push({
          id: doc.id,
          service,
          startDate: d.startDate ?? null,
          endDate: d.endDate ?? null,
          startTime: d.startTime ?? null,
          endTime: d.endTime ?? null,
          rentalUnit: d.rentalUnit ?? null,
          listingId: d.listingId ?? null,
          category: d.category ?? d.vehicleClass ?? null,
          city: d.city ?? null,
          fareNgn: d.fareNgn ?? null,
          status: statusNorm || "confirmed",
          scheduledPickupTime: d.scheduledPickupTime ?? null,
        });
      }
    });

    results.sort((a, b) => {
      // Sort by end time desc (fallback to start)
      const parse = (x: any) => {
        const end = (() => {
          const sd = x.startDate;
          const ed = x.endDate;
          const st = x.startTime;
          const et = x.endTime;
          if (!sd && !x.scheduledPickupTime) return null;
          if (ed) return new Date(`${ed}T${et || "23:59"}`);
          if (et && sd) return new Date(`${sd}T${et}`);
          const sched =
            x.scheduledPickupTime?.toDate?.() ??
            x.scheduledPickupTime ??
            `${x.startDate || ""}T${x.startTime || "00:00"}`;
          return new Date(sched);
        })();
        return end ? new Date(end) : new Date(0);
      };
      return parse(b).getTime() - parse(a).getTime();
    });

    return NextResponse.json(
      { reservations: results.slice(0, limit) },
      { status: 200 },
    );
  } catch (error) {
    const degraded = isFirestoreConnectivityError(error);
    if (degraded) {
      console.warn(
        "[GET /api/reservations/past] Firestore unreachable, returning empty reservations list",
      );
      return NextResponse.json(
        { reservations: [], degraded: true },
        { status: 503 },
      );
    }
    console.error("Error fetching past reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch past reservations." },
      { status: 500 },
    );
  }
}
