import "server-only";

import { Resend } from "resend";

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export function getEmailFrom(): string | null {
  const from =
    process.env.EMAIL_FROM ||
    process.env.SUPPORT_EMAIL_FROM ||
    process.env.REFERENCES_EMAIL_FROM;
  return from ? String(from).trim() : null;
}

export function getSupportEmailFrom(): string | null {
  const from = process.env.SUPPORT_EMAIL_FROM || process.env.EMAIL_FROM;
  return from ? String(from).trim() : null;
}

export function getReferencesEmailFrom(): string | null {
  const from = process.env.REFERENCES_EMAIL_FROM || process.env.EMAIL_FROM;
  return from ? String(from).trim() : null;
}
