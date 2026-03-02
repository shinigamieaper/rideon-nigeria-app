import { getReferencesEmailFrom, getResendClient } from "@/lib/resendServer";

export type ReferenceRequestFlow = "on_demand" | "full_time";

export interface ReferencePerson {
  name: string;
  email: string;
  phone?: string;
  relationship: string;
}

export interface ReferenceRequestEmailItem {
  token: string;
  reference: ReferencePerson;
}

function safeBaseUrl(baseUrl: string): string {
  const b = (baseUrl || "").trim();
  return b ? b.replace(/\/$/, "") : "http://localhost:3000";
}

export async function sendReferenceRequestEmails(args: {
  flow: ReferenceRequestFlow;
  applicantName: string;
  items: ReferenceRequestEmailItem[];
  baseUrl: string;
}): Promise<{ sent: number; skipped: number }> {
  const resend = getResendClient();
  const from = getReferencesEmailFrom();
  if (!resend || !from) {
    return { sent: 0, skipped: args.items.length };
  }

  const appBase = safeBaseUrl(args.baseUrl);

  const results = await Promise.allSettled(
    args.items.map(async ({ token, reference }) => {
      const to = String(reference.email || "").trim();
      if (!to) return;

      const link = `${appBase}/references/${encodeURIComponent(token)}`;
      const subject = `RideOn reference request for ${args.applicantName}`;

      const textLines = [
        `Hello ${reference.name || "there"},`,
        "",
        `You were listed as a reference for ${args.applicantName}.`,
        `Relationship: ${reference.relationship || "N/A"}`,
        "",
        `Please complete the short reference form here:`,
        link,
        "",
        `Thank you,`,
        `RideOn Team`,
      ];

      const html = `
        <p>Hello <strong>${reference.name || "there"}</strong>,</p>
        <p>You were listed as a reference for <strong>${args.applicantName}</strong>.</p>
        <p><strong>Relationship:</strong> ${reference.relationship || "N/A"}</p>
        <p>
          Please complete the short reference form by clicking the link below:
        </p>
        <p><a href="${link}">${link}</a></p>
        <p>Thank you,<br/>RideOn Team</p>
      `;

      await resend.emails.send({
        from,
        to,
        subject,
        text: textLines.join("\n"),
        html,
      });
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const skipped = args.items.length - sent;
  return { sent, skipped };
}

export async function sendApplicantReferenceConfirmationEmail(args: {
  to: string;
  applicantName: string;
  referencesCount: number;
  flow: ReferenceRequestFlow;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const resend = getResendClient();
  const from = getReferencesEmailFrom();
  const to = String(args.to || "").trim();
  if (!resend || !from || !to) {
    return { sent: false, skipped: true };
  }

  const subject = "Your RideOn application: reference checks sent";

  const text = [
    `Hi ${args.applicantName || "there"},`,
    "",
    `We’ve sent reference check requests to ${args.referencesCount} reference(s) you provided.`,
    `You can track progress on your application status page.`,
    "",
    `RideOn Team`,
  ].join("\n");

  const html = `
    <p>Hi <strong>${args.applicantName || "there"}</strong>,</p>
    <p>
      We’ve sent reference check requests to <strong>${args.referencesCount}</strong> reference(s) you provided.
    </p>
    <p>You can track progress on your application status page.</p>
    <p>RideOn Team</p>
  `;

  await resend.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, skipped: false };
}
