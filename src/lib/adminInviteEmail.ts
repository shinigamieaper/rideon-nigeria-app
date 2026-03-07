import "server-only";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getResendClient, getEmailFrom } from "@/lib/resendServer";
import { createAuditLog } from "@/lib/auditLog";

function safeBaseUrl(): string {
  const env = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function sendAdminInviteEmail({
  targetEmail,
  targetName,
  inviterName,
  role,
}: {
  targetEmail: string;
  targetName?: string;
  inviterName: string;
  role: string;
}) {
  const resend = getResendClient();
  const from = getEmailFrom();
  if (!resend || !from) {
    console.warn("[AdminInvite] Resend not configured; skipping email");
    return null;
  }

  const subject = `You’ve been invited to join RideOn as an admin`;
  const loginUrl = `${safeBaseUrl()}/login`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
      <h2 style="color: #111827; margin-bottom: 8px;">You’re invited to join RideOn as an admin</h2>
      <p style="color: #374151; line-height: 1.6;">
        ${inviterName} has invited you to join the RideOn admin panel with the role <strong>${role}</strong>.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Click the button below to sign in and access the admin dashboard.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Sign in to Admin</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If you didn’t expect this invitation, you can ignore this email.</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [targetEmail],
      subject,
      html,
    });
    if (error) {
      console.error("[AdminInvite] Failed to send email", error);
      return null;
    }
    console.log("[AdminInvite] Invite email sent to", targetEmail, data);
    return data;
  } catch (e) {
    console.error("[AdminInvite] Exception sending invite email", e);
    return null;
  }
}
