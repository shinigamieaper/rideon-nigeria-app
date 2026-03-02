import "server-only";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getEmailFrom, getResendClient } from "@/lib/resendServer";

type PlacementEmailKind = "interview" | "hire";

type PlacementEmailStatus = "accepted" | "declined";

function safeBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  return "http://localhost:3000";
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

export async function sendPlacementStatusEmail(args: {
  customerId: string;
  kind: PlacementEmailKind;
  status: PlacementEmailStatus;
  conversationId?: string;
  driverName?: string;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const resend = getResendClient();
  const from = getEmailFrom();
  if (!resend || !from) return { sent: false, skipped: true };

  const to = await resolveUserEmail(args.customerId);
  if (!to) return { sent: false, skipped: true };

  const baseUrl = safeBaseUrl();
  const driverName = (args.driverName || "").trim();
  const namePart = driverName ? ` with ${driverName}` : "";

  const kindLabel = args.kind === "hire" ? "Hire request" : "Interview request";
  const statusLabel = args.status === "accepted" ? "accepted" : "declined";
  const subject = `RideOn: ${kindLabel} ${statusLabel}`;

  const messagesLink = args.conversationId
    ? `${baseUrl}/app/hire-a-driver/messages/${encodeURIComponent(args.conversationId)}`
    : `${baseUrl}/app/hire-a-driver/engagements`;

  const headline = `${kindLabel} ${statusLabel}${namePart}`;
  const nextLine =
    args.status === "accepted"
      ? "You can continue in-app to chat and proceed."
      : "You can explore other drivers and try again.";

  const text = [headline, "", nextLine, "", "Open:", messagesLink].join("\n");

  const html = `
    <p><strong>${headline}</strong></p>
    <p>${nextLine}</p>
    <p><a href="${messagesLink}">Open in RideOn</a></p>
  `;

  try {
    await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
    return { sent: true, skipped: false };
  } catch (e) {
    console.warn(
      "[placementStatusEmails] Failed to send placement status email",
      e,
    );
    return { sent: false, skipped: true };
  }
}
