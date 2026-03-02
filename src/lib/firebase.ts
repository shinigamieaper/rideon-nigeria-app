import { getApps, initializeApp, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Keep this file client-only by importing it only from Client Components.
// Reads config from NEXT_PUBLIC_* env vars (do not embed secrets).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  messagingSenderId: process.env
    .NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
};

// Initialize (safe for hot reloads)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Make auth persistent across reloads (localStorage). Ignore errors silently in unsupported contexts.
// This file is client-only; calls run in the browser.
setPersistence(auth, browserLocalPersistence).catch(() => {});
export const storage = getStorage(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Helper: wait for a signed-in user without flaking on slow startups.
// Uses auth.authStateReady() when available, with a generous timeout, and
// falls back to a one-shot onAuthStateChanged listener.
export async function waitForUser(timeoutMs = 15000): Promise<User> {
  // Fast path
  if (auth.currentUser) return auth.currentUser;

  // Some Firebase builds expose auth.authStateReady() which relies on `this`.
  // Call it as a method to preserve context, not as a detached function.
  const hasAuthStateReady = typeof (auth as any).authStateReady === "function";
  if (hasAuthStateReady) {
    // Wait until the initial auth state is resolved (or timeout)
    await Promise.race([
      (auth as any).authStateReady(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("auth_init_timeout")), timeoutMs),
      ),
    ]);
    if (auth.currentUser) return auth.currentUser;
    // authStateReady resolved but user is null - fall through to listener approach
    // which gives persistence a bit more time to restore the session
  }

  // Listener-based wait: resolve when we first get a non-null user, or time out.
  // This handles the case where persistence restores the user slightly after authStateReady.
  return await new Promise<User>((resolve, reject) => {
    const t = setTimeout(() => {
      unsub();
      reject(new Error("Please sign in to continue."));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return; // wait until non-null
      clearTimeout(t);
      unsub();
      resolve(u);
    });
  });
}
