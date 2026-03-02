"use client";

import * as React from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { StickyBanner } from "@/components";
import { Loader2, LogOut, UserX } from "lucide-react";
import { useRouter } from "next/navigation";

async function getUserOrWait(timeoutMs = 4000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    const t = window.setTimeout(() => {
      unsub();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      window.clearTimeout(t);
      unsub();
      resolve(u);
    });
  });
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);
  const [deactivating, setDeactivating] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate brief loading to ensure auth state
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  async function handleSignOut() {
    try {
      if (!window.confirm("Are you sure you want to sign out?")) return;
      setSigningOut(true);
      await auth.signOut();
      router.push("/login");
    } catch (e: any) {
      setError(e?.message || "Unable to sign out.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDeactivate() {
    try {
      if (
        !window.confirm(
          "Are you sure you want to deactivate your account? You can contact support to reactivate.",
        )
      )
        return;
      setDeactivating(true);

      const user = await getUserOrWait();
      const token = await user.getIdToken();

      const res = await fetch("/api/drivers/me/deactivate", {
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
        router.push("/login");
      }, 1500);
    } catch (e: any) {
      setError(e?.message || "Unable to deactivate account.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <div className="h-6 w-48 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        <div className="mt-1 h-4 w-80 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />

        <div className="mt-5 space-y-5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 animate-pulse"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="h-3 w-full max-w-md rounded bg-slate-200/70 dark:bg-slate-800/70" />
                  </div>
                  <div className="h-10 w-28 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Account Settings
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Manage your account security and privacy settings.
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

      {/* Sign Out Section */}
      <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sign Out
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Sign out of your RideOn driver account on this device.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-slate-700 dark:bg-slate-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-700 shadow-lg transition-all duration-200 disabled:opacity-60"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing Out...
                  </>
                ) : (
                  "Sign Out"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deactivate Account Section */}
      <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-800/60">
            <UserX className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Deactivate Account
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Deactivate your driver account. This will prevent new trip
              assignments and marketplace visibility until reactivated. Your
              data will be retained. For permanent deletion, please contact
              support.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all duration-200 disabled:opacity-60"
              >
                {deactivating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deactivating...
                  </>
                ) : (
                  "Deactivate Account"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
