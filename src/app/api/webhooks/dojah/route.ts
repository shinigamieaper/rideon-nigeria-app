import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { hmacSha256Hex, sha256Hex, redactLargeFields } from "@/lib/dojah";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const secret = (process.env.DOJAH_SECRET_KEY || "").trim();
    if (!secret) {
      console.error("[Dojah Webhook] Missing DOJAH_SECRET_KEY");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 },
      );
    }

    const rawBody = await req.text();

    const sig = (req.headers.get("x-dojah-signature") || "").trim();
    const sigV2 = (req.headers.get("x-dojah-signature-v2") || "").trim();

    let verified = false;

    if (sig) {
      const expected = hmacSha256Hex(secret, rawBody);
      verified = sig === expected;
    } else if (sigV2) {
      const expected = sha256Hex(secret);
      verified = sigV2 === expected;
    }

    if (!verified) {
      console.warn("[Dojah Webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature." },
        { status: 401 },
      );
    }

    let payload: any;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const stored = redactLargeFields(payload);

    await adminDb.collection("dojah_webhook_events").add({
      receivedAt: FieldValue.serverTimestamp(),
      headers: {
        "x-dojah-signature": sig || null,
        "x-dojah-signature-v2": sigV2 || null,
      },
      payload: stored,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Dojah Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook." },
      { status: 500 },
    );
  }
}
