"use client";

import * as React from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Loader2 } from "lucide-react";

export interface FullTimeDriverKycCardProps
  extends React.ComponentPropsWithoutRef<"section"> {
  applicationStatus?:
    | "not_applied"
    | "pending_review"
    | "needs_more_info"
    | "approved"
    | "rejected";
}

type KycSummary = {
  overallStatus: string;
  nin: string;
  bvn: string;
  lastRunAt: string | null;
};

async function waitForUser(timeoutMs = 5000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    let unsub: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      if (unsub) unsub();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);

    unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      window.clearTimeout(timer);
      if (unsub) unsub();
      resolve(u);
    });
  });
}

export default function FullTimeDriverKycCard({
  applicationStatus,
  className,
  ...props
}: FullTimeDriverKycCardProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kycSummary, setKycSummary] = React.useState<KycSummary | null>(null);
  const [running, setRunning] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const user = await waitForUser();
    const token = await user.getIdToken();

    const res = await fetch("/api/full-time-driver/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(j?.error || "Failed to load verification status.");

    const ks = j?.kycSummary;
    setKycSummary(
      ks && typeof ks === "object"
        ? {
            overallStatus: String((ks as any).overallStatus || "pending"),
            nin: String((ks as any).nin || "pending"),
            bvn: String((ks as any).bvn || "pending"),
            lastRunAt:
              typeof (ks as any).lastRunAt === "string"
                ? (ks as any).lastRunAt
                : null,
          }
        : null,
    );
  }, []);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        await refresh();
      } catch (e: any) {
        if (mounted)
          setError(e?.message || "Failed to load verification status.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const runVerification = React.useCallback(async () => {
    if (running) return;

    if (applicationStatus === "not_applied") {
      setError("Please submit your application details first.");
      return;
    }

    try {
      setRunning(true);
      setError(null);

      const user = await waitForUser();
      const token = await user.getIdToken();

      const res = await fetch("/api/full-time-driver/kyc/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to run verification.");

      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to run verification.");
    } finally {
      setRunning(false);
    }
  }, [applicationStatus, refresh, running]);

  return (
    <section
      className={[
        "rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6 sm:p-7",
        className || "",
      ].join(" ")}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Verification (Dojah)
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Verify your NIN (required) and BVN (optional).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading verification status…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-red-200/80 dark:border-red-900/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : kycSummary ? (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Overall:</span>{" "}
            <span className="font-semibold">{kycSummary.overallStatus}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">NIN:</span>{" "}
            <span className="font-semibold">{kycSummary.nin}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">BVN:</span>{" "}
            <span className="font-semibold">{kycSummary.bvn}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">
              Last run:
            </span>{" "}
            <span className="font-semibold">
              {kycSummary.lastRunAt
                ? new Date(kycSummary.lastRunAt).toLocaleString()
                : "—"}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          No verification status yet.
        </div>
      )}

      <button
        type="button"
        onClick={runVerification}
        disabled={loading || running || applicationStatus === "not_applied"}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#00529B] to-[#0077E6] px-4 py-3 text-white font-medium shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-50"
      >
        {running ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running verification…
          </span>
        ) : (
          "Run Verification"
        )}
      </button>
    </section>
  );
}
