export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

function normalizeEmail(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase();
}

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeDays(n: unknown): number | null {
  const v = nf(n);
  if (v == null) return null;
  const days = Math.round(v);
  if (days < 1) return null;
  if (days > 365) return 365;
  return days;
}

function parseAccessExpiresAt(raw: unknown): Date | null {
  if (!raw) return null;

  if (typeof (raw as any)?.toDate === "function") {
    try {
      return (raw as any).toDate();
    } catch {
      return null;
    }
  }

  if (raw instanceof Date) return raw;

  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
      "product_admin",
    ]);
    if (response) return response;

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);

    const email = normalizeEmail((body as any)?.email);
    const durationDays = normalizeDays((body as any)?.durationDays);
    const reason =
      typeof (body as any)?.reason === "string"
        ? (body as any).reason.trim().slice(0, 200)
        : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    if (!durationDays) {
      return NextResponse.json(
        { error: "durationDays must be a positive number." },
        { status: 400 },
      );
    }

    let userRecord: import("firebase-admin/auth").UserRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        return NextResponse.json(
          { error: "No user found with this email." },
          { status: 404 },
        );
      }
      throw err;
    }

    const customerId = userRecord.uid;

    const userRef = adminDb.collection("users").doc(customerId);
    const purchaseRef = adminDb.collection("placement_access_purchases").doc();

    const now = new Date();

    const userSnap = await userRef.get();
    const existingAccessExpiresAt = parseAccessExpiresAt(
      (userSnap.data() as any)?.placementAccess?.accessExpiresAt,
    );
    const existingPurchaseId = (userSnap.data() as any)?.placementAccess
      ?.purchaseId;

    const base =
      existingAccessExpiresAt &&
      existingAccessExpiresAt.getTime() > now.getTime()
        ? existingAccessExpiresAt
        : now;
    const accessExpiresAtDate = new Date(
      base.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    const accessExpiresAtTs = Timestamp.fromDate(accessExpiresAtDate);

    const purchaseDoc: Record<string, unknown> = {
      customerId,
      tierDurationDays: durationDays,
      amountNgn: 0,
      paymentReference: "manual_grant",
      status: "manual_grant",
      grantedBy: caller!.uid,
      accessExpiresAt: accessExpiresAtTs,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (existingPurchaseId && typeof existingPurchaseId === "string") {
      purchaseDoc.renewedFromPurchaseId = existingPurchaseId;
    }

    const batch = adminDb.batch();

    batch.set(purchaseRef, purchaseDoc, { merge: true });
    batch.set(
      userRef,
      {
        placementAccess: {
          hasAccess: true,
          accessExpiresAt: accessExpiresAtTs,
          purchaseId: purchaseRef.id,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();

    await createAuditLog({
      actionType: "config_updated",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: purchaseRef.id,
      targetType: "placement_access_purchase",
      details: `Manually granted placement access to ${email} for ${durationDays} days.${reason ? ` Reason: ${reason}` : ""}`,
      metadata: {
        email,
        customerId,
        durationDays,
        accessExpiresAt: accessExpiresAtDate.toISOString(),
        renewedFromPurchaseId:
          typeof existingPurchaseId === "string" ? existingPurchaseId : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        customerId,
        purchaseId: purchaseRef.id,
        accessExpiresAt: accessExpiresAtDate.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/admin/placement/grant-access] Error:", error);
    return NextResponse.json(
      { error: "Failed to grant placement access." },
      { status: 500 },
    );
  }
}
