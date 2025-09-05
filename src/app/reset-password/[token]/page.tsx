"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import BlurText from "../../../../components/shared/BlurText";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!oobCode) {
      setError("Invalid or missing reset code. Please request a new link.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      // Verify code first
      await verifyPasswordResetCode(auth, oobCode);
      // Confirm reset
      await confirmPasswordReset(auth, oobCode, password);
      setMessage("Your password has been reset successfully. You can now log in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : undefined;
      let msg = "Failed to reset password. Please try again.";
      if (code === "auth/expired-action-code") msg = "This reset link has expired. Please request a new one.";
      if (code === "auth/invalid-action-code") msg = "This reset link is invalid or has already been used.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4  text-foreground">
      {/* Background handled globally by DottedBackground */}

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 flex items-center justify-center gap-2" aria-label="Home">
            <span className="text-2xl font-semibold tracking-tighter">RideOn Nigeria</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            <BlurText as="span" text="Set a New Password" animateBy="words" direction="top" delay={120} />
          </h1>
          <BlurText
            as="p"
            className="mt-2 text-sm text-gray-600 dark:text-slate-400"
            text="Your new password must be different from previous passwords."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:bg-slate-900/70">
          {message ? (
            <div
              role="status"
              className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
            >
              {message} {" "}
              <Link
                href="/login"
                className="font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-300"
              >
                Go to Login
              </Link>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
                New Password
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/60 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/60 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:opacity-90 hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BlurText
                as="span"
                text={isLoading ? "Resetting..." : "Reset Password"}
                animateBy="words"
                direction="top"
                delay={60}
              />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
