"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";

export type RentalUnit = "day" | "4h";

export interface RentalState {
  listingId?: string;
  rentalUnit?: RentalUnit;
  city?: string;
  pickupAddress?: string;
  returnAddress?: string;
  startDate?: string; // yyyy-mm-dd
  endDate?: string; // yyyy-mm-dd
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  passengers?: number;
  notes?: string;
  blocks?: number;
}

const defaultState: RentalState = {};

interface RentalContextValue {
  state: RentalState;
  setListing: (listingId?: string) => void;
  setRentalUnit: (unit?: RentalUnit) => void;
  setCity: (city?: string) => void;
  setPickupAddress: (addr?: string) => void;
  setReturnAddress: (addr?: string) => void;
  setSchedule: (
    s: Partial<
      Pick<RentalState, "startDate" | "endDate" | "startTime" | "endTime">
    >,
  ) => void;
  setPassengers: (n?: number) => void;
  setNotes: (notes?: string) => void;
  setBlocks: (blocks?: number) => void;
  reset: () => void;
}

const Ctx = createContext<RentalContextValue | undefined>(undefined);

export function useRental() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRental must be used within <RentalProvider>");
  return v;
}

export default function RentalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const STORAGE_KEY = "rideon:rentalDraft";
  const [state, setState] = useState<RentalState>(defaultState);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RentalState>;
        setState((s) => ({ ...s, ...parsed }));
      }
    } catch {}
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const setListing = useCallback(
    (listingId?: string) => setState((s) => ({ ...s, listingId })),
    [],
  );
  const setRentalUnit = useCallback(
    (rentalUnit?: RentalUnit) => setState((s) => ({ ...s, rentalUnit })),
    [],
  );
  const setCity = useCallback(
    (city?: string) => setState((s) => ({ ...s, city })),
    [],
  );
  const setPickupAddress = useCallback(
    (pickupAddress?: string) => setState((s) => ({ ...s, pickupAddress })),
    [],
  );
  const setReturnAddress = useCallback(
    (returnAddress?: string) => setState((s) => ({ ...s, returnAddress })),
    [],
  );
  const setSchedule = useCallback(
    (
      sched: Partial<
        Pick<RentalState, "startDate" | "endDate" | "startTime" | "endTime">
      >,
    ) => setState((s) => ({ ...s, ...sched })),
    [],
  );
  const setPassengers = useCallback((n?: number) => {
    const v = Math.max(1, Math.min(12, Math.floor(Number(n || 1))));
    setState((s) => ({ ...s, passengers: v }));
  }, []);
  const setNotes = useCallback(
    (notes?: string) => setState((s) => ({ ...s, notes })),
    [],
  );
  const setBlocks = useCallback(
    (blocks?: number) => setState((s) => ({ ...s, blocks })),
    [],
  );
  const reset = useCallback(() => {
    try {
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setState(defaultState);
  }, []);

  const value = useMemo<RentalContextValue>(
    () => ({
      state,
      setListing,
      setRentalUnit,
      setCity,
      setPickupAddress,
      setReturnAddress,
      setSchedule,
      setPassengers,
      setNotes,
      setBlocks,
      reset,
    }),
    [
      state,
      setListing,
      setRentalUnit,
      setCity,
      setPickupAddress,
      setReturnAddress,
      setSchedule,
      setPassengers,
      setNotes,
      setBlocks,
      reset,
    ],
  );

  return (
    <Ctx.Provider value={value}>{hydrated ? children : null}</Ctx.Provider>
  );
}
