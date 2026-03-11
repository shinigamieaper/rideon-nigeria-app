"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import BlurText from "../../../components/shared/BlurText";
import RevealOnScroll from "../../../components/shared/RevealOnScroll";

const EMAIL_VERIFY_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

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

function isAllowlistedNext(nextAfter: string | null): boolean {
  const n = (nextAfter || "").trim();
  if (!n) return false;
  return n.startsWith("/join/partner");
}

function getAccountAgeMs(
  creationTime: string | null | undefined,
): number | null {
  if (!creationTime) return null;
  const created = Date.parse(creationTime);
  if (!Number.isFinite(created)) return null;
  return Date.now() - created;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextAfter = searchParams.get("next");
  const nextSafe = safeNextPath(nextAfter);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempted = false;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (cancelled || attempted) return;
      if (!u) return;

      attempted = true;
      try {
        setError(null);
        setLoading(true);
        const token = await u.getIdToken();
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, remember: true }),
        });
        router.replace(nextSafe);
      } catch {
        // If restore fails, fall back to showing the login form
        attempted = false;
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [nextSafe, router]);

  useEffect(() => {
    let cancelled = false;

    async function completeGoogleRedirect() {
      try {
        console.log("[Login] Checking for Google redirect result");
        const result = await getRedirectResult(auth);
        if (cancelled || !result?.user) {
          console.log("[Login] No Google redirect result or cancelled");
          return;
        }

        setError(null);
        setLoading(true);
        const token = await result.user.getIdToken();
        const sessionRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, remember: true }),
        });
        if (!sessionRes.ok) {
          const errText = await sessionRes.text();
          console.error(
            "[Login] Redirect session API error",
            sessionRes.status,
            errText,
          );
          throw new Error(`Session API error: ${sessionRes.status}`);
        }
        router.replace(nextSafe);
      } catch (e) {
        console.error("[Login] Google redirect result failed", e);
        if (!cancelled) {
          setError("Google sign-in failed. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    completeGoogleRedirect();
    return () => {
      cancelled = true;
    };
  }, [router, nextAfter]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // If user has no account, guide them to sign up first
      await signInWithEmailAndPassword(auth, email, password);
      const u = auth.currentUser;
      if (u) {
        if (!u.emailVerified && !isAllowlistedNext(nextAfter)) {
          const ageMs = getAccountAgeMs(u.metadata?.creationTime);
          if (ageMs !== null && ageMs >= EMAIL_VERIFY_GRACE_MS) {
            const next = nextSafe;
            router.replace(`/verify-email?next=${encodeURIComponent(next)}`);
            return;
          }
        }
        const token = await u.getIdToken();
        const sessionRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, remember: true }),
        });
        if (!sessionRes.ok) {
          const errText = await sessionRes.text();
          console.error(
            "[Login] Session API error",
            sessionRes.status,
            errText,
          );
          throw new Error(`Session API error: ${sessionRes.status}`);
        }
      }
      router.push(nextSafe);
    } catch (err: unknown) {
      console.error("[Login] onSubmit error", err);
      // Show friendly message
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code?: string }).code)
          : undefined;
      let message =
        "Failed to sign in. Please check your credentials and try again.";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password")
        message = "Incorrect email or password.";
      if (code === "auth/user-not-found") {
        message = "No account found for this email.";
        router.push(`/register/customer?next=${encodeURIComponent(nextSafe)}`);
        return;
      }
      if (code === "auth/too-many-requests")
        message = "Too many attempts. Please try again later.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isIOS = /iPad|iPhone|iPod/i.test(ua);

      // iOS Chrome/Safari often breaks popup auth (opens about:blank). Use redirect.
      if (isIOS) {
        console.log("[Login] iOS detected: using Google redirect");
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      try {
        console.log("[Login] Non-iOS: attempting Google popup");
        await signInWithPopup(auth, googleProvider);
      } catch (popupErr: unknown) {
        console.error("[Login] Google popup failed", popupErr);
        const code =
          typeof popupErr === "object" && popupErr && "code" in popupErr
            ? String((popupErr as { code?: string }).code)
            : undefined;
        if (
          code === "auth/popup-blocked" ||
          code === "auth/popup-closed-by-user" ||
          code === "auth/operation-not-supported-in-this-environment"
        ) {
          console.log("[Login] Falling back to Google redirect");
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }

      const u = auth.currentUser;
      if (u) {
        const token = await u.getIdToken();
        const sessionRes = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, remember: true }),
        });
        if (!sessionRes.ok) {
          const errText = await sessionRes.text();
          console.error(
            "[Login] Google session API error",
            sessionRes.status,
            errText,
          );
          throw new Error(`Session API error: ${sessionRes.status}`);
        }
      }
      router.push(nextSafe);
    } catch (e) {
      console.error("[Login] Google sign-in failed", e);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4  text-foreground">
      {/* Background handled globally by DottedBackground */}

      <div className="relative w-full max-w-sm">
        <RevealOnScroll
          as="div"
          className="text-center mb-8"
          style={
            {
              ["--tw-enter-opacity" as any]: "0",
              ["--tw-enter-translate-y" as any]: "1rem",
              ["--tw-enter-blur" as any]: "8px",
              animationDelay: "100ms",
            } as React.CSSProperties
          }
        >
          <Link
            href="/"
            className="flex items-center justify-center gap-2 mb-4"
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
              text="Welcome Back"
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h1>
          <BlurText
            as="p"
            className="mt-2 text-sm text-gray-500 dark:text-gray-400 justify-center"
            text="Log in to continue to your dashboard."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </RevealOnScroll>

        <RevealOnScroll
          as="div"
          className="w-full rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8 lg:p-12"
          style={
            {
              ["--tw-enter-opacity" as any]: "0",
              ["--tw-enter-translate-y" as any]: "1rem",
              ["--tw-enter-blur" as any]: "8px",
              animationDelay: "200ms",
              boxShadow:
                "0 25px 50px -12px rgba(0,0,0,0.25), 0 0px 40px -10px rgba(0, 82, 155, 0.40)",
            } as React.CSSProperties
          }
        >
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/60 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800/70 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:opacity-90 hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <BlurText
                    as="span"
                    text="Signing in..."
                    animateBy="words"
                    direction="top"
                    delay={60}
                  />
                ) : (
                  <BlurText
                    as="span"
                    text="Log In"
                    animateBy="words"
                    direction="top"
                    delay={60}
                  />
                )}
              </button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-gray-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/70 px-2 text-gray-500 dark:bg-slate-900/70">
                or
              </span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center gap-3 rounded-md border border-white/10 bg-white/60 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {/* Simple G icon */}
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <g clipPath="url(#clip0_15_154)">
                  <path
                    d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.84497H12.24V14.4591H18.7219C18.4528 16.0372 17.5885 17.4046 16.323 18.2813V21.1039H20.19C22.4608 19.0129 23.766 15.9201 23.766 12.2764Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1944 21.1039L16.3274 18.2813C15.2517 19.0407 13.8669 19.4921 12.2401 19.4921C9.11388 19.4921 6.45905 17.3338 5.50705 14.5457H1.51611V17.4434C3.49336 21.2319 7.56106 24.0008 12.2401 24.0008Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.50256 14.5456C5.25291 13.7863 5.10773 12.9841 5.10773 12.1623C5.10773 11.3405 5.25291 10.5383 5.50256 9.77895V6.88119H1.51162C0.544836 8.77196 0 10.4061 0 12.1623C0 13.9184 0.544836 15.5526 1.51162 17.4434L5.50256 14.5456Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12.2401 4.83244C13.9619 4.83244 15.5872 5.45444 16.8434 6.63948L20.2695 3.21338C18.1983 1.2246 15.4722 0 12.2401 0C7.56106 0 3.49336 2.76888 1.51611 6.55743L5.50705 9.45518C6.45905 6.66699 9.11388 4.83244 12.2401 4.83244Z"
                    fill="#EA4335"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_15_154">
                    <rect
                      width="24"
                      height="24"
                      fill="white"
                      transform="translate(0 0.000976562)"
                    />
                  </clipPath>
                </defs>
              </svg>
              <BlurText
                as="span"
                text="Continue with Google"
                animateBy="words"
                direction="top"
                delay={60}
              />
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Sign up
            </Link>
          </p>
        </RevealOnScroll>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4 text-foreground">
          <div className="w-full max-w-sm rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-8 lg:p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading login...
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
