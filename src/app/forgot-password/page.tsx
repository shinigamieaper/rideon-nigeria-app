"use client";

import React, { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import BlurText from "../../../components/shared/BlurText";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setIsLoading(true);
    try {
      // Ensure the email link returns to our app so we can handle oobCode on /reset-password/[token]
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password/reset`,
        handleCodeInApp: true,
      } as const;
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setMessage(
        "If an account exists for this email, a reset link has been sent."
      );
    } catch (err: unknown) {
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : undefined;
      // Do not reveal whether the email exists. Show generic success for common cases.
      const generic =
        "If an account exists for this email, a reset link has been sent.";
      if (
        code === "auth/user-not-found" ||
        code === "auth/invalid-email" ||
        code === "auth/missing-email"
      ) {
        setMessage(generic);
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
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
            <BlurText as="span" text="Forgot Password?" animateBy="words" direction="top" delay={120} />
          </h1>
          <BlurText
            as="p"
            className="mt-2 text-sm text-gray-600 dark:text-slate-400"
            text="No worries, we'll send you reset instructions."
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
              {message}
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
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                text={isLoading ? "Sending..." : "Send Reset Link"}
                animateBy="words"
                direction="top"
                delay={60}
              />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Back to Log In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
