"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  LogOut,
  Save,
  XCircle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  ActionModal,
  BankAccountForm,
  PartnerNotificationPermissionCard,
  PartnerNotificationToggles,
  type BankAccountData,
} from "@/components";
import { usePartnerTeam } from "@/hooks";

interface KycSummary {
  overallStatus: string;
  cac: string;
  individualId: string;
  director: string;
  lastRunAt: string | null;
}

interface PartnerPayout {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

interface PartnerProfile {
  status: string;
  partnerType: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  businessName: string;
  live: boolean;
  approvedVehicles: number;
  kycSummary: KycSummary;
  createdAt: string | null;
  updatedAt: string | null;
}

function KycStatusBadge({ status }: { status: string }) {
  if (status === "verified" || status === "passed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
        <CheckCircle2 className="h-3 w-3" /> Verified
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

export default function PartnerSettingsPage() {
  const router = useRouter();
  const { loading: teamLoading, isTeamMember } = usePartnerTeam();
  const isReadOnlyTeam = isTeamMember;
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sendingReset, setSendingReset] = React.useState(false);
  const [revokingSessions, setRevokingSessions] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<PartnerProfile | null>(null);

  const [payoutLoading, setPayoutLoading] = React.useState(true);
  const [payoutErr, setPayoutErr] = React.useState<string | null>(null);
  const [payout, setPayout] = React.useState<PartnerPayout | null>(null);
  const [showPayoutForm, setShowPayoutForm] = React.useState(false);

  const [confirmModal, setConfirmModal] = React.useState<
    | { kind: "password_reset"; email: string }
    | { kind: "revoke_sessions" }
    | null
  >(null);

  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      setPayoutLoading(true);
      setPayoutErr(null);

      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }

      let token = await user.getIdToken();
      const fetchMe = async (t: string) =>
        fetch("/api/partner/me", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });
      const fetchPayout = async (t: string) =>
        fetch("/api/partner/payout-settings", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });

      let res = await fetchMe(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await fetchMe(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to load profile.");
      }

      const j = (await res.json()) as PartnerProfile;
      setProfile(j);
      setPhoneNumber(j.phoneNumber || "");
      setBusinessName(j.businessName || "");

      if (isTeamMember) {
        setPayoutErr(null);
        setPayout(null);
        return;
      }

      let payoutRes = await fetchPayout(token);
      if (payoutRes.status === 403) {
        token = await user.getIdToken(true);
        payoutRes = await fetchPayout(token);
      }

      if (!payoutRes.ok) {
        const pj = await payoutRes.json().catch(() => null);
        setPayoutErr(pj?.error || "Failed to load payout settings.");
        setPayout(null);
      } else {
        const pj = (await payoutRes.json().catch(() => null)) as {
          payout?: PartnerPayout;
        } | null;
        const p = pj?.payout;
        if (p && typeof p === "object") {
          setPayout({
            bankName: typeof p.bankName === "string" ? p.bankName : "",
            bankCode: typeof p.bankCode === "string" ? p.bankCode : "",
            accountNumber:
              typeof p.accountNumber === "string" ? p.accountNumber : "",
            accountName: typeof p.accountName === "string" ? p.accountName : "",
          });
        } else {
          setPayout(null);
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Something went wrong.");
    } finally {
      setLoading(false);
      setPayoutLoading(false);
    }
  }, [isTeamMember, router]);

  React.useEffect(() => {
    if (teamLoading) return;
    load();
  }, [load, teamLoading]);

  const onSave = async () => {
    if (isReadOnlyTeam) return;
    if (saving) return;
    setSaving(true);
    setErr(null);
    setSuccessMsg(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }

      let token = await user.getIdToken();
      const doPatch = async (t: string) =>
        fetch("/api/partner/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({ phoneNumber, businessName }),
        });

      let res = await doPatch(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doPatch(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to save changes.");
      }

      setSuccessMsg("Changes saved successfully.");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const onSavePayout = async (data: BankAccountData) => {
    if (isTeamMember) return;
    setPayoutErr(null);
    setSuccessMsg(null);

    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return;
    }

    let token = await user.getIdToken();
    const doPost = async (t: string) =>
      fetch("/api/partner/payout-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(data),
      });

    let res = await doPost(token);
    if (res.status === 403) {
      token = await user.getIdToken(true);
      res = await doPost(token);
    }

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || "Failed to update payout settings.");
    }

    setSuccessMsg("Payout settings saved successfully.");
    setShowPayoutForm(false);
    await load();
  };

  const onSendPasswordReset = async () => {
    if (sendingReset) return;
    setErr(null);
    setSuccessMsg(null);
    try {
      const user = auth.currentUser;
      const email = user?.email || "";
      if (!email) {
        throw new Error("No email found for this account.");
      }
      setSendingReset(true);
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password/reset`,
        handleCodeInApp: true,
      } as const;
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSuccessMsg("Password reset email sent. Check your inbox.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to send password reset email.");
    } finally {
      setSendingReset(false);
    }
  };

  const onRevokeSessions = async () => {
    if (revokingSessions) return;
    setErr(null);
    setSuccessMsg(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }

      setRevokingSessions(true);

      let token = await user.getIdToken();
      const doPost = async (t: string) =>
        fetch("/api/partner/me/revoke-sessions", {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        });

      let res = await doPost(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doPost(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to revoke sessions.");
      }

      try {
        await auth.signOut();
      } catch {
        // ignore
      }
      router.replace("/login");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to sign out of all devices.");
    } finally {
      setRevokingSessions(false);
    }
  };

  const hasChanges =
    phoneNumber !== (profile?.phoneNumber || "") ||
    businessName !== (profile?.businessName || "");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/partner"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage your partner profile.
            </p>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-red-200/80 dark:border-red-800/40 shadow-lg p-6">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Error</p>
              <p className="text-sm">{err}</p>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-green-200/80 dark:border-green-800/40 shadow-lg p-6">
          <div className="flex items-start gap-3 text-green-600">
            <CheckCircle2 className="h-5 w-5 mt-0.5" />
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Loading profile…</p>
          </div>
        </div>
      ) : profile ? (
        <>
          {/* Profile Info */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  First name
                </label>
                <input
                  value={profile.firstName}
                  disabled
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-100/70 dark:bg-slate-950/40 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Contact support to change.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Last name
                </label>
                <input
                  value={profile.lastName}
                  disabled
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-100/70 dark:bg-slate-950/40 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Contact support to change.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  value={profile.email}
                  disabled
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-100/70 dark:bg-slate-950/40 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Contact support to change.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone number
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isReadOnlyTeam}
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                  placeholder="+234..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Business name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isReadOnlyTeam}
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                  placeholder="Your company or trading name"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled={!hasChanges || saving || isReadOnlyTeam}
                onClick={onSave}
                className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#00529B" }}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save changes
              </button>
            </div>
          </div>

          {/* Account Status */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Account Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Partner type
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {profile.partnerType}
                </p>
              </div>
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Application status
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {profile.status.replace("_", " ")}
                </p>
              </div>
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Live in catalog
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {profile.live ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          {isTeamMember ? null : (
            <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Payout &amp; Banking
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Where we send your earnings and settlement payouts.
                  </p>
                </div>
                {showPayoutForm ? null : (
                  <button
                    type="button"
                    onClick={() => setShowPayoutForm(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80"
                  >
                    Change
                  </button>
                )}
              </div>

              {payoutLoading ? (
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Loading payout settings…</p>
                </div>
              ) : payoutErr ? (
                <div className="flex items-start gap-3 text-red-600">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">
                      Couldn’t load payout settings
                    </p>
                    <p className="text-sm">{payoutErr}</p>
                  </div>
                </div>
              ) : showPayoutForm ? (
                <div className="max-w-xl">
                  <BankAccountForm
                    onSubmit={onSavePayout}
                    initialData={
                      payout
                        ? {
                            accountNumber: payout.accountNumber,
                            bankCode: payout.bankCode,
                            bankName: payout.bankName,
                          }
                        : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPayoutForm(false)}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80"
                  >
                    Cancel
                  </button>
                </div>
              ) : payout && (payout.bankName || payout.accountNumber) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Bank
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {payout.bankName || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Account
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {payout.accountNumber
                        ? `•••• ${payout.accountNumber.slice(-4)}`
                        : "—"}
                    </p>
                    {payout.accountName ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {payout.accountName}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No payout account set yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPayoutForm(true)}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90"
                    style={{ backgroundColor: "#00529B" }}
                  >
                    Add bank account
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Choose how you want to receive important updates about your fleet,
              payouts, and platform changes.
            </p>
            <div className="mt-4">
              <PartnerNotificationPermissionCard compact />
              <PartnerNotificationToggles readOnly={isReadOnlyTeam} />
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Security
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage password and active sessions.
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Reset password
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Send a password reset link to your email.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const email =
                      profile?.email || auth.currentUser?.email || "";
                    if (!email) {
                      setErr("No email found for this account.");
                      return;
                    }
                    setConfirmModal({ kind: "password_reset", email });
                  }}
                  disabled={sendingReset}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80 disabled:opacity-60"
                >
                  {sendingReset ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Send reset email
                </button>
              </div>

              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Sign out of all devices
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Revokes your sessions across all devices.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmModal({ kind: "revoke_sessions" })}
                  disabled={revokingSessions || isTeamMember}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#00529B" }}
                >
                  {revokingSessions ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Sign out everywhere
                </button>
              </div>
            </div>
          </div>

          {/* KYC Status */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Verification (KYC)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Overall
                </p>
                <KycStatusBadge status={profile.kycSummary.overallStatus} />
              </div>
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  CAC (Business)
                </p>
                <KycStatusBadge status={profile.kycSummary.cac} />
              </div>
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Individual ID
                </p>
                <KycStatusBadge status={profile.kycSummary.individualId} />
              </div>
              <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Director
                </p>
                <KycStatusBadge status={profile.kycSummary.director} />
              </div>
            </div>
            {profile.kycSummary.lastRunAt && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Last verified:{" "}
                {new Date(profile.kycSummary.lastRunAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Account Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Created
                </p>
                <p className="mt-1 text-slate-900 dark:text-white">
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Last updated
                </p>
                <p className="mt-1 text-slate-900 dark:text-white">
                  {profile.updatedAt
                    ? new Date(profile.updatedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <ActionModal
        isOpen={Boolean(confirmModal)}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.kind === "password_reset"
            ? "Reset password"
            : "Sign out everywhere"
        }
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {confirmModal?.kind === "password_reset"
              ? `Send a password reset link to ${confirmModal.email}?`
              : "Sign out of all devices? You will be signed out on this device too."}
          </div>
        }
        confirmText={
          confirmModal?.kind === "password_reset" ? "Send link" : "Sign out"
        }
        confirmVariant={
          confirmModal?.kind === "password_reset" ? "primary" : "destructive"
        }
        loading={Boolean(
          (confirmModal?.kind === "password_reset" && sendingReset) ||
            (confirmModal?.kind === "revoke_sessions" && revokingSessions),
        )}
        onConfirm={async () => {
          if (!confirmModal) return;
          if (confirmModal.kind === "password_reset") {
            await onSendPasswordReset();
            setConfirmModal(null);
            return;
          }
          await onRevokeSessions();
          setConfirmModal(null);
        }}
      />
    </div>
  );
}
