"use client";

import React from "react";
import { Calendar, Car, MapPin, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBooking } from "@/components/app/BookingProvider";

export interface BookingSummaryProps
  extends React.ComponentPropsWithoutRef<"div"> {}

export default function BookingSummary({
  className,
  ...rest
}: BookingSummaryProps) {
  const { state, estimateFare } = useBooking();
  const fare = estimateFare();

  return (
    <div className={cn("space-y-5", className)} {...rest}>
      <div>
        <h3 className="text-[18px] tracking-tight font-medium text-slate-900 dark:text-slate-100 mb-3">
          Booking Details
        </h3>
        <div className="space-y-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4 backdrop-blur-lg shadow-lg">
          <Row icon={<MapPin className="h-5 w-5" />} label="Route">
            <p className="text-[14px] font-normal text-slate-800 dark:text-slate-200">
              {state.pickupAddress || "Pickup"} →{" "}
              {state.dropoffAddress || "Drop-off"}
            </p>
          </Row>
          <Row icon={<Calendar className="h-5 w-5" />} label="Date & Time">
            <p className="text-[14px] font-normal text-slate-800 dark:text-slate-200">
              {state.startDate || "Date"}{" "}
              {state.startTime ? `• ${state.startTime}` : ""}
              {state.endDate
                ? ` → ${state.endDate}${state.endTime ? ` • ${state.endTime}` : ""}`
                : ""}
            </p>
          </Row>
          <Row icon={<Car className="h-5 w-5" />} label="Vehicle">
            <p className="text-[14px] font-normal text-slate-800 dark:text-slate-200">
              {state.vehicleClass || "Select vehicle"}
            </p>
          </Row>
          <Row icon={<StickyNote className="h-5 w-5" />} label="Notes">
            <p className="text-[14px] font-normal text-slate-800 dark:text-slate-200 italic">
              {state.notes?.trim() ? `"${state.notes}"` : "None"}
            </p>
          </Row>
        </div>
      </div>

      <div>
        <h3 className="text-[18px] tracking-tight font-medium text-slate-900 dark:text-slate-100 mb-3">
          Fare Breakdown
        </h3>
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 p-4 backdrop-blur-lg shadow-lg">
          <div className="space-y-2 text-[14px]">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Base Fare</span>
              <span className="font-normal text-slate-800 dark:text-slate-200">
                ₦
                {new Intl.NumberFormat("en-NG").format(Math.round(fare * 0.93))}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Fees & Taxes</span>
              <span className="font-normal text-slate-800 dark:text-slate-200">
                ₦
                {new Intl.NumberFormat("en-NG").format(Math.round(fare * 0.07))}
              </span>
            </div>
          </div>
          <hr className="border-slate-200/80 dark:border-slate-800/60 my-3" />
          <div className="flex justify-between items-center font-medium text-slate-900 dark:text-slate-100">
            <span className="text-[15px]">Total</span>
            <span className="text-lg text-[#00529B]">
              ₦{new Intl.NumberFormat("en-NG").format(fare)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-[#00529B]">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[13px] text-slate-600 dark:text-slate-400">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
