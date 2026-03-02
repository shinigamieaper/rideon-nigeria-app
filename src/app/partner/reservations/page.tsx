"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Calendar, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { usePartnerTeam } from "@/hooks";

type ReservationStatus = string;

interface ReservationRow {
  id: string;
  status: ReservationStatus;
  listingId: string | null;
  city: string | null;
  rentalUnit: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  scheduledPickupTime: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  fareNgn: number | null;
  paymentStatus: string;
  createdAt: string | null;
  partnerDriverId: string | null;
  partnerDriverInfo: unknown;
  partnerDispatchStatus: string | null;
}

interface PartnerVehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  city: string;
  seats: number | null;
  status: string | null;
}

interface ActiveLink {
  id: string;
  status: "active" | "inactive";
  vehicleId: string;
  driverId: string;
}

function getPartnerDriverName(info: unknown): string | null {
  if (!info || typeof info !== "object") return null;
  const rec = info as Record<string, unknown>;
  return typeof rec.name === "string" && rec.name.trim() ? rec.name : null;
}

function partnerDispatchPill(status: string | null) {
  const s = String(status || "").trim();
  if (!s) return null;
  const isDispatched = s === "dispatched";
  const cls = isDispatched
    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200";
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}
    >
      partner: {s.replace("_", " ")}
    </span>
  );
}

function formatNgn(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PartnerReservationsPage() {
  const router = useRouter();
  const { isTeamMember, teamRole } = usePartnerTeam();
  const isReadOnlyTeam =
    isTeamMember && teamRole !== "admin" && teamRole !== "manager";

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ReservationRow[]>([]);

  const [vehicles, setVehicles] = React.useState<PartnerVehicle[]>([]);
  const [links, setLinks] = React.useState<ActiveLink[]>([]);
  const [assigningId, setAssigningId] = React.useState<string | null>(null);

  const loadReservations = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      let token = await user.getIdToken();
      const fetchList = async (t: string) =>
        fetch("/api/partner/reservations?limit=50", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });

      let res = await fetchList(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await fetchList(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to load reservations.");
      }

      const j = await res.json();
      setRows(
        Array.isArray(j?.reservations)
          ? (j.reservations as ReservationRow[])
          : [],
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadFleet = React.useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }

      let token = await user.getIdToken();
      const fetchData = async (t: string) =>
        fetch("/api/partner/vehicle-driver-links", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });

      let res = await fetchData(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await fetchData(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to load fleet.");
      }

      const j = await res.json();
      const nextVehicles = Array.isArray(j?.vehicles)
        ? (j.vehicles as PartnerVehicle[])
        : [];
      const nextLinks = Array.isArray(j?.links)
        ? (j.links as ActiveLink[])
        : [];
      setVehicles(nextVehicles);
      setLinks(nextLinks);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to load fleet.");
    } finally {
    }
  }, [router]);

  React.useEffect(() => {
    loadReservations();
    loadFleet();
  }, [loadReservations, loadFleet]);

  const getLinkedDriverIdForVehicle = (vehicleId: string) => {
    const link = links.find(
      (l) => l.vehicleId === vehicleId && l.status === "active",
    );
    return link?.driverId || null;
  };

  const assign = async (reservationId: string, vehicleId: string) => {
    if (isReadOnlyTeam) return;
    if (!vehicleId) {
      setErr("Reservation is missing listingId (vehicle).");
      return;
    }

    const driverId = getLinkedDriverIdForVehicle(vehicleId);
    if (!driverId) {
      setErr(
        "This reservation’s vehicle has no linked driver. Assign a driver to the vehicle first.",
      );
      return;
    }

    setAssigningId(reservationId);
    setErr(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      let token = await user.getIdToken();

      const doAssign = async (t: string) =>
        fetch(
          `/api/partner/reservations/${encodeURIComponent(reservationId)}/assign`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${t}`,
            },
            body: JSON.stringify({ vehicleId }),
          },
        );

      let res = await doAssign(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doAssign(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to assign reservation.");
      }

      await loadReservations();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to assign reservation.");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Reservations
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          View reservations for your fleet listings and dispatch your linked
          drivers.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-red-200/80 dark:border-red-800/40 shadow-lg p-6">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Something went wrong</p>
              <p className="text-sm">{err}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Loading reservations…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600 dark:text-slate-400">
            <Calendar className="h-10 w-10 opacity-60" />
            <p className="mt-3 text-sm font-semibold">No reservations found</p>
            <p className="mt-1 text-sm">
              Reservations will appear when customers book your vehicles.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/50 dark:divide-slate-800/60">
            {rows.map((r) => {
              const vehicleId = String(r.listingId || "").trim();
              const linkedDriverId = vehicleId
                ? getLinkedDriverIdForVehicle(vehicleId)
                : null;
              const canDispatch = Boolean(vehicleId) && Boolean(linkedDriverId);
              const busy = assigningId === r.id;
              const assignedName =
                getPartnerDriverName(r.partnerDriverInfo) ||
                (r.partnerDriverId ? "Assigned" : null);
              const vehicleName = (() => {
                if (!vehicleId) return null;
                const v = vehicles.find((x) => x.id === vehicleId);
                if (!v) return null;
                return `${v.make} ${v.model}`.trim() || "Vehicle";
              })();

              return (
                <div key={r.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Reservation #{r.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {r.city || "—"} • {r.rentalUnit || "—"} • {r.status}
                      </p>
                      <div className="mt-2">
                        {partnerDispatchPill(r.partnerDispatchStatus)}
                      </div>
                      {vehicleName ? (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Vehicle:{" "}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {vehicleName}
                          </span>
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 truncate">
                        Pickup: {r.pickupAddress || "—"}
                      </p>
                      {r.dropoffAddress ? (
                        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                          Dropoff: {r.dropoffAddress}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Fare:{" "}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatNgn(r.fareNgn)}
                        </span>
                        <span className="ml-2 text-xs">
                          ({r.paymentStatus})
                        </span>
                      </p>
                      {assignedName ? (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          Dispatched driver:{" "}
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {assignedName}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 lg:items-center">
                      <button
                        type="button"
                        disabled={!canDispatch || busy || isReadOnlyTeam}
                        onClick={() => assign(r.id, vehicleId)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: "#00529B" }}
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Dispatch linked driver
                      </button>
                      {!vehicleId ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No vehicle assigned
                        </p>
                      ) : !linkedDriverId ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No linked driver for vehicle
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
