import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

function normalizePrivateKey(pk?: string): string | undefined {
  if (!pk) return undefined;
  let p = pk.trim();
  // Remove surrounding quotes if present
  if (
    (p.startsWith('"') && p.endsWith('"')) ||
    (p.startsWith("'") && p.endsWith("'"))
  ) {
    p = p.slice(1, -1);
  }
  // Normalize escaped CRLF and LF sequences and any literal CRLF
  p = p
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
  return p;
}

function decodeBase64Key(b64?: string): string | undefined {
  if (!b64) return undefined;
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return undefined;
  }
}

// Initialize Firebase Admin SDK using service account env vars
// Required envs:
// - FIREBASE_ADMIN_PROJECT_ID
// - FIREBASE_ADMIN_CLIENT_EMAIL
// - FIREBASE_ADMIN_PRIVATE_KEY  (escaped with \n for newlines)
let app: App;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey =
    normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY) ??
    decodeBase64Key(process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials environment variables.",
    );
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    // If provided, set default Storage bucket so Admin SDK can access it
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = getApps()[0]!;
}

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export const RIDEON_ID_TOKEN_COOKIE_PREFIX = "id_token:";

try {
  const raw = String(process.env.FIRESTORE_PREFER_REST || "").toLowerCase();
  const preferRest =
    raw === "true" ||
    (process.env.NODE_ENV !== "production" && raw !== "false");
  if (preferRest) {
    (adminDb as any).settings?.({ preferRest: true });
  }
} catch {}

export async function verifyRideOnSessionCookie(sessionCookie: string) {
  const raw = String(sessionCookie || "").trim();
  if (!raw) return null;

  if (raw.startsWith(RIDEON_ID_TOKEN_COOKIE_PREFIX)) {
    const token = raw.slice(RIDEON_ID_TOKEN_COOKIE_PREFIX.length).trim();
    if (!token) return null;
    try {
      return await withTimeout(
        adminAuth.verifyIdToken(token),
        2_500,
        "[verifyRideOnSessionCookie] verifyIdToken",
      );
    } catch {
      return null;
    }
  }

  try {
    return await withTimeout(
      adminAuth.verifySessionCookie(raw, true),
      2_500,
      "[verifyRideOnSessionCookie] verifySessionCookie",
    );
  } catch {
    return null;
  }
}

// Make Storage optional: if no bucket configured, export undefined to avoid runtime errors
export const adminBucket = (() => {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  try {
    return name ? getStorage(app).bucket() : undefined;
  } catch {
    return undefined;
  }
})();
