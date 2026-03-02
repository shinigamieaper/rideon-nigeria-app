"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepHeader from "@/components/app/booking/StepHeader";
import { useRental } from "@/components/app/RentalProvider";
import RentalSummary from "@/components/app/RentalSummary";
import ChangeVehiclePicker from "@/components/app/ChangeVehiclePicker";
import { auth } from "@/lib/firebase";
import { StickyBanner } from "@/components";

export default function Page() {
  const router = useRouter();
  const { state: rental, setListing, setRentalUnit, setCity } = useRental();
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loadingUI, setLoadingUI] = React.useState(true);
  const [quoteTotal, setQuoteTotal] = React.useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [changeVehicleOpen, setChangeVehicleOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const scheduleValid = React.useMemo(() => {
    if (!rental?.startDate || !rental?.startTime) return false;
    const start = toLocalDate(rental.startDate, rental.startTime);
    if (start.getTime() < Date.now()) return false;
    if (rental.endDate) {
      const end = toLocalDate(
        rental.endDate,
        rental.endTime || rental.startTime,
      );
      if (end.getTime() < start.getTime()) return false;
    }
    return true;
  }, [rental?.startDate, rental?.startTime, rental?.endDate, rental?.endTime]);
  const rentalMode = React.useMemo(
    () => Boolean(rental?.listingId && rental?.rentalUnit),
    [rental?.listingId, rental?.rentalUnit],
  );
  const blocks = React.useMemo(
    () =>
      rental?.rentalUnit === "4h"
        ? Math.max(1, Math.min(2, Math.floor(Number(rental?.blocks || 1))))
        : undefined,
    [rental?.rentalUnit, rental?.blocks],
  );
  const canSubmit = Boolean(
    rentalMode &&
      scheduleValid &&
      rental.listingId &&
      rental.rentalUnit &&
      rental.pickupAddress &&
      rental.pickupAddress.trim(),
  );
  React.useEffect(() => {
    const t = setTimeout(() => setLoadingUI(false), 250);
    return () => clearTimeout(t);
  }, []);

  // Surface cancellation info when returning from payment callback
  React.useEffect(() => {
    const p = searchParams?.get("payment");
    if (p === "cancelled") {
      setErrorMsg("Payment was cancelled. You can try again.");
    }
  }, [searchParams]);

  // Fetch rental quote when in rental mode and schedule changes
  React.useEffect(() => {
    let cancelled = false;
    async function fetchQuote() {
      if (!rentalMode) {
        setQuoteTotal(null);
        return;
      }
      if (
        !rental?.listingId ||
        !rental?.rentalUnit ||
        !rental?.startDate ||
        !rental?.startTime
      ) {
        setQuoteTotal(null);
        return;
      }
      try {
        setQuoteLoading(true);
        const res = await fetch("/api/rentals/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            listingId: rental.listingId,
            rentalUnit: rental.rentalUnit,
            city: rental.city,
            startDate: rental.startDate,
            endDate: rental.endDate,
            startTime: rental.startTime,
            endTime: rental.endTime,
            blocks,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && typeof j?.totalNgn === "number") {
          setQuoteTotal(j.totalNgn);
        } else if (!cancelled) {
          setQuoteTotal(null);
        }
      } catch {
        if (!cancelled) setQuoteTotal(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }
    fetchQuote();
    return () => {
      cancelled = true;
    };
  }, [
    rentalMode,
    rental?.listingId,
    rental?.rentalUnit,
    rental?.city,
    rental?.startDate,
    rental?.endDate,
    rental?.startTime,
    rental?.endTime,
    blocks,
  ]);

  async function handleConfirm() {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      if (!scheduleValid) {
        setErrorMsg(
          "Please set a valid schedule: start must be in the future and end cannot be before start.",
        );
        return;
      }
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      const token = await user.getIdToken();

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("rideon:lastCheckoutService", "rental");
        }
      } catch {}

      // Rental availability check before starting payment
      const availRes = await fetch("/api/rentals/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          listingId: rental.listingId,
          rentalUnit: rental.rentalUnit,
          startDate: rental.startDate,
          endDate: rental.endDate,
          startTime: rental.startTime,
          endTime: rental.endTime,
        }),
      });
      const availJson = await availRes.json().catch(() => ({}));
      if (!availRes.ok) {
        throw new Error(availJson?.error || "Failed to check availability.");
      }
      if (!availJson?.available) {
        setErrorMsg(
          "Selected vehicle is not available for the chosen schedule. Please adjust and try again.",
        );
        return;
      }

      // Persist current draft explicitly before leaving the app domain
      try {
        if (typeof window !== "undefined") {
          const draft = {
            listingId: rental.listingId,
            rentalUnit: rental.rentalUnit,
            city: rental.city,
            pickupAddress: rental.pickupAddress,
            returnAddress: rental.returnAddress,
            startDate: rental.startDate,
            endDate: rental.endDate,
            startTime: rental.startTime,
            endTime: rental.endTime,
            passengers: rental.passengers,
            notes: rental.notes,
            quoteTotalNgn: quoteTotal,
            blocks,
          };
          localStorage.setItem("rideon:rentalDraft", JSON.stringify(draft));
        }
      } catch {}

      const resp = await fetch("/api/payments/paystack/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: rental.listingId,
          rentalUnit: rental.rentalUnit,
          city: rental.city,
          pickupAddress: rental.pickupAddress,
          returnAddress: rental.returnAddress,
          passengers: rental.passengers ?? 1,
          startDate: rental.startDate,
          endDate: rental.endDate,
          startTime: rental.startTime,
          endTime: rental.endTime,
          blocks,
          notes: rental.notes,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to initialize payment.");
      }

      const authorization_url: string | undefined = data?.authorization_url;
      if (!authorization_url) {
        throw new Error(
          "Payment initialization did not return a redirect URL.",
        );
      }

      // Redirect to Paystack checkout
      window.location.href = authorization_url;
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to start payment.");
    } finally {
      setSubmitting(false);
    }
  }

  function toLocalDate(yyyy_mm_dd?: string, hh_mm?: string) {
    const [y, m, d] = (yyyy_mm_dd || "1970-01-01")
      .split("-")
      .map((n) => parseInt(n, 10));
    const [hh, mm] = (hh_mm || "00:00").split(":").map((n) => parseInt(n, 10));
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="mt-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg transition-all duration-300 overflow-hidden">
        {/* Inline step header */}
        <div className="px-4 sm:px-6 mt-4 flex items-center justify-between">
          <StepHeader step={4} total={4} title="Review" />
          {rentalMode && (
            <button
              type="button"
              onClick={() => setChangeVehicleOpen(true)}
              className="ml-3 inline-flex h-9 items-center justify-center rounded-md border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/90"
            >
              Change vehicle
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 mt-4 space-y-5 pb-6">
          {errorMsg && (
            <StickyBanner className="z-50">
              <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
                {errorMsg}
              </div>
            </StickyBanner>
          )}
          {loadingUI ? (
            <div className="space-y-4">
              <div className="h-36 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
              <div className="h-28 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
            </div>
          ) : (
            <RentalSummary
              quoteTotalNgn={typeof quoteTotal === "number" ? quoteTotal : null}
            />
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push("/app/book/step-3")}
              className="inline-flex h-11 w-1/3 items-center justify-center rounded-md border border-white/10 bg-white/60 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !canSubmit}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-[#00529B] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:opacity-90 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Processing…"
                : typeof quoteTotal === "number"
                  ? `Proceed to Pay • ₦${new Intl.NumberFormat("en-NG").format(quoteTotal)}`
                  : "Proceed to Pay"}
            </button>
          </div>
        </div>
      </section>
      <ChangeVehiclePicker
        open={changeVehicleOpen}
        onClose={() => setChangeVehicleOpen(false)}
        onSelect={({ listingId, rentalUnit, city }) => {
          setListing(listingId);
          setRentalUnit(rentalUnit as any);
          setCity(city);
          setChangeVehicleOpen(false);
        }}
      />
    </div>
  );
}
