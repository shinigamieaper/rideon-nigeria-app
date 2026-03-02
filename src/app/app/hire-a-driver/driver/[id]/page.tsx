"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Heart,
  MapPin,
  Briefcase,
  Wallet,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { waitForUser } from "@/lib/firebase";
import {
  ActionModal,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StickyBanner,
} from "@/components";

type DriverDetail = {
  id: string;
  firstName: string;
  lastNameInitial: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  preferredCity: string | null;
  servedCities: string[];
  experienceYears: number;
  salaryExpectationNgn: number | null;
  salaryExpectationMinNgn: number | null;
  salaryExpectationMaxNgn: number | null;
  placementStatus: string;
  available: boolean;
  hasAccess: boolean;
  accessExpiresAt: string | null;
  phoneNumber: string | null;
  professionalSummary: string | null;
  languages: string[];
  hobbies: string[];
  vehicleExperience: { categories: string[]; notes: string } | null;
  familyFitTags: string[];
  familyFitNotes: string | null;
  fullTimePreferences: {
    willingToTravel: boolean | null;
    preferredClientType: string | null;
  } | null;
};

type DetailResponse = {
  driver?: DriverDetail;
};

type AccessStatusResponse = {
  savedDriverIds?: string[];
};

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
) {
  const timeoutMs = init?.timeoutMs ?? 9000;
  const { timeoutMs: _timeoutMs, ...rest } = init || {};
  if ((rest as any).signal) return await fetch(input, rest);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export default function Page() {
  const params = useParams();
  const id = typeof (params as any)?.id === "string" ? (params as any).id : "";

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [driver, setDriver] = React.useState<DriverDetail | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);

  const [interviewModalOpen, setInterviewModalOpen] = React.useState(false);
  const [hireModalOpen, setHireModalOpen] = React.useState(false);
  const [interviewNotes, setInterviewNotes] = React.useState("");
  const [hireNotes, setHireNotes] = React.useState("");
  const [interviewType, setInterviewType] = React.useState<
    "google_meet_audio" | "google_meet_video" | "in_person"
  >("google_meet_video");
  const [submittingInterview, setSubmittingInterview] = React.useState(false);
  const [submittingHire, setSubmittingHire] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) throw new Error("Missing driver id");
      const user = await waitForUser();
      const token = await user.getIdToken();

      const [dRes, aRes] = await Promise.all([
        fetchWithTimeout(
          `/api/customer/placement/drivers/${encodeURIComponent(id)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            timeoutMs: 9000,
          },
        ),
        fetchWithTimeout("/api/customer/placement/access-status", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: 9000,
        }),
      ]);

      const dj = (await dRes.json().catch(() => ({}))) as DetailResponse;
      if (!dRes.ok)
        throw new Error((dj as any)?.error || "Failed to load driver.");
      const detail = dj?.driver || null;
      setDriver(detail);

      const aj = (await aRes.json().catch(() => ({}))) as AccessStatusResponse;
      const savedIds = Array.isArray(aj?.savedDriverIds)
        ? aj.savedDriverIds.filter((x) => typeof x === "string")
        : [];
      setSaved(savedIds.includes(id));
    } catch (e: any) {
      setDriver(null);
      setError(e?.message || "We couldn't load this driver right now.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);

  async function toggleShortlist() {
    if (!id) return;
    try {
      setToggling(true);
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch("/api/customer/placement/drivers/shortlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverId: id, action: "toggle" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to update shortlist.");
      setSaved(Boolean(j?.saved));
    } catch (e: any) {
      setError(e?.message || "Failed to update shortlist.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setToggling(false);
    }
  }

  async function submitInterviewRequest() {
    if (!id) return;
    try {
      setSubmittingInterview(true);
      setError(null);
      setSuccess(null);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch("/api/customer/placement/interview-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverId: id,
          interviewType,
          notes: interviewNotes,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to request interview.");

      setInterviewModalOpen(false);
      setInterviewNotes("");
      setSuccess(
        "Interview request submitted. We’ll notify you when the driver responds.",
      );
    } catch (e: any) {
      setError(e?.message || "Failed to request interview.");
      setTimeout(() => setError(null), 3500);
    } finally {
      setSubmittingInterview(false);
    }
  }

  async function submitHireRequest() {
    if (!id) return;
    try {
      setSubmittingHire(true);
      setError(null);
      setSuccess(null);
      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch("/api/customer/placement/hire-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverId: id,
          notes: hireNotes,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j?.error || "Failed to submit hire request.");

      setHireModalOpen(false);
      setHireNotes("");
      setSuccess(
        "Hiring interest sent. We’ll notify you when the driver responds.",
      );
    } catch (e: any) {
      setError(e?.message || "Failed to submit hire request.");
      setTimeout(() => setError(null), 3500);
    } finally {
      setSubmittingHire(false);
    }
  }

  const hasAccess = driver?.hasAccess === true;
  const available = driver?.available === true;
  const displayName = driver
    ? `${driver.firstName}${driver.lastNameInitial ? ` ${driver.lastNameInitial}.` : ""}`
    : "Driver";
  const cityLabel = driver?.preferredCity || null;

  const salaryLabel = React.useMemo(() => {
    const min =
      driver && typeof driver.salaryExpectationMinNgn === "number"
        ? driver.salaryExpectationMinNgn
        : null;
    const max =
      driver && typeof driver.salaryExpectationMaxNgn === "number"
        ? driver.salaryExpectationMaxNgn
        : driver && typeof driver.salaryExpectationNgn === "number"
          ? driver.salaryExpectationNgn
          : null;

    if (typeof min === "number" && typeof max === "number") {
      if (min === max) return `₦${new Intl.NumberFormat("en-NG").format(max)}`;
      return `₦${new Intl.NumberFormat("en-NG").format(min)} – ₦${new Intl.NumberFormat("en-NG").format(max)}`;
    }
    if (typeof max === "number")
      return `₦${new Intl.NumberFormat("en-NG").format(max)}`;
    return null;
  }, [driver]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      <header className="mb-6">
        <h1 className="text-[22px] sm:text-[26px] tracking-tight font-semibold text-slate-900 dark:text-slate-100">
          Driver Profile
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Review details and shortlist drivers.
        </p>
      </header>

      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      {success && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {success}
          </div>
        </StickyBanner>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
          <div className="h-40 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
          <div className="h-40 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
        </div>
      ) : !driver ? (
        <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Driver not found.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link href="/app/hire-a-driver/browse">
              <Button className="h-11">Back to Browse</Button>
            </Link>
            <button
              onClick={load}
              className="text-sm font-medium text-[#00529B] hover:underline"
              type="button"
            >
              Retry
            </button>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {!available && (
            <div className="rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/20 px-4 py-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    This driver is currently unavailable.
                  </p>
                  <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                    You can still shortlist them for later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!hasAccess && (
            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 px-4 py-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Some details are hidden. Get access to view contact details and
                start engagements.
              </p>
              <div className="mt-3">
                <Link href="/app/hire-a-driver/access">
                  <Button className="h-11">Get Access</Button>
                </Link>
              </div>
            </div>
          )}

          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-full bg-white/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 overflow-hidden flex items-center justify-center">
                {driver.profileImageUrl ? (
                  <Image
                    src={driver.profileImageUrl}
                    alt={displayName}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base font-semibold text-slate-700 dark:text-slate-200">
                    {driver.firstName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {displayName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {cityLabel && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {cityLabel}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {driver.experienceYears} yrs
                      </span>
                      {salaryLabel != null && (
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" />
                          {salaryLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={toggling}
                    onClick={toggleShortlist}
                    className={[
                      "h-10 w-10 rounded-xl border flex items-center justify-center transition",
                      saved
                        ? "bg-rose-50/70 dark:bg-rose-900/20 border-rose-200/80 dark:border-rose-800/40 text-rose-600"
                        : "bg-white/40 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60 text-slate-600 dark:text-slate-300",
                      toggling ? "opacity-60" : "hover:shadow",
                    ].join(" ")}
                    aria-label={
                      saved ? "Remove from shortlist" : "Add to shortlist"
                    }
                  >
                    <Heart
                      className={saved ? "h-5 w-5 fill-current" : "h-5 w-5"}
                    />
                  </button>
                </div>

                {driver.lastName && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    Full name: {driver.firstName} {driver.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Phone
                </p>
                {driver.phoneNumber ? (
                  <a
                    href={`tel:${driver.phoneNumber}`}
                    className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-[#00529B] hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {driver.phoneNumber}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    Hidden
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Languages
                </p>
                {driver.languages && driver.languages.length > 0 ? (
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {driver.languages.join(", ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    —
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
            <h2 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              Summary
            </h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {driver.professionalSummary || "No summary provided."}
            </p>

            {driver.vehicleExperience &&
              driver.vehicleExperience.categories.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Vehicle experience
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {driver.vehicleExperience.categories.join(", ")}
                  </p>
                </div>
              )}

            {driver.familyFitTags && driver.familyFitTags.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Family fit
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {driver.familyFitTags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-full text-xs bg-white/50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/60 text-slate-700 dark:text-slate-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 p-5">
            <h2 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              Actions
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                className="h-11"
                disabled={!hasAccess || !available}
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setInterviewModalOpen(true);
                }}
              >
                Request Interview
              </Button>
              <Button
                className="h-11"
                variant="secondary"
                disabled={!hasAccess || !available}
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setHireModalOpen(true);
                }}
              >
                Express Hiring Interest
              </Button>
            </div>
            {!hasAccess && (
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                Activate access to request interviews and hire drivers.
              </p>
            )}
            {hasAccess && !available && (
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                This driver is currently unavailable.
              </p>
            )}
          </section>

          <ActionModal
            isOpen={interviewModalOpen}
            onClose={() => {
              if (submittingInterview) return;
              setInterviewModalOpen(false);
            }}
            title="Request an interview"
            description={
              <div className="space-y-3">
                <p>
                  Choose how you’d like to interview. If accepted, you can
                  coordinate details via chat.
                </p>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Interview type
                  </label>
                  <Select
                    value={interviewType}
                    onValueChange={(v) => setInterviewType(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interview type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_meet_video">
                        Video call
                      </SelectItem>
                      <SelectItem value="google_meet_audio">
                        Phone call
                      </SelectItem>
                      <SelectItem value="in_person">In person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            }
            confirmText="Submit request"
            cancelText="Cancel"
            reasonLabel="Notes (optional)"
            reasonPlaceholder="Anything you want the driver to know? (Schedule, preferred time, etc.)"
            reasonValue={interviewNotes}
            onReasonValueChange={setInterviewNotes}
            loading={submittingInterview}
            confirmDisabled={!hasAccess || !available}
            onConfirm={submitInterviewRequest}
          />

          <ActionModal
            isOpen={hireModalOpen}
            onClose={() => {
              if (submittingHire) return;
              setHireModalOpen(false);
            }}
            title="Express hiring interest"
            description={
              <div className="space-y-2">
                <p>
                  Send a clear signal that you’re ready to proceed. The driver
                  can accept or decline, and an admin may follow up for
                  documentation.
                </p>
              </div>
            }
            confirmText="Send interest"
            cancelText="Cancel"
            confirmVariant="primary"
            reasonLabel="Notes (optional)"
            reasonPlaceholder="Role expectations, start date, schedule, etc."
            reasonValue={hireNotes}
            onReasonValueChange={setHireNotes}
            loading={submittingHire}
            confirmDisabled={!hasAccess || !available}
            onConfirm={submitHireRequest}
          />

          <div className="flex items-center gap-3">
            <Link href="/app/hire-a-driver/browse">
              <Button className="h-11">Back to Browse</Button>
            </Link>
            <Link href="/app/dashboard">
              <Button variant="secondary" className="h-11">
                Home
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
