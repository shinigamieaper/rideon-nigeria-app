export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  adminAuth,
  adminDb,
  verifyRideOnSessionCookie,
} from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

async function getCustomerUid(req: Request): Promise<string | null> {
  const c = await cookies();
  const session = c.get("rideon_session")?.value || "";

  if (session) {
    const decoded = await verifyRideOnSessionCookie(session);
    if (decoded?.uid) return decoded.uid;
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded as any)?.role ?? (decoded as any)?.claims?.role;
    if (role && role !== "customer") return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const uid = await getCustomerUid(req);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);
    const driverId =
      typeof (body as any)?.driverId === "string"
        ? (body as any).driverId.trim()
        : "";
    const actionRaw =
      typeof (body as any)?.action === "string"
        ? (body as any).action.trim()
        : "toggle";
    const action =
      actionRaw === "add" || actionRaw === "remove" || actionRaw === "toggle"
        ? actionRaw
        : "toggle";

    if (!driverId) {
      return NextResponse.json(
        { error: "driverId is required." },
        { status: 400 },
      );
    }

    const driverSnap = await adminDb.collection("drivers").doc(driverId).get();
    if (!driverSnap.exists) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

    const userRef = adminDb.collection("users").doc(uid);

    if (action === "add") {
      await userRef.set(
        {
          savedDriverIds: FieldValue.arrayUnion(driverId),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return NextResponse.json({ success: true, saved: true }, { status: 200 });
    }

    if (action === "remove") {
      await userRef.set(
        {
          savedDriverIds: FieldValue.arrayRemove(driverId),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return NextResponse.json(
        { success: true, saved: false },
        { status: 200 },
      );
    }

    const snap = await userRef.get();
    const current =
      snap.exists && Array.isArray((snap.data() as any)?.savedDriverIds)
        ? ((snap.data() as any).savedDriverIds as unknown[]).filter(
            (x) => typeof x === "string",
          )
        : [];

    const alreadySaved = current.includes(driverId);

    await userRef.set(
      {
        savedDriverIds: alreadySaved
          ? FieldValue.arrayRemove(driverId)
          : FieldValue.arrayUnion(driverId),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json(
      { success: true, saved: !alreadySaved },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "[POST /api/customer/placement/drivers/shortlist] Error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to update shortlist." },
      { status: 500 },
    );
  }
}
