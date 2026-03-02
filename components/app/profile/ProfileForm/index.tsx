"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { auth, waitForUser } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Input } from "@/components";
import { StickyBanner } from "@/components";

function getInitials(first?: string, last?: string, email?: string) {
  const a = (first || "").trim();
  const b = (last || "").trim();
  if (a || b) {
    const i1 = a ? a[0]!.toUpperCase() : "";
    const i2 = b ? b[0]!.toUpperCase() : "";
    return i1 + i2 || i1 || i2 || "?";
  }
  const e = (email || "").trim();
  if (e) return e[0]!.toUpperCase();
  return "?";
}

export interface ProfileFormProps
  extends React.ComponentPropsWithoutRef<"div"> {}

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profileImageUrl?: string | null;
  avatarColor?: string | null;
}

const initialProfile: ProfileData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  profileImageUrl: null,
  avatarColor: "#00529B",
};

export default function ProfileForm({ className, ...rest }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileData>(initialProfile);
  const [original, setOriginal] = React.useState<ProfileData>(initialProfile);
  const [saving, setSaving] = React.useState(false);
  const broadcastRef = React.useRef<number | null>(null);

  // use shared waitForUser() where needed

  const isDirty = React.useMemo(() => {
    return (
      profile.firstName !== original.firstName ||
      profile.lastName !== original.lastName ||
      profile.email !== original.email ||
      profile.phoneNumber !== original.phoneNumber ||
      (profile.profileImageUrl || null) !==
        (original.profileImageUrl || null) ||
      (profile.avatarColor || null) !== (original.avatarColor || null)
    );
  }, [profile, original]);

  React.useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        router.replace("/login?next=/app/profile/details");
        return;
      }
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to load profile");
        const data: ProfileData = {
          firstName: (j?.firstName ?? "") as string,
          lastName: (j?.lastName ?? "") as string,
          email: (j?.email ?? user.email ?? "") as string,
          phoneNumber: (j?.phoneNumber ?? "") as string,
          profileImageUrl: null, // we have removed photo usage
          avatarColor: (j?.avatarColor ?? "#00529B") as string,
        };
        if (!cancelled) {
          setProfile(data);
          setOriginal(data);
          try {
            const payload = {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              avatarColor: data.avatarColor,
            };
            localStorage.setItem("rideon-profile", JSON.stringify(payload));
            const initials = getInitials(
              data.firstName,
              data.lastName,
              data.email,
            );
            window.dispatchEvent(
              new CustomEvent("rideon-profile-updated", {
                detail: { initials, avatarColor: data.avatarColor },
              }),
            );
          } catch {}
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e?.message || "Failed to load profile.");
          setTimeout(() => setError(null), 2500);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  // Broadcast initials/color on edits (mobile-first UX: header reflects current state)
  React.useEffect(() => {
    if (loading) return;
    if (broadcastRef.current) window.clearTimeout(broadcastRef.current);
    broadcastRef.current = window.setTimeout(() => {
      try {
        const payload = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          avatarColor: profile.avatarColor,
        };
        localStorage.setItem("rideon-profile", JSON.stringify(payload));
        const initials = getInitials(
          profile.firstName,
          profile.lastName,
          profile.email,
        );
        window.dispatchEvent(
          new CustomEvent("rideon-profile-updated", {
            detail: { initials, avatarColor: profile.avatarColor },
          }),
        );
      } catch {}
    }, 250);
    return () => {
      if (broadcastRef.current) window.clearTimeout(broadcastRef.current);
    };
  }, [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.avatarColor,
    loading,
  ]);

  async function handleSave() {
    try {
      setSaving(true);
      const user = await waitForUser().catch((e) => {
        setError(e?.message || "You're offline. Please try again.");
        setTimeout(() => setError(null), 2500);
        throw e;
      });
      let token = await user.getIdToken().catch(() => null);
      if (!token) {
        // Retry once with force refresh
        token = await user.getIdToken(true);
      }
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to update profile");
      const updated: ProfileData = {
        firstName: (j?.firstName ?? profile.firstName) as string,
        lastName: (j?.lastName ?? profile.lastName) as string,
        email: (j?.email ?? profile.email) as string,
        phoneNumber: (j?.phoneNumber ?? profile.phoneNumber) as string,
        profileImageUrl: null,
        avatarColor: (j?.avatarColor ??
          profile.avatarColor ??
          "#00529B") as string,
      };
      setProfile(updated);
      setOriginal(updated);
      setError("Profile saved.");
      setTimeout(() => setError(null), 1800);
      try {
        const payload = {
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          avatarColor: updated.avatarColor,
        };
        localStorage.setItem("rideon-profile", JSON.stringify(payload));
        const initials = getInitials(
          updated.firstName,
          updated.lastName,
          updated.email,
        );
        window.dispatchEvent(
          new CustomEvent("rideon-profile-updated", {
            detail: { initials, avatarColor: updated.avatarColor },
          }),
        );
      } catch {}
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to update profile.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={["mx-auto max-w-3xl px-4 sm:px-6 pb-40", className || ""].join(
        " ",
      )}
      {...rest}
    >
      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}
      {loading ? (
        <>
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-20 w-20 shrink-0 rounded-full bg-slate-200/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60" />
              <div className="flex items-center gap-3">
                <div className="h-4 w-28 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-11 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-11 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="h-4 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-11 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="h-4 w-28 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-11 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </div>
          <div
            className="fixed left-0 right-0 z-40 border-t border-slate-200/70 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl"
            style={{
              bottom:
                "calc(var(--dock-offset, 112px) + env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3">
              <div className="h-11 w-full rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-slate-200/80 dark:border-slate-800/60 text-white text-lg font-semibold"
                style={{ background: profile.avatarColor || "#00529B" }}
                aria-label="User initials"
              >
                {getInitials(
                  profile.firstName,
                  profile.lastName,
                  profile.email,
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-slate-700 dark:text-slate-300 mr-1">
                  Avatar Color
                </label>
                <input
                  type="color"
                  value={profile.avatarColor || "#00529B"}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, avatarColor: e.target.value }))
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-slate-200/80 dark:border-slate-800/60 bg-transparent"
                  aria-label="Pick avatar color"
                />
                <div className="flex items-center gap-1 flex-wrap max-w-full">
                  {[
                    "#00529B",
                    "#0f4c81",
                    "#2563eb",
                    "#16a34a",
                    "#9333ea",
                    "#dc2626",
                    "#025b4c",
                    "#111827",
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="h-6 w-6 rounded-full border border-white/50 shadow ring-1 ring-black/5"
                      style={{ background: c }}
                      aria-label={`Set color ${c}`}
                      onClick={() =>
                        setProfile((p) => ({ ...p, avatarColor: c }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  First Name
                </label>
                <Input
                  value={profile.firstName}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, firstName: e.target.value }))
                  }
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Last Name
                </label>
                <Input
                  value={profile.lastName}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, lastName: e.target.value }))
                  }
                  placeholder="Last Name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="name@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={profile.phoneNumber}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, phoneNumber: e.target.value }))
                  }
                  placeholder="+234 801 234 5678"
                />
              </div>
            </div>
          </div>

          {/* Sticky bottom action */}
          <div
            className="fixed left-0 right-0 z-40 border-t border-slate-200/70 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl"
            style={{
              bottom:
                "calc(var(--dock-offset, 112px) + env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3">
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
