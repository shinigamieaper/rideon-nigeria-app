export const runtime = "nodejs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import {
  NextTripLive,
  QuickStatsBar,
  NotificationPermissionCard,
  DriverRatingsSection,
  DashboardHero,
} from "@/components";
import type {
  UpNextCardTrip,
  QuickStatsBarProps,
  FullTimeApplicationStatus,
} from "@/components";

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

interface DriverShape {
  uid: string;
  firstName: string;
  online?: boolean;
}

type Portal = "app" | "driver" | "full-time-driver";

function normalizePortal(raw: unknown): Portal | null {
  const p = typeof raw === "string" ? raw.trim() : "";
  if (p === "app" || p === "driver" || p === "full-time-driver") return p;
  return null;
}

function inferPortalFromType(type: unknown): Portal {
  const t = typeof type === "string" ? type.trim() : "";

  if (t.startsWith("placement_")) {
    if (t.endsWith("_update")) return "app";
    if (t.includes("access")) return "app";
    return "driver";
  }
  if (t.startsWith("driver_") || t.startsWith("recruitment_")) return "driver";
  if (t.startsWith("full_time_driver_")) return "full-time-driver";

  return "app";
}

function normalizeFullTimeStatus(
  input: unknown,
  fallback: FullTimeApplicationStatus,
): FullTimeApplicationStatus {
  const s = String(input || "").trim();
  if (s === "pending_review") return "pending_review";
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  return fallback;
}

type FleetData = {
  driver: DriverShape;
  nextTrip: UpNextCardTrip | null;
  isNewDriver: boolean;
  stats: QuickStatsBarProps["stats"];
  unreadNotifications: number;
  placementOptIn: boolean;
  pendingOffersCount: number; // Booking offers awaiting driver acceptance
  fullTimeApplicationStatus: FullTimeApplicationStatus;
};

async function getAuthedUid(): Promise<{ uid: string }> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  let decoded: any | null = null;

  if (session) {
    decoded = await verifyRideOnSessionCookie(session);
  }

  if (!decoded) {
    const h = await headers();
    const requestedPath = h.get("x-pathname") || "/driver";
    const authHeader = h.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";
    if (!token) {
      redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
    decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[driver/page] verifyIdToken",
    );
  }

  const role = (decoded?.role ?? decoded?.claims?.role) as string | undefined;
  if (role !== "driver") {
    const h = await headers();
    const requestedPath = h.get("x-pathname") || "/driver";
    redirect(`/register/driver?next=${encodeURIComponent(requestedPath)}`);
  }

  return { uid: decoded.uid as string };
}

