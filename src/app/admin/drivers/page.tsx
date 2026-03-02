"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import {
  Users,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Star,
  FileText,
  ExternalLink,
  MoreHorizontal,
  Check,
  Ban,
  RotateCcw,
  Grid3X3,
  List,
  Phone,
  Mail,
  TrendingUp,
  Wallet,
  Activity,
  ChevronRight,
  Shield,
  Calendar,
  Route,
  Eye,
  EyeOff,
} from "lucide-react";
import { ActionModal } from "@/components";

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profileImageUrl: string;
  status: string;
  onlineStatus: boolean;
  experienceYears: number;
  recruitmentPool?: boolean;
  recruitmentVisible?: boolean;
  documents: {
    driversLicense?: string;
    governmentId?: string;
    lasdriCard?: string;
    // Legacy keys (kept for older records)
    driversLicenseUrl?: string;
    lasdriCardUrl?: string;
  };
  servedCities: string[];
  createdAt: string | null;
  rating: number | null;
  totalTrips: number;
  rideOnVerified?: boolean;
  placementStatus?: string;
}

type ViewMode = "table" | "cards";

interface StatusCounts {
  all: number;
  pending_review: number;
  approved: number;
  suspended: number;
}

const STATUS_TABS = [
  { key: "all", label: "All Drivers", icon: Users },
  {
    key: "pending_review",
    label: "Pending Review",
    icon: Clock,
    color: "text-amber-600",
  },
  {
    key: "approved",
    label: "Approved",
    icon: CheckCircle,
    color: "text-green-600",
  },
  {
    key: "suspended",
    label: "Suspended",
    icon: XCircle,
    color: "text-red-600",
  },
];

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0,
    pending_review: 0,
    approved: 0,
    suspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    driverId: string;
    action: "reject" | "suspend";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [showActions, setShowActions] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/drivers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch drivers");
      const data = await res.json();
      setDrivers(data.drivers || []);
      setCounts(
        data.counts || { all: 0, pending_review: 0, approved: 0, suspended: 0 },
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchDrivers();
    });
    return () => unsubscribe();
  }, [fetchDrivers]);

  const handleAction = async (
    driverId: string,
    action: string,
    reason?: string,
    extra?: Record<string, any>,
  ) => {
    if (
      (action === "reject" || action === "suspend") &&
      !String(reason || "").trim()
    ) {
      return;
    }
    try {
      setActionLoading(driverId);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason, ...(extra || {}) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }

      setShowActions(null);
      setActionModal(null);
      setActionReason("");
      fetchDrivers();
    } catch (err: any) {
      setError(err.message || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter by search
  const filteredDrivers = drivers.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${d.firstName} ${d.lastName}`.toLowerCase();
    return (
      name.includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.phoneNumber.includes(q)
    );
  });

  const getStatusBadge = (status: string, onlineStatus: boolean) => {
    const styles: Record<string, string> = {
      pending_review:
        "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40",
      approved:
        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40",
      suspended:
        "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40",
      rejected:
        "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50",
    };
    const style = styles[status] || styles.rejected;
    return (
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${style}`}
        >
          {status.replace("_", " ")}
        </span>
        {status === "approved" && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
              onlineStatus
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40"
                : "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                onlineStatus
                  ? "bg-emerald-600 dark:bg-emerald-300"
                  : "bg-slate-400 dark:bg-slate-500"
              }`}
            />
            {onlineStatus ? "Online" : "Offline"}
          </span>
        )}
      </div>
    );
  };

  const getRecruitmentBadge = (driver: Driver) => {
    if (!driver.recruitmentPool) return null;
    const isListed = driver.recruitmentVisible === true;
    const cls = isListed
      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
      : "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50";
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}
      >
        Recruitment: {isListed ? "Listed" : "Hidden"}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Compute additional stats
  const onlineCount = drivers.filter(
    (d) => d.onlineStatus && d.status === "approved",
  ).length;
  const avgRating =
    drivers.filter((d) => d.rating).length > 0
      ? drivers
          .filter((d) => d.rating)
          .reduce((sum, d) => sum + (d.rating || 0), 0) /
        drivers.filter((d) => d.rating).length
      : 0;
  const totalTrips = drivers.reduce((sum, d) => sum + (d.totalTrips || 0), 0);
  const verifiedCount = drivers.filter((d) => d.rideOnVerified).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div
          data-tour="admin-drivers-header"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/50 rounded-2xl">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Driver Management
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Review applications and manage your driver fleet
              </p>
            </div>
          </div>

          {/* Search & View Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full sm:w-56"
              />
            </div>
            <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "cards"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                title="Card view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.all}
            </p>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {counts.pending_review}
            </p>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Online</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {onlineCount}
            </p>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium">Verified</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {verifiedCount}
            </p>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Star className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </p>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Route className="h-4 w-4" />
              <span className="text-xs font-medium">Trips</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalTrips.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Status Tabs */}
        <div
          data-tour="admin-drivers-status-tabs"
          className="flex gap-2 mb-6 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0"
        >
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.key as keyof StatusCounts] || 0;
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-white dark:text-slate-900" : tab.color || ""}`}
                />
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive
                      ? "bg-white/20 dark:bg-slate-900/10"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div data-tour="admin-drivers-content">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl">
              <Users className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-medium">No drivers found</p>
              <p className="text-sm text-slate-400">
                Try adjusting your search or filters
              </p>
            </div>
          ) : viewMode === "cards" ? (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div
                    className={`h-1.5 ${
                      driver.status === "approved"
                        ? driver.onlineStatus
                          ? "bg-emerald-500/50"
                          : "bg-emerald-300/40"
                        : driver.status === "pending_review"
                          ? "bg-amber-400/50"
                          : driver.status === "suspended"
                            ? "bg-rose-500/50"
                            : "bg-slate-300/50"
                    }`}
                  />

                  <div className="p-5">
                    {/* Profile Section */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          {driver.profileImageUrl ? (
                            <img
                              src={driver.profileImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="h-7 w-7 text-slate-500 dark:text-slate-300" />
                          )}
                        </div>
                        {driver.status === "approved" && (
                          <span
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                              driver.onlineStatus
                                ? "bg-emerald-500"
                                : "bg-slate-400 dark:bg-slate-500"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {driver.firstName} {driver.lastName}
                          </h3>
                          {driver.rideOnVerified && (
                            <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {driver.email}
                        </p>
                        {driver.phoneNumber && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {driver.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {driver.rating?.toFixed(1) || "—"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Rating
                        </p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {driver.totalTrips}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Trips
                        </p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {driver.experienceYears || 0}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Yrs Exp
                        </p>
                      </div>
                    </div>

                    {/* Cities */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {driver.servedCities.slice(0, 3).map((city) => (
                        <span
                          key={city}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <MapPin className="h-2.5 w-2.5" />
                          {city}
                        </span>
                      ))}
                      {driver.servedCities.length > 3 && (
                        <span className="text-xs text-slate-400">
                          +{driver.servedCities.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(driver.status, driver.onlineStatus)}
                        {getRecruitmentBadge(driver)}
                      </div>
                      <span className="text-xs text-slate-400">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(driver.createdAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <Link
                        href={`/admin/drivers/${driver.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        View Profile
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      {driver.status === "pending_review" && (
                        <>
                          <button
                            onClick={() => handleAction(driver.id, "approve")}
                            disabled={actionLoading === driver.id}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActionReason("");
                              setActionModal({
                                driverId: driver.id,
                                action: "reject",
                              });
                            }}
                            disabled={actionLoading === driver.id}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {driver.status === "approved" && (
                        <button
                          onClick={() => {
                            setActionReason("");
                            setActionModal({
                              driverId: driver.id,
                              action: "suspend",
                            });
                          }}
                          disabled={actionLoading === driver.id}
                          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-amber-600 dark:text-amber-400 transition-colors disabled:opacity-50"
                          title="Suspend"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                      {driver.recruitmentPool && (
                        <button
                          onClick={() =>
                            handleAction(
                              driver.id,
                              "set_recruitment_visibility",
                              undefined,
                              {
                                recruitmentVisible: !driver.recruitmentVisible,
                              },
                            )
                          }
                          disabled={actionLoading === driver.id}
                          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-50"
                          title={
                            driver.recruitmentVisible
                              ? "Hide from recruitment"
                              : "List on recruitment"
                          }
                        >
                          {driver.recruitmentVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {driver.status === "suspended" && (
                        <button
                          onClick={() => handleAction(driver.id, "reinstate")}
                          disabled={actionLoading === driver.id}
                          className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                          title="Reinstate"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Driver
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Experience
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Cities
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Rating
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Trips
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    {filteredDrivers.map((driver) => (
                      <tr
                        key={driver.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
                                {driver.profileImageUrl ? (
                                  <img
                                    src={driver.profileImageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                              {driver.rideOnVerified && (
                                <Shield className="absolute -top-1 -right-1 h-4 w-4 text-blue-500 bg-white dark:bg-slate-900 rounded-full" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-sm">
                                {driver.firstName} {driver.lastName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {driver.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {(driver.experienceYears || 0).toLocaleString()} yrs
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {driver.servedCities.slice(0, 2).map((city) => (
                              <span
                                key={city}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400"
                              >
                                <MapPin className="h-3 w-3" />
                                {city}
                              </span>
                            ))}
                            {driver.servedCities.length > 2 && (
                              <span className="text-xs text-slate-400">
                                +{driver.servedCities.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(driver.status, driver.onlineStatus)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {driver.rating ? (
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {driver.rating.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {driver.totalTrips}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 relative">
                            <Link
                              href={`/admin/drivers/${driver.id}`}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <ExternalLink className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                            </Link>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setShowActions(
                                    showActions === driver.id
                                      ? null
                                      : driver.id,
                                  )
                                }
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                              </button>

                              {showActions === driver.id && (
                                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 py-1">
                                  {driver.status === "pending_review" && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleAction(driver.id, "approve")
                                        }
                                        disabled={actionLoading === driver.id}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                      >
                                        <Check className="h-4 w-4" />
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          setShowActions(null);
                                          setActionReason("");
                                          setActionModal({
                                            driverId: driver.id,
                                            action: "reject",
                                          });
                                        }}
                                        disabled={actionLoading === driver.id}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                      >
                                        <XCircle className="h-4 w-4" />
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {driver.status === "approved" && (
                                    <button
                                      onClick={() => {
                                        setShowActions(null);
                                        setActionReason("");
                                        setActionModal({
                                          driverId: driver.id,
                                          action: "suspend",
                                        });
                                      }}
                                      disabled={actionLoading === driver.id}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Suspend
                                    </button>
                                  )}
                                  {driver.recruitmentPool && (
                                    <button
                                      onClick={() => {
                                        setShowActions(null);
                                        handleAction(
                                          driver.id,
                                          "set_recruitment_visibility",
                                          undefined,
                                          {
                                            recruitmentVisible:
                                              !driver.recruitmentVisible,
                                          },
                                        );
                                      }}
                                      disabled={actionLoading === driver.id}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                      {driver.recruitmentVisible ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                      {driver.recruitmentVisible
                                        ? "Hide Recruitment"
                                        : "List Recruitment"}
                                    </button>
                                  )}
                                  {driver.status === "suspended" && (
                                    <button
                                      onClick={() =>
                                        handleAction(driver.id, "reinstate")
                                      }
                                      disabled={actionLoading === driver.id}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                      Reinstate
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
            </div>
          )}
        </div>
      </div>

      <ActionModal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={
          actionModal?.action === "reject" ? "Reject Driver" : "Suspend Driver"
        }
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {actionModal?.action === "reject"
              ? "This will reject the driver application."
              : "This will suspend the driver account."}
          </div>
        }
        confirmText={actionModal?.action === "reject" ? "Reject" : "Suspend"}
        confirmVariant="destructive"
        reasonLabel={
          actionModal?.action === "reject"
            ? "Rejection reason"
            : "Suspension reason"
        }
        reasonPlaceholder={
          actionModal?.action === "reject"
            ? "Enter rejection reason..."
            : "Enter suspension reason..."
        }
        reasonValue={actionReason}
        onReasonValueChange={setActionReason}
        requireReason
        loading={Boolean(actionModal && actionLoading === actionModal.driverId)}
        onConfirm={() => {
          if (!actionModal) return;
          return handleAction(
            actionModal.driverId,
            actionModal.action,
            actionReason,
          );
        }}
      />
    </div>
  );
}
