"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import BlurText from "../../../../components/shared/BlurText";

export default function CustomerRegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Simple validators
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const isValidPassword = (val: string) => val.length >= 8;
  const isValidPhone = (val: string) => {
    // Allow digits, spaces, dashes, parentheses, leading +; ensure 10-15 digits total
    const digits = val.replace(/[^0-9]/g, "");
    return digits.length >= 10 && digits.length <= 15;
  };

  const formValid = useMemo(() => {
    return (
      firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      isValidEmail(email) &&
      isValidPhone(phoneNumber) &&
      isValidPassword(password) &&
      termsAccepted
    );
  }, [firstName, lastName, email, phoneNumber, password, termsAccepted]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    // Extra guards
    if (!formValid) {
      setError(
        !termsAccepted
          ? "Please accept the Terms of Service and Privacy Policy."
          : "Please fix validation errors and try again."
      );
      return;
    }

    setIsLoading(true);
    try {
      // 1) Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      // 2) Get ID token
      const idToken = await user.getIdToken();

      // 3) Call backend to create Mongo profile and set role=customer
      const res = await fetch("/api/auth/register-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to complete registration.");
      }

      // 4) Redirect to app dashboard
      router.push("/app");
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/email-already-in-use") {
        setError("This email is already in use. Please log in instead or reset your password.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Please use at least 8 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError(err?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center pt-24 pb-12 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 p-6 sm:p-8 lg:p-12 animate-in"
        style={{ ["--tw-enter-scale" as any]: 0.96, ["--tw-enter-blur" as any]: "16px", boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0px 40px -10px rgba(0, 82, 155, 0.40)' }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <BlurText as="span" text="Create your Customer Account" animateBy="words" direction="top" delay={120} />
          </h1>
          <BlurText
            as="p"
            className="mt-2 text-slate-600 dark:text-slate-400"
            text="Get started with fast and reliable rides."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">First Name</label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                placeholder="John"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`block w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 transition text-sm ${
                email && !isValidEmail(email)
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500"
              }`}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={`block w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 transition text-sm ${
                phoneNumber && !isValidPhone(phoneNumber)
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500"
              }`}
              placeholder="+234 801 234 5678"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`block w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 transition text-sm ${
                password && !isValidPassword(password)
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500"
              }`}
              placeholder="••••••••"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Use at least 8 characters.</p>
          </div>

          <div className="pt-2">
            <label htmlFor="terms" className="flex items-start cursor-pointer group select-none">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="peer mt-1 h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">
                I agree to the RideOn <a href="#" className="font-medium text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="font-medium text-blue-600 hover:underline">Privacy Policy</a>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={!formValid || isLoading}
            className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#1D4ED8" }}
          >
            <BlurText
              as="span"
              text={isLoading ? "Creating Account…" : "Create Account"}
              animateBy="words"
              direction="top"
              delay={60}
            />
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account? <a href="/login" className="font-medium text-slate-800 dark:text-slate-200 hover:underline">Log In</a>
          </p>
        </form>
      </div>

      <style jsx global>{`
        .animate-in { animation: enter 0.6s ease-out forwards; }
        @keyframes enter { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </main>
  );
}
