import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

function getDefaultPreferences() {
  return {
    enabled: true,
    application: {
      application_approved: { push: true, email: true },
      application_rejected: { push: true, email: true },
      application_needs_more_info: { push: true, email: true },
    },
  };
}

async function getUidFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring("Bearer ".length)
    : "";

  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function requireApprovedFullTimeApplication(uid: string) {
  const appSnap = await adminDb
    .collection("full_time_driver_applications")
    .doc(uid)
    .get();
  if (!appSnap.exists) {
    return {
      ok: false as const,
      status: 404,
      error: "Full-time driver application not found.",
    };
  }

  const d = appSnap.data() as any;
  const status = String(d?.status || "");
  if (status !== "approved") {
    return {
      ok: false as const,
      status: 403,
      error:
        "Full-time notification settings are available after your application is approved.",
    };
  }

  return { ok: true as const, appSnap };
}

export async function GET(req: Request) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eligibility = await requireApprovedFullTimeApplication(uid);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error },
        { status: eligibility.status },
      );
    }

    const data = eligibility.appSnap.data() as any;
    const prefs = data?.notificationPreferences || getDefaultPreferences();

    return NextResponse.json(prefs, { status: 200 });
  } catch (error) {
    console.error("[GET /api/full-time-driver/me/notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch full-time notification preferences." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const uid = await getUidFromRequest(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eligibility = await requireApprovedFullTimeApplication(uid);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error },
        { status: eligibility.status },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const enabled = (body as any).enabled;
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid preferences" },
        { status: 400 },
      );
    }

    const appRef = adminDb.collection("full_time_driver_applications").doc(uid);
    await appRef.update({
      notificationPreferences: body,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("[PUT /api/full-time-driver/me/notifications] Error:", error);
    return NextResponse.json(
      { error: "Failed to update full-time notification preferences." },
      { status: 500 },
    );
  }
}
