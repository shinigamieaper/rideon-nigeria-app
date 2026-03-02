import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

let firestoreOutageUntil = 0;

function isFirestoreInOutage(): boolean {
  return Date.now() < firestoreOutageUntil;
}

function markFirestoreOutage(ms: number) {
  firestoreOutageUntil = Math.max(firestoreOutageUntil, Date.now() + ms);
}

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
    const serviceFilter = String(url.searchParams.get("service") || "").trim();

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";
    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[reservations/upcoming] verifyIdToken",
    );
    const uid = decoded.uid;

    const now = new Date();
    async function fetchForField(whereField: "uid" | "customerId") {
      return withTimeout(
        adminDb
          .collection("bookings")
          .where(whereField, "==", uid)
          .limit(60)
          .get(),
        3_000,
        "[reservations/upcoming] bookings query",
      );
    }

    if (isFirestoreInOutage()) {
      return NextResponse.json(
        { reservations: [], degraded: true },
        { status: 200 },
      );
    }

    const snaps = await Promise.allSettled([
      fetchForField("uid"),
      fetchForField("customerId"),
    ]);

    const docMap = new Map<string, any>();
    for (const s of snaps) {
      if (s.status !== "fulfilled") {
        if (isFirestoreConnectivityError(s.reason)) {
          markFirestoreOutage(30_000);
        }
        continue;
      }
      for (const d of s.value.docs) {
        docMap.set(d.id, d);
      }
    }

    if (docMap.size === 0 && snaps.some((s) => s.status === "rejected")) {
      // If everything failed (likely connectivity), degrade fast.
      return NextResponse.json(
        { reservations: [], degraded: true },
        { status: 200 },
      );
    }

    const docs = Array.from(docMap.values());

    const results: any[] = [];
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

      const sched: Date | null = (() => {
        try {
          const t =
            d.scheduledPickupTime?.toDate?.() ?? d.scheduledPickupTime ?? null;
          if (t) {
            const dt = new Date(t);
            if (!isNaN(dt.getTime())) return dt;
          }
        } catch {}
        if (d.startDate) {
          const [y, m, dd] = String(d.startDate)
            .split("-")
            .map((n: string) => parseInt(n, 10));
          const [hh, mm] = String(d.startTime || "00:00")
            .split(":")
            .map((n: string) => parseInt(n, 10));
          const dt = new Date(
            y || 1970,
            (m || 1) - 1,
            dd || 1,
            hh || 0,
            mm || 0,
          );
          return isNaN(dt.getTime()) ? null : dt;
        }
        return null;
      })();

      const status: string = String(d.status || "confirmed");
      const isFuture = sched ? sched.getTime() >= now.getTime() : true;
      const paymentStatus: string = String(d?.payment?.status || "pending");
      const isPaid = paymentStatus === "succeeded";
      const isUpcomingStatus = [
        "confirmed",
        "driver_assigned",
        "en_route",
        "in_progress",
        "needs_reassignment",
      ].includes(status);

      if (isFuture && isUpcomingStatus && isPaid) {
        results.push({
          id: doc.id,
          service,
          pickupAddress: d.pickupAddress ?? "",
          pickupCoords: Array.isArray(d.pickupCoords)
            ? d.pickupCoords
            : undefined,
          scheduledPickupTime: d.scheduledPickupTime ?? null,
          startDate: d.startDate ?? null,
          startTime: d.startTime ?? null,
          rentalUnit: d.rentalUnit ?? null,
          listingId: d.listingId ?? null,
          category: d.category ?? d.vehicleClass ?? null,
          city: d.city ?? null,
          fareNgn: d.fareNgn ?? null,
          status,
        });
      }
    });

    results.sort((a, b) => {
      const ad = new Date(
        a.scheduledPickupTime?.toDate?.() ??
          a.scheduledPickupTime ??
          `${a.startDate || ""}T${a.startTime || "00:00"}`,
      );
      const bd = new Date(
        b.scheduledPickupTime?.toDate?.() ??
          b.scheduledPickupTime ??
          `${b.startDate || ""}T${b.startTime || "00:00"}`,
      );
      return ad.getTime() - bd.getTime();
    });

    return NextResponse.json({ reservations: results }, { status: 200 });
  } catch (error) {
    if (isFirestoreConnectivityError(error)) {
      markFirestoreOutage(30_000);
      console.warn(
        "[GET /api/reservations/upcoming] Firestore unreachable; returning empty reservations list",
      );
      return NextResponse.json(
        { reservations: [], degraded: true },
        { status: 200 },
      );
    }
    console.error("Error fetching upcoming reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming reservations." },
      { status: 500 },
    );
  }
}
