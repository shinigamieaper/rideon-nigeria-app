import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

interface UserDoc {
  _id: string; // Firebase UID
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { firstName, lastName, phoneNumber } = (await req.json()) as {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };

    // Derive email from decoded token or user record to ensure consistency
    let email = decoded.email || "";
    if (!email) {
      const userRecord = await adminAuth.getUser(uid);
      email = userRecord.email || "";
    }

    if (!firstName || !lastName || !phoneNumber) {
      throw new Error("Missing required fields.");
    }

    if (!email) {
      throw new Error("Email not found on authenticated user.");
    }

    await adminDb.runTransaction(async (tx) => {
      const ref = adminDb.collection("users").doc(uid);
      const snap = await tx.get(ref);
      const base = {
        _id: uid,
        role: "customer",
        firstName,
        lastName,
        email,
        phoneNumber,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<UserDoc> & Record<string, unknown>;

      // Remove undefined values to satisfy Firestore document constraints
      const sanitized = Object.fromEntries(
        Object.entries(base).filter(([, v]) => typeof v !== "undefined"),
      );

      if (snap.exists) {
        tx.set(ref, sanitized, { merge: true });
      } else {
        tx.set(
          ref,
          { ...sanitized, createdAt: FieldValue.serverTimestamp() },
          { merge: false },
        );
      }
    });

    // Set custom claim role=customer
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: "customer",
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error in register-customer:", error);
    return NextResponse.json(
      { error: "Failed to register customer." },
      { status: 500 },
    );
  }
}
