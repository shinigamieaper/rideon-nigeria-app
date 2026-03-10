import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

function safeBaseUrl(): string {
  const env = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  return "http://localhost:3000";
}

async function isPartnerSubmissionUpdateEmailEnabled(
  partnerId: string,
): Promise<boolean> {
  try {
    const prefsDoc = await adminDb
      .collection("partner_applications")
      .doc(partnerId)
      .collection("settings")
      .doc("notifications")
      .get();

    if (!prefsDoc.exists) return true;

    const prefs = (prefsDoc.data() as any) || {};
    if (prefs.enabled === false) return false;

    const channelVal = prefs?.fleet?.submission_updates?.email;
    if (channelVal === false) return false;

    return true;
  } catch (e) {
    console.warn(
      "[bookingEmails] Failed to read partner submission notification prefs",
      e,
    );
    return true;
  }
}

export async function sendPartnerSubmissionUpdateEmail(args: {
  partnerId: string;
  submissionType: "vehicle" | "driver";
  submissionId: string;
  action: "approved" | "rejected" | "changes_requested";
  title: string;
  message: string;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const resend = getResendClient();
  const from = getEmailFrom();
  if (!resend || !from) return { sent: false, skipped: true };

  const allow = await isPartnerSubmissionUpdateEmailEnabled(args.partnerId);
  if (!allow) return { sent: false, skipped: true };

  const partnerSnap = await adminDb
    .collection("partner_applications")
    .doc(args.partnerId)
    .get();
  if (!partnerSnap.exists) return { sent: false, skipped: true };
  const partner = partnerSnap.data() as any;
  const to = typeof partner?.email === "string" ? partner.email.trim() : "";
  if (!to) return { sent: false, skipped: true };

  const lockId = `partner:${args.partnerId}:submission_update:${args.submissionType}:${args.submissionId}:${args.action}`;
  const gotLock = await acquireEmailLock(lockId);
  if (!gotLock) return { sent: false, skipped: true };

  const baseUrl = safeBaseUrl();
  const linkPath =
    args.submissionType === "vehicle"
      ? `/partner/vehicles/submissions/${encodeURIComponent(args.submissionId)}`
      : `/partner/drivers/submissions/${encodeURIComponent(args.submissionId)}`;
  const link = `${baseUrl}${linkPath}`;

  const subject = `RideOn Partner: ${args.title}`;
  const text = [args.message, "", "Open Partner Portal:", link].join("\n");
  const html = `
    <p>${args.message}</p>
    <p><a href="${link}">Open Partner Portal</a></p>
  `;

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
    await markEmailLock(lockId, { status: "sent" });
    return { sent: true, skipped: false };
  } catch (e: any) {
    await markEmailLock(lockId, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    });
    console.warn("[bookingEmails] Failed sending partner submission email", e);
    return { sent: false, skipped: true };
  }
}

async function resolveUserEmail(uid: string): Promise<string> {
  try {
    const u = await adminAuth.getUser(uid);
    const email = (u.email || "").trim();
    if (email) return email;
  } catch {}

  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return "";
    const data = snap.data() as any;
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    return email;
  } catch {
    return "";
  }
}

