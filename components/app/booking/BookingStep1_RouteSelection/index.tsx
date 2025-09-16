"use client";

import * as React from "react";
import LocationInputFields, { LocationValue } from "@/components/app/booking/LocationInputFields";
import VehicleClassSelector, { VehicleClassOption } from "@/components/app/booking/VehicleClassSelector";
import Button from "@/components/ui/Button";

export interface BookingStep1RouteSelectionProps extends React.ComponentPropsWithoutRef<'section'> {
  pickup: LocationValue | null;
  dropoff: LocationValue | null;
  onPickupSelect: (loc: LocationValue) => void;
  onDropoffSelect: (loc: LocationValue) => void;
  selectedVehicle: VehicleClassOption | null;
  onVehicleSelect: (v: VehicleClassOption) => void;
  onNext: () => void;
}

export default function BookingStep1_RouteSelection({
  pickup,
  dropoff,
  onPickupSelect,
  onDropoffSelect,
  selectedVehicle,
  onVehicleSelect,
  onNext,
  className,
  ...props
}: BookingStep1RouteSelectionProps) {
  const canProceed = Boolean(pickup?.address && dropoff?.address && selectedVehicle);

  return (
    <section className={className} {...props}>
      {/* Progress */}
      <p className="text-xs text-slate-500">Step 1 of 3: <span className="font-medium text-slate-800 dark:text-slate-200">Your Ride</span></p>

      {/* Inputs */}
      <div className="mt-3">
        <LocationInputFields
          pickup={pickup}
          dropoff={dropoff}
          onPickupSelect={onPickupSelect}
          onDropoffSelect={onDropoffSelect}
        />
      </div>

      {/* Vehicles */}
      <div className="mt-5">
        <VehicleClassSelector
          routeDetails={{
            pickup: { lat: pickup?.lat, lng: pickup?.lng },
            dropoff: { lat: dropoff?.lat, lng: dropoff?.lng },
          }}
          selectedId={selectedVehicle?.id ?? null}
          onSelect={onVehicleSelect}
        />
      </div>

      {/* Next button anchored */}
      <div className="mt-6">
        <Button className="w-full" disabled={!canProceed} onClick={onNext}>
          Next: Schedule
        </Button>
      </div>
    </section>
  );
}
