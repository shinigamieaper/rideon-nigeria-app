"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Modal } from "@/components";
import {
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  CalendarClock,
  Star,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Wallet,
  TrendingUp,
  Clock,
  Ban,
  Activity,
  Route,
  Target,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";

interface DriverDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profileImageUrl: string;
  status: string;
  onlineStatus: boolean;
  experienceYears: number;
  bankAccount?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  } | null;
  references?: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
  }[];
  recruitmentProfilePending?: {
    status: string;
    rejectionReason: string | null;
    submittedAt: string | null;
    rejectedAt?: string | null;
    professionalSummary: string;
    experienceYears: number;
    languages: string[];
    hobbies: string[];
    vehicleExperience?: { categories: string[]; notes: string };
    familyFitTags?: string[];
    familyFitNotes?: string;
    fullTimePreferences?: {
      willingToTravel: boolean | null;
      preferredClientType: string | null;
    } | null;
  } | null;
  recruitmentPool?: boolean;
  recruitmentVisible?: boolean;
  documents: {
    driversLicense?: string;
    governmentId?: string;
    lasdriCard?: string;
    driversLicenseUrl?: string;
    governmentIdUrl?: string;
    lasdriCardUrl?: string;
  };
  servedCities: string[];
  placementStatus: string;
  rideOnVerified: boolean;
  professionalSummary: string;
  createdAt: string | null;
  updatedAt: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  rating: number | null;
  totalTrips: number;
  // Earnings data
  totalEarnings: number;
  pendingEarnings: number;
  completedTrips: number;
  cancelledTrips: number;
  acceptanceRate: number;
}

interface DriverBooking {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  fareNgn: number;
  driverPayoutNgn: number;
  driverPaid: boolean;
  scheduledPickupTime: string | null;
  createdAt: string | null;
  paymentStatus: string;
}

interface PageProps {
  params: Promise<{
    driverId: string;
  }>;
}

