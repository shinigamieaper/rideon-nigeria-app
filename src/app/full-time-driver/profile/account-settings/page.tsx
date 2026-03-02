"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { auth } from "@/lib/firebase";
import { StickyBanner } from "@/components";
import { Loader2, LogOut, Shield, AlertCircle, Settings } from "lucide-react";

export default function FullTimeDriverAccountSettingsPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    try {
      if (!window.confirm("Are you sure you want to sign out?")) return;
      setSigningOut(true);
      setError(null);
      await auth.signOut();
      router.push("/login");
    } catch (e: any) {
      setError(e?.message || "Unable to sign out.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your account and security settings.
        </p>
      </div>

      {/* Header Banner */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-5 shadow-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-white/5" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Account & Security
            </h2>
            <p className="text-sm text-white/70">
              Manage your session and account preferences
            </p>
          </div>
        </div>
      </motion.div>

      {error && (
        <StickyBanner className="z-50">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl px-4 py-3 text-sm shadow-lg border bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            {error}
          </motion.div>
        </StickyBanner>
      )}

      {/* Security Info Card */}
      <motion.div
        className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Account Security
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your account is secured with Firebase Authentication. Keep your
              login credentials safe and don't share them with anyone.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sign Out Card */}
      <motion.div
        className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sign Out
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Sign out of your RideOn account on this device. You'll need to
              sign in again to access your application.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold hover:bg-slate-900 dark:hover:bg-slate-600 shadow-lg transition-all duration-200 disabled:opacity-60"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
