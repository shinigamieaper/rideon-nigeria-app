"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  Users,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Flag,
  MoreHorizontal,
  Eye,
  Calendar,
  Ban,
  RotateCcw,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  X,
  ExternalLink,
} from "lucide-react";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  homeCity: string;
  createdAt: string;
  status: string;
  flagged: boolean;
  flagReason: string;
  profileImageUrl: string;
  totalBookings: number;
  completedTrips: number;
  totalSpend: number;
  lastBookingDate: string | null;
}

interface Reservation {
  id: string;
  status: string;
  pickupAddress: string;
  fareNgn: number;
  startDate: string | null;
  createdAt: string | null;
  paymentStatus: string;
}

interface Counts {
  all: number;
  active: number;
  flagged: number;
  suspended: number;
}

const STATUS_TABS = [
  { key: "all", label: "All Customers", icon: Users },
  {
    key: "active",
    label: "Active",
    icon: CheckCircle,
    color: "text-green-600",
  },
  { key: "flagged", label: "Flagged", icon: Flag, color: "text-amber-600" },
  {
    key: "suspended",
    label: "Suspended",
    icon: XCircle,
    color: "text-red-600",
  },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [counts, setCounts] = useState<Counts>({
    all: 0,
    active: 0,
    flagged: 0,
    suspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  // Customer detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerReservations, setCustomerReservations] = useState<
    Reservation[]
  >([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [showFlagModal, setShowFlagModal] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/admin/users/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data.customers || []);
      setCounts(data.counts || { all: 0, active: 0, flagged: 0, suspended: 0 });
    } catch (err) {
      console.error(err);
      setError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchCustomers();
    });
    return () => unsubscribe();
  }, [fetchCustomers]);

  const fetchReservations = async (customerId: string) => {
    try {
      setReservationsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/users/customers/${customerId}/reservations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) throw new Error("Failed to fetch reservations");
      const data = await res.json();
      setCustomerReservations(data.reservations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReservationsLoading(false);
    }
  };

  const handleAction = async (
    customer: Customer,
    action: "suspend" | "activate" | "flag" | "unflag",
    reason?: string,
  ) => {
    try {
      setActionLoading(customer.id);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/users/customers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: customer.id, action, reason }),
      });

      if (!res.ok) throw new Error("Failed to update customer");

      fetchCustomers();
      setShowActions(null);
      setShowFlagModal(false);
      setFlagReason("");
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchReservations(customer.id);
  };

  const formatNgn = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string, flagged: boolean) => {
    if (flagged) {
      return (
        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
          Flagged
        </span>
      );
    }
    if (status === "suspended") {
      return (
        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
        Active
      </span>
    );
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phoneNumber.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Customer Management
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                View profiles, reservation history, and manage accounts
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 pl-10 pr-4 py-2.5 bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {STATUS_TABS.map((tab) => {
            const count = counts[tab.key as keyof Counts] || 0;
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <tab.icon
                  className={`h-4 w-4 ${isActive ? "" : tab.color || ""}`}
                />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-xs ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Customers
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {loading ? "—" : counts.all}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Active
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {loading ? "—" : counts.active}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Flagged
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {loading ? "—" : counts.flagged}
                </p>
              </div>
              <Flag className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Suspended
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {loading ? "—" : counts.suspended}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchCustomers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Trips
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Total Spend
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Last Booking
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
                            {customer.firstName?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Joined {formatDate(customer.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            {customer.email}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {customer.phoneNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {customer.completedTrips}
                          </p>
                          <p className="text-xs text-slate-500">
                            {customer.totalBookings} total
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatNgn(customer.totalSpend)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(customer.status, customer.flagged)}
                        {customer.flagged && customer.flagReason && (
                          <p
                            className="text-xs text-amber-600 dark:text-amber-400 mt-1 max-w-[150px] truncate"
                            title={customer.flagReason}
                          >
                            {customer.flagReason}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(customer.lastBookingDate)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openCustomerDetail(customer)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4 text-slate-500 hover:text-blue-500" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowActions(
                                  showActions === customer.id
                                    ? null
                                    : customer.id,
                                )
                              }
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4 text-slate-500" />
                            </button>
                            {showActions === customer.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-10">
                                <button
                                  onClick={() => openCustomerDetail(customer)}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" /> View Profile
                                </button>
                                <Link
                                  href={`/admin/reservations?customer=${customer.id}`}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Calendar className="h-4 w-4" /> View
                                  Reservations
                                </Link>
                                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                                {!customer.flagged ? (
                                  <button
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setShowFlagModal(true);
                                      setShowActions(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                                  >
                                    <Flag className="h-4 w-4" /> Flag Account
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleAction(customer, "unflag")
                                    }
                                    disabled={actionLoading === customer.id}
                                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                                  >
                                    <RotateCcw className="h-4 w-4" /> Remove
                                    Flag
                                  </button>
                                )}
                                {customer.status !== "suspended" ? (
                                  <button
                                    onClick={() =>
                                      handleAction(customer, "suspend")
                                    }
                                    disabled={actionLoading === customer.id}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <Ban className="h-4 w-4" /> Suspend Account
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleAction(customer, "activate")
                                    }
                                    disabled={actionLoading === customer.id}
                                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                                  >
                                    <CheckCircle className="h-4 w-4" />{" "}
                                    Reactivate Account
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && !showFlagModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold">
                  {selectedCustomer.firstName?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Customer since {formatDate(selectedCustomer.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Profile Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Email
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {selectedCustomer.email}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Phone
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {selectedCustomer.phoneNumber}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    City
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {selectedCustomer.homeCity || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Status
                  </p>
                  {getStatusBadge(
                    selectedCustomer.status,
                    selectedCustomer.flagged,
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedCustomer.completedTrips}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Completed Trips
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatNgn(selectedCustomer.totalSpend)}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Total Spend
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedCustomer.totalBookings}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Total Bookings
                  </p>
                </div>
              </div>

              {/* Reservation History */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recent Reservations
                </h3>
                {reservationsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  </div>
                ) : customerReservations.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                    No reservations yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customerReservations.slice(0, 5).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${r.status === "completed" ? "bg-green-500" : r.status === "cancelled" ? "bg-red-500" : "bg-amber-500"}`}
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {r.pickupAddress?.slice(0, 30)}...
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(r.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatNgn(r.fareNgn)}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {r.status.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                    ))}
                    {customerReservations.length > 5 && (
                      <Link
                        href={`/admin/reservations?customer=${selectedCustomer.id}`}
                        className="block text-center text-sm text-blue-600 dark:text-blue-400 py-2 hover:underline"
                      >
                        View all {customerReservations.length} reservations →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
              <Link
                href={`/admin/reservations?customer=${selectedCustomer.id}`}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View All Reservations
              </Link>
              {selectedCustomer.status !== "suspended" ? (
                <button
                  onClick={() => handleAction(selectedCustomer, "suspend")}
                  disabled={actionLoading === selectedCustomer.id}
                  className="px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => handleAction(selectedCustomer, "activate")}
                  disabled={actionLoading === selectedCustomer.id}
                  className="px-4 py-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Reactivate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && selectedCustomer && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFlagModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500" />
              Flag Customer Account
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Flag this customer for review. They will still be able to use the
              platform but will be marked for attention.
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Enter reason for flagging (e.g., suspicious activity, payment issues, etc.)"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowFlagModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(selectedCustomer, "flag", flagReason)
                }
                disabled={
                  actionLoading === selectedCustomer.id || !flagReason.trim()
                }
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === selectedCustomer.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
                Flag Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
