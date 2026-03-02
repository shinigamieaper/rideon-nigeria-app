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

async function upsertAuthUser(args: {
  email: string;
  password: string;
  role: "customer" | "driver";
}) {
  const { email, password, role } = args;

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
  await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role });

  return { uid };
}

async function upsertCustomerDocs(args: {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}) {
  const { uid, email, firstName, lastName, phoneNumber } = args;

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
}

async function upsertPlacementDriverDocs(args: {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  approved: boolean;
}) {
  const { uid, email, firstName, lastName, phoneNumber, approved } = args;

  await adminDb
    .collection("users")
    .doc(uid)
    .set(
      {
        _id: uid,
        role: "driver",
        firstName,
        lastName,
        email: String(email || "")
          .trim()
          .toLowerCase(),
        phoneNumber,
        driverTrack: "placement",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  await adminDb
    .collection("drivers")
    .doc(uid)
    .set(
      {
        userId: uid,
        status: approved ? "approved" : "pending_review",
        placementStatus: "available",
        recruitmentPool: true,
        recruitmentVisible: true,
        servedCities: ["Lagos"],
        placementProfile: {
          preferredCity: "Lagos",
          salaryExpectation: 200000,
          salaryExpectationMinNgn: 150000,
          salaryExpectationMaxNgn: 250000,
          experienceYears: 7,
          profileSummary: "Dev placement profile",
          backgroundConsent: true,
          reference: { name: "Ref Person", phone: "+2348000000001" },
        },
        recruitmentProfile: {
          preferredCity: "Lagos",
          salaryExpectationMinNgn: 150000,
          salaryExpectationMaxNgn: 250000,
          experienceYears: 7,
          profileImageUrl: "",
          languages: ["English"],
          familyFitTags: ["Reliable"],
        },
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
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
    console.warn("[dev/seed-placement-pair] Failed to send email", e);
  }

  return {
    purchaseId: purchaseRef.id,
    reference,
    accessExpiresAt: accessExpiresAt.toISOString(),
    emailSent,
    emailSkipped,
  };
}

async function readUserProfile(uid: string, role: "customer" | "driver") {
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    const d = snap.exists ? (snap.data() as any) : {};
    const firstName =
      typeof d?.firstName === "string" ? String(d.firstName).trim() : "";
    const lastName =
      typeof d?.lastName === "string" ? String(d.lastName).trim() : "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();

    const profile: Record<string, unknown> = { role };
    if (name) profile.name = name;
    const avatar =
      typeof d?.profileImageUrl === "string"
        ? String(d.profileImageUrl).trim()
        : "";
    if (avatar) profile.avatarUrl = avatar;
    const email = typeof d?.email === "string" ? String(d.email).trim() : "";
    if (email) profile.email = email;
    const phone =
      typeof d?.phoneNumber === "string" ? String(d.phoneNumber).trim() : "";
    if (phone) profile.phone = phone;

    return profile;
  } catch {
    return { role };
  }
}

async function findOrCreatePlacementConversation(args: {
  customerId: string;
  driverId: string;
  placementContactStatus: "requested" | "accepted" | "declined";
}) {
  const { customerId, driverId, placementContactStatus } = args;

  const [a, b] = [customerId, driverId].sort();
  const memberKey = `${a}|${b}|placement`;

  const existingSnap = await adminDb
    .collection("conversations")
    .where("memberKey", "==", memberKey)
    .limit(1)
    .get();

  const nowIso = new Date().toISOString();

  if (!existingSnap.empty) {
    const existingId = existingSnap.docs[0].id;
    try {
      await adminDb
        .collection("conversations")
        .doc(existingId)
        .set(
          {
            context: {
              customerId,
              driverId,
              channel: "in_app",
              source: "placement_portfolio",
              placementContactStatus,
            },
            updatedAt: nowIso,
          },
          { merge: true },
        );
    } catch {}
    return { conversationId: existingId, created: false };
  }

  const [customerProfile, driverProfile] = await Promise.all([
    readUserProfile(customerId, "customer"),
    readUserProfile(driverId, "driver"),
  ]);

  const convRef = adminDb.collection("conversations").doc();

  await convRef.set({
    type: "general",
    memberIds: [customerId, driverId],
    memberKey,
    participantProfiles: {
      [customerId]: customerProfile,
      [driverId]: driverProfile,
    },
    createdBy: customerId,
    status: "open",
    priority: "normal",
    tags: [],
    context: {
      customerId,
      driverId,
      channel: "in_app",
      source: "placement_portfolio",
      placementContactStatus,
    },
    lastMessage: "",
    lastMessageAt: nowIso,
    lastMessageSenderId: customerId,
    unreadCounts: {
      [customerId]: 0,
      [driverId]: 0,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  return { conversationId: convRef.id, created: true };
}

async function findExistingRequestedInterview(args: {
  customerId: string;
  driverId: string;
}) {
  const { customerId, driverId } = args;

  try {
    const qs = await adminDb
      .collection("placement_interview_requests")
      .where("customerId", "==", customerId)
      .where("driverId", "==", driverId)
      .limit(10)
      .get();

    for (const d of qs.docs) {
      const v = d.data() as any;
      if (String(v?.status || "") === "requested") {
        return {
          requestId: d.id,
          conversationId: String(v?.conversationId || ""),
        };
      }
    }
  } catch (e: any) {
    const msg = String(e?.message || "");
    const code = (e && (e.code ?? e.status)) as unknown;

    if (msg.includes("requires an index") || code === 9) {
      const qs = await adminDb
        .collection("placement_interview_requests")
        .where("customerId", "==", customerId)
        .limit(50)
        .get();

      for (const d of qs.docs) {
        const v = d.data() as any;
        if (String(v?.driverId || "") !== driverId) continue;
        if (String(v?.status || "") === "requested") {
          return {
            requestId: d.id,
            conversationId: String(v?.conversationId || ""),
          };
        }
      }
    } else {
      throw e;
    }
  }

  return null;
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

    const customerEmail =
      typeof body?.customerEmail === "string" && body.customerEmail
        ? body.customerEmail
        : "dev-customer@example.com";
    const customerPassword =
      typeof body?.customerPassword === "string" && body.customerPassword
        ? body.customerPassword
        : "DevCustomer#12345";

    const driverEmail =
      typeof body?.driverEmail === "string" && body.driverEmail
        ? body.driverEmail
        : "dev-driver@example.com";
    const driverPassword =
      typeof body?.driverPassword === "string" && body.driverPassword
        ? body.driverPassword
        : "DevDriver#12345";

    const durationDays = normalizeDays(body?.durationDays);
    const approved = body?.driverApproved !== false;
    const acceptImmediately = body?.acceptImmediately === true;

    const enablePlacementPricing = body?.enablePlacementPricing !== false;
    const grantAccess = body?.grantPlacementAccess !== false;

    if (enablePlacementPricing) {
      await ensurePlacementPricingEnabled();
    }

    const [{ uid: customerId }, { uid: driverId }] = await Promise.all([
      upsertAuthUser({
        email: customerEmail,
        password: customerPassword,
        role: "customer",
      }),
      upsertAuthUser({
        email: driverEmail,
        password: driverPassword,
        role: "driver",
      }),
    ]);

    await Promise.all([
      upsertCustomerDocs({
        uid: customerId,
        email: customerEmail,
        firstName: "Dev",
        lastName: "Customer",
        phoneNumber: "+2348000000999",
      }),
      upsertPlacementDriverDocs({
        uid: driverId,
        email: driverEmail,
        firstName: "Dev",
        lastName: "Driver",
        phoneNumber: "+2348000000000",
        approved,
      }),
    ]);

    const placementAccess = grantAccess
      ? await grantPlacementAccess({
          customerId,
          durationDays,
          customerEmail: customerEmail,
        })
      : null;

    const placementContactStatus: "requested" | "accepted" = acceptImmediately
      ? "accepted"
      : "requested";

    const { conversationId } = await findOrCreatePlacementConversation({
      customerId,
      driverId,
      placementContactStatus,
    });

    const existing = await findExistingRequestedInterview({
      customerId,
      driverId,
    });

    let requestId = existing?.requestId || null;

    if (!requestId) {
      const requestRef = adminDb
        .collection("placement_interview_requests")
        .doc();
      requestId = requestRef.id;

      await requestRef.set(
        {
          conversationId,
          driverId,
          customerId,
          customerName: "Dev Customer",
          customerAvatarUrl: null,
          status: acceptImmediately ? "accepted" : "requested",
          interviewType: "google_meet_video",
          notes: "Dev seed interview request",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(acceptImmediately
            ? { respondedAt: FieldValue.serverTimestamp() }
            : {}),
        },
        { merge: true },
      );
    } else if (acceptImmediately) {
      await adminDb
        .collection("placement_interview_requests")
        .doc(requestId)
        .set(
          {
            status: "accepted",
            respondedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      await adminDb
        .collection("conversations")
        .doc(conversationId)
        .set(
          {
            context: { placementContactStatus: "accepted" },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

      try {
        await adminDb
          .collection("users")
          .doc(customerId)
          .collection("notifications")
          .add({
            type: "placement_interview_request_update",
            title: "Interview accepted",
            message:
              "Your interview request was accepted. You can now chat and call the driver from your messages.",
            portal: "app",
            unread: true,
            createdAt: FieldValue.serverTimestamp(),
          });
      } catch {}
    }

    try {
      await adminDb
        .collection("users")
        .doc(driverId)
        .collection("notifications")
        .add({
          type: "placement_interview_request",
          title: "New interview request",
          message: "A client requested an interview with you.",
          portal: "driver",
          unread: true,
          createdAt: FieldValue.serverTimestamp(),
        });
    } catch {}

    return NextResponse.json(
      {
        customer: {
          uid: customerId,
          email: customerEmail,
          password: customerPassword,
        },
        driver: {
          uid: driverId,
          email: driverEmail,
          password: driverPassword,
          approved,
        },
        enablePlacementPricing,
        grantPlacementAccess: grantAccess,
        placementAccess,
        conversationId,
        interviewRequestId: requestId,
        acceptImmediately,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in dev/seed-placement-pair:", error);
    return NextResponse.json(
      { error: "Failed to seed placement pair." },
      { status: 500 },
    );
  }
}