async function getDashboardData(): Promise<FleetData> {
  const { uid } = await getAuthedUid();

  // Fetch minimal profile and driver docs
  const [userSnap, driverSnap, fullTimeAppSnap] = await Promise.all([
    withTimeout(
      adminDb.collection("users").doc(uid).get(),
      3_000,
      "[driver/page] users doc",
    ),
    withTimeout(
      adminDb.collection("drivers").doc(uid).get(),
      3_000,
      "[driver/page] drivers doc",
    ),
    withTimeout(
      adminDb.collection("full_time_driver_applications").doc(uid).get(),
      3_000,
      "[driver/page] full_time_driver_applications doc",
    ),
  ]);

  const userData = userSnap.exists ? (userSnap.data() as any) : {};
  const driverData = driverSnap.exists ? (driverSnap.data() as any) : {};

  const firstName: string =
    typeof userData?.firstName === "string" && userData.firstName
      ? userData.firstName
      : "Driver";
  const online: boolean =
    typeof driverData?.onlineStatus === "boolean"
      ? !!driverData.onlineStatus
      : !!driverData?.online;
  const placementOptIn: boolean = driverData?.placementOptIn === true;

  const fullTimeApplicationStatus: FullTimeApplicationStatus =
    fullTimeAppSnap.exists
      ? normalizeFullTimeStatus(
          (fullTimeAppSnap.data() as any)?.status,
          "pending_review",
        )
      : "not_applied";

  const unreadPromise = (async () => {
    const unreadSnap = await withTimeout(
      adminDb
        .collection("users")
        .doc(uid)
        .collection("notifications")
        .where("unread", "==", true)
        .select("unread", "portal", "type")
        .get(),
      3_000,
      "[driver/page] unread notifications query",
    );
    return (unreadSnap?.docs || []).reduce((acc: number, d: any) => {
      const data = d?.data?.() ? d.data() : d?.data || {};
      const portalValue =
        normalizePortal(data?.portal) || inferPortalFromType(data?.type);
      return acc + (portalValue === "driver" ? 1 : 0);
    }, 0) as number;
  })().catch((e) => {
    console.warn("[driver/dashboard] unread notifications query failed:", e);
    return 0;
  });

  const pendingOffersPromise = (async () => {
    const nowMs = Date.now();
    let qs: any;
    try {
      qs = await withTimeout(
        adminDb
          .collection("booking_offers")
          .where("driverId", "==", uid)
          .where("status", "==", "pending")
          .where("expiresAtMs", ">", nowMs)
          .limit(100)
          .get(),
        3_000,
        "[driver/page] booking_offers query",
      );
    } catch (e) {
      console.warn(
        "[driver/dashboard] Pending offers query failed; falling back to equality-only query:",
        e,
      );
      qs = await withTimeout(
        adminDb
          .collection("booking_offers")
          .where("driverId", "==", uid)
          .where("status", "==", "pending")
          .limit(200)
          .get(),
        3_000,
        "[driver/page] booking_offers fallback query",
      );
    }

    return qs.docs.filter((d: any) => {
      const v = d.data() as any;
      if (String(v?.service || "") !== "drive_my_car") return false;
      const exp = Number(v?.expiresAtMs || 0);
      if (exp && exp <= nowMs) return false;
      return true;
    }).length as number;
  })().catch((e) => {
    console.warn("[driver/dashboard] Pending offers count query failed:", e);
    return 0;
  });

  const nextTripPromise = (async () => {
    const now = new Date();
    const qs = await withTimeout(
      adminDb
        .collection("bookings")
        .where("driverId", "==", uid)
        .where("status", "in", ["confirmed", "en_route", "in_progress"])
        .where("scheduledPickupTime", ">=", now)
        .orderBy("scheduledPickupTime", "asc")
        .limit(1)
        .get(),
      3_000,
      "[driver/page] next trip query",
    );
    if (qs.empty) return null;
    const doc = qs.docs[0]!;
    const d = doc.data() as any;
    const sched = d?.scheduledPickupTime?.toDate
      ? d.scheduledPickupTime.toDate()
      : d?.scheduledPickupTime;

    let pickupCoords: [number, number] | undefined;
    let dropoffCoords: [number, number] | undefined;
    if (d?.pickupLocation?.coordinates) {
      pickupCoords = [
        d.pickupLocation.coordinates[0],
        d.pickupLocation.coordinates[1],
      ];
    }
    if (d?.dropoffLocation?.coordinates) {
      dropoffCoords = [
        d.dropoffLocation.coordinates[0],
        d.dropoffLocation.coordinates[1],
      ];
    }

    return {
      _id: doc.id,
      pickupAddress: String(d?.pickupAddress || ""),
      dropoffAddress: d?.dropoffAddress ? String(d.dropoffAddress) : undefined,
      pickupCoords,
      dropoffCoords,
      scheduledPickupTime: sched,
      fare: Number(d?.fareNgn || d?.fare || 0),
      rentalUnit: d?.rentalUnit as "day" | "4h" | undefined,
      city: d?.city ? String(d.city) : undefined,
      startDate: d?.startDate ? String(d.startDate) : undefined,
      endDate: d?.endDate ? String(d.endDate) : undefined,
      startTime: d?.startTime ? String(d.startTime) : undefined,
      endTime: d?.endTime ? String(d.endTime) : undefined,
    } satisfies UpNextCardTrip;
  })().catch((e) => {
    console.error("[driver/dashboard] Failed to fetch next trip:", e);
    return null;
  });

  const earningsPromise = (async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const earningsQs = await withTimeout(
      adminDb
        .collection("bookings")
        .where("driverId", "==", uid)
        .where("status", "==", "completed")
        .where("completionTime", ">=", start)
        .where("completionTime", "<=", end)
        .get(),
      3_000,
      "[driver/page] earnings query",
    );
    return earningsQs.docs.reduce((sum, doc) => {
      const d = doc.data() as any;
      const fare = Number(d?.fareNgn || d?.fare || 0);
      return sum + (Number.isFinite(fare) ? fare : 0);
    }, 0) as number;
  })().catch((e) => {
    console.warn(
      "[driver/dashboard] Earnings query failed (defaulting to 0):",
      e,
    );
    return 0;
  });

  const anyBookingsPromise = (async () => {
    const anyQs = await withTimeout(
      adminDb
        .collection("bookings")
        .where("driverId", "==", uid)
        .limit(1)
        .get(),
      3_000,
      "[driver/page] any-bookings query",
    );
    return !anyQs.empty;
  })().catch((e) => {
    console.warn(
      "[driver/dashboard] Any-bookings query failed (defaulting to false):",
      e,
    );
    return false;
  });

  const [
    unreadNotifications,
    pendingOffersCount,
    nextTrip,
    todaysEarnings,
    hasAnyBookings,
  ] = await Promise.all([
    unreadPromise,
    pendingOffersPromise,
    nextTripPromise,
    earningsPromise,
    anyBookingsPromise,
  ]);

  const weeklyRating = Number(driverData?.averageRating || 0) || 0;

  const driver: DriverShape = { uid, firstName, online };
  const stats: QuickStatsBarProps["stats"] = { todaysEarnings, weeklyRating };
  return {
    driver,
    nextTrip,
    isNewDriver: !hasAnyBookings && !nextTrip,
    stats,
    unreadNotifications,
    placementOptIn,
    pendingOffersCount,
    fullTimeApplicationStatus,
  } satisfies FleetData;
}

