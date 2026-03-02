"use client";

import * as React from "react";
import { motion } from "motion/react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { StickyBanner, ProfilePhotoUpload } from "@/components";
import {
  User as UserIcon,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";

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

export default function FullTimeDriverPersonalProfilePage() {
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
        if (!res.ok) throw new Error(data?.error || "Failed to load profile.");

        if (!cancelled) {
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setEmail(data.email || "");
          setPhoneNumber(data.phoneNumber || "");
          setProfileImageUrl(data.profileImageUrl || "");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unable to load profile.");
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
      if (!res.ok) throw new Error(data?.error || "Failed to update profile.");

      setSuccess("Profile updated successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Unable to update profile.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
        {/* Header skeleton */}
        <div className="h-28 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 animate-pulse" />

        {/* Photo section skeleton */}
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-3 w-48 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>
        </div>

        {/* Form skeleton */}
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 p-6 space-y-4 animate-pulse">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
          <div className="h-11 w-36 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 ml-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
      {/* Header Banner */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 sm:p-6 shadow-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Personal Profile
              </h1>
              <p className="text-sm text-white/80 mt-0.5">
                Update your contact details and photo
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {(error || success) && (
        <StickyBanner className="z-50">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={[
              "rounded-xl px-4 py-3 text-sm shadow-lg border flex items-center gap-3",
              success
                ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200",
            ].join(" ")}
          >
            {success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            {success || error}
          </motion.div>
        </StickyBanner>
      )}

      {/* Photo Upload Card */}
      <motion.div
        className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ProfilePhotoUpload
          currentPhotoUrl={profileImageUrl}
          onPhotoChange={setProfileImageUrl}
          label="Profile Photo"
          helperText="This photo may be used across your RideOn experience."
        />
      </motion.div>

      {/* Form Card */}
      <motion.form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6 space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Name Fields */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Basic Information
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                First Name
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00529B] focus:ring-2 focus:ring-[#00529B]/20 transition-all"
                placeholder="First name"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Last Name
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00529B] focus:ring-2 focus:ring-[#00529B]/20 transition-all"
                placeholder="Last name"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200/70 dark:border-slate-700/50" />

        {/* Contact Fields */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Contact Details
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00529B] focus:ring-2 focus:ring-[#00529B]/20 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#00529B] focus:ring-2 focus:ring-[#00529B]/20 transition-all"
                  placeholder="+234 801 234 5678"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:opacity-95 transition-all duration-200 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
