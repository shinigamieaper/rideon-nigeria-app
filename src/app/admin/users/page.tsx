"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Loader2,
  Users,
  AlertCircle,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  status: string;
  profileImageUrl: string;
  totalBookings: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(
    new Set(),
  );
  const [authReady, setAuthReady] = useState(false);

  // Wait for Firebase auth to initialize
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch customers
  useEffect(() => {
    if (!authReady) return;

    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);

      try {
        const user = auth.currentUser;
        if (!user) {
          setError("Authentication required");
          return;
        }

        const token = await user.getIdToken();
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "20",
          ...(searchQuery && { search: searchQuery }),
          ...(statusFilter !== "all" && { status: statusFilter }),
        });

        const response = await fetch(`/api/admin/users/customers?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch customers");
        }

        const data = await response.json();
        setCustomers(data.customers);
        setPagination(data.pagination);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError("Failed to load customers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [authReady, currentPage, searchQuery, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1); // Reset to first page on search
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map((c) => c.id)));
    }
  };

  const getPageNumbers = () => {
    if (!pagination) return [];
    const { page, totalPages } = pagination;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      ) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        {/* Header removed - using sidebar navigation */}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
          <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
              <p className="text-slate-600 dark:text-slate-400">
                Loading customers...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        {/* Header removed - using sidebar navigation */}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
          <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header removed - using sidebar navigation */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        {/* Top Bar with Search and Filters */}
        <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 w-full lg:max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/60 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all text-sm"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Select
                value={dateFilter}
                onValueChange={(v) => setDateFilter(v)}
              >
                <SelectTrigger className="pl-10 pr-8 py-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/60 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-sky-500/50 transition-all cursor-pointer text-sm font-medium shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Last 30 days</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v)}
              >
                <SelectTrigger className="pl-10 pr-8 py-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/60 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-sky-500/50 transition-all cursor-pointer text-sm font-medium shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-lg overflow-hidden">
          {/* Table Stats */}
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Users className="h-5 w-5" />
              <span className="font-medium">
                {pagination?.total || 0}{" "}
                {pagination?.total === 1 ? "customer" : "customers"}
              </span>
              {searchQuery && (
                <span className="text-sm">
                  matching &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
          </div>

          <div className="xl:hidden p-4 sm:p-6">
            {customers.length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400">
                    No customers found
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                      }}
                      className="text-sky-500 hover:text-sky-600 text-sm font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customers.map((customer) => {
                  const isSelected = selectedCustomers.has(customer.id);
                  return (
                    <div
                      key={customer.id}
                      className={`rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 ${
                        isSelected ? "ring-2 ring-sky-500/30" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {customer.firstName?.[0]?.toUpperCase() || "U"}
                            {customer.lastName?.[0]?.toUpperCase() || ""}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/users/${customer.id}`}
                              className="block font-medium text-slate-900 dark:text-white truncate"
                            >
                              {customer.firstName} {customer.lastName}
                            </Link>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {customer.email}
                            </div>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCustomer(customer.id)}
                          className="w-4 h-4 mt-1 text-sky-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-sky-500 cursor-pointer flex-shrink-0"
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Phone
                          </div>
                          <div className="text-slate-700 dark:text-slate-200 truncate">
                            {customer.phoneNumber || "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Joined
                          </div>
                          <div className="text-slate-700 dark:text-slate-200 truncate">
                            {formatDate(customer.createdAt)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Bookings
                          </div>
                          <div className="text-slate-700 dark:text-slate-200 truncate">
                            {String(customer.totalBookings).padStart(2, "0")}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            User ID
                          </div>
                          <div className="text-slate-700 dark:text-slate-200 truncate">
                            #{customer.id.slice(0, 6)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/users/${customer.id}`}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                          title="View Details"
                        >
                          <Edit2 className="h-4 w-4 text-slate-400 group-hover:text-sky-500" />
                        </Link>
                        <button
                          onClick={() => console.log("Delete:", customer.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="hidden xl:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5 text-left w-12">
                    <input
                      type="checkbox"
                      checked={
                        customers.length > 0 &&
                        selectedCustomers.size === customers.length
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-sky-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    User Name
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Roll
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date of Joined
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                        <p className="text-slate-500 dark:text-slate-400">
                          No customers found
                        </p>
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("all");
                            }}
                            className="text-sky-500 hover:text-sky-600 text-sm font-medium"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => {
                    const isSelected = selectedCustomers.has(customer.id);
                    return (
                      <tr
                        key={customer.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                          isSelected ? "bg-sky-50/30 dark:bg-sky-900/10" : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCustomer(customer.id)}
                            className="w-4 h-4 text-sky-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/admin/users/${customer.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
                              {customer.firstName?.[0]?.toUpperCase() || "U"}
                              {customer.lastName?.[0]?.toUpperCase() || ""}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors text-sm">
                              {customer.firstName} {customer.lastName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-slate-600 dark:text-slate-400 text-sm">
                            #{customer.id.slice(0, 6)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {customer.email}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-xs font-medium">
                            {String(customer.totalBookings).padStart(2, "0")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {formatDate(customer.createdAt)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-slate-600 dark:text-slate-400 text-sm">
                            {customer.phoneNumber}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/users/${customer.id}`}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                              title="View Details"
                            >
                              <Edit2 className="h-4 w-4 text-slate-400 group-hover:text-sky-500" />
                            </Link>
                            <button
                              onClick={() =>
                                console.log("Delete:", customer.id)
                              }
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800/60">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Items per page selector */}
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>{pagination.limit}</span>
                  <span>/</span>
                  <span>page</span>
                </div>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={!pagination.hasPrev}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </button>

                  {getPageNumbers().map((pageNum, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        typeof pageNum === "number" && setCurrentPage(pageNum)
                      }
                      disabled={pageNum === "..."}
                      className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                        pageNum === pagination.page
                          ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/30"
                          : pageNum === "..."
                            ? "text-slate-400 cursor-default"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!pagination.hasNext}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </button>

                  {/* Jump to last page */}
                  <button
                    onClick={() => setCurrentPage(pagination.totalPages)}
                    className="ml-2 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                    title="Jump to last page"
                  >
                    <span>{pagination.totalPages}</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
