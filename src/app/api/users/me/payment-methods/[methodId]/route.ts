import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// DELETE /api/users/me/payment-methods/[methodId]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ methodId: string }> },
) {
  try {
    const { methodId } = await params;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring("Bearer ".length)
      : "";

    if (!token) throw new Error("Missing Authorization Bearer token");

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Prevent deleting default method if set
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const defaultId =
      (userDoc.exists && (userDoc.data() as any)?.defaultPaymentMethodId) ||
      null;
    if (defaultId && defaultId === methodId) {
      return NextResponse.json(
        {
          error:
            "Cannot remove the default payment method. Please set another card as default first.",
        },
        { status: 400 },
      );
    }

    const ref = adminDb
      .collection("users")
      .doc(uid)
      .collection("payment_methods")
      .doc(methodId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Payment method not found." },
        { status: 404 },
      );
    }

    await ref.delete();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method." },
      { status: 500 },
    );
  }
}
