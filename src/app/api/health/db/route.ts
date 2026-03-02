import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Firestore doesn't have a ping; do a tiny read on a sentinel doc
    const ref = adminDb.collection("_health").doc("ping");
    await ref.get();
    return NextResponse.json(
      {
        ok: true,
        ping: 1,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DB health check failed:", error);
    return NextResponse.json(
      { error: "Database connectivity check failed." },
      { status: 500 },
    );
  }
}