// Server Action: update online status
async function setDriverOnlineStatus(online: boolean) {
  "use server";
  try {
    const c = await cookies();
    const session = c.get("rideon_session")?.value || "";
    let uid: string | null = null;
    if (session) {
      const decoded = await verifyRideOnSessionCookie(session);
      uid = decoded?.uid ? (decoded.uid as string) : null;
    }
    if (!uid) {
      const h = await headers();
      const authHeader = h.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : "";
      if (token) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          uid = decoded.uid as string;
        } catch {
          uid = null;
        }
      }
    }
    if (!uid) return;
    await adminDb
      .collection("drivers")
      .doc(uid)
      .set({ online: !!online, onlineStatus: !!online }, { merge: true });
    console.info("[driver/dashboard] online status updated", {
      uid,
      online: !!online,
    });
  } catch (e) {
    console.error("[driver/dashboard] Failed to set online status:", e);
  }
}

export default async function Page() {
  const data = await getDashboardData();

  const pendingCount = data.pendingOffersCount ?? 0;
  const ftStatus = data.fullTimeApplicationStatus || "not_applied";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-8 space-y-5">
        {/* Animated Hero Section with Full-Time Placement */}
        <DashboardHero
          driverName={data.driver.firstName}
          isOnline={!!data.driver.online}
          onStatusChange={setDriverOnlineStatus}
          pendingOffersCount={pendingCount}
          fullTimeStatus={ftStatus}
          unreadNotifications={data.unreadNotifications}
        />

        {/* Push notification permission prompt - only shows if not enabled */}
        <NotificationPermissionCard compact />

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-5">
          {/* Next Trip / Welcome Card */}
          <NextTripLive
            fallbackTrip={data.nextTrip ?? null}
            isNewDriver={data.isNewDriver ?? false}
          />

          {/* Stats Row */}
          <QuickStatsBar
            stats={data.stats ?? { todaysEarnings: 0, weeklyRating: 0 }}
          />
        </div>

        {/* Customer Ratings Section */}
        <DriverRatingsSection />
      </div>
    </main>
  );
}
