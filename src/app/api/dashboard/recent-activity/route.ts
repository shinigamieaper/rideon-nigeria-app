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

function toIso(input: any): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  if (input?.toDate) {
    try {
      return input.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (input instanceof Date) return input.toISOString();
  return undefined;
}

function tsToMs(input: any): number {
  if (!input) return 0;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const n = Date.parse(input);
    return Number.isFinite(n) ? n : 0;
  }
  if (input?.toDate) {
    try {
      const d = input.toDate();
      return d instanceof Date ? d.getTime() : 0;
    } catch {
      return 0;
    }
  }
  if (input instanceof Date) return input.getTime();
  return 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitRaw = Number(url.searchParams.get("limit") || 5);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
      : 5;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[recent-activity] verifyIdToken",
    );
    const uid = decoded.uid;

    if (isFirestoreInOutage()) {
      return NextResponse.json(
        { activities: [], degraded: true },
        { status: 200 },
      );
    }

    const oversample = Math.min(100, Math.max(10, limit * 4));

    async function fetchWithOrder(whereField: "uid" | "customerId") {
      return withTimeout(
        adminDb
          .collection("bookings")
          .where(whereField, "==", uid)
          .orderBy("createdAt", "desc")
          .limit(oversample)
          .get(),
        3_000,
        "[recent-activity] query (ordered)",
      );
    }

    async function fetchWithoutOrder(whereField: "uid" | "customerId") {
      // Fallback when composite index is missing: fetch a small slice and sort in memory
      const fallbackLimit = Math.min(100, Math.max(10, oversample));
      return withTimeout(
        adminDb
          .collection("bookings")
          .where(whereField, "==", uid)
          .limit(fallbackLimit)
          .get(),
        3_000,
        "[recent-activity] query (fallback)",
      );
    }

    async function fetchForField(whereField: "uid" | "customerId") {
      try {
        return await fetchWithOrder(whereField);
      } catch (e: any) {
        const msg = String(e?.message || "");
        const code = (e && (e.code ?? e.status)) as unknown;
        if (msg.includes("requires an index") || code === 9) {
          console.warn(
            "[recent-activity] Missing composite index, using fallback equality-only query",
          );
          return await fetchWithoutOrder(whereField);
        }
        throw e;
      }
    }

    async function fetchPlacementInterviewRequests() {
      try {
        return await withTimeout(
          adminDb
            .collection("placement_interview_requests")
            .where("customerId", "==", uid)
            .orderBy("createdAt", "desc")
            .limit(oversample)
            .get(),
          3_000,
          "[recent-activity] placement_interview_requests query",
        );
      } catch (e: any) {
        const msg = String(e?.message || "");
        const code = (e && (e.code ?? e.status)) as unknown;
        if (msg.includes("requires an index") || code === 9) {
          console.warn(
            "[recent-activity] Missing composite index for placement_interview_requests, using fallback equality-only query",
          );
          return await withTimeout(
            adminDb
              .collection("placement_interview_requests")
              .where("customerId", "==", uid)
              .limit(oversample)
              .get(),
            3_000,
            "[recent-activity] placement_interview_requests query (fallback)",
          );
        }
        throw e;
      }
    }

    async function fetchPlacementHireRequests() {
      try {
        return await withTimeout(
          adminDb
            .collection("placement_hire_requests")
            .where("customerId", "==", uid)
            .orderBy("createdAt", "desc")
            .limit(oversample)
            .get(),
          3_000,
          "[recent-activity] placement_hire_requests query",
        );
      } catch (e: any) {
        const msg = String(e?.message || "");
        const code = (e && (e.code ?? e.status)) as unknown;
        if (msg.includes("requires an index") || code === 9) {
          console.warn(
            "[recent-activity] Missing composite index for placement_hire_requests, using fallback equality-only query",
          );
          return await withTimeout(
            adminDb
              .collection("placement_hire_requests")
              .where("customerId", "==", uid)
              .limit(oversample)
              .get(),
            3_000,
            "[recent-activity] placement_hire_requests query (fallback)",
          );
        }
        throw e;
      }
    }

    async function fetchPlacementAccessPurchases() {
      try {
        return await withTimeout(
          adminDb
            .collection("placement_access_purchases")
            .where("customerId", "==", uid)
            .orderBy("createdAt", "desc")
            .limit(oversample)
            .get(),
          3_000,
          "[recent-activity] placement_access_purchases query",
        );
      } catch (e: any) {
        const msg = String(e?.message || "");
        const code = (e && (e.code ?? e.status)) as unknown;
        if (msg.includes("requires an index") || code === 9) {
          console.warn(
            "[recent-activity] Missing composite index for placement_access_purchases, using fallback equality-only query",
          );
          return await withTimeout(
            adminDb
              .collection("placement_access_purchases")
              .where("customerId", "==", uid)
              .limit(oversample)
              .get(),
            3_000,
            "[recent-activity] placement_access_purchases query (fallback)",
          );
        }
        throw e;
      }
    }

    const snaps = await Promise.allSettled([
      fetchForField("uid"),
      fetchForField("customerId"),
      fetchPlacementInterviewRequests(),
      fetchPlacementHireRequests(),
      fetchPlacementAccessPurchases(),
    ]);

    const docMap = new Map<string, any>();
    const placementInterviewDocs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] =
      [];
    const placementHireDocs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] =
      [];
    const placementAccessDocs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] =
      [];

    for (let i = 0; i < snaps.length; i++) {
      const s = snaps[i];
      if (s.status !== "fulfilled") {
        if (isFirestoreConnectivityError(s.reason)) {
          markFirestoreOutage(30_000);
        }
        continue;
      }

      // 0,1 are bookings queries
      if (i === 0 || i === 1) {
        for (const d of s.value.docs) {
          docMap.set(d.id, d);
        }
        continue;
      }

      if (i === 2) placementInterviewDocs.push(...s.value.docs);
      if (i === 3) placementHireDocs.push(...s.value.docs);
      if (i === 4) placementAccessDocs.push(...s.value.docs);
    }

    if (
      docMap.size === 0 &&
      placementInterviewDocs.length === 0 &&
      placementHireDocs.length === 0 &&
      placementAccessDocs.length === 0 &&
      snaps.some((s) => s.status === "rejected")
    ) {
      return NextResponse.json(
        { activities: [], degraded: true },
        { status: 200 },
      );
    }

    const docs = Array.from(docMap.values());

    const rows: Array<{
      id: string;
      type: string;
      tone: "emerald" | "blue" | "rose" | "amber" | "gray";
      title: string;
      serviceGroup: "driver" | "chauffeur";
      link?: string;
      createdAt: number;
      timestamp: string;
    }> = [];

    // Bookings
    for (const doc of docs) {
      const data = doc.data() as any;
      const status: string = data.status || "requested";
      const pickupAddress = data.pickupAddress || "";
      const dropoffAddress = data.dropoffAddress || "";
      const createdAtDate =
        data.createdAt?.toDate?.() ?? data.createdAt ?? new Date();
      const createdAtIso = new Date(createdAtDate).toISOString();

      const internalService =
        data?.service === "drive_my_car"
          ? "drive_my_car"
          : data?.listingId && data?.rentalUnit
            ? "rental"
            : "chauffeur";
      const serviceGroup: "driver" | "chauffeur" =
        internalService === "drive_my_car" ? "driver" : "chauffeur";
      const routeText = dropoffAddress
        ? `${pickupAddress} → ${dropoffAddress}`
        : pickupAddress;

      let tone: "emerald" | "blue" | "rose" | "amber" | "gray" = "gray";
      let type: string = "trip_update";
      let title = `Trip Update`;

      switch (status) {
        case "completed":
          tone = "emerald";
          type = "trip_completed";
          title = routeText ? `Trip Completed: ${routeText}` : "Trip Completed";
          break;
        case "driver_assigned":
        case "confirmed":
        case "en_route":
        case "in_progress":
          tone = "blue";
          type = "trip_progress";
          title = routeText
            ? `Trip In Progress: ${routeText}`
            : "Trip In Progress";
          break;
        case "cancelled_by_customer":
        case "cancelled_by_driver":
          tone = "rose";
          type = "trip_canceled";
          title = `Trip Canceled`;
          break;
        default:
          tone = "gray";
          type = "trip_update";
          title = `Trip Update`;
      }

      rows.push({
        id: doc.id,
        type,
        tone,
        title,
        serviceGroup,
        link: `/app/reservations/${doc.id}`,
        createdAt: createdAtDate ? new Date(createdAtDate).getTime() : 0,
        timestamp: createdAtIso,
      });
    }

    // Placement driver profiles (names) for customer-friendly titles
    const placementDriverIds = Array.from(
      new Set(
        [...placementInterviewDocs, ...placementHireDocs]
          .map((d) => String((d.data() as any)?.driverId || "").trim())
          .filter(Boolean),
      ),
    );

    const driverById = new Map<string, { name: string }>();
    if (placementDriverIds.length) {
      try {
        const refs = placementDriverIds.map((id) =>
          adminDb.collection("users").doc(id),
        );
        const snaps = await withTimeout(
          adminDb.getAll(...refs),
          3_000,
          "[recent-activity] placement driver profiles",
        );
        for (const s of snaps) {
          if (!s.exists) continue;
          const u = s.data() as any;
          const firstName =
            typeof u?.firstName === "string" ? u.firstName.trim() : "";
          const lastName =
            typeof u?.lastName === "string" ? u.lastName.trim() : "";
          const name = [firstName, lastName].filter(Boolean).join(" ").trim();
          driverById.set(s.id, { name: name || "Driver" });
        }
      } catch (e) {
        console.warn(
          "[recent-activity] Failed to fetch placement driver profiles",
          e,
        );
      }
    }

    // Placement interview requests
    for (const doc of placementInterviewDocs) {
      const data = doc.data() as any;
      const status = String(data?.status || "requested");
      const driverId = String(data?.driverId || "").trim();
      const driverName = driverId
        ? driverById.get(driverId)?.name || "Driver"
        : "Driver";
      const conversationId = String(data?.conversationId || "").trim();

      const createdAtMs =
        tsToMs(data?.respondedAt) ||
        tsToMs(data?.updatedAt) ||
        tsToMs(data?.createdAt);
      const timestamp =
        toIso(data?.respondedAt) ||
        toIso(data?.updatedAt) ||
        toIso(data?.createdAt) ||
        new Date().toISOString();

      let tone: "emerald" | "blue" | "rose" | "amber" | "gray" = "gray";
      let type = "placement_interview_update";
      let title = `Interview update with ${driverName}`;

      if (status === "requested") {
        tone = "blue";
        type = "placement_interview_requested";
        title = `Interview requested with ${driverName}`;
      } else if (status === "accepted" || status === "scheduled") {
        tone = "emerald";
        type = "placement_interview_accepted";
        title = `Interview accepted by ${driverName}`;
      } else if (status === "declined" || status === "cancelled") {
        tone = "rose";
        type = "placement_interview_declined";
        title = `Interview declined by ${driverName}`;
      }

      rows.push({
        id: `placement_interview_${doc.id}`,
        type,
        tone,
        title,
        serviceGroup: "driver",
        link: conversationId
          ? `/app/hire-a-driver/messages/${conversationId}`
          : "/app/hire-a-driver/engagements",
        createdAt: createdAtMs,
        timestamp,
      });
    }

    // Placement hire requests
    for (const doc of placementHireDocs) {
      const data = doc.data() as any;
      const status = String(data?.status || "requested");
      const driverId = String(data?.driverId || "").trim();
      const driverName = driverId
        ? driverById.get(driverId)?.name || "Driver"
        : "Driver";
      const conversationId = String(data?.conversationId || "").trim();

      const createdAtMs =
        tsToMs(data?.respondedAt) ||
        tsToMs(data?.updatedAt) ||
        tsToMs(data?.createdAt);
      const timestamp =
        toIso(data?.respondedAt) ||
        toIso(data?.updatedAt) ||
        toIso(data?.createdAt) ||
        new Date().toISOString();

      let tone: "emerald" | "blue" | "rose" | "amber" | "gray" = "gray";
      let type = "placement_hire_update";
      let title = `Hire request update for ${driverName}`;

      if (status === "requested") {
        tone = "blue";
        type = "placement_hire_requested";
        title = `Hire request sent to ${driverName}`;
      } else if (status === "accepted" || status === "admin_approved") {
        tone = "emerald";
        type = "placement_hire_accepted";
        title = `Hire request accepted by ${driverName}`;
      } else if (status === "declined" || status === "cancelled") {
        tone = "rose";
        type = "placement_hire_declined";
        title = `Hire request declined by ${driverName}`;
      }

      rows.push({
        id: `placement_hire_${doc.id}`,
        type,
        tone,
        title,
        serviceGroup: "driver",
        link: conversationId
          ? `/app/hire-a-driver/messages/${conversationId}`
          : "/app/hire-a-driver/engagements",
        createdAt: createdAtMs,
        timestamp,
      });
    }

    // Placement access activation (completed/manual grant only)
    for (const doc of placementAccessDocs) {
      const data = doc.data() as any;
      const status = String(data?.status || "pending");
      if (status !== "completed" && status !== "manual_grant") continue;

      const createdAtMs = tsToMs(data?.completedAt) || tsToMs(data?.createdAt);
      const timestamp =
        toIso(data?.completedAt) ||
        toIso(data?.createdAt) ||
        new Date().toISOString();

      rows.push({
        id: `placement_access_${doc.id}`,
        type: "placement_access_activated",
        tone: "emerald",
        title: "Hire a Driver access activated",
        serviceGroup: "driver",
        link: "/app/hire-a-driver",
        createdAt: createdAtMs,
        timestamp,
      });
    }

    // Ensure descending by createdAt in memory and trim to requested limit
    const trimmed = rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    const activities = trimmed.map(({ createdAt, ...rest }) => rest);

    return NextResponse.json({ activities }, { status: 200 });
  } catch (error) {
    if (isFirestoreConnectivityError(error)) {
      markFirestoreOutage(30_000);
      console.warn(
        "[GET /api/dashboard/recent-activity] Firestore unreachable; returning empty activities",
      );
      return NextResponse.json(
        { activities: [], degraded: true },
        { status: 200 },
      );
    }
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activity." },
      { status: 500 },
    );
  }
}
