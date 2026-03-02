import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { canWrite, resolvePartnerPortalContext } from "@/lib/partnerPortalAuth";

export const runtime = "nodejs";

type Prefs = {
  enabled: boolean;
  [category: string]: unknown;
};

const DEFAULT_PREFS: Prefs = {
  enabled: true,
  fleet: {
    submission_updates: { push: true, email: true, sms: false },
    booking_requests: { push: true, email: true, sms: false },
  },
  earnings: {
    payout_processed: { push: true, email: true, sms: false },
    payout_failed: { push: true, email: true, sms: false },
  },
  general: {
    platform_updates: { email: true, sms: false },
  },
};

export async function GET(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;

    const appRef = adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const doc = await appRef.collection("settings").doc("notifications").get();
    const prefs = doc.exists ? (doc.data() as Prefs) : DEFAULT_PREFS;

    return NextResponse.json(prefs, { status: 200 });
  } catch (error) {
    console.error("Error fetching partner notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await resolvePartnerPortalContext(req, {
      requireApproved: true,
    });
    if (ctx instanceof NextResponse) return ctx;
    if (!canWrite(ctx)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const appRef = adminDb
      .collection("partner_applications")
      .doc(ctx.partnerId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
    const payload: Prefs = { enabled };

    for (const key of ["fleet", "earnings", "general"] as const) {
      const v = body[key];
      if (v && typeof v === "object") {
        payload[key] = v;
      }
    }

    await appRef
      .collection("settings")
      .doc("notifications")
      .set(payload, { merge: true });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error updating partner notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences." },
      { status: 500 },
    );
  }
}
