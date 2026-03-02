import crypto from "crypto";

export type DojahEnvironment = "sandbox" | "live";

export function getDojahBaseUrl(): string {
  const explicit = (process.env.DOJAH_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const env = (process.env.DOJAH_ENV || "").trim().toLowerCase();
  const resolved: DojahEnvironment = env === "live" ? "live" : "sandbox";

  return resolved === "live"
    ? "https://api.dojah.io"
    : "https://sandbox.dojah.io";
}

export function getDojahAuthHeaders(): {
  AppId: string;
  Authorization: string;
} {
  const appId = (process.env.DOJAH_APP_ID || "").trim();
  const secret = (process.env.DOJAH_SECRET_KEY || "").trim();
  if (!appId || !secret) {
    throw new Error("Missing DOJAH_APP_ID or DOJAH_SECRET_KEY");
  }
  return { AppId: appId, Authorization: secret };
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dojahGetJson(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  const baseUrl = getDojahBaseUrl();
  const { AppId, Authorization } = getDojahAuthHeaders();

  const url = new URL(baseUrl + path);
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      AppId,
      Authorization,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    json,
    rawText: text,
  };
}

export function redactLargeFields(input: any): any {
  try {
    if (!input || typeof input !== "object") return input;
    const clone = Array.isArray(input) ? [...input] : { ...input };

    // Avoid storing large base64 blobs (e.g., photo fields)
    const stack: any[] = [clone];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;

      for (const key of Object.keys(node)) {
        const val = (node as any)[key];
        const k = String(key || "").toLowerCase();

        // Redact common PII fields
        if (
          k === "nin" ||
          k === "vnin" ||
          k === "bvn" ||
          k === "email" ||
          k === "phone" ||
          k === "phone_number"
        ) {
          if (val && typeof val === "object") {
            // Keep boolean/status/confidence values but remove raw identifiers
            if (k === "bvn" && typeof (val as any).value === "string") {
              (node as any)[key] = { ...(val as any), value: "[redacted]" };
              continue;
            }
          }
          if (typeof val === "string") {
            (node as any)[key] = "[redacted]";
            continue;
          }
        }

        if (typeof val === "string" && val.length > 5000) {
          (node as any)[key] = "[redacted]";
        } else if (val && typeof val === "object") {
          stack.push(val);
        }
      }
    }

    return clone;
  } catch {
    return input;
  }
}

export function normalizeNamePart(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function namesMatch(a: string, b: string): boolean {
  const x = normalizeNamePart(a);
  const y = normalizeNamePart(b);
  if (!x || !y) return false;
  return x === y;
}
