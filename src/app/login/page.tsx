"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import BlurText from "../../../components/shared/BlurText";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: unknown) {
      // Show friendly message
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : undefined;
      let message = "Failed to sign in. Please check your credentials and try again.";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") message = "Incorrect email or password.";
      if (code === "auth/user-not-found") message = "No account found for this email.";
      if (code === "auth/too-many-requests") message = "Too many attempts. Please try again later.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4  text-foreground">
      {/* Background handled globally by DottedBackground */}

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8 animate-in delay-1">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4" aria-label="Home">
            <span className="text-2xl font-semibold tracking-tighter">RideOn Nigeria</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            <BlurText as="span" text="Welcome Back" animateBy="words" direction="top" delay={120} />
          </h1>
          <BlurText
            as="p"
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
            text="Log in to continue to your dashboard."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>

        <div className="w-full rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8 lg:p-12 animate-in delay-2" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0px 40px -10px rgba(0, 82, 155, 0.40)' }}>
          {error ? (
            <div role="alert" className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
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
                <label htmlFor="password" className="block text-sm font-medium">Password</label>
                <Link href="/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">Forgot Password?</Link>
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
                  <BlurText as="span" text="Signing in..." animateBy="words" direction="top" delay={60} />
                ) : (
                  <BlurText as="span" text="Log In" animateBy="words" direction="top" delay={60} />
                )}
              </button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-gray-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/70 px-2 text-gray-500 dark:bg-slate-900/70">or</span>
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
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <g clipPath="url(#clip0_15_154)">
                  <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.84497H12.24V14.4591H18.7219C18.4528 16.0372 17.5885 17.4046 16.323 18.2813V21.1039H20.19C22.4608 19.0129 23.766 15.9201 23.766 12.2764Z" fill="#4285F4"/>
                  <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1944 21.1039L16.3274 18.2813C15.2517 19.0407 13.8669 19.4921 12.2401 19.4921C9.11388 19.4921 6.45905 17.3338 5.50705 14.5457H1.51611V17.4434C3.49336 21.2319 7.56106 24.0008 12.2401 24.0008Z" fill="#34A853"/>
                  <path d="M5.50256 14.5456C5.25291 13.7863 5.10773 12.9841 5.10773 12.1623C5.10773 11.3405 5.25291 10.5383 5.50256 9.77895V6.88119H1.51162C0.544836 8.77196 0 10.4061 0 12.1623C0 13.9184 0.544836 15.5526 1.51162 17.4434L5.50256 14.5456Z" fill="#FBBC05"/>
                  <path d="M12.2401 4.83244C13.9619 4.83244 15.5872 5.45444 16.8434 6.63948L20.2695 3.21338C18.1983 1.2246 15.4722 0 12.2401 0C7.56106 0 3.49336 2.76888 1.51611 6.55743L5.50705 9.45518C6.45905 6.66699 9.11388 4.83244 12.2401 4.83244Z" fill="#EA4335"/>
                </g>
                <defs>
                  <clipPath id="clip0_15_154">
                    <rect width="24" height="24" fill="white" transform="translate(0 0.000976562)"/>
                  </clipPath>
                </defs>
              </svg>
              <BlurText as="span" text="Continue with Google" animateBy="words" direction="top" delay={60} />
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">Sign up</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
