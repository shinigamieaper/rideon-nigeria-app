import crypto from "crypto";

export function generateReferenceRequestToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
