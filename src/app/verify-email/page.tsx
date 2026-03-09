"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import BlurText from "../../../components/shared/BlurText";

function safeNextPath(raw: string | null | undefined): string {
  const val = (raw || "").trim();
  if (!val) return "/app/dashboard";

  if (val.startsWith("/")) return val;

  try {
    const u = new URL(val);
    if (typeof window !== "undefined" && u.origin === window.location.origin) {
      const p = `${u.pathname}${u.search}${u.hash}`;
      return p.startsWith("/") ? p : "/app/dashboard";
    }
  } catch {
    // ignore
  }

  return "/app/dashboard";
}

async function refreshSessionCookie(user: User) {
  try {
    const token = await user.getIdToken(true);
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token, remember: true }),
    });
  } catch {
    // best-effort
  }
}

async function clearSessionCookie() {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // best-effort
  }
}

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const continueUrl = searchParams.get("continueUrl");
  const nextFromContinue = (() => {
    if (!continueUrl) return null;
    try {
      const u = new URL(continueUrl, window.location.origin);
      const n = u.searchParams.get("next");
      return n ? n : null;
    } catch {
      return null;
    }
  })();

  const next = safeNextPath(searchParams.get("next") || nextFromContinue);

  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  React.useEffect(() => {
    if (mode === "verifyEmail" && oobCode) {
      const qs = new URLSearchParams();
      qs.set("mode", "verifyEmail");
      qs.set("oobCode", oobCode);
      qs.set("next", next);
      router.replace(`/auth/action?${qs.toString()}`);
    }
  }, [mode, next, oobCode, router]);

  const [user, setUser] = React.useState<User | null>(auth.currentUser);
  const [checking, setChecking] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const resend = async () => {
    setError(null);
    setMessage(null);

    const u = auth.currentUser;
    if (!u) {
      setError("Please log in to resend the verification email.");
      return;
    }

    try {
      setSending(true);
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action?next=${encodeURIComponent(next)}`,
        handleCodeInApp: true,
      } as const;

      await sendEmailVerification(u, actionCodeSettings);
      setMessage("Verification email sent. Please check your inbox.");
    } catch (e: unknown) {
      const code =
        typeof e === "object" && e && "code" in e
          ? String((e as { code?: string }).code)
          : undefined;

      if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Failed to send verification email. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const iveVerified = async () => {
    setError(null);
    setMessage(null);

    const u = auth.currentUser;
    if (!u) {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    try {
      setRefreshing(true);
      await u.reload();
      if (!u.emailVerified) {
        setError(
          "Not verified yet. Please click the link in your email first.",
        );
        return;
      }

      await refreshSessionCookie(u);
      router.replace(next);
    } catch {
      setError("Failed to refresh verification status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const doSignOut = async () => {
    setError(null);
    setMessage(null);

    try {
      await clearSessionCookie();
      await signOut(auth);
    } catch {
      // ignore
    } finally {
      router.replace("/login");
    }
  };

  const email = (user?.email || "").trim();

  return (
    <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4 text-foreground">
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-4 flex items-center justify-center gap-2"
            aria-label="Home"
          >
            <Image
              src="/RIDEONNIGERIA%20LOGO.png"
              alt="RideOn Nigeria"
              width={1024}
              height={1024}
              className="h-14 w-auto"
              priority
            />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            <BlurText
              as="span"
              text="Verify your email"
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h1>
          <BlurText
            as="p"
            className="mt-2 text-sm text-gray-600 dark:text-slate-400"
            text="To keep your account active, please verify your email address."
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

          {checking ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Checking your account…
            </p>
          ) : user ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Signed in as
                </p>
                <p className="mt-1 text-sm font-mono text-slate-900 dark:text-slate-100 break-all">
                  {email || "(no email)"}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={resend}
                  disabled={sending}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#00529B] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Resend verification email"}
                </button>

                <button
                  type="button"
                  onClick={iveVerified}
                  disabled={refreshing}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-white/10 bg-white/60 px-6 text-sm font-semibold text-slate-900 shadow-lg transition-all duration-200 hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {refreshing ? "Refreshing…" : "I’ve verified"}
                </button>

                <button
                  type="button"
                  onClick={doSignOut}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-white/10 bg-transparent px-6 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-white/40 dark:text-slate-200 dark:hover:bg-slate-800/50"
                >
                  Sign out
                </button>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  After verification, you’ll continue to:{" "}
                  <span className="font-mono">{next}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Please log in to resend the verification email.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#00529B] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90"
              >
                Go to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4 text-foreground">
          <div className="relative w-full max-w-sm">
            <div className="w-full rounded-2xl border border-white/10 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:bg-slate-900/70 text-center text-sm text-slate-700 dark:text-slate-300">
              Loading…
            </div>
          </div>
        </main>
      }
    >
      <VerifyEmailPageContent />
    </Suspense>
  );
}
