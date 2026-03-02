"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, LogIn, Users } from "lucide-react";
import { auth } from "@/lib/firebase";

function JoinPartnerTeamPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerId = (searchParams.get("partnerId") || "").trim();
  const inviteId = (searchParams.get("inviteId") || "").trim();

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const accept = async () => {
    setErr(null);
    setSuccess(null);

    if (!partnerId || !inviteId) {
      setErr("Invalid invite link.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace(
        `/login?next=${encodeURIComponent(`/join/partner?partnerId=${partnerId}&inviteId=${inviteId}`)}`,
      );
      return;
    }

    try {
      setLoading(true);
      let token = await user.getIdToken();

      const doPost = async (t: string) =>
        fetch(
          `/api/partner/team/invites/${encodeURIComponent(inviteId)}/accept`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${t}`,
            },
            body: JSON.stringify({ partnerId }),
          },
        );

      let res = await doPost(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doPost(token);
      }

      const j = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(j?.error || "Failed to accept invite.");
      }

      await user.getIdToken(true);
      setSuccess("You’ve joined the partner team. Redirecting…");
      setTimeout(() => router.replace("/partner/team"), 800);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to accept invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Join Partner Team
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Accept the invite to access the partner portal. You must sign in
            with the invited email.
          </p>
        </div>

        {(err || success) && (
          <div
            className={`mb-4 rounded-2xl backdrop-blur-lg border shadow-lg p-4 ${
              success
                ? "bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <p className="text-sm font-semibold">{success || err}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                Invite details
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {partnerId && inviteId
                  ? "Ready to accept."
                  : "Invalid invite link."}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Partner ID
              </p>
              <p className="mt-1 text-sm font-mono text-slate-900 dark:text-slate-100 break-all">
                {partnerId || "—"}
              </p>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Invite ID
              </p>
              <p className="mt-1 text-sm font-mono text-slate-900 dark:text-slate-100 break-all">
                {inviteId || "—"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={accept}
              disabled={loading || !partnerId || !inviteId}
              className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#00529B" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Accept invite
            </button>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-11 px-5 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function JoinPartnerTeamPage() {
  return (
    <React.Suspense
      fallback={
        <main className="relative z-10 flex min-h-[80vh] w-full items-center justify-center p-4 text-foreground">
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">Loading…</p>
            </div>
          </div>
        </main>
      }
    >
      <JoinPartnerTeamPageInner />
    </React.Suspense>
  );
}
