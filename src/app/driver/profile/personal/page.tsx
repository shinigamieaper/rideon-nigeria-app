"use client";

import * as React from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { StickyBanner, ProfilePhotoUpload } from "@/components";

async function waitForAuthUser(timeoutMs = 5000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      window.clearTimeout(timer);
      unsubscribe();
      resolve(u);
    });
  });
}

export default function DriverPersonalProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [profileImageUrl, setProfileImageUrl] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const user = await waitForAuthUser();
        const token = await user.getIdToken();

        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Failed to load personal profile.");

        if (!cancelled) {
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setEmail(data.email || "");
          setPhoneNumber(data.phoneNumber || "");
          setProfileImageUrl(data.profileImageUrl || "");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unable to load personal profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const user = await waitForAuthUser();
      const token = await user.getIdToken();

      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          profileImageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to update personal profile.");

      setSuccess("Personal information updated successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Unable to update personal profile.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <div className="h-6 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        <div className="mt-1 h-4 w-80 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />

        <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 space-y-6 animate-pulse">
          <div className="h-28 w-full rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 w-full rounded-lg bg-slate-200/70 dark:bg-slate-800/70"
              />
            ))}
          </div>
          <div className="h-11 w-36 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Personal Profile
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Update your contact details and profile photo. Name changes may require
        additional verification by our team.
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

      <form
        onSubmit={handleSubmit}
        className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 space-y-6"
      >
        <ProfilePhotoUpload
          currentPhotoUrl={profileImageUrl}
          onPhotoChange={setProfileImageUrl}
          label="Profile Photo"
          helperText="This photo is used throughout your RideOn experience. For placement drivers it appears on your public profile."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              First Name
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B] transition"
              placeholder="First name"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Last Name
            </label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B] transition"
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B] transition"
              placeholder="name@example.com"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Updating your email will require verification before it takes
              effect.
            </p>
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:border-[#00529B] focus:ring-1 focus:ring-[#00529B] transition"
              placeholder="e.g. +234 801 234 5678"
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
          Changes to your personal details may trigger compliance review. Our
          team may contact you to confirm updates before they reflect in trip
          manifests or billing paperwork.
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[#00529B] text-white text-sm font-semibold hover:bg-[#003D7A] shadow-lg shadow-blue-900/20 transition-all duration-200 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
