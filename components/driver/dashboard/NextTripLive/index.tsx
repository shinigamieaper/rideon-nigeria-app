"use client";

import * as React from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db, waitForUser } from "@/lib/firebase";
import { UpNextCard, type UpNextCardTrip } from "@/components";

export interface NextTripLiveProps
  extends React.ComponentPropsWithoutRef<"div"> {
  fallbackTrip?: UpNextCardTrip | null;
  isNewDriver?: boolean;
}

export default function NextTripLive({
  fallbackTrip = null,
  isNewDriver = false,
  className,
  ...rest
}: NextTripLiveProps) {
  const [trip, setTrip] = React.useState<UpNextCardTrip | null>(fallbackTrip);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;
    (async () => {
      try {
        const u = await waitForUser(3500);
        if (!mounted) return;
        const now = new Date();
        // IMPORTANT: Only show trips the driver has ACCEPTED (not just assigned)
        // 'driver_assigned' = pending acceptance, 'confirmed' = driver accepted
        const q = query(
          collection(db, "bookings"),
          where("driverId", "==", u.uid),
          where("status", "in", ["confirmed", "en_route", "in_progress"]),
          where("scheduledPickupTime", ">=", now),
          orderBy("scheduledPickupTime", "asc"),
          limit(1),
        );
        unsub = onSnapshot(q, (snap) => {
          if (snap.empty) {
            setTrip(null);
            return;
          }
          const d = snap.docs[0]!.data() as any;
          const sched: Date =
            d?.scheduledPickupTime instanceof Timestamp
              ? d.scheduledPickupTime.toDate()
              : (d?.scheduledPickupTime as Date | string);

          // Extract coordinates from GeoPoint if available
          let pickupCoords: [number, number] | undefined;
          let dropoffCoords: [number, number] | undefined;
          if (d?.pickupLocation?.coordinates) {
            pickupCoords = [
              d.pickupLocation.coordinates[0],
              d.pickupLocation.coordinates[1],
            ];
          }
          if (d?.dropoffLocation?.coordinates) {
            dropoffCoords = [
              d.dropoffLocation.coordinates[0],
              d.dropoffLocation.coordinates[1],
            ];
          }

          const t: UpNextCardTrip = {
            _id: snap.docs[0]!.id,
            pickupAddress: String(d?.pickupAddress || ""),
            dropoffAddress: d?.dropoffAddress
              ? String(d.dropoffAddress)
              : undefined,
            pickupCoords,
            dropoffCoords,
            scheduledPickupTime: sched,
            fare: Number(
              d?.driverPayoutNgn ||
                d?.driverPayout ||
                d?.fareNgn ||
                d?.fare ||
                0,
            ),
            // Rental-specific fields
            rentalUnit: d?.rentalUnit as "day" | "4h" | undefined,
            city: d?.city ? String(d.city) : undefined,
            startDate: d?.startDate ? String(d.startDate) : undefined,
            endDate: d?.endDate ? String(d.endDate) : undefined,
            startTime: d?.startTime ? String(d.startTime) : undefined,
            endTime: d?.endTime ? String(d.endTime) : undefined,
          };
          setTrip(t);
        });
      } catch (err) {
        if (!mounted) return;
        console.warn(
          "[NextTripLive] failed to subscribe to upcoming trips",
          err,
        );
        setTrip(null);
      }
    })();
    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  return (
    <UpNextCard
      trip={trip}
      isNewDriver={isNewDriver}
      className={className}
      {...rest}
    />
  );
}
