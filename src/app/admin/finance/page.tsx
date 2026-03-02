"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  Download,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  CheckCircle,
  Clock,
  History,
  Users,
  Banknote,
  X,
  AlertCircle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

interface FinanceStats {
  gmv: { value: string; rawValue: number; change: string; positive: boolean };
  netRevenue: {
    value: string;
    rawValue: number;
    change: string;
    positive: boolean;
  };
  pendingPayouts: { value: string; rawValue: number; count: number };
  refunds: { value: string; rawValue: number; count: number };
}

interface Transaction {
  id: string;
  type: "booking" | "refund" | "payout";
  bookingId: string;
  customerName: string;
  driverName: string | null;
  amount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
}

interface DriverPayout {
  driverId: string;
  driverName: string;
  driverEmail: string;
  totalEarnings: number;
  paidAmount: number;
  pendingAmount: number;
  completedTrips: number;
  bookingIds: string[];
  lastTripDate: string | null;
}

interface PayoutHistory {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  bookingCount: number;
  method: string;
  paidByEmail: string;
  paidAt: string | null;
  notes: string;
}

type TabType = "overview" | "payouts" | "history";

export default function FinancePage() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Payout states
  const [payouts, setPayouts] = useState<DriverPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutTotals, setPayoutTotals] = useState({
    totalPending: 0,
    totalPaid: 0,
    driversWithPending: 0,
  });
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  // History states
  const [history, setHistory] = useState<PayoutHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    driverId: string;
    driverName: string;
    amount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/finance/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch finance stats");
        return;
      }

      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const fetchTransactions = useCallback(async () => {
    try {
      setTxLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/finance/transactions?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch transactions");
        return;
      }

      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const fetchPayouts = useCallback(async () => {
    try {
      setPayoutsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/finance/payouts?status=pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch payouts");
        return;
      }

      const data = await res.json();
      setPayouts(data.payouts || []);
      setPayoutTotals(
        data.totals || { totalPending: 0, totalPaid: 0, driversWithPending: 0 },
      );
    } catch (err) {
      console.error(err);
    } finally {
      setPayoutsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/finance/payout-history?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch payout history");
        return;
      }

      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleMarkAsPaid = async (driverId: string) => {
    try {
      setProcessingPayout(driverId);
      setError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/finance/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverId, markAll: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process payout");
      }

      // Refresh data
      fetchPayouts();
      fetchStats();
      setConfirmModal(null);
    } catch (err: any) {
      setError(err.message || "Failed to process payout");
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/finance/payouts/export", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to export");
      }

      // Download the CSV
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `driver-payouts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setError("Failed to export CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchStats();
        fetchTransactions();
      }
    });
    return () => unsubscribe();
  }, [fetchStats, fetchTransactions]);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === "payouts") {
      fetchPayouts();
    } else if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchPayouts, fetchHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      case "in_progress":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      default:
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div
          data-tour="admin-finance-header"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Finance & Payouts
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Revenue analytics and driver payouts
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {activeTab === "overview" && (
              <div className="w-full sm:w-[170px]">
                <Select
                  value={period}
                  onValueChange={(v) =>
                    setPeriod(v as "day" | "week" | "month")
                  }
                >
                  <SelectTrigger className="h-11 px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-blue-500/50 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeTab === "payouts" && (
              <button
                onClick={handleExportCsv}
                disabled={exportingCsv || payouts.length === 0}
                className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {exportingCsv ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export CSV
              </button>
            )}
            <button
              onClick={() => {
                if (activeTab === "overview") {
                  fetchStats();
                  fetchTransactions();
                } else if (activeTab === "payouts") {
                  fetchPayouts();
                } else {
                  fetchHistory();
                }
              }}
              disabled={loading || payoutsLoading || historyLoading}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading || payoutsLoading || historyLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          data-tour="admin-finance-tabs"
          className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-700 pb-3"
        >
          {[
            { key: "overview" as TabType, label: "Overview", icon: TrendingUp },
            {
              key: "payouts" as TabType,
              label: "Driver Payouts",
              icon: Banknote,
            },
            {
              key: "history" as TabType,
              label: "Payout History",
              icon: History,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <>
            {/* Revenue Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {loading ? (
                <div className="col-span-4 flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Gross Revenue (GMV)
                      </p>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats?.gmv.value || "₦0"}
                    </p>
                    <p
                      className={`text-xs mt-1 ${stats?.gmv.positive ? "text-green-600" : "text-red-600"}`}
                    >
                      {stats?.gmv.positive ? "+" : ""}
                      {stats?.gmv.change || "0"}% vs last period
                    </p>
                  </div>

                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Net Company Revenue
                      </p>
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats?.netRevenue.value || "₦0"}
                    </p>
                    <p
                      className={`text-xs mt-1 ${stats?.netRevenue.positive ? "text-green-600" : "text-red-600"}`}
                    >
                      {stats?.netRevenue.positive ? "+" : ""}
                      {stats?.netRevenue.change || "0"}% vs last period
                    </p>
                  </div>

                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Pending Payouts
                      </p>
                      <Wallet className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats?.pendingPayouts.value || "₦0"}
                    </p>
                    <p className="text-xs mt-1 text-slate-500">
                      {stats?.pendingPayouts.count || 0} driver
                      {(stats?.pendingPayouts.count || 0) === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Refunds
                      </p>
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats?.refunds.value || "₦0"}
                    </p>
                    <p className="text-xs mt-1 text-slate-500">
                      {stats?.refunds.count || 0} refund
                      {(stats?.refunds.count || 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Transactions table */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 mt-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Recent Transactions
              </h2>

              {txLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No transactions found for this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Date
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Customer
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Driver
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Amount
                        </th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-400">
                            {new Date(tx.createdAt).toLocaleDateString(
                              "en-NG",
                              {
                                day: "numeric",
                                month: "short",
                              },
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm font-medium text-slate-900 dark:text-white">
                            {tx.customerName}
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-400">
                            {tx.driverName || "—"}
                          </td>
                          <td className="py-3 px-2 text-sm font-medium text-slate-900 dark:text-white">
                            {formatNaira(tx.amount)}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}
                            >
                              {formatStatus(tx.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Payouts Tab */}
        {activeTab === "payouts" && (
          <>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {/* Payout Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Pending Total</span>
                </div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatNaira(payoutTotals.totalPending)}
                </p>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Drivers Awaiting</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {payoutTotals.driversWithPending}
                </p>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Total Paid (All Time)</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatNaira(payoutTotals.totalPaid)}
                </p>
              </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden">
              {payoutsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <CheckCircle className="h-12 w-12 mb-3 text-green-500" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No pending payouts at this time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Driver
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Trips
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Total Earned
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Already Paid
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Pending
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Last Trip
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                      {payouts.map((payout) => (
                        <tr
                          key={payout.driverId}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                {payout.driverName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {payout.driverEmail}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                            {payout.completedTrips}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-slate-900 dark:text-white">
                            {formatNaira(payout.totalEarnings)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-green-600 dark:text-green-400">
                            {formatNaira(payout.paidAmount)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                              {formatNaira(payout.pendingAmount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {payout.lastTripDate
                              ? new Date(
                                  payout.lastTripDate,
                                ).toLocaleDateString("en-NG", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  driverId: payout.driverId,
                                  driverName: payout.driverName,
                                  amount: payout.pendingAmount,
                                })
                              }
                              disabled={processingPayout === payout.driverId}
                              className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                            >
                              {processingPayout === payout.driverId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Mark Paid"
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden">
            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <History className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
                <p className="font-medium">No payout history</p>
                <p className="text-sm">Completed payouts will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Driver
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Trips
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Method
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Processed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    {history.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {entry.paidAt
                            ? new Date(entry.paidAt).toLocaleDateString(
                                "en-NG",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {entry.driverName}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                            {formatNaira(entry.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                          {entry.bookingCount}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
                            {entry.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {entry.paidByEmail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Payout Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Confirm Payout
              </h3>
              <button
                onClick={() => setConfirmModal(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This will mark all pending bookings as paid for this driver.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Driver
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {confirmModal.driverName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Amount
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatNaira(confirmModal.amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkAsPaid(confirmModal.driverId)}
                disabled={processingPayout === confirmModal.driverId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {processingPayout === confirmModal.driverId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