async function acquireEmailLock(lockId: string): Promise<boolean> {
  try {
    await adminDb.collection("email_locks").doc(lockId).create({
      status: "sending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (e: any) {
    const code = String(e?.code ?? "");
    const msg = String(e?.message ?? "").toLowerCase();
    if (
      code === "6" ||
      msg.includes("already exists") ||
      msg.includes("already-exists")
    ) {
      return false;
    }
    throw e;
  }
}

async function markEmailLock(
  lockId: string,
  args: { status: "sent" | "failed"; error?: string },
) {
  try {
    await adminDb
      .collection("email_locks")
      .doc(lockId)
      .set(
        {
          status: args.status,
          error: args.error || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (e) {
    console.warn("[bookingEmails] Failed to update email lock", lockId, e);
  }
}

async function isPartnerBookingRequestEmailEnabled(
  partnerId: string,
): Promise<boolean> {
  try {
    const prefsDoc = await adminDb
      .collection("partner_applications")
      .doc(partnerId)
      .collection("settings")
      .doc("notifications")
      .get();

    if (!prefsDoc.exists) return true;

    const prefs = (prefsDoc.data() as any) || {};
    if (prefs.enabled === false) return false;

    const channelVal = prefs?.fleet?.booking_requests?.email;
    if (channelVal === false) return false;

    return true;
  } catch (e) {
    console.warn(
      "[bookingEmails] Failed to read partner notification prefs",
      e,
    );
    return true;
  }
}

export async function sendCustomerPaymentSucceededEmail(args: {
  bookingId: string;
  customerId: string;
  amountKobo?: number | null;
  currency?: string | null;
  pickupAddress?: string | null;
  city?: string | null;
  scheduledPickupTimeIso?: string | null;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const resend = getResendClient();
  const from = getEmailFrom();
  if (!resend || !from) return { sent: false, skipped: true };

  const to = await resolveUserEmail(args.customerId);
  if (!to) return { sent: false, skipped: true };

  const lockId = `booking:${args.bookingId}:customer_payment_succeeded`;
  const gotLock = await acquireEmailLock(lockId);
  if (!gotLock) return { sent: false, skipped: true };

  const baseUrl = safeBaseUrl();
  const link = `${baseUrl}/app/reservations/${encodeURIComponent(args.bookingId)}`;

  const amountNgn =
    args.amountKobo && Number.isFinite(args.amountKobo)
      ? Math.max(0, Math.round(Number(args.amountKobo) / 100))
      : null;

  const currency = String(args.currency || "NGN").trim() || "NGN";
  const pickup = String(args.pickupAddress || "").trim();
  const city = String(args.city || "").trim();
  const when = String(args.scheduledPickupTimeIso || "").trim();

  const subject = "RideOn: Payment confirmed";

  const detailLines: string[] = [];
  if (amountNgn != null)
    detailLines.push(
      `Amount: ₦${amountNgn.toLocaleString()} ${currency === "NGN" ? "" : currency}`.trim(),
    );
  if (city) detailLines.push(`City: ${city}`);
  if (pickup) detailLines.push(`Pickup: ${pickup}`);
  if (when) detailLines.push(`Pickup time: ${when}`);

  const text = [
    "Your payment has been confirmed.",
    ...detailLines.map((l) => l),
    "",
    "View your reservation:",
    link,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>Your payment has been confirmed.</strong></p>
    ${detailLines.length > 0 ? `<ul>${detailLines.map((l) => `<li>${l}</li>`).join("")}</ul>` : ""}
    <p><a href="${link}">View your reservation</a></p>
  `;

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
    await markEmailLock(lockId, { status: "sent" });
    return { sent: true, skipped: false };
  } catch (e: any) {
    await markEmailLock(lockId, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    });
    console.warn("[bookingEmails] Failed sending customer payment email", e);
    return { sent: false, skipped: true };
  }
}

export async function sendPartnerNewReservationRequestEmail(args: {
  bookingId: string;
  partnerId: string;
  pickupAddress?: string | null;
  city?: string | null;
  scheduledPickupTimeIso?: string | null;
  fareNgn?: number | null;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const resend = getResendClient();
  const from = getEmailFrom();
  if (!resend || !from) return { sent: false, skipped: true };

  const allow = await isPartnerBookingRequestEmailEnabled(args.partnerId);
  if (!allow) return { sent: false, skipped: true };

  const partnerSnap = await adminDb
    .collection("partner_applications")
    .doc(args.partnerId)
    .get();
  if (!partnerSnap.exists) return { sent: false, skipped: true };
  const partner = partnerSnap.data() as any;
  const to = typeof partner?.email === "string" ? partner.email.trim() : "";
  if (!to) return { sent: false, skipped: true };

  const lockId = `booking:${args.bookingId}:partner_booking_request`;
  const gotLock = await acquireEmailLock(lockId);
  if (!gotLock) return { sent: false, skipped: true };

  const baseUrl = safeBaseUrl();
  const link = `${baseUrl}/partner/reservations`;

  const city = String(args.city || "").trim();
  const pickup = String(args.pickupAddress || "").trim();
  const when = String(args.scheduledPickupTimeIso || "").trim();

  const subject = "RideOn Partner: New reservation request";

  const detailLines: string[] = [];
  if (city) detailLines.push(`City: ${city}`);
  if (pickup) detailLines.push(`Pickup: ${pickup}`);
  if (when) detailLines.push(`Pickup time: ${when}`);
  if (args.fareNgn && Number.isFinite(args.fareNgn))
    detailLines.push(`Fare: ₦${Number(args.fareNgn).toLocaleString()}`);

  const text = [
    "A new reservation request is available for dispatch.",
    ...detailLines,
    "",
    "Open Partner Portal:",
    link,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p><strong>A new reservation request is available for dispatch.</strong></p>
    ${detailLines.length > 0 ? `<ul>${detailLines.map((l) => `<li>${l}</li>`).join("")}</ul>` : ""}
    <p><a href="${link}">Open Partner Portal</a></p>
  `;

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
    await markEmailLock(lockId, { status: "sent" });
    return { sent: true, skipped: false };
  } catch (e: any) {
    await markEmailLock(lockId, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    });
    console.warn(
      "[bookingEmails] Failed sending partner booking request email",
      e,
    );
    return { sent: false, skipped: true };
  }
}