export default function DriverDetailPage({ params }: PageProps) {
  const { driverId } = React.use(params);
  const router = useRouter();

  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [docOpeningKey, setDocOpeningKey] = useState<string | null>(null);
  const [recentBookings, setRecentBookings] = useState<DriverBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [adminRole, setAdminRole] = useState<
    | "super_admin"
    | "admin"
    | "ops_admin"
    | "driver_admin"
    | "product_admin"
    | "finance_admin"
  >("admin");
  const [payoutModal, setPayoutModal] = useState<{
    bookingId: string;
    payoutAmount: number;
  } | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerResolvedUrl, setViewerResolvedUrl] = useState("");
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerKind, setViewerKind] = useState<"pdf" | "image" | "other">(
    "other",
  );

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerTitle("");
    setViewerResolvedUrl("");
    setViewerError(null);
    setViewerLoading(false);
    setViewerKind("other");
  };

  const openDocument = async (key: string, rawUrl: string) => {
    try {
      setError(null);
      setDocOpeningKey(key);

      setViewerTitle(key);
      setViewerOpen(true);
      setViewerResolvedUrl("");
      setViewerError(null);
      setViewerLoading(true);
      setViewerKind("other");

      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const token = await user.getIdToken();

      const base = String(rawUrl || "").split("?")[0];
      if (base.startsWith("/api/files/")) {
        const res = await fetch(`${base}?resolve=1`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Failed to open document");
        const resolved = typeof j?.url === "string" ? j.url : "";
        if (!resolved) throw new Error("Failed to open document");

        const kindFromApi =
          j?.kind === "pdf" || j?.kind === "image" || j?.kind === "other"
            ? j.kind
            : null;
        if (kindFromApi) {
          setViewerKind(kindFromApi);
        } else {
          const isPdf = /\.pdf(\?|$)/i.test(resolved);
          const isImg = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(resolved);
          setViewerKind(isPdf ? "pdf" : isImg ? "image" : "other");
        }
        setViewerTitle(key);
        setViewerResolvedUrl(resolved);
        return;
      }

      throw new Error(
        "This document link is not compatible. Please ask the driver to re-upload the document.",
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unable to open document.";
      setError(msg);
      setViewerError(msg);
    } finally {
      setDocOpeningKey(null);
      setViewerLoading(false);
    }
  };

  const fetchDriver = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load driver");
      }

      const data = await res.json();
      setDriver(data.driver as DriverDetail);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load driver");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/drivers/${driverId}/bookings?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      setRecentBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (err) {
      console.error(err);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        user
          .getIdTokenResult()
          .then((r) => {
            const claims: any = r?.claims || {};
            const role =
              typeof claims.adminRole === "string"
                ? claims.adminRole
                : typeof claims.role === "string"
                  ? claims.role
                  : "admin";
            const validRoles = [
              "super_admin",
              "admin",
              "ops_admin",
              "driver_admin",
              "product_admin",
              "finance_admin",
            ] as const;
            setAdminRole(
              validRoles.includes(role as any)
                ? (role as (typeof validRoles)[number])
                : "admin",
            );
          })
          .catch(() => {
            setAdminRole("admin");
          });
        fetchDriver();
        fetchBookings();
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const handleAction = async (
    action:
      | "approve"
      | "reject"
      | "suspend"
      | "reinstate"
      | "set_recruitment_visibility",
    extra?: Record<string, any>,
  ) => {
    if (!driver) return;

    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Rejection reason:") || undefined;
      if (!reason) return;
    }
    if (action === "suspend") {
      reason = window.prompt("Suspension reason:") || undefined;
      if (!reason) return;
    }

    try {
      setActionLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason, ...(extra || {}) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }

      await fetchDriver();
    } catch (err: any) {
      setError(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecruitmentProfileAction = async (
    action: "approve" | "reject",
  ) => {
    if (!driver) return;

    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Rejection reason:") || undefined;
      if (!reason) return;
    }

    try {
      setActionLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/drivers/${driver.id}/recruitment-profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, reason }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }

      await fetchDriver();
    } catch (err: any) {
      setError(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maskAccountNumber = (accountNumber: string) => {
    const raw = String(accountNumber || "").trim();
    if (!raw) return "—";
    const last4 = raw.slice(-4);
    return `****${last4}`;
  };

  const canPayDriver =
    adminRole === "super_admin" ||
    adminRole === "admin" ||
    adminRole === "finance_admin";

  const openPayoutModal = (booking: DriverBooking) => {
    setError(null);
    setPayoutModal({
      bookingId: booking.id,
      payoutAmount: Number(booking.driverPayoutNgn) || 0,
    });
  };

  const handleMarkTripPaid = async (bookingId: string) => {
    try {
      if (!driver) return;
      setError(null);
      setPayingBookingId(bookingId);

      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/finance/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverId: driver.id, bookingIds: [bookingId] }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to mark trip as paid");
      }

      setPayoutModal(null);
      await fetchDriver();
      await fetchBookings();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to mark trip as paid";
      setError(msg);
    } finally {
      setPayingBookingId(null);
    }
  };

  const fullName = driver
    ? `${driver.firstName} ${driver.lastName}`.trim() || "Driver"
    : "Driver";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header / Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/drivers")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Drivers
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-500">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : !driver ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Users className="h-10 w-10 mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm">Driver not found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-green-500 mb-1">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Earned</span>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {formatNaira(driver.totalEarnings)}
                </p>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-500 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Pending</span>
                </div>
                <p className="text-xl font-bold text-amber-600">
                  {formatNaira(driver.pendingEarnings)}
                </p>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-blue-500 mb-1">
                  <Route className="h-4 w-4" />
                  <span className="text-xs font-medium">Trips</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {driver.completedTrips}
                </p>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <Star className="h-4 w-4" />
                  <span className="text-xs font-medium">Rating</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {driver.rating?.toFixed(1) || "—"}
                </p>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-green-500 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Acceptance</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {driver.acceptanceRate}%
                </p>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-red-500 mb-1">
                  <Ban className="h-4 w-4" />
                  <span className="text-xs font-medium">Cancelled</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {driver.cancelledTrips}
                </p>
              </div>
            </div>

            {/* Top row: Profile + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile card */}
              <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    {driver.profileImageUrl ? (
                      <img
                        src={driver.profileImageUrl}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        {fullName}
                      </h1>
                      {driver.rideOnVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          RideOn Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      ID: {driver.id}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-300">
                      {driver.email && (
                        <span className="inline-flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {driver.email}
                        </span>
                      )}
                      {driver.phoneNumber && (
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {driver.phoneNumber}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {driver.servedCities.map((city) => (
                        <span
                          key={city}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          {city}
                        </span>
                      ))}
                      {driver.servedCities.length === 0 && (
                        <span className="text-xs text-slate-400 italic">
                          No cities configured
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {driver.professionalSummary && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                      Professional Summary
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug whitespace-pre-line">
                      {driver.professionalSummary}
                    </p>
                  </div>
                )}

                {driver.recruitmentProfilePending && (
                  <div className="mt-4 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Pending public profile update
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Status: {driver.recruitmentProfilePending.status}
                          {driver.recruitmentProfilePending.submittedAt
                            ? ` • Submitted ${formatDate(driver.recruitmentProfilePending.submittedAt)}`
                            : ""}
                        </div>
                        {driver.recruitmentProfilePending.rejectionReason ? (
                          <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                            Reason:{" "}
                            {driver.recruitmentProfilePending.rejectionReason}
                          </div>
                        ) : null}
                      </div>

                      {driver.recruitmentProfilePending.status ===
                        "pending" && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleRecruitmentProfileAction("approve")
                            }
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRecruitmentProfileAction("reject")
                            }
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-200">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Summary
                        </div>
                        <div className="mt-1 whitespace-pre-line">
                          {driver.recruitmentProfilePending
                            .professionalSummary || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Experience
                        </div>
                        <div className="mt-1">
                          {driver.recruitmentProfilePending.experienceYears ||
                            0}{" "}
                          yrs
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Languages
                        </div>
                        <div className="mt-1">
                          {driver.recruitmentProfilePending.languages?.join(
                            ", ",
                          ) || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Family-fit
                        </div>
                        <div className="mt-1">
                          {driver.recruitmentProfilePending.familyFitTags?.join(
                            ", ",
                          ) || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-6 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Applied {formatDate(driver.createdAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {driver.experienceYears || 0} yrs experience
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    {driver.rating
                      ? `${driver.rating.toFixed(1)} • ${driver.totalTrips} trips`
                      : "No rating yet"}
                  </div>
                </div>
              </div>

              {/* Status card */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Status
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      driver.status === "approved"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : driver.status === "pending_review"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : driver.status === "suspended"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {driver.status.replace("_", " ")}
                  </span>
                  {driver.status === "approved" && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        driver.onlineStatus
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          driver.onlineStatus ? "bg-white" : "bg-slate-500"
                        }`}
                      />
                      {driver.onlineStatus ? "Online" : "Offline"}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Placement: {driver.placementStatus || "—"}
                  </span>
                  {driver.recruitmentPool && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        driver.recruitmentVisible
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40"
                          : "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/50"
                      }`}
                    >
                      Recruitment:{" "}
                      {driver.recruitmentVisible ? "Listed" : "Hidden"}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Use approve/reject for initial application, and
                    suspend/reinstate for live drivers.
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {driver.status === "pending_review" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction("approve")}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction("reject")}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {driver.status === "approved" && (
                    <button
                      type="button"
                      onClick={() => handleAction("suspend")}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Suspend
                    </button>
                  )}
                  {driver.recruitmentPool && (
                    <button
                      type="button"
                      onClick={() =>
                        handleAction("set_recruitment_visibility", {
                          recruitmentVisible: !driver.recruitmentVisible,
                        })
                      }
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
                      type="button"
                      onClick={() => handleAction("reinstate")}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Reinstate
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Second row: Vehicle & Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-slate-500" />
                    Bank Details
                  </p>
                </div>
                {driver.bankAccount ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-200">
                    <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/60 p-3">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Bank
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {driver.bankAccount.bankName || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/60 p-3">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Account Name
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {driver.bankAccount.accountName || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/60 p-3 sm:col-span-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Account Number
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                        {driver.bankAccount.accountNumber || "—"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No bank account linked yet.
                  </p>
                )}
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    References
                  </p>
                </div>
                {Array.isArray(driver.references) &&
                driver.references.length > 0 ? (
                  <div className="space-y-3">
                    {driver.references.map((r, idx) => (
                      <div
                        key={`${r.email || r.phone || r.name || idx}-${idx}`}
                        className="rounded-xl bg-slate-50/80 dark:bg-slate-800/60 p-3"
                      >
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {r.name || "—"}
                        </div>
                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">
                              Relationship:
                            </span>{" "}
                            {r.relationship || "—"}
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400">
                              Phone:
                            </span>{" "}
                            {r.phone || "—"}
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-500 dark:text-slate-400">
                              Email:
                            </span>{" "}
                            {r.email || "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No references submitted.
                  </p>
                )}
              </div>

              {/* Documents */}
              <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    Documents
                  </p>
                </div>
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  {[
                    {
                      key: "driversLicense" as const,
                      label: "Driver's License",
                    },
                    {
                      key: "governmentId" as const,
                      label: "Government ID",
                    },
                    {
                      key: "lasdriCard" as const,
                      label: "LASDRI Card (optional)",
                    },
                  ].map((doc) => {
                    const url =
                      (driver.documents as any)?.[doc.key] ||
                      (doc.key === "driversLicense"
                        ? (driver.documents as any)?.driversLicenseUrl
                        : undefined) ||
                      (doc.key === "governmentId"
                        ? (driver.documents as any)?.governmentIdUrl
                        : undefined) ||
                      (doc.key === "lasdriCard"
                        ? (driver.documents as any)?.lasdriCardUrl
                        : undefined);
                    return (
                      <div
                        key={doc.key}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-slate-800 dark:text-slate-100">
                            {doc.label}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {url ? "Uploaded" : "Missing"}
                          </span>
                        </div>
                        {url ? (
                          <button
                            type="button"
                            onClick={() =>
                              void openDocument(doc.key, String(url))
                            }
                            disabled={docOpeningKey === doc.key}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {docOpeningKey === doc.key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : null}
                            View
                          </button>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {doc.key === "lasdriCard" ? "Optional" : "Required"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  Recent Trips
                </p>
              </div>
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : recentBookings.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No trips yet for this driver.
                </p>
              ) : (
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
                          {booking.pickupAddress || "Pickup —"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          → {booking.dropoffAddress || "Dropoff —"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {booking.createdAt
                            ? new Date(booking.createdAt).toLocaleDateString(
                                "en-NG",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "—"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                          ₦{(booking.fareNgn || 0).toLocaleString("en-NG")}
                        </span>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {booking.status.replace(/_/g, " ")}
                        </span>
                        {booking.status === "completed" ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              booking.driverPaid
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {booking.driverPaid ? "Paid" : "Unpaid"}
                          </span>
                        ) : null}

                        {canPayDriver &&
                        booking.status === "completed" &&
                        !booking.driverPaid ? (
                          <button
                            type="button"
                            onClick={() => openPayoutModal(booking)}
                            disabled={payingBookingId === booking.id}
                            className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-60"
                          >
                            {payingBookingId === booking.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : null}
                            Pay now
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(payoutModal)}
        onClose={() => setPayoutModal(null)}
        title="Confirm Driver Payment"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Confirm only after you’ve sent the payment to the driver. This
              will mark this trip as paid.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Amount
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatNaira(payoutModal?.payoutAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Bank
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {driver?.bankAccount?.bankName || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Account
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {driver?.bankAccount?.accountName || "—"} •{" "}
                {driver?.bankAccount?.accountNumber
                  ? maskAccountNumber(driver.bankAccount.accountNumber)
                  : "—"}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPayoutModal(null)}
              disabled={Boolean(payingBookingId)}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                payoutModal
                  ? handleMarkTripPaid(payoutModal.bookingId)
                  : undefined
              }
              disabled={
                !payoutModal ||
                Boolean(payingBookingId) ||
                payoutModal.payoutAmount <= 0
              }
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl transition-all disabled:opacity-50"
            >
              {payingBookingId === payoutModal?.bookingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Mark Paid
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={viewerOpen}
        onClose={closeViewer}
        title={viewerTitle || "Document"}
        className="max-w-5xl"
      >
        {viewerLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Opening…</span>
          </div>
        ) : viewerError ? (
          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300">
              {viewerError}
            </div>
          </div>
        ) : viewerResolvedUrl ? (
          <div className="space-y-3">
            <div className="flex items-center justify-end">
              <a
                href={`${viewerResolvedUrl}${viewerResolvedUrl.includes("?") ? "&" : "?"}download=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
            {viewerKind === "image" ? (
              <img
                src={viewerResolvedUrl}
                alt={viewerTitle}
                className="w-full max-h-[70vh] object-contain rounded-xl bg-white/60 dark:bg-slate-900/40"
              />
            ) : viewerKind === "pdf" ? (
              <iframe
                src={viewerResolvedUrl}
                className="w-full h-[70vh] rounded-xl bg-white/60 dark:bg-slate-900/40"
              />
            ) : (
              <a
                href={viewerResolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
