"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { StickyBanner, Checkbox } from "@/components";

type FullTimePreferences = {
  willingToTravel: boolean | null;
  preferredClientType: "personal" | "corporate" | "any" | "";
};

type PublicProfilePayload = {
  professionalSummary: string;
  experienceYears: number;
  languages: string[];
  hobbies: string[];
  vehicleExperience?: { categories: string[]; notes: string };
  familyFitTags?: string[];
  familyFitNotes?: string;
  fullTimePreferences?: {
    willingToTravel: boolean | null;
    preferredClientType: string | null;
  } | null;
  pending?: {
    status: string;
    rejectionReason: string | null;
    submittedAt: string | null;
    professionalSummary: string;
    experienceYears: number;
    languages: string[];
    hobbies: string[];
    vehicleExperience?: { categories: string[]; notes: string };
    familyFitTags?: string[];
    familyFitNotes?: string;
    fullTimePreferences?: {
      willingToTravel: boolean | null;
      preferredClientType: string | null;
    } | null;
  } | null;
};

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

function toggleArrayValue(arr: string[], value: string) {
  const set = new Set(arr);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

const VEHICLE_CATEGORIES = [
  "Sedan",
  "SUV",
  "Van/Minivan",
  "Bus",
  "Pickup/Truck",
  "Luxury",
  "Manual",
  "Automatic",
];

const FAMILY_FIT_TAGS = [
  "Kids/School runs",
  "Elderly care",
  "Special needs experience",
  "Executive/Corporate driving",
  "Night driving",
  "Long-distance/Interstate trips",
];

export default function DriverPlacementProfileEditPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [pendingStatus, setPendingStatus] = React.useState<string | null>(null);
  const [pendingRejectionReason, setPendingRejectionReason] = React.useState<
    string | null
  >(null);

  const [professionalSummary, setProfessionalSummary] =
    React.useState<string>("");
  const [experienceYears, setExperienceYears] = React.useState<string>("");

  const [vehicleExperienceCategories, setVehicleExperienceCategories] =
    React.useState<string[]>([]);
  const [vehicleExperienceNotes, setVehicleExperienceNotes] =
    React.useState<string>("");

  const [familyFitTags, setFamilyFitTags] = React.useState<string[]>([]);
  const [familyFitNotes, setFamilyFitNotes] = React.useState<string>("");

  const [languages, setLanguages] = React.useState<string[]>([]);
  const [hobbies, setHobbies] = React.useState<string[]>([]);
  const [languageInput, setLanguageInput] = React.useState<string>("");
  const [hobbyInput, setHobbyInput] = React.useState<string>("");

  const [fullTimePreferences, setFullTimePreferences] =
    React.useState<FullTimePreferences>({
      willingToTravel: null,
      preferredClientType: "",
    });

  const addTag = (key: "languages" | "hobbies", raw: string) => {
    const v = String(raw || "").trim();
    if (!v) return;
    if (key === "languages") setLanguages((prev) => toggleArrayValue(prev, v));
    if (key === "hobbies") setHobbies((prev) => toggleArrayValue(prev, v));
  };

  const removeTag = (key: "languages" | "hobbies", value: string) => {
    if (key === "languages")
      setLanguages((prev) => prev.filter((x) => x !== value));
    if (key === "hobbies")
      setHobbies((prev) => prev.filter((x) => x !== value));
  };

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const user = await waitForAuthUser();
        const token = await user.getIdToken();

        const res = await fetch("/api/drivers/me/public-profile", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = (await res
          .json()
          .catch(() => ({}))) as Partial<PublicProfilePayload>;
        if (!res.ok) {
          throw new Error((data as any)?.error || "Failed to load profile.");
        }

        const pending =
          data.pending && typeof data.pending === "object"
            ? data.pending
            : null;
        const usePending =
          pending &&
          (pending.status === "pending" || pending.status === "rejected");

        const source = usePending ? pending! : (data as PublicProfilePayload);

        if (!cancelled) {
          setPendingStatus(pending?.status || null);
          setPendingRejectionReason(pending?.rejectionReason || null);

          setProfessionalSummary(source.professionalSummary || "");
          setExperienceYears(
            String(
              Number.isFinite(source.experienceYears)
                ? source.experienceYears
                : 0,
            ),
          );

          setVehicleExperienceCategories(
            Array.isArray(source.vehicleExperience?.categories)
              ? source.vehicleExperience!.categories
              : [],
          );
          setVehicleExperienceNotes(
            typeof source.vehicleExperience?.notes === "string"
              ? source.vehicleExperience!.notes
              : "",
          );

          setFamilyFitTags(
            Array.isArray(source.familyFitTags) ? source.familyFitTags : [],
          );
          setFamilyFitNotes(
            typeof source.familyFitNotes === "string"
              ? source.familyFitNotes
              : "",
          );

          setLanguages(Array.isArray(source.languages) ? source.languages : []);
          setHobbies(Array.isArray(source.hobbies) ? source.hobbies : []);

          const ftp =
            source.fullTimePreferences &&
            typeof source.fullTimePreferences === "object"
              ? source.fullTimePreferences
              : null;
          const preferredClientType =
            ftp?.preferredClientType === "personal" ||
            ftp?.preferredClientType === "corporate" ||
            ftp?.preferredClientType === "any"
              ? ftp.preferredClientType
              : "";
          setFullTimePreferences({
            willingToTravel:
              typeof ftp?.willingToTravel === "boolean"
                ? ftp.willingToTravel
                : null,
            preferredClientType,
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load profile.");
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

      const yearsNum = Number(experienceYears);
      if (!Number.isFinite(yearsNum) || yearsNum < 0 || yearsNum > 80) {
        throw new Error("Experience years must be between 0 and 80.");
      }

      const user = await waitForAuthUser();
      const token = await user.getIdToken();

      const payload: Record<string, any> = {
        professionalSummary,
        experienceYears: yearsNum,
        languages,
        hobbies,
        vehicleExperience: {
          categories: vehicleExperienceCategories,
          notes: vehicleExperienceNotes,
        },
        familyFitTags,
        familyFitNotes,
        fullTimePreferences: {
          ...(typeof fullTimePreferences.willingToTravel === "boolean"
            ? { willingToTravel: fullTimePreferences.willingToTravel }
            : {}),
          ...(fullTimePreferences.preferredClientType === "personal" ||
          fullTimePreferences.preferredClientType === "corporate" ||
          fullTimePreferences.preferredClientType === "any"
            ? { preferredClientType: fullTimePreferences.preferredClientType }
            : {}),
        },
      };

      const res = await fetch("/api/drivers/me/public-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit profile update.");
      }

      setSuccess(
        "Submitted for review. An admin will approve or request changes.",
      );
      setTimeout(() => setSuccess(null), 4000);
      router.push("/driver/placement");
    } catch (e: any) {
      setError(e?.message || "Failed to submit profile update.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-dvh bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
          <div className="h-6 w-56 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="mt-1 h-4 w-80 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          <div className="mt-5 h-96 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 shadow-lg animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Edit Public Profile
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Updates are submitted for admin review before going live.
            </p>
          </div>
          <Link
            href="/driver/placement"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
          >
            Back
          </Link>
        </div>

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

        {pendingStatus && (
          <div className="mt-4 rounded-2xl bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200/70 dark:border-amber-800/40 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
            <div className="font-medium">
              Current review status: {pendingStatus}
            </div>
            {pendingRejectionReason ? (
              <div className="mt-1 text-xs text-red-700 dark:text-red-300">
                Reason: {pendingRejectionReason}
              </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Professional Summary
              </label>
              <textarea
                value={professionalSummary}
                onChange={(e) => setProfessionalSummary(e.target.value)}
                className="w-full min-h-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                placeholder="Write a short summary that clients will see…"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Years of experience
              </label>
              <input
                type="number"
                min={0}
                max={80}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Vehicle experience
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VEHICLE_CATEGORIES.map((cat) => {
                const checked = vehicleExperienceCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setVehicleExperienceCategories((prev) =>
                          toggleArrayValue(prev, cat),
                        )
                      }
                    />
                    <span>{cat}</span>
                  </label>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={vehicleExperienceNotes}
                onChange={(e) => setVehicleExperienceNotes(e.target.value)}
                className="w-full min-h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                placeholder="Any specific vehicle experience you want to highlight…"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Family-fit
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FAMILY_FIT_TAGS.map((tag) => {
                const checked = familyFitTags.includes(tag);
                return (
                  <label
                    key={tag}
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setFamilyFitTags((prev) => toggleArrayValue(prev, tag))
                      }
                    />
                    <span>{tag}</span>
                  </label>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={familyFitNotes}
                onChange={(e) => setFamilyFitNotes(e.target.value)}
                className="w-full min-h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 py-3 text-sm"
                placeholder="Any additional context…"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Languages
            </div>
            <div className="flex gap-2">
              <input
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag("languages", languageInput);
                    setLanguageInput("");
                  }
                }}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 text-sm"
                placeholder="Type a language and press Enter"
              />
              <button
                type="button"
                onClick={() => {
                  addTag("languages", languageInput);
                  setLanguageInput("");
                }}
                className="shrink-0 rounded-xl bg-[#00529B] px-4 py-3 text-sm font-medium text-white"
              >
                Add
              </button>
            </div>
            {languages.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {languages.map((l) => (
                  <span
                    key={l}
                    className="inline-flex items-center gap-2 rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
                  >
                    {l}
                    <button
                      type="button"
                      onClick={() => removeTag("languages", l)}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="pt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Interests (optional)
            </div>
            <div className="flex gap-2">
              <input
                value={hobbyInput}
                onChange={(e) => setHobbyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag("hobbies", hobbyInput);
                    setHobbyInput("");
                  }
                }}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 text-sm"
                placeholder="Type an interest and press Enter"
              />
              <button
                type="button"
                onClick={() => {
                  addTag("hobbies", hobbyInput);
                  setHobbyInput("");
                }}
                className="shrink-0 rounded-xl bg-[#00529B] px-4 py-3 text-sm font-medium text-white"
              >
                Add
              </button>
            </div>
            {hobbies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hobbies.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-2 rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
                  >
                    {h}
                    <button
                      type="button"
                      onClick={() => removeTag("hobbies", h)}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 space-y-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Full-time preferences
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <Checkbox
                checked={fullTimePreferences.willingToTravel === true}
                onCheckedChange={(next) =>
                  setFullTimePreferences((p) => ({
                    ...p,
                    willingToTravel: next,
                  }))
                }
              />
              <span>Willing to travel</span>
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Preferred client type (optional)
              </label>
              <select
                value={fullTimePreferences.preferredClientType}
                onChange={(e) =>
                  setFullTimePreferences((p) => ({
                    ...p,
                    preferredClientType: e.target.value as any,
                  }))
                }
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 px-4 text-sm"
              >
                <option value="">No preference</option>
                <option value="personal">Personal</option>
                <option value="corporate">Corporate</option>
                <option value="any">Any</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-[#00529B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </div>
    </main>
  );
}
