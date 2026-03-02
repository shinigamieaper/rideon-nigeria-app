import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

function getRole(decoded: unknown): string | undefined {
  const d = decoded as Record<string, unknown>;
  const claims = (d?.claims as Record<string, unknown>) || {};
  const role = (d?.role ?? claims?.role) as string | undefined;
  return typeof role === "string" ? role : undefined;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const role = getRole(decoded);
    if (role !== "partner" && role !== "partner_applicant") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const uid = decoded.uid;

    const appRef = adminDb.collection("partner_applications").doc(uid);
    const appSnap = await appRef.get();
    if (!appSnap.exists) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 },
      );
    }

    await adminAuth.revokeRefreshTokens(uid);

    await appRef.collection("settings").doc("security").set(
      {
        revokedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error revoking partner sessions:", error);
    return NextResponse.json(
      { error: "Failed to revoke sessions." },
      { status: 500 },
    );
  }
}
