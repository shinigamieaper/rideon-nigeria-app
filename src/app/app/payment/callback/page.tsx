"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { StickyBanner } from "@/components";

export default function PaystackCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [statusMsg, setStatusMsg] = React.useState<string>(
    "Finalizing your payment…",
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const purpose = (params.get("purpose") || "").trim();

        const cancelledRedirect = (() => {
          if (purpose === "placement_access") {
            return "/app/hire-a-driver/access?placementAccess=cancelled";
          }
          try {
            const lastService =
              typeof window !== "undefined"
                ? window.localStorage.getItem("rideon:lastCheckoutService")
                : null;
            if (lastService === "drive_my_car") {
              return "/app/drive-my-car/review?payment=cancelled";
            }
          } catch {
            // ignore
          }
          return "/app/book/step-4?payment=cancelled";
        })();

        const ref = (
          params.get("reference") ||
          params.get("trxref") ||
          ""
        ).trim();
        if (!ref) {
          // No reference – treat as cancellation and return to checkout
          router.replace(cancelledRedirect);
          return;
        }
        const user = auth.currentUser;
        if (!user) {
          const next = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          router.push(`/login?next=${next}`);
          return;
        }
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/payments/paystack/verify?reference=${encodeURIComponent(ref)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to verify payment.");

        const verifiedPurpose: string | null =
          typeof j?.purpose === "string" ? j.purpose : null;
        const bookingId: string | undefined = j?.bookingId;
        const paymentStatus: string | undefined = j?.paymentStatus;
        const service: string | null = j?.service ?? null;

        if (verifiedPurpose === "placement_access") {
          if (paymentStatus === "succeeded") {
            if (cancelled) return;
            setStatusMsg("Access activated! Redirecting…");
            setTimeout(() => {
              router.replace("/app/hire-a-driver?placementAccess=success");
            }, 800);
            return;
          }

          router.replace("/app/hire-a-driver/access?placementAccess=failed");
          return;
        }

        if (paymentStatus === "succeeded" && bookingId) {
          if (cancelled) return;
          setStatusMsg("Payment confirmed! Redirecting to your reservation…");
          setTimeout(() => {
            router.replace(
              `/app/reservations/${encodeURIComponent(bookingId)}`,
            );
          }, 800);
          return;
        }
        // For failed/abandoned/pending or anything else, send back to checkout with a banner
        if (service === "drive_my_car") {
          router.replace("/app/drive-my-car/review?payment=cancelled");
        } else if (service === "rental") {
          router.replace("/app/book/step-4?payment=cancelled");
        } else if (service === "chauffeur") {
          router.replace("/app/catalog?payment=cancelled");
        } else {
          router.replace(cancelledRedirect);
        }
      } catch (e: any) {
        // On any error verifying, send back to checkout with a banner as a safe default
        try {
          const purpose = (params.get("purpose") || "").trim();
          if (purpose === "placement_access") {
            router.replace("/app/hire-a-driver/access?placementAccess=failed");
            return;
          }
        } catch {}
        try {
          const lastService =
            typeof window !== "undefined"
              ? window.localStorage.getItem("rideon:lastCheckoutService")
              : null;
          if (lastService === "drive_my_car") {
            router.replace("/app/drive-my-car/review?payment=cancelled");
            return;
          }
        } catch {
          // ignore
        }
        router.replace("/app/book/step-4?payment=cancelled");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="min-h-dvh bg-background text-foreground px-4 py-8">
      <div className="mx-auto max-w-lg">
        {errorMsg && (
          <StickyBanner className="z-50 mb-4">
            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
              {errorMsg}
            </div>
          </StickyBanner>
        )}
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg transition-all duration-300 p-6">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Processing Payment
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {statusMsg}
          </p>
          {loading && (
            <div className="mt-6 h-28 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
          )}
          {/* On failure we auto-redirect; buttons are not needed */}
        </div>
      </div>
    </div>
  );
}
