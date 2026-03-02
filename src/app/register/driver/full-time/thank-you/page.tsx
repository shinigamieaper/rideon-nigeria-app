"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import BlurText from "../../../../../../components/shared/BlurText";
import RevealOnScroll from "../../../../../../components/shared/RevealOnScroll";
import { auth } from "@/lib/firebase";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

export default function FullTimeThankYouPage() {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [status, setStatus] = React.useState<
    "pending_review" | "approved" | "rejected" | null
  >(null);
  const [referencesSummary, setReferencesSummary] = React.useState<{
    required: number;
    completed: number;
  } | null>(null);
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
          throw new Error("Please sign in to view your application status.");
        }
        const token = await user.getIdToken();
        const res = await fetch("/api/full-time-driver/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to load status");
        }
        const j = await res.json();
        const s = j?.status as typeof status;
        const rs = j?.referencesSummary;
        if (mounted) {
          setStatus(s ?? null);
          setReferencesSummary(
            rs && typeof rs === "object"
              ? {
                  required: Number((rs as any).required) || 0,
                  completed: Number((rs as any).completed) || 0,
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
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          <BlurText
            as="span"
            text="Application Submitted"
            animateBy="words"
            direction="top"
            delay={120}
          />
        </h1>

        <BlurText
          as="p"
          className="mt-3 text-slate-600 dark:text-slate-400"
          text="Thank you for applying to RideOn's full-time driver recruitment program. Your application is under review. We'll notify you once a decision is made."
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
              Approved! Our team will contact you with next steps.
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

          {!loading && !err && referencesSummary ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              References completed: {referencesSummary.completed}/
              {referencesSummary.required}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              const u = auth.currentUser;
              if (!u) return;
              u.getIdToken()
                .then((t) =>
                  fetch("/api/full-time-driver/me", {
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
                  const rs = j?.referencesSummary;
                  setReferencesSummary(
                    rs && typeof rs === "object"
                      ? {
                          required: Number((rs as any).required) || 0,
                          completed: Number((rs as any).completed) || 0,
                        }
                      : null,
                  );
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
