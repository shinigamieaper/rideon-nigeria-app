"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import BlurText from "../../../../../components/shared/BlurText";
import RevealOnScroll from "../../../../../components/shared/RevealOnScroll";
import { auth } from "@/lib/firebase";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

export default function PartnerThankYouPage() {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [status, setStatus] = React.useState<
    "pending_review" | "approved" | "rejected" | null
  >(null);
  const [approvedVehicles, setApprovedVehicles] = React.useState<number | null>(
    null,
  );
  const [live, setLive] = React.useState<boolean | null>(null);
  const [kycSummary, setKycSummary] = React.useState<{
    overallStatus: string;
    cac: string;
    individualId: string;
    director: string;
    lastRunAt: string | null;
  } | null>(null);
  const [kycRunning, setKycRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const user = auth.currentUser;
        if (!user) {
          throw new Error(
            "Please sign in to view your partner application status.",
          );
        }

        const token = await user.getIdToken();
        const res = await fetch("/api/partner/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to load status");
        }

        const j = await res.json();
        const s = j?.status as typeof status;
        const av =
          typeof j?.approvedVehicles === "number" ? j.approvedVehicles : null;
        const isLive = typeof j?.live === "boolean" ? j.live : null;
        const ks = j?.kycSummary;

        if (mounted) {
          setStatus(s ?? null);
          setApprovedVehicles(av);
          setLive(isLive);
          setKycSummary(
            ks && typeof ks === "object"
              ? {
                  overallStatus: String((ks as any).overallStatus || "pending"),
                  cac: String((ks as any).cac || "pending"),
                  individualId: String((ks as any).individualId || "pending"),
                  director: String((ks as any).director || "pending"),
                  lastRunAt: (ks as any).lastRunAt
                    ? String((ks as any).lastRunAt)
                    : null,
                }
              : null,
          );
          setLoading(false);
          if (s === "approved" || s === "rejected") {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        }
      } catch (e: any) {
        if (mounted) {
          setErr(e?.message || "Unable to load status.");
          setLoading(false);
        }
      }
    };

    load();
    timer = setInterval(load, 15000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const shouldCelebrate = status === "approved";

  return (
    <main className="relative flex min-h-[70vh] w-full items-center justify-center p-6">
      {shouldCelebrate && (
        <Confetti
          width={size.width}
          height={size.height}
          numberOfPieces={280}
          recycle={false}
          gravity={0.25}
          colors={["#00529B", "#34A853", "#0ea5e9", "#22c55e"]}
        />
      )}

      <RevealOnScroll
        as="div"
        className="relative w-full max-w-2xl rounded-2xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center"
        style={{
          ["--tw-enter-scale" as any]: 0.98,
          ["--tw-enter-blur" as any]: "12px",
        }}
      >
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
          <CheckCircle2 className="h-8 w-8 text-blue-500" />
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          <BlurText
            as="span"
            text="Partner Application Submitted"
            animateBy="words"
            direction="top"
            delay={120}
          />
        </h1>

        <BlurText
          as="p"
          className="mt-3 text-slate-600 dark:text-slate-400"
          text="Thank you for applying to become a RideOn vehicle partner. Our team is reviewing your business details and verification documents. Once approved, you’ll be able to access the Partner Portal to submit vehicles for review."
          animateBy="words"
          direction="top"
          delay={24}
        />

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Checking your application status…
            </p>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : status === "approved" ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Approved! You can proceed to the Partner Portal to add vehicles.
            </p>
          ) : status === "rejected" ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              We’re sorry—your application was not approved at this time.
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Status: Pending review
            </p>
          )}

          {!loading && !err && kycSummary ? (
            <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-4 text-left">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Verification (Dojah)
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                <p>
                  Overall:{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {kycSummary.overallStatus}
                  </span>
                </p>
                <p>
                  CAC:{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {kycSummary.cac}
                  </span>
                </p>
                <p>
                  Individual ID:{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {kycSummary.individualId}
                  </span>
                </p>
                <p>
                  Director:{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {kycSummary.director}
                  </span>
                </p>
                <p className="sm:col-span-2">
                  Last run:{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {kycSummary.lastRunAt || "—"}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          {!loading && !err && status === "approved" ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Live status requires at least 1 approved vehicle. Approved
              vehicles: {approvedVehicles ?? 0}. Live: {live ? "Yes" : "No"}.
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {status !== "approved" ? (
            <button
              disabled={kycRunning}
              onClick={async () => {
                if (kycRunning) return;
                setKycRunning(true);
                try {
                  const u = auth.currentUser;
                  if (!u)
                    throw new Error("Please sign in to run verification.");
                  let token = await u.getIdToken();

                  const run = async (t: string) =>
                    fetch("/api/partner/kyc/run", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${t}` },
                    });

                  let r = await run(token);
                  if (r.status === 403) {
                    token = await u.getIdToken(true);
                    r = await run(token);
                  }

                  if (!r.ok) {
                    const j = await r.json().catch(() => null);
                    throw new Error(j?.error || "Verification failed.");
                  }

                  // Refresh status after verification
                  const me = await fetch("/api/partner/me", {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const mj = await me.json().catch(() => null);
                  if (me.ok && mj) {
                    setStatus(mj?.status ?? null);
                    setApprovedVehicles(
                      typeof mj?.approvedVehicles === "number"
                        ? mj.approvedVehicles
                        : null,
                    );
                    setLive(typeof mj?.live === "boolean" ? mj.live : null);
                    const ks = mj?.kycSummary;
                    setKycSummary(
                      ks && typeof ks === "object"
                        ? {
                            overallStatus: String(
                              (ks as any).overallStatus || "pending",
                            ),
                            cac: String((ks as any).cac || "pending"),
                            individualId: String(
                              (ks as any).individualId || "pending",
                            ),
                            director: String((ks as any).director || "pending"),
                            lastRunAt: (ks as any).lastRunAt
                              ? String((ks as any).lastRunAt)
                              : null,
                          }
                        : null,
                    );
                  }
                } catch (e: any) {
                  setErr(e?.message || "Failed to run verification.");
                } finally {
                  setKycRunning(false);
                }
              }}
              className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#34A853" }}
            >
              <BlurText
                as="span"
                text={kycRunning ? "Running Verification…" : "Run Verification"}
                animateBy="words"
                direction="top"
                delay={60}
              />
            </button>
          ) : null}
          {status === "approved" ? (
            <Link
              href="/partner"
              className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition hover:opacity-90"
              style={{ backgroundColor: "#00529B" }}
            >
              <BlurText
                as="span"
                text="Go to Partner Portal"
                animateBy="words"
                direction="top"
                delay={60}
              />
            </Link>
          ) : (
            <button
              onClick={() => {
                const u = auth.currentUser;
                if (!u) return;
                u.getIdToken()
                  .then((t) =>
                    fetch("/api/partner/me", {
                      headers: { Authorization: `Bearer ${t}` },
                    }),
                  )
                  .then((r) =>
                    r.ok
                      ? r.json()
                      : Promise.reject(new Error("Failed to refresh")),
                  )
                  .then((j) => {
                    setStatus(j?.status ?? null);
                    setApprovedVehicles(
                      typeof j?.approvedVehicles === "number"
                        ? j.approvedVehicles
                        : null,
                    );
                    setLive(typeof j?.live === "boolean" ? j.live : null);
                  })
                  .catch(() => {});
              }}
              className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white h-10 px-6 transition hover:opacity-90"
              style={{ backgroundColor: "#00529B" }}
            >
              <BlurText
                as="span"
                text="Refresh Status"
                animateBy="words"
                direction="top"
                delay={60}
              />
            </button>
          )}

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-6 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <BlurText
              as="span"
              text="Go to Login"
              animateBy="words"
              direction="top"
              delay={60}
            />
          </Link>
        </div>
      </RevealOnScroll>
    </main>
  );
}
