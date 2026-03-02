"use client";

import * as React from "react";
import { StickyBanner, LogoutButton } from "@/components";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

async function getUserOrWait(timeoutMs = 4000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    const t = window.setTimeout(() => {
      unsub();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return; // wait until non-null
      window.clearTimeout(t);
      unsub();
      resolve(u);
    });
  });
}

export default function AccountPrivacyPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function deactivate() {
    try {
      if (
        !window.confirm(
          "Are you sure you want to deactivate your account? You can contact support to reactivate.",
        )
      )
        return;
      setBusy(true);
      const user = await getUserOrWait();
      const token = await user.getIdToken();
      const res = await fetch("/api/users/me/deactivate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to deactivate account");
      setSuccess("Your account has been deactivated. You will be signed out.");
      setTimeout(() => {
        try {
          auth.signOut();
        } catch {}
        window.location.href = "/login";
      }, 1000);
    } catch (e: any) {
      setError(e?.message || "Unable to deactivate account.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Account & Privacy
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Manage your sign-in and privacy settings.
      </p>

      {(error || success) && (
        <StickyBanner className="z-50 mt-4">
          <div
            className={[
              "rounded-xl px-3 py-2 text-[13px] shadow border",
              success
                ? "bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200",
            ].join(" ")}
          >
            {success || error}
          </div>
        </StickyBanner>
      )}

      <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Sign out
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          You can sign out of your RideOn account at any time.
        </p>
        <div className="mt-3">
          <LogoutButton />
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Deactivate account
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Deactivate your account. This will prevent new reservations and access
          until reactivated. Data is retained. For permanent deletion, contact
          support.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={deactivate}
            disabled={busy}
            className="inline-flex items-center justify-center h-11 px-4 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all duration-200 disabled:opacity-60"
          >
            {busy ? "Processing…" : "Deactivate Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
