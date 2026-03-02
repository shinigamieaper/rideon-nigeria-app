import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// GET /api/drivers/me/preferences
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

    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded?.role ?? (decoded as any)?.claims?.role) as
      | string
      | undefined;
    if (role !== "driver") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const uid = decoded.uid;

    const driverSnap = await adminDb.collection("drivers").doc(uid).get();
    if (!driverSnap.exists) {
      return NextResponse.json(
        { error: "Driver profile not found." },
        { status: 404 },
      );
    }

    const data = driverSnap.data() as any;

    return NextResponse.json(
      {
        fullTimePreferences: data?.fullTimePreferences || {
          willingToTravel: false,
          preferredClientType: "any",
        },
        servedCities: Array.isArray(data?.servedCities)
          ? data?.servedCities
          : [],
        maxPickupRadiusKm:
          typeof data?.maxPickupRadiusKm === "number"
            ? data?.maxPickupRadiusKm
            : null,
        travelScope:
          typeof data?.travelScope === "object" && data?.travelScope
            ? data?.travelScope
            : {},
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching driver preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences." },
      { status: 500 },
    );
  }
}

// PUT /api/drivers/me/preferences
export async function PUT(req: Request) {
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
    const { fullTimePreferences } = body;

    // Validation
    if (!fullTimePreferences || typeof fullTimePreferences !== "object") {
      return NextResponse.json(
        { error: "Invalid preferences data." },
        { status: 400 },
      );
    }

    const validClientTypes = ["personal", "corporate", "any"];
    if (!validClientTypes.includes(fullTimePreferences.preferredClientType)) {
      return NextResponse.json(
        { error: "Invalid preferred client type." },
        { status: 400 },
      );
    }

    let servedCitiesUpdate: string[] | undefined = undefined;
    if (Array.isArray(body.servedCities)) {
      servedCitiesUpdate = body.servedCities
        .filter((c: any) => typeof c === "string" && c.trim())
        .map((c: string) => c.trim());
    }

    let maxPickupRadiusKmUpdate: number | undefined = undefined;
    if (body.maxPickupRadiusKm !== undefined) {
      const v = Number(body.maxPickupRadiusKm);
      if (!isFinite(v) || v < 0) {
        return NextResponse.json(
          { error: "Invalid maxPickupRadiusKm." },
          { status: 400 },
        );
      }
      maxPickupRadiusKmUpdate = v;
    }

    let travelScopeUpdate: Record<string, string> | undefined = undefined;
    if (body.travelScope && typeof body.travelScope === "object") {
      travelScopeUpdate = {};
      for (const [city, scope] of Object.entries(body.travelScope)) {
        if (typeof city !== "string") continue;
        if (
          scope !== "within_city" &&
          scope !== "within_state" &&
          scope !== "across_states"
        )
          continue;
        travelScopeUpdate[city] = scope;
      }
    }

    const driverRef = adminDb.collection("drivers").doc(uid);
    const update: any = {
      fullTimePreferences: {
        willingToTravel: Boolean(fullTimePreferences.willingToTravel),
        preferredClientType: fullTimePreferences.preferredClientType,
      },
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (servedCitiesUpdate) update.servedCities = servedCitiesUpdate;
    if (maxPickupRadiusKmUpdate !== undefined)
      update.maxPickupRadiusKm = maxPickupRadiusKmUpdate;
    if (travelScopeUpdate) update.travelScope = travelScopeUpdate;
    await driverRef.update(update);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating driver preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences." },
      { status: 500 },
    );
  }
}
