"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  FileDown,
  Loader2,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/firebase";

type PartnerPayout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  reference: string | null;
};

type PartnerInvoice = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  downloadUrl: string | null;
};

type BillingResponse = {
  payouts: PartnerPayout[];
  invoices: PartnerInvoice[];
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${currency || "NGN"} ${amount || 0}`;
  }
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  try {
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    if (s && e) return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
    if (s) return s.toLocaleDateString();
    if (e) return e.toLocaleDateString();
    return "—";
  } catch {
    return "—";
  }
}

export default function PartnerBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<BillingResponse | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const user = auth.currentUser;
        if (!user) {
          router.replace("/login");
          return;
        }

        let token = await user.getIdToken();
        const fetchBilling = async (t: string) =>
          fetch("/api/partner/billing", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
          });

        let res = await fetchBilling(token);
        if (res.status === 403) {
          token = await user.getIdToken(true);
          res = await fetchBilling(token);
        }

        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to load billing data.");
        }

        const j = (await res.json()) as BillingResponse;
        if (!mounted) return;
        setData({
          payouts: Array.isArray(j?.payouts) ? j.payouts : [],
          invoices: Array.isArray(j?.invoices) ? j.invoices : [],
        });
      } catch (e: unknown) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : null;
        setErr(message || "Something went wrong.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

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
              Billing
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Invoices, statements, and payout history.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Loading billing…</p>
          </div>
        </div>
      ) : err ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-red-200/80 dark:border-red-800/40 shadow-lg p-6">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Couldn’t load billing</p>
              <p className="text-sm">{err}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Invoices
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Download invoices for completed billing periods.
                </p>
              </div>
            </div>

            {data?.invoices?.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">Period</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Issued</th>
                      <th className="py-2">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {data.invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {formatPeriod(inv.periodStart, inv.periodEnd)}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap font-semibold">
                          {formatMoney(inv.amount, inv.currency)}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {inv.status}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {inv.createdAt
                            ? new Date(inv.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {inv.downloadUrl ? (
                            <a
                              href={inv.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl text-sm font-semibold h-9 px-3 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80"
                            >
                              <FileDown className="h-4 w-4" />
                              PDF
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Not available
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No invoices yet.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Payouts
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    History of settlement payouts to your bank.
                  </p>
                </div>
              </div>
            </div>

            {data?.payouts?.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Period</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {data.payouts.map((p) => (
                      <tr
                        key={p.id}
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {formatPeriod(p.periodStart, p.periodEnd)}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap font-semibold">
                          {formatMoney(p.amount, p.currency)}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {p.status}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {p.reference ? (
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                              {p.reference}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No payouts yet.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
