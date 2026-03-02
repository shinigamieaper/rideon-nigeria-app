"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";

export interface Transaction {
  id: string;
  type: "trip" | "other";
  amount: number;
  description: string;
  date: string;
  status?: "completed" | "pending" | "failed";
}

export interface EarningsDashboardClientProps
  extends React.ComponentPropsWithoutRef<"div"> {
  transactions: Transaction[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type TimePeriod = "week" | "month" | "all";
type TransactionTab = "trips" | "other";

const EarningsDashboardClient: React.FC<EarningsDashboardClientProps> = ({
  transactions,
  className,
  ...divProps
}) => {
  const [period, setPeriod] = React.useState<TimePeriod>("month");
  const [activeTab, setActiveTab] = React.useState<TransactionTab>("trips");

  // Filter by time period
  const filteredByTime = React.useMemo(() => {
    if (period === "all") return transactions;

    const now = new Date();
    const cutoff = new Date();

    if (period === "week") {
      cutoff.setDate(now.getDate() - 7);
    } else if (period === "month") {
      cutoff.setMonth(now.getMonth() - 1);
    }

    return transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [transactions, period]);

  // Filter by transaction type
  const filteredByTab = React.useMemo(() => {
    return filteredByTime.filter((t) => {
      if (activeTab === "trips") return t.type === "trip";
      if (activeTab === "other") return t.type === "other";
      return false;
    });
  }, [filteredByTime, activeTab]);

  // Calculate total for the period
  const total = React.useMemo(() => {
    return filteredByTime.reduce((sum, t) => {
      if (t.status !== "failed") return sum + t.amount;
      return sum;
    }, 0);
  }, [filteredByTime]);

  const periodButtons = [
    { value: "week" as const, label: "This Week" },
    { value: "month" as const, label: "This Month" },
    { value: "all" as const, label: "All Time" },
  ];

  const tabs = [
    { value: "trips" as const, label: "Rental History" },
    { value: "other" as const, label: "Other" },
  ];

  return (
    <div {...divProps} className={className}>
      {/* Time Period Selector */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {periodButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setPeriod(btn.value)}
              className={[
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                period === btn.value
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
              ].join(" ")}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Total Earnings for Period */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-5 w-5 text-[#00529B]" />
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Total Earnings
          </h3>
        </div>
        <div className="text-3xl font-bold text-foreground">
          {formatCurrency(total)}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {period === "week" && "Last 7 days"}
          {period === "month" && "Last 30 days"}
          {period === "all" && "All time"}
        </p>
      </div>

      {/* Transaction Tabs */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Transaction History
        </h3>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200/80 dark:border-slate-800/60 mb-4">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={[
                  "px-1 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  activeTab === tab.value
                    ? "text-[#00529B] border-b-2 border-[#00529B]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredByTab.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <p className="text-sm">No transactions found for this period</p>
            </div>
          ) : (
            filteredByTab.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-start justify-between gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatDate(transaction.date)}
                  </p>
                  {transaction.status && transaction.status !== "completed" && (
                    <span
                      className={[
                        "inline-block mt-1 text-xs px-2 py-0.5 rounded-full",
                        transaction.status === "pending"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
                          : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
                      ].join(" ")}
                    >
                      {transaction.status.charAt(0).toUpperCase() +
                        transaction.status.slice(1)}
                    </span>
                  )}
                </div>
                <div
                  className={[
                    "font-semibold text-sm whitespace-nowrap",
                    transaction.status === "failed"
                      ? "text-slate-400 dark:text-slate-500 line-through"
                      : transaction.amount >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                  ].join(" ")}
                >
                  {transaction.amount >= 0 ? "+" : ""}
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EarningsDashboardClient;
