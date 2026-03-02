"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepHeader from "@/components/app/booking/StepHeader";
import { waitForUser } from "@/lib/firebase";
import { Button, StickyBanner } from "@/components";

type QuoteResponse = {
  currency?: string;
  service?: string;
  city?: string;
  blockHours?: number;
  totalNgn?: number;
};

type Draft = {
  pickupAddress?: string;
  pickupCoords?: [number, number];
  city?: string;
  blockHours?: number;
  startDate?: string;
  startTime?: string;
  notes?: string;
};

const STORAGE_KEY = "rideon:driveMyCarDraft";

function toLocalDate(yyyy_mm_dd?: string, hh_mm?: string) {
  const [y, m, d] = (yyyy_mm_dd || "1970-01-01")
    .split("-")
    .map((n) => parseInt(n, 10));
  const [hh, mm] = (hh_mm || "00:00").split(":").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const p = params?.get("payment");
    if (p === "cancelled") {
      setErrorMsg("Payment was cancelled. You can try again.");
    }
  }, [params]);

  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setDraft(null);
        return;
      }
      const parsed = JSON.parse(raw) as Draft;
      setDraft(parsed);
    } catch {
      setDraft(null);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function loadQuote() {
      try {
        setQuote(null);
        setErrorMsg(null);
        if (!draft?.city || !draft?.blockHours) return;
        const user = await waitForUser();
        const token = await user.getIdToken();
        setQuoteLoading(true);
        const res = await fetch("/api/drive-my-car/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          body: JSON.stringify({
            city: draft.city,
            blockHours: draft.blockHours,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to fetch quote");
        if (!cancelled) setQuote(j as QuoteResponse);
      } catch (e: any) {
        if (!cancelled) {
          setQuote(null);
          setErrorMsg(e?.message || "Failed to fetch quote.");
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }
    loadQuote();
    return () => {
      cancelled = true;
    };
  }, [draft?.blockHours, draft?.city]);

  const scheduleValid = React.useMemo(() => {
    if (!draft?.startDate || !draft?.startTime) return false;
    const start = toLocalDate(draft.startDate, draft.startTime);
    return start.getTime() >= Date.now();
  }, [draft?.startDate, draft?.startTime]);

  const canSubmit = React.useMemo(() => {
    if (!draft?.pickupAddress?.trim()) return false;
    if (!draft?.city?.trim()) return false;
    if (!draft?.blockHours || !Number.isFinite(draft.blockHours)) return false;
    if (!draft?.startDate || !draft?.startTime) return false;
    if (!scheduleValid) return false;
    if (!quote || typeof quote.totalNgn !== "number") return false;
    return true;
  }, [draft, quote, scheduleValid]);

  async function handleConfirmAndPay() {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      if (!draft) {
        setErrorMsg("Missing request details. Please start again.");
        return;
      }

      if (!scheduleValid) {
        setErrorMsg(
          "Please set a valid schedule: start must be in the future.",
        );
        return;
      }

      const user = await waitForUser();
      const token = await user.getIdToken();

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "rideon:lastCheckoutService",
            "drive_my_car",
          );
        }
      } catch {}

      const resp = await fetch("/api/payments/paystack/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service: "drive_my_car",
          pickupAddress: String(draft.pickupAddress || "").trim(),
          city: String(draft.city || "").trim(),
          blockHours: Number(draft.blockHours),
          startDate: String(draft.startDate || "").trim(),
          startTime: String(draft.startTime || "").trim(),
          notes: String(draft.notes || "").trim() || undefined,
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

      window.location.href = authorization_url;
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to start payment.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalNgn = typeof quote?.totalNgn === "number" ? quote.totalNgn : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <section className="mt-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg transition-all duration-300 overflow-hidden">
        <div className="px-4 sm:px-6 mt-4 flex items-center justify-between">
          <StepHeader step={2} total={2} title="Review" />
        </div>

        <div className="px-4 sm:px-6 mt-4 space-y-5 pb-6">
          {errorMsg && (
            <StickyBanner className="z-50">
              <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/60 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-100 shadow">
                {errorMsg}
              </div>
            </StickyBanner>
          )}

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4">
            <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              How driver assignment works
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              After you pay, your reservation will be confirmed. Our team will
              then assign a professional driver. Once assigned, you'll see the
              driver details in Reservations.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  router.push("/app/reservations?service=drive_my_car")
                }
                className="text-sm font-medium text-[#00529B] hover:underline"
              >
                Track in Reservations
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4">
            <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              Request summary
            </h3>
            {!draft ? (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Missing request details. Please go back and try again.
              </p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <span className="text-slate-600 dark:text-slate-400">
                    Pickup:
                  </span>{" "}
                  {draft.pickupAddress || ""}
                </p>
                <p>
                  <span className="text-slate-600 dark:text-slate-400">
                    City:
                  </span>{" "}
                  {draft.city || ""}
                </p>
                <p>
                  <span className="text-slate-600 dark:text-slate-400">
                    Duration:
                  </span>{" "}
                  {draft.blockHours || ""} hours
                </p>
                <p>
                  <span className="text-slate-600 dark:text-slate-400">
                    Start:
                  </span>{" "}
                  {draft.startDate || ""} {draft.startTime || ""}
                </p>
                {draft.notes ? (
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">
                      Notes:
                    </span>{" "}
                    {draft.notes}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4">
            <h3 className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
              Price
            </h3>
            {quoteLoading ? (
              <div className="mt-3 h-10 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 animate-pulse" />
            ) : totalNgn != null ? (
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                ₦{new Intl.NumberFormat("en-NG").format(totalNgn)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Could not load pricing.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="secondary"
              type="button"
              onClick={() => router.push("/app/drive-my-car/request")}
              className="h-11 w-1/3"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAndPay}
              disabled={submitting || !canSubmit}
              className="h-11 flex-1"
            >
              {submitting
                ? "Processing…"
                : totalNgn != null
                  ? `Proceed to Pay • ₦${new Intl.NumberFormat("en-NG").format(totalNgn)}`
                  : "Proceed to Pay"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
