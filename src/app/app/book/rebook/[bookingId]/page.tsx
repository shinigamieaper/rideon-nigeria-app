"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { StickyBanner } from "@/components";

export default function Page() {
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = React.useMemo(
    () => (params?.bookingId ? String(params.bookingId) : ""),
    [params?.bookingId],
  );

  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setBusy(true);
        setError(null);
        if (!bookingId) throw new Error("Missing bookingId");
        // Legacy rebook flow is deprecated. Send users to catalog to pick a vehicle for rentals.
        if (!cancelled)
          router.replace(
            `/app/catalog?rebook=1&prev=${encodeURIComponent(bookingId)}`,
          );
      } catch (e: any) {
        if (!cancelled)
          setError(e?.message || "We couldn't prepare your reservation.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [bookingId, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28">
      {error && (
        <StickyBanner className="z-50 mb-4">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg p-6 text-center">
        <h1 className="text-[20px] font-medium text-slate-900 dark:text-slate-100">
          Preparing your reservation…
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          We’re pre-filling your rental details from your previous reservation.
          You’ll be able to review before confirming.
        </p>
        {busy && (
          <div className="mt-6 mx-auto h-10 w-10 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-transparent animate-spin" />
        )}
        {!busy && error && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.push("/app/reservations")}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 hover:shadow-blue-500/30"
            >
              Back to Reservations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
