import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" && body.email
        ? body.email
        : "dev-admin@example.com";
    const password =
      typeof body?.password === "string" && body.password
        ? body.password
        : "DevAdmin#12345";
    const firstName =
      typeof body?.firstName === "string" && body.firstName
        ? body.firstName
        : "Dev";
    const lastName =
      typeof body?.lastName === "string" && body.lastName
        ? body.lastName
        : "Admin";
    const adminRole =
      typeof body?.adminRole === "string" && body.adminRole
        ? body.adminRole
        : "super_admin";

    let userRecord: import("firebase-admin/auth").UserRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, { password });
    } catch {
      userRecord = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        disabled: false,
      });
    }

    const uid = userRecord.uid;

    const existingClaims = (await adminAuth.getUser(uid)).customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      admin: true,
      role: "admin",
      adminRole,
    });

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = {
      _id: uid,
      role: "admin",
      isAdmin: true,
      adminRole,
      firstName,
      lastName,
      email,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    } as Record<string, unknown>;

    await userRef.set(userDoc, { merge: true });

    return NextResponse.json(
      { uid, email, password, adminRole },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in dev/seed-admin:", error);
    return NextResponse.json(
      { error: "Failed to seed admin." },
      { status: 500 },
    );
  }
}
