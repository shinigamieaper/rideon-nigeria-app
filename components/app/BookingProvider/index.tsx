"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type VehicleClassName =
  | "Rider Economy"
  | "Rider General"
  | "Rider Coffee"
  | "Rider Dogon"
  | "Executive SUV"
  | "Group Van";

export interface BookingState {
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords?: [number, number]; // [lon, lat]
  dropoffCoords?: [number, number];
  vehicleClass?: VehicleClassName;
  passengers?: number;
  distanceKm?: number;
  etaMins?: number;
  // Multi-day chauffeur support
  startDate?: string; // yyyy-mm-dd
  endDate?: string; // yyyy-mm-dd
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  notes?: string;
  fareNgn?: number;
}

const defaultState: BookingState = {
  pickupAddress: "",
  dropoffAddress: "",
};

interface BookingContextValue {
  state: BookingState;
  setPickup: (address: string, coords?: [number, number]) => void;
  setDropoff: (address: string, coords?: [number, number]) => void;
  setVehicleClass: (cls?: VehicleClassName) => void;
  setPassengers: (count: number) => void;
  setSchedule: (
    schedule: Partial<
      Pick<BookingState, "startDate" | "endDate" | "startTime" | "endTime">
    >,
  ) => void;
  setNotes: (notes: string) => void;
  setDistanceEta: (distanceKm?: number, etaMins?: number) => void;
  setFareNgn: (fare?: number) => void;
  estimateFare: () => number;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(
  undefined,
);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within <BookingProvider>");
  return ctx;
}

export default function BookingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<BookingState>(defaultState);
  const STORAGE_KEY = "rideon:bookingDraft";
  const [hydrated, setHydrated] = React.useState(false);

  // Load persisted draft on first mount (survives external redirects)
  React.useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BookingState>;
        // Merge to avoid wiping any future defaults
        setState((s) => ({ ...s, ...parsed }));
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist whenever state changes
  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota or serialization errors
    }
  }, [state]);

  const setPickup = useCallback(
    (address: string, coords?: [number, number]) => {
      setState((s) => ({ ...s, pickupAddress: address, pickupCoords: coords }));
    },
    [],
  );

  const setDropoff = useCallback(
    (address: string, coords?: [number, number]) => {
      setState((s) => ({
        ...s,
        dropoffAddress: address,
        dropoffCoords: coords,
      }));
    },
    [],
  );

  const setVehicleClass = useCallback((cls?: VehicleClassName) => {
    setState((s) => ({ ...s, vehicleClass: cls }));
  }, []);

  const setPassengers = useCallback((count: number) => {
    const n = Math.max(1, Math.min(12, Math.floor(Number(count) || 1)));
    setState((s) => ({ ...s, passengers: n }));
  }, []);

  const setSchedule = useCallback(
    (
      schedule: Partial<
        Pick<BookingState, "startDate" | "endDate" | "startTime" | "endTime">
      >,
    ) => {
      setState((s) => ({ ...s, ...schedule }));
    },
    [],
  );

  const setNotes = useCallback((notes: string) => {
    setState((s) => ({ ...s, notes }));
  }, []);

  const setDistanceEta = useCallback(
    (distanceKm?: number, etaMins?: number) => {
      setState((s) => ({ ...s, distanceKm, etaMins }));
    },
    [],
  );

  const setFareNgn = useCallback((fare?: number) => {
    setState((s) => ({ ...s, fareNgn: fare }));
  }, []);

  const estimateFare = useCallback(() => {
    // Very lightweight on-frontend fare estimation for visuals only
    const distance = state.distanceKm ?? 12; // default demo distance
    const days =
      state.startDate && state.endDate
        ? Math.max(
            1,
            Math.ceil(
              (Date.parse(state.endDate) - Date.parse(state.startDate)) /
                (1000 * 60 * 60 * 24),
            ) + 1,
          )
        : 1;

    const classRate: Record<VehicleClassName, number> = {
      "Rider Economy": 450,
      "Rider General": 550,
      "Rider Coffee": 600,
      "Rider Dogon": 700,
      "Executive SUV": 950,
      "Group Van": 1100,
    } as const;

    const base = state.vehicleClass ? classRate[state.vehicleClass] : 500;
    const estimated = Math.round(distance * base * days);
    return estimated;
  }, [state.distanceKm, state.endDate, state.startDate, state.vehicleClass]);

  const reset = useCallback(() => {
    try {
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setState(defaultState);
  }, []);

  const value = useMemo<BookingContextValue>(
    () => ({
      state,
      setPickup,
      setDropoff,
      setVehicleClass,
      setPassengers,
      setSchedule,
      setNotes,
      setDistanceEta,
      setFareNgn,
      estimateFare,
      reset,
    }),
    [
      state,
      setPickup,
      setDropoff,
      setVehicleClass,
      setPassengers,
      setSchedule,
      setNotes,
      setDistanceEta,
      setFareNgn,
      estimateFare,
      reset,
    ],
  );

  return (
    <BookingContext.Provider value={value}>
      {hydrated ? children : null}
    </BookingContext.Provider>
  );
}
