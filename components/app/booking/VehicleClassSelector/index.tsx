"use client";

import React from "react";
import VehicleClassCard from "@/components/app/VehicleClassCard";
import type { VehicleClassName } from "@/components/app/BookingProvider";
import { useBooking } from "@/components/app/BookingProvider";
import { cn } from "@/lib/utils";

export interface VehicleClassSelectorProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const CAR_IMAGES: Record<VehicleClassName, string> = {
  "Rider Economy":
    "https://images.unsplash.com/photo-1549921296-3d5a72f12fb9?q=80&w=800&auto=format&fit=crop",
  "Rider General":
    "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?q=80&w=800&auto=format&fit=crop",
  "Rider Coffee":
    "https://images.unsplash.com/photo-1511910849309-0dffb3980f5b?q=80&w=800&auto=format&fit=crop",
  "Rider Dogon":
    "https://images.unsplash.com/photo-1511396275277-3d51a53f6c87?q=80&w=800&auto=format&fit=crop",
  "Executive SUV":
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop",
  "Group Van":
    "https://images.unsplash.com/photo-1519582172808-3b64622b20f1?q=80&w=800&auto=format&fit=crop",
};

const PASSENGERS: Record<VehicleClassName, number> = {
  "Rider Economy": 4,
  "Rider General": 4,
  "Rider Coffee": 4,
  "Rider Dogon": 4,
  "Executive SUV": 6,
  "Group Van": 12,
};

const CLASS_ORDER: VehicleClassName[] = [
  "Rider Economy",
  "Rider General",
  "Rider Coffee",
  "Rider Dogon",
  "Executive SUV",
  "Group Van",
];

export default function VehicleClassSelector({
  className,
  ...rest
}: VehicleClassSelectorProps) {
  const { state, setVehicleClass } = useBooking();

  const estimatePriceFor = React.useCallback(
    (cls: VehicleClassName) => {
      const distance = state.distanceKm ?? 12;
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
      return Math.round(distance * classRate[cls] * days);
    },
    [state.distanceKm, state.endDate, state.startDate],
  );

  return (
    <div className={cn("w-full", className)} {...rest}>
      <div className="flex items-stretch gap-4 overflow-x-auto snap-x snap-mandatory pb-1 pt-1 -mx-1 px-1">
        {CLASS_ORDER.map((cls, idx) => (
          <VehicleClassCard
            key={cls}
            name={cls}
            passengers={PASSENGERS[cls]}
            etaMins={idx + 2}
            imgSrc={CAR_IMAGES[cls]}
            priceNgn={estimatePriceFor(cls)}
            selected={state.vehicleClass === cls}
            recommended={cls === "Rider Economy"}
            onClick={() => setVehicleClass(cls)}
          />
        ))}
      </div>
    </div>
  );
}
