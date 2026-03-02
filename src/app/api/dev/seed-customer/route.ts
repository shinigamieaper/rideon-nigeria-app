import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

export const runtime = "nodejs";

function nf(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeDays(n: unknown): number {
  const v = nf(n);
  const days = v == null ? 7 : Math.max(1, Math.min(365, Math.round(v)));
  return days;
}

async function ensurePlacementPricingEnabled() {
  const ref = adminDb.collection("config").doc("placement_access_pricing");
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as any) : {};
  if (
    data?.enabled === true &&
    Array.isArray(data?.accessTiers) &&
    data.accessTiers.length > 0
  )
    return;

  await ref.set(
    {
      enabled: true,
      accessTiers: [
        { durationDays: 7, priceNgn: 1000, label: "Starter" },
        { durationDays: 30, priceNgn: 3000, label: "Extended" },
      ],
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function grantPlacementAccess(args: {
  customerId: string;
  durationDays: number;
  customerEmail: string;
}) {
  const { customerId, durationDays, customerEmail } = args;

  const now = new Date();
  const accessExpiresAt = new Date(
    now.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );
  const accessExpiresAtTs = Timestamp.fromDate(accessExpiresAt);

  const purchaseRef = adminDb.collection("placement_access_purchases").doc();
  const reference = `dev_placement_${purchaseRef.id}_${Date.now()}`;

  await adminDb.runTransaction(async (tx) => {
    const userRef = adminDb.collection("users").doc(customerId);

    tx.set(
      purchaseRef,
      {
        customerId,
        tierDurationDays: durationDays,
        amountNgn: 0,
        paymentReference: reference,
        status: "completed",
        accessExpiresAt: accessExpiresAtTs,
        gateway: {
          provider: "dev",
          status: "success",
          reference,
          paidAt: now.toISOString(),
          currency: "NGN",
          amountKobo: 0,
          transactionId: null,
          authorizationCode: null,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    tx.set(
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
  });

  let emailSent = false;
  let emailSkipped = false;

  try {
    const resend = getResendClient();
    const from = getEmailFrom();
    const to = String(customerEmail || "").trim();

    if (!resend || !from || !to) {
      emailSkipped = true;
    } else {
      await resend.emails.send({
        from,
        to,
        subject: "Your Hire-a-Driver access is active (Dev)",
        html: `
          <p>Your Hire-a-Driver access has been activated in the dev environment.</p>
          <p>Expiry: <strong>${accessExpiresAt.toLocaleString()}</strong></p>
          <p>You can now browse drivers, request interviews, and test messaging flows.</p>
          <p>RideOn Team</p>
        `,
      });
      emailSent = true;
    }
  } catch (e) {
    console.warn("[dev/seed-customer] Failed to send email", e);
  }

  return {
    purchaseId: purchaseRef.id,
    reference,
    accessExpiresAt: accessExpiresAt.toISOString(),
    emailSent,
    emailSkipped,
  };
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Disabled in production." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}) as any);

    const email =
      typeof body?.email === "string" && body.email
        ? body.email
        : "dev-customer@example.com";
    const password =
      typeof body?.password === "string" && body.password
        ? body.password
        : "DevCustomer#12345";
    const firstName =
      typeof body?.firstName === "string" && body.firstName
        ? body.firstName
        : "Dev";
    const lastName =
      typeof body?.lastName === "string" && body.lastName
        ? body.lastName
        : "Customer";
    const phoneNumber =
      typeof body?.phoneNumber === "string" && body.phoneNumber
        ? body.phoneNumber
        : "+2348000000999";

    const enablePlacementPricing = body?.enablePlacementPricing !== false;
    const grantAccess = body?.grantPlacementAccess === true;
    const durationDays = normalizeDays(body?.durationDays);

    if (enablePlacementPricing) {
      await ensurePlacementPricingEnabled();
    }

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
      role: "customer",
    });

    await adminDb
      .collection("users")
      .doc(uid)
      .set(
        {
          _id: uid,
          role: "customer",
          firstName,
          lastName,
          email: String(email || "")
            .trim()
            .toLowerCase(),
          phoneNumber,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    let placementAccess: any = null;
    if (grantAccess) {
      placementAccess = await grantPlacementAccess({
        customerId: uid,
        durationDays,
        customerEmail: email,
      });
    }

    return NextResponse.json(
      {
        uid,
        email,
        password,
        enablePlacementPricing,
        grantPlacementAccess: grantAccess,
        durationDays: grantAccess ? durationDays : null,
        placementAccess,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in dev/seed-customer:", error);
    return NextResponse.json(
      { error: "Failed to seed customer." },
      { status: 500 },
    );
  }
}
