"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  applyActionCode,
  getAuth,
  reload,
  type Auth,
  type User,
} from "firebase/auth";
import { auth as appAuth } from "@/lib/firebase";
import BlurText from "../../../../components/shared/BlurText";

function safeNextPath(raw: string | null | undefined): string {
  const val = (raw || "").trim();
  if (!val) return "/app/dashboard";

  if (val.startsWith("/") && !val.startsWith("//") && !val.startsWith("/\\"))
    return val;

  try {
    const u = new URL(val);
    if (typeof window !== "undefined" && u.origin === window.location.origin) {
      const p = `${u.pathname}${u.search}${u.hash}`;
      return p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\")
        ? p
        : "/app/dashboard";
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

async function reloadUser(u: User) {
  try {
    await reload(u);
  } catch {
    // ignore
  }
}

function getFirebaseAuth(): Auth {
  return appAuth || getAuth();
}

function AuthActionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");
  const continueUrl = searchParams.get("continueUrl");
  const nextRaw = searchParams.get("next") || continueUrl;
  const nextPath = safeNextPath(nextRaw);

  const [status, setStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (status !== "idle") return;

      if (mode !== "verifyEmail") {
        setStatus("error");
        setError("Unsupported action.");
        return;
      }

      if (!oobCode) {
        setStatus("error");
        setError("Invalid or missing verification code.");
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        const a = getFirebaseAuth();
        await applyActionCode(a, oobCode);

        const u = a.currentUser;
        if (u) {
          await reloadUser(u);
          if (u.emailVerified) {
            await refreshSessionCookie(u);
            if (!cancelled) {
              setStatus("success");
              router.replace(nextPath);
              return;
            }
          }
        }

        if (!cancelled) {
          setStatus("success");
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to verify email.";
        if (!cancelled) {
          setStatus("error");
          setError(msg);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [mode, nextPath, oobCode, router, status]);

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
              text={
                status === "success"
                  ? "Email verified"
                  : status === "error"
                    ? "Verification failed"
                    : "Verifying email"
              }
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h1>
          <BlurText
            as="p"
            className="mt-2 text-sm text-gray-600 dark:text-slate-400"
            text={
              status === "loading"
                ? "Please wait a moment…"
                : "You can close this tab after verification completes."
            }
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:bg-slate-900/70">
          {status === "loading" ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Processing…
            </p>
          ) : null}

          {status === "error" ? (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            >
              {error || "Failed to verify email. Please try again."}
            </div>
          ) : null}

          {status === "success" ? (
            <div
              role="status"
              className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
            >
              Your email has been verified.
            </div>
          ) : null}

          <div className="space-y-3">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:opacity-90"
            >
              Go to Login
            </Link>

            <Link
              href={`/verify-email?next=${encodeURIComponent(nextPath)}`}
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-white/10 bg-white/60 px-6 text-sm font-semibold text-slate-900 shadow-lg transition-all duration-200 hover:bg-white/80 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Resend verification email
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4 text-foreground">
          <div className="relative w-full max-w-sm">
            <div className="w-full rounded-2xl border border-white/10 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:bg-slate-900/70 text-center text-sm text-slate-700 dark:text-slate-300">
              Verifying…
            </div>
          </div>
        </main>
      }
    >
      <AuthActionPageContent />
    </Suspense>
  );
}
