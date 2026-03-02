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

// GET /api/drivers/me
// Returns driver data for the current authenticated user including service settings
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      2_500,
      "[drivers/me] verifyIdToken",
    );
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    // Fetch driver doc
    let driverStatus: "pending_review" | "approved" | "rejected" =
      "pending_review";
    let servedCities: string[] = [];
    let online = false;
    let onlineStatus = false;
    let workingHours: { start: string; end: string } | null = null;
    let workingDays: string[] = [];
    let maxPickupRadiusKm: number | null = null;
    let hasDaySpecificAvailability = false;
    let referencesSummary: { required: number; completed: number } | null =
      null;

    if (isFirestoreInOutage()) {
      return NextResponse.json(
        {
          firstName: null,
          status: driverStatus,
          servedCities,
          online,
          onlineStatus,
          workingHours,
          workingDays,
          maxPickupRadiusKm,
          hasDaySpecificAvailability,
          referencesSummary,
          degraded: true,
        },
        { status: 200 },
      );
    }

    try {
      const dSnap = await withTimeout(
        adminDb.collection("drivers").doc(uid).get(),
        3_000,
        "[drivers/me] drivers doc",
      );
      if (dSnap.exists) {
        const d = (dSnap.data() as any) || {};
        const st = d?.status as string | undefined;
        if (st === "pending_review" || st === "approved" || st === "rejected") {
          driverStatus = st;
        }
        // Service settings
        if (Array.isArray(d?.servedCities)) {
          servedCities = d.servedCities;
        }
        onlineStatus =
          typeof d?.onlineStatus === "boolean" ? !!d.onlineStatus : !!d?.online;
        online = onlineStatus;

        if (d?.workingHours && typeof d.workingHours === "object") {
          const start =
            typeof (d.workingHours as any)?.start === "string"
              ? String((d.workingHours as any).start)
              : "";
          const end =
            typeof (d.workingHours as any)?.end === "string"
              ? String((d.workingHours as any).end)
              : "";
          if (start && end) {
            workingHours = { start, end };
          }
        }

        if (Array.isArray(d?.workingDays)) {
          workingDays = d.workingDays.filter((x: any) => typeof x === "string");
        }

        if (
          typeof d?.maxPickupRadiusKm === "number" &&
          Number.isFinite(d.maxPickupRadiusKm)
        ) {
          maxPickupRadiusKm = Number(d.maxPickupRadiusKm);
        }

        hasDaySpecificAvailability = d?.hasDaySpecificAvailability === true;

        if (d?.referencesSummary && typeof d.referencesSummary === "object") {
          const required = Number((d.referencesSummary as any)?.required);
          const completed = Number((d.referencesSummary as any)?.completed);
          if (Number.isFinite(required) && Number.isFinite(completed)) {
            referencesSummary = {
              required,
              completed,
            };
          }
        }
      }
    } catch (e) {
      markFirestoreOutage(30_000);
      console.warn("[drivers/me] Failed to read drivers doc", e);
    }

    // Fetch user doc for firstName fallback
    let firstName: string | null = null;
    try {
      const uSnap = await withTimeout(
        adminDb.collection("users").doc(uid).get(),
        3_000,
        "[drivers/me] users doc",
      );
      if (uSnap.exists) {
        const u = (uSnap.data() as any) || {};
        if (typeof u?.firstName === "string" && u.firstName.trim()) {
          firstName = u.firstName.trim();
        }
      }
    } catch (e) {
      markFirestoreOutage(30_000);
      console.warn("[drivers/me] Failed to read users doc", e);
    }

    // Fallback to auth record/displayName if firstName is absent (best-effort)
    if (!firstName) {
      try {
        const ar = await withTimeout(
          adminAuth.getUser(uid),
          2_500,
          "[drivers/me] getUser",
        );
        const displayName = (ar.displayName || "").trim();
        if (displayName) firstName = displayName.split(" ")[0] || null;
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      {
        firstName,
        status: driverStatus,
        servedCities,
        online,
        onlineStatus,
        workingHours,
        workingDays,
        maxPickupRadiusKm,
        hasDaySpecificAvailability,
        referencesSummary,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver profile." },
      { status: 500 },
    );
  }
}

// PATCH /api/drivers/me
// Update driver service settings (servedCities, vehicle)
export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token." },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    const body = await req.json();
    const updateData: Record<string, any> = {};

    // Update servedCities if provided
    if (Array.isArray(body.servedCities)) {
      updateData.servedCities = body.servedCities.filter(
        (c: any) => typeof c === "string",
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 },
      );
    }

    updateData.updatedAt = new Date().toISOString();

    await adminDb
      .collection("drivers")
      .doc(uid)
      .set(updateData, { merge: true });

    return NextResponse.json({ success: true, ...updateData }, { status: 200 });
  } catch (error) {
    console.error("Error updating driver profile:", error);
    return NextResponse.json(
      { error: "Failed to update driver profile." },
      { status: 500 },
    );
  }
}
