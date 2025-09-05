import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function normalizePrivateKey(pk?: string): string | undefined {
  if (!pk) return undefined;
  let p = pk.trim();
  // Remove surrounding quotes if present
  if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
    p = p.slice(1, -1);
  }
  // Normalize escaped CRLF and LF sequences and any literal CRLF
  p = p
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');
  return p;
}

function decodeBase64Key(b64?: string): string | undefined {
  if (!b64) return undefined;
  try {
    return Buffer.from(b64, 'base64').toString('utf8');
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
    throw new Error('Missing Firebase Admin credentials environment variables.');
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else {
  app = getApps()[0]!;
}

export const adminAuth = getAuth(app);
