"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  CalendarClock,
  Search,
  Loader2,
  AlertCircle,
  MapPin,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  CreditCard,
  ExternalLink,
  MoreHorizontal,
  X,
  Phone,
  Mail,
  UserMinus,
  RefreshCw,
  Ban,
  Eye,
} from "lucide-react";
import {
  ActionModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SingleSelectCombobox,
} from "@/components";

interface Reservation {
  id: string;
  service?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  driverId: string | null;
  driverName: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleClass: string;
  city: string | null;
  rentalUnit: string | null;
  listingId: string | null;
  status: string;
  fareNgn: number;
  startDate: string | null;
  startTime: string | null;
  scheduledPickupTime: string | null;
  createdAt: string | null;
  paymentStatus: string;
}

interface StatusCounts {
  all: number;
  requested: number;
  confirmed: number;
  needs_reassignment: number;
  driver_assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

const STATUS_TABS = [
  { key: "all", label: "All", icon: CalendarClock },
  { key: "needs_reassignment", label: "Ops Queue", icon: AlertCircle },
  { key: "requested", label: "Requested", icon: Clock },
  { key: "driver_assigned", label: "Assigned", icon: Truck },
  { key: "in_progress", label: "In Progress", icon: MapPin },
  { key: "completed", label: "Completed", icon: CheckCircle },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
];

interface ReservationDetail extends Reservation {
  customerPhone?: string;
  driverEmail?: string;
  driverPhone?: string;
  pickupCoordinates?: { lat: number; lng: number } | null;
  dropoffCoordinates?: { lat: number; lng: number } | null;
  driverPayoutNgn?: number;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  notes?: string;
}

interface ListingOption {
  id: string;
  title: string;
  city: string;
  category: string;
  status: string;
  partnerId: string | null;
  adminActive: boolean;
  dayRateNgn: number;
  block4hRateNgn: number;
}

interface DriverOption {
  id: string;
  name: string;
  status: string;
  onlineStatus: boolean;
  placementStatus: string;
  driverTrack: string;
  servedCities: string[];
  phoneNumber: string;
}

export default function ReservationsPage() {
  const searchParams = useSearchParams();
  const openReservationId = searchParams.get("open");
  const openedReservationIdRef = useRef<string | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0,
    requested: 0,
    confirmed: 0,
    needs_reassignment: 0,
    driver_assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30d");

  // Action states
  const [showActions, setShowActions] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Detail modal
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [assignModal, setAssignModal] = useState<{
    reservationId: string;
  } | null>(null);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  const [reassignVehicleModal, setReassignVehicleModal] = useState<{
    reservationId: string;
    city: string | null;
    currentListingId: string | null;
  } | null>(null);
  const [availableListings, setAvailableListings] = useState<ListingOption[]>(
    [],
  );
  const [listingsLoading, setListingsLoading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [settlementOverride, setSettlementOverride] = useState<string>("");

  const [unassignDriverModal, setUnassignDriverModal] = useState<{
    reservationId: string;
  } | null>(null);

  // Cancel modal
  const [cancelModal, setCancelModal] = useState<{
    id: string;
    customerName: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (serviceFilter !== "all") params.set("service", serviceFilter);
      params.set("dateRange", dateRange);

      const res = await fetch(`/api/admin/reservations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch reservations");
      const data = await res.json();
      setReservations(data.reservations || []);
      setCounts(
        data.counts || {
          all: 0,
          requested: 0,
          confirmed: 0,
          needs_reassignment: 0,
          driver_assigned: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        },
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, serviceFilter, dateRange]);

  const fetchReservationDetail = useCallback(async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/reservations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch reservation");
      }

      const data = await res.json();
      setSelectedReservation(data.reservation);
    } catch (err) {
      console.error(err);
      setDetailError("Failed to load reservation details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      fetchReservations();
      if (
        openReservationId &&
        openedReservationIdRef.current !== openReservationId
      ) {
        openedReservationIdRef.current = openReservationId;
        fetchReservationDetail(openReservationId);
      }
    });
    return () => unsubscribe();
  }, [fetchReservationDetail, fetchReservations, openReservationId]);

  const handleCancelReservation = async () => {
    if (!cancelModal) return;

    try {
      setActionLoading(cancelModal.id);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/reservations/${cancelModal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }

      setCancelModal(null);
      setCancelReason("");
      fetchReservations();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel reservation";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchAvailableListings = useCallback(
    async (city: string | null, currentListingId: string | null) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      setListingsLoading(true);
      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams();
        params.set("status", "available");
        if (city) params.set("city", city);
        const res = await fetch(`/api/admin/catalog?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch listings");
        }
        const data = await res.json().catch(() => ({}));
        const raw = Array.isArray(data?.listings) ? data.listings : [];
        const mapped: ListingOption[] = raw
          .map((l: any) => {
            const title =
              [l?.make, l?.model].filter(Boolean).join(" ").trim() ||
              l?.category ||
              "Vehicle";
            return {
              id: String(l?.id || ""),
              title,
              city: String(l?.city || ""),
              category: String(l?.category || ""),
              status: String(l?.status || ""),
              partnerId: l?.partnerId ? String(l.partnerId) : null,
              adminActive: l?.adminActive === false ? false : true,
              dayRateNgn: Number.isFinite(l?.dayRateNgn)
                ? Number(l.dayRateNgn)
                : 0,
              block4hRateNgn: Number.isFinite(l?.block4hRateNgn)
                ? Number(l.block4hRateNgn)
                : 0,
            };
          })
          .filter(
            (l: ListingOption) =>
              Boolean(l.id) &&
              l.status === "available" &&
              l.adminActive !== false &&
              (!currentListingId || l.id !== currentListingId),
          );

        mapped.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        setAvailableListings(mapped);
        setSelectedListingId((prev) => {
          if (prev && mapped.some((m) => m.id === prev)) return prev;
          return mapped.length > 0 ? mapped[0]!.id : "";
        });
      } finally {
        setListingsLoading(false);
      }
    },
    [],
  );

