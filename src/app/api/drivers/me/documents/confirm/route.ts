import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

const ALLOWED_DOCUMENT_KEYS = new Set([
  "driversLicense",
  "governmentId",
  "lasdriCard",
]);

// POST /api/drivers/me/documents/confirm
export async function POST(req: Request) {
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
    const { documentKey, fileUrl } = body;

    if (!documentKey || !fileUrl) {
      return NextResponse.json(
        { error: "Missing documentKey or fileUrl." },
        { status: 400 },
      );
    }

    if (
      typeof documentKey !== "string" ||
      !ALLOWED_DOCUMENT_KEYS.has(documentKey)
    ) {
      return NextResponse.json(
        { error: "Invalid documentKey." },
        { status: 400 },
      );
    }

    if (typeof fileUrl !== "string") {
      return NextResponse.json({ error: "Invalid fileUrl." }, { status: 400 });
    }

    // Update the driver document in Firestore
    const driverRef = adminDb.collection("drivers").doc(uid);

    // Build the update path dynamically
    const updateData: Record<string, any> = {
      [`documents.${documentKey}`]: {
        url: fileUrl,
        status: "pending", // Admin will review and approve/reject
        uploadedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    };

    await driverRef.update(updateData);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error confirming document upload:", error);
    return NextResponse.json(
      { error: "Failed to confirm document upload." },
      { status: 500 },
    );
  }
}
