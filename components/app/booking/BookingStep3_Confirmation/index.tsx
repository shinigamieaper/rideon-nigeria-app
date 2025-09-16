"use client";

import * as React from "react";
import Button from "@/components/ui/Button";
import PaymentMethodSelector, { PaymentMethod } from "@/components/app/booking/PaymentMethodSelector";
import { LocationValue } from "@/components/app/booking/LocationInputFields";
import { VehicleClassOption } from "@/components/app/booking/VehicleClassSelector";

export interface BookingStep3ConfirmationProps extends React.ComponentPropsWithoutRef<'section'> {
  pickup: LocationValue;
  dropoff: LocationValue;
  vehicle: VehicleClassOption;
  schedule: { date: string; time: string };
  notes?: string;
  paymentMethod: PaymentMethod | null;
  onPaymentMethodChange: (m: PaymentMethod | null) => void;
  onBack: () => void;
  onConfirm: () => void;
}

function formatDateTime(date: string, time: string) {
  try {
    const dt = new Date(`${date}T${time}:00`);
    return dt.toLocaleString(undefined, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return `${date} ${time}`;
  }
}

export default function BookingStep3_Confirmation({ pickup, dropoff, vehicle, schedule, notes, paymentMethod, onPaymentMethodChange, onBack, onConfirm, className, ...props }: BookingStep3ConfirmationProps) {
  const baseFare = vehicle.price;
  const taxes = Math.round(baseFare * 0.075); // 7.5% VAT
  const fees = 200; // service fee
  const total = baseFare + taxes + fees;

  const confirmDisabled = !paymentMethod;

  return (
    <section className={className} {...props}>
      {/* Progress */}
      <p className="text-xs text-slate-500">Step 3 of 3: <span className="font-medium text-slate-800 dark:text-slate-200">Confirm & Pay</span></p>

      <div className="mt-4 space-y-4">
        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Trip Summary</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
            <li><span className="font-medium">Route:</span> Pickup: {pickup.address}, Drop-off: {dropoff.address}</li>
            <li><span className="font-medium">Date & Time:</span> {formatDateTime(schedule.date, schedule.time)}</li>
            <li><span className="font-medium">Vehicle:</span> {vehicle.name}</li>
            <li><span className="font-medium">Notes:</span> {notes?.trim() ? notes : 'None'}</li>
          </ul>
        </div>

        {/* Fare breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Fare Breakdown</h3>
          <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <div className="flex items-center justify-between py-1"><span>Base Fare</span><span>₦{baseFare.toLocaleString()}</span></div>
            <div className="flex items-center justify-between py-1"><span>Taxes/Fees (VAT 7.5%)</span><span>₦{taxes.toLocaleString()}</span></div>
            <div className="flex items-center justify-between py-1"><span>Service Fee</span><span>₦{fees.toLocaleString()}</span></div>
            <div className="flex items-center justify-between py-2 font-semibold text-slate-900 dark:text-slate-100"><span>Total</span><span>₦{total.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Payment method */}
        <PaymentMethodSelector value={paymentMethod} onChange={onPaymentMethodChange} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" className="w-full" onClick={onBack}>Back</Button>
        <Button className="w-full" disabled={confirmDisabled} onClick={onConfirm}>
          Confirm & Book for ₦{total.toLocaleString()}
        </Button>
      </div>
    </section>
  );
}