  const openReassignVehicle = async (reservation: Reservation) => {
    try {
      setError(null);
      setSettlementOverride("");
      setSelectedListingId("");
      setReassignVehicleModal({
        reservationId: reservation.id,
        city: reservation.city,
        currentListingId: reservation.listingId,
      });
      await fetchAvailableListings(reservation.city, reservation.listingId);
    } catch (err: any) {
      setError(err?.message || "Failed to load listings");
      setReassignVehicleModal(null);
    }
  };

  const handleReassignVehicle = async () => {
    if (!reassignVehicleModal) return;
    if (!selectedListingId) {
      setError("Select a vehicle");
      return;
    }

    try {
      setActionLoading(reassignVehicleModal.reservationId);
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const overrideNum = settlementOverride.trim()
        ? Number(settlementOverride.trim())
        : null;
      const payload: any = {
        action: "reassign_vehicle",
        listingId: selectedListingId,
      };
      if (overrideNum != null && Number.isFinite(overrideNum)) {
        payload.settlementOverrideNgn = Math.max(0, Math.round(overrideNum));
      }

      const res = await fetch(
        `/api/admin/reservations/${reassignVehicleModal.reservationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reassign vehicle");
      }

      setReassignVehicleModal(null);
      await fetchReservations();

      if (selectedReservation?.id === reassignVehicleModal.reservationId) {
        await fetchReservationDetail(reassignVehicleModal.reservationId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to reassign vehicle");
    } finally {
      setActionLoading(null);
    }
  };

  const fetchApprovedDrivers = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");

    setDriversLoading(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      params.set("status", "approved");
      params.set("limit", "200");
      const res = await fetch(`/api/admin/drivers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch drivers");
      }
      const data = await res.json().catch(() => ({}));
      const raw = Array.isArray(data?.drivers) ? data.drivers : [];
      const mapped: DriverOption[] = raw
        .map((d: any) => {
          const first = String(d?.firstName || "").trim();
          const last = String(d?.lastName || "").trim();
          const name = `${first} ${last}`.trim() || d?.email || "Driver";
          return {
            id: String(d?.id || ""),
            name,
            status: String(d?.status || ""),
            onlineStatus: Boolean(d?.onlineStatus),
            placementStatus: String(d?.placementStatus || ""),
            driverTrack: String(d?.driverTrack || "fleet"),
            servedCities: Array.isArray(d?.servedCities) ? d.servedCities : [],
            phoneNumber: String(d?.phoneNumber || ""),
          };
        })
        .filter(
          (d: DriverOption) => Boolean(d.id) && d.driverTrack !== "placement",
        );

      mapped.sort((a, b) => {
        const aScore =
          (a.placementStatus === "available" ? 2 : 0) +
          (a.onlineStatus ? 1 : 0);
        const bScore =
          (b.placementStatus === "available" ? 2 : 0) +
          (b.onlineStatus ? 1 : 0);
        return bScore - aScore;
      });

      setDrivers(mapped);
      setSelectedDriverId((prev) => {
        if (prev && mapped.some((d) => d.id === prev)) return prev;
        return mapped.length > 0 ? mapped[0]!.id : "";
      });
    } finally {
      setDriversLoading(false);
    }
  }, []);

  const openAssignDriver = async (reservationId: string) => {
    try {
      setError(null);
      setAssignModal({ reservationId });
      setSelectedDriverId("");
      await fetchApprovedDrivers();
    } catch (err: any) {
      setError(err?.message || "Failed to load drivers");
      setAssignModal(null);
    }
  };

  const handleAssignDriver = async () => {
    if (!assignModal) return;
    if (!selectedDriverId) {
      setError("Select a driver");
      return;
    }

    try {
      setActionLoading(assignModal.reservationId);
      setError(null);

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const res = await fetch(
        `/api/admin/reservations/${assignModal.reservationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "reassign",
            driverId: selectedDriverId,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to assign driver");
      }

      setAssignModal(null);
      await fetchReservations();

      if (selectedReservation?.id === assignModal.reservationId) {
        await fetchReservationDetail(assignModal.reservationId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to assign driver");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnassignDriver = async (reservationId: string) => {
    try {
      setActionLoading(reservationId);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "unassign" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unassign");
      }

      setShowActions(null);
      setUnassignDriverModal(null);
      fetchReservations();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to unassign driver";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter by search
  const filteredReservations = reservations.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.customerName.toLowerCase().includes(q) ||
      r.pickupAddress.toLowerCase().includes(q) ||
      r.dropoffAddress.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  });

  const formatServiceLabel = (service?: string) => {
    const raw = String(service || "").trim();
    const s = raw === "rental" ? "chauffeur" : raw;
    if (s === "drive_my_car") return "Hire a Driver";
    if (s === "chauffeur") return "Chauffeur";
    return s ? s.replace(/_/g, " ") : "Unknown";
  };

  const getServiceBadge = (service?: string) => {
    const raw = String(service || "").trim();
    const s = raw === "rental" ? "chauffeur" : raw;
    const styles: Record<string, string> = {
      drive_my_car:
        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      chauffeur: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    };
    const style =
      styles[s] ||
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${style}`}
      >
        {formatServiceLabel(s)}
      </span>
    );
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      requested:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      confirmed:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      needs_reassignment:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
      driver_assigned:
        "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
      en_route:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      in_progress:
        "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
      completed:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      cancelled_by_customer:
        "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      cancelled_by_driver:
        "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    };
    const style =
      styles[status] ||
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    const label = status
      .replace(/_/g, " ")
      .replace("cancelled by", "cancelled:");
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${style}`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div
          data-tour="admin-reservations-header"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <CalendarClock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Reservations
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage all customer reservations
              </p>
            </div>
          </div>

          {/* Filters */}
          <div
            data-tour="admin-reservations-filters"
            className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto"
          >
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full sm:w-40"
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                value={serviceFilter}
                onValueChange={(v) => setServiceFilter(v)}
              >
                <SelectTrigger className="h-11 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 cursor-pointer shadow-none">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  <SelectItem value="drive_my_car">Hire a Driver</SelectItem>
                  <SelectItem value="chauffeur">Chauffeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[160px]">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v)}>
                <SelectTrigger className="h-11 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 cursor-pointer shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div
          data-tour="admin-reservations-status-tabs"
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : ""}`} />
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${isActive ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div
          data-tour="admin-reservations-list"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <CalendarClock className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
              <p>No reservations found</p>
            </div>
          ) : (
            <>
              <div className="xl:hidden p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-white truncate">
                                  {reservation.customerName}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {reservation.vehicleClass ||
                                    formatServiceLabel(reservation.service)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getServiceBadge(reservation.service)}
                            {getStatusBadge(reservation.status)}
                            <button
                              data-tour="admin-reservations-row-actions"
                              onClick={() =>
                                setShowActions(
                                  showActions === reservation.id
                                    ? null
                                    : reservation.id,
                                )
                              }
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4 text-slate-500" />
                            </button>
                          </div>
                        </div>

                        {showActions === reservation.id && (
                          <div className="relative">
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 py-1">
                              {reservation.driverId &&
                                ![
                                  "completed",
                                  "cancelled_by_customer",
                                  "cancelled_by_driver",
                                  "cancelled_by_admin",
                                ].includes(reservation.status) && (
                                  <button
                                    onClick={() =>
                                      setUnassignDriverModal({
                                        reservationId: reservation.id,
                                      })
                                    }
                                    disabled={actionLoading === reservation.id}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                    Unassign Driver
                                  </button>
                                )}

                              {![
                                "completed",
                                "cancelled_by_customer",
                                "cancelled_by_driver",
                                "cancelled_by_admin",
                              ].includes(reservation.status) &&
                                (!reservation.driverId ||
                                  reservation.status ===
                                    "needs_reassignment") && (
                                  <button
                                    onClick={() => {
                                      openAssignDriver(reservation.id);
                                      setShowActions(null);
                                    }}
                                    disabled={actionLoading === reservation.id}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Assign Driver
                                  </button>
                                )}

                              {reservation.status === "needs_reassignment" && (
                                <button
                                  onClick={() => {
                                    openReassignVehicle(reservation);
                                    setShowActions(null);
                                  }}
                                  disabled={actionLoading === reservation.id}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                  <Truck className="h-4 w-4" />
                                  Reassign Vehicle
                                </button>
                              )}

                              {![
                                "completed",
                                "cancelled_by_customer",
                                "cancelled_by_driver",
                                "cancelled_by_admin",
                              ].includes(reservation.status) && (
                                <button
                                  onClick={() => {
                                    setCancelModal({
                                      id: reservation.id,
                                      customerName: reservation.customerName,
                                    });
                                    setShowActions(null);
                                  }}
                                  disabled={actionLoading === reservation.id}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Ban className="h-4 w-4" />
                                  Cancel Reservation
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  fetchReservationDetail(reservation.id);
                                  setShowActions(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Route
                            </div>
                            <div
                              className="text-sm text-slate-700 dark:text-slate-200 truncate"
                              title={reservation.pickupAddress}
                            >
                              {reservation.pickupAddress || "—"}
                            </div>
                            <div
                              className="text-xs text-slate-500 dark:text-slate-400 truncate"
                              title={reservation.dropoffAddress}
                            >
                              → {reservation.dropoffAddress || "—"}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Driver
                              </div>
                              <div className="text-sm text-slate-700 dark:text-slate-200 truncate">
                                {reservation.driverName || "Not assigned"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Fare
                              </div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {formatNgn(reservation.fareNgn)}
                              </div>
                              <div
                                className={`text-[11px] ${["succeeded", "success"].includes(String(reservation.paymentStatus)) ? "text-green-600" : "text-amber-600"}`}
                              >
                                {reservation.paymentStatus}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(reservation.createdAt)}
                            </div>
                            <button
                              onClick={() =>
                                fetchReservationDetail(reservation.id)
                              }
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                            >
                              <Eye className="h-4 w-4" />
                              Open
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Service
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Route
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Driver
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Fare
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Created
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    {filteredReservations.map((reservation) => (
                      <tr
                        key={reservation.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-sm">
                                {reservation.customerName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {reservation.vehicleClass ||
                                  formatServiceLabel(reservation.service)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getServiceBadge(reservation.service)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[200px]">
                            <p
                              className="text-sm text-slate-700 dark:text-slate-300 truncate"
                              title={reservation.pickupAddress}
                            >
                              {reservation.pickupAddress || "—"}
                            </p>
                            <p
                              className="text-xs text-slate-500 dark:text-slate-400 truncate"
                              title={reservation.dropoffAddress}
                            >
                              → {reservation.dropoffAddress || "—"}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {reservation.driverName ? (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {reservation.driverName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">
                              Not assigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {formatNgn(reservation.fareNgn)}
                            </p>
                            <p
                              className={`text-xs ${["succeeded", "success"].includes(String(reservation.paymentStatus)) ? "text-green-600" : "text-amber-600"}`}
                            >
                              {reservation.paymentStatus}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(reservation.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(reservation.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 relative">
                            {/* View Details */}
                            <button
                              onClick={() =>
                                fetchReservationDetail(reservation.id)
                              }
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                            </button>

                            {/* Actions Menu */}
                            <div className="relative">
                              <button
                                data-tour="admin-reservations-row-actions"
                                onClick={() =>
                                  setShowActions(
                                    showActions === reservation.id
                                      ? null
                                      : reservation.id,
                                  )
                                }
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                              </button>

                              {showActions === reservation.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 py-1">
                                  {/* Unassign Driver */}
                                  {reservation.driverId &&
                                    ![
                                      "completed",
                                      "cancelled_by_customer",
                                      "cancelled_by_driver",
                                      "cancelled_by_admin",
                                    ].includes(reservation.status) && (
                                      <button
                                        onClick={() =>
                                          setUnassignDriverModal({
                                            reservationId: reservation.id,
                                          })
                                        }
                                        disabled={
                                          actionLoading === reservation.id
                                        }
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                      >
                                        <UserMinus className="h-4 w-4" />
                                        Unassign Driver
                                      </button>
                                    )}

                                  {![
                                    "completed",
                                    "cancelled_by_customer",
                                    "cancelled_by_driver",
                                    "cancelled_by_admin",
                                  ].includes(reservation.status) &&
                                    (!reservation.driverId ||
                                      reservation.status ===
                                        "needs_reassignment") && (
                                      <button
                                        onClick={() => {
                                          openAssignDriver(reservation.id);
                                          setShowActions(null);
                                        }}
                                        disabled={
                                          actionLoading === reservation.id
                                        }
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                      >
                                        <RefreshCw className="h-4 w-4" />
                                        Assign Driver
                                      </button>
                                    )}

                                  {reservation.status ===
                                    "needs_reassignment" && (
                                    <button
                                      onClick={() => {
                                        openReassignVehicle(reservation);
                                        setShowActions(null);
                                      }}
                                      disabled={
                                        actionLoading === reservation.id
                                      }
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                      <Truck className="h-4 w-4" />
                                      Reassign Vehicle
                                    </button>
                                  )}

                                  {/* Cancel Reservation */}
                                  {![
                                    "completed",
                                    "cancelled_by_customer",
                                    "cancelled_by_driver",
                                    "cancelled_by_admin",
                                  ].includes(reservation.status) && (
                                    <button
                                      onClick={() => {
                                        setCancelModal({
                                          id: reservation.id,
                                          customerName:
                                            reservation.customerName,
                                        });
                                        setShowActions(null);
                                      }}
                                      disabled={
                                        actionLoading === reservation.id
                                      }
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Ban className="h-4 w-4" />
                                      Cancel Reservation
                                    </button>
                                  )}

                                  {/* View Full Details */}
                                  <button
                                    onClick={() => {
                                      fetchReservationDetail(reservation.id);
                                      setShowActions(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Full Details
                                  </button>
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
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {(selectedReservation || detailLoading) && (
        <div
          data-tour="admin-reservations-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Reservation Details
              </h3>
              <button
                onClick={() => setSelectedReservation(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              selectedReservation && (
                <div className="p-6 space-y-6">
                  {detailError && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{detailError}</span>
                    </div>
                  )}
                  {/* Status & ID */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Booking ID
                      </p>
                      <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        {selectedReservation.id}
                      </p>
                    </div>
                    {getStatusBadge(selectedReservation.status)}
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                      Customer
                    </p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {selectedReservation.customerName}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {selectedReservation.customerEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {selectedReservation.customerEmail}
                        </span>
                      )}
                      {selectedReservation.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {selectedReservation.customerPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Driver Info */}
                  {selectedReservation.driverName && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-2">
                        Assigned Driver
                      </p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedReservation.driverName}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {selectedReservation.driverEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {selectedReservation.driverEmail}
                          </span>
                        )}
                        {selectedReservation.driverPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {selectedReservation.driverPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Route */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Pickup
                        </p>
                        <p className="text-sm text-slate-900 dark:text-white">
                          {selectedReservation.pickupAddress || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Dropoff
                        </p>
                        <p className="text-sm text-slate-900 dark:text-white">
                          {selectedReservation.dropoffAddress || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fare & Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Fare
                      </p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatNgn(selectedReservation.fareNgn)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Vehicle Class
                      </p>
                      <p className="text-lg font-medium text-slate-900 dark:text-white">
                        {selectedReservation.vehicleClass || "—"}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Payment Status
                      </p>
                      <p
                        className={`text-sm font-medium ${["succeeded", "success"].includes(String(selectedReservation.paymentStatus)) ? "text-green-600" : "text-amber-600"}`}
                      >
                        {selectedReservation.paymentStatus}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Created
                      </p>
                      <p className="text-sm text-slate-900 dark:text-white">
                        {formatDate(selectedReservation.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Cancellation Info */}
                  {selectedReservation.cancellationReason && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1">
                        Cancellation Reason
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {selectedReservation.cancellationReason}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {![
                    "completed",
                    "cancelled_by_customer",
                    "cancelled_by_driver",
                    "cancelled_by_admin",
                  ].includes(selectedReservation.status) && (
                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      {(!selectedReservation.driverId ||
                        selectedReservation.status ===
                          "needs_reassignment") && (
                        <button
                          onClick={() => {
                            openAssignDriver(selectedReservation.id);
                            setSelectedReservation(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Assign Driver
                        </button>
                      )}
                      {selectedReservation.driverId && (
                        <button
                          onClick={() => {
                            setUnassignDriverModal({
                              reservationId: selectedReservation.id,
                            });
                            setSelectedReservation(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                        >
                          <UserMinus className="h-4 w-4" />
                          Unassign Driver
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setCancelModal({
                            id: selectedReservation.id,
                            customerName: selectedReservation.customerName,
                          });
                          setSelectedReservation(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        <Ban className="h-4 w-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Assign Driver
              </h3>
              <button
                onClick={() => setAssignModal(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Reservation:{" "}
                <span className="font-mono">{assignModal.reservationId}</span>
              </div>

              {driversLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Driver
                  </label>
                  <SingleSelectCombobox
                    value={selectedDriverId}
                    onValueChange={(v) => setSelectedDriverId(v)}
                    placeholder="Select a driver"
                    searchPlaceholder="Search drivers..."
                    options={drivers.map((d) => ({
                      value: d.id,
                      label: `${d.name}${d.onlineStatus ? " (online)" : ""}${d.placementStatus ? ` • ${d.placementStatus}` : ""}`,
                      keywords:
                        `${(d.servedCities || []).join(" ")} ${d.phoneNumber || ""} ${d.driverTrack || ""}`.trim(),
                    }))}
                  />

                  {selectedDriverId ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {(() => {
                        const drv = drivers.find(
                          (d) => d.id === selectedDriverId,
                        );
                        if (!drv) return null;
                        const cities = drv.servedCities?.length
                          ? `Cities: ${drv.servedCities.join(", ")}`
                          : null;
                        const phone = drv.phoneNumber
                          ? `Phone: ${drv.phoneNumber}`
                          : null;
                        return [cities, phone].filter(Boolean).join(" • ");
                      })()}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAssignModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDriver}
                disabled={
                  driversLoading ||
                  !selectedDriverId ||
                  actionLoading === assignModal.reservationId
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === assignModal.reservationId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {reassignVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Reassign Vehicle
              </h3>
              <button
                onClick={() => setReassignVehicleModal(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Reservation:{" "}
                <span className="font-mono">
                  {reassignVehicleModal.reservationId}
                </span>
              </div>

              {listingsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vehicle
                    </label>
                    <SingleSelectCombobox
                      value={selectedListingId}
                      onValueChange={(v) => setSelectedListingId(v)}
                      placeholder="Select a vehicle"
                      searchPlaceholder="Search vehicles..."
                      options={availableListings.map((l) => ({
                        value: l.id,
                        label: `${l.title} • ${l.city}${l.partnerId ? ` • partner ${l.partnerId}` : ""}`,
                        keywords:
                          `${l.category || ""} ${l.status || ""} ${l.adminActive ? "active" : "inactive"}`.trim(),
                      }))}
                    />
                    {selectedListingId ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {(() => {
                          const l = availableListings.find(
                            (x) => x.id === selectedListingId,
                          );
                          if (!l) return null;
                          const price = l.dayRateNgn
                            ? `Day: ${formatNgn(l.dayRateNgn)}`
                            : null;
                          const block = l.block4hRateNgn
                            ? `4h: ${formatNgn(l.block4hRateNgn)}`
                            : null;
                          return [price, block].filter(Boolean).join(" • ");
                        })()}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Settlement override (optional, NGN)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={settlementOverride}
                      onChange={(e) => setSettlementOverride(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="e.g. 50000"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setReassignVehicleModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignVehicle}
                disabled={
                  listingsLoading ||
                  !selectedListingId ||
                  actionLoading === reassignVehicleModal.reservationId
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === reassignVehicleModal.reservationId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Cancel Reservation
              </h3>
              <button
                onClick={() => {
                  setCancelModal(null);
                  setCancelReason("");
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  This will cancel the reservation for{" "}
                  <strong>{cancelModal.customerName}</strong>. This action
                  cannot be undone.
                </p>
              </div>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Cancellation Reason
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelModal(null);
                  setCancelReason("");
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelReservation}
                disabled={
                  actionLoading === cancelModal.id || !cancelReason.trim()
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === cancelModal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionModal
        isOpen={Boolean(unassignDriverModal)}
        onClose={() => setUnassignDriverModal(null)}
        title="Unassign Driver"
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            This will remove the assigned driver from this reservation. You can
            reassign a new driver afterwards.
          </div>
        }
        confirmText="Unassign"
        confirmVariant="destructive"
        loading={Boolean(
          unassignDriverModal &&
            actionLoading === unassignDriverModal.reservationId,
        )}
        onConfirm={() => {
          if (!unassignDriverModal) return;
          return handleUnassignDriver(unassignDriverModal.reservationId);
        }}
      />
    </div>
  );
}
