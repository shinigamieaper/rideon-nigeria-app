"use client";

import Image from "next/image";
import React from "react";
import { Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehicleClassName } from "../BookingProvider";

export interface VehicleClassCardProps
  extends React.ComponentPropsWithoutRef<"button"> {
  name: VehicleClassName;
  priceNgn: number;
  etaMins?: number;
  passengers: number;
  imgSrc: string;
  selected?: boolean;
  recommended?: boolean;
}

export default function VehicleClassCard({
  name,
  priceNgn,
  etaMins,
  passengers,
  imgSrc,
  selected,
  recommended,
  className,
  ...rest
}: VehicleClassCardProps) {
  return (
    <button
      className={cn(
        "group relative w-[280px] shrink-0 snap-start rounded-2xl text-left",
        "bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60",
        "backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5",
        selected && "ring-2 ring-[#00529B]",
        className,
      )}
      {...rest}
    >
      {recommended && (
        <span className="absolute left-3 top-3 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/90 text-white shadow">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-4 p-4">
        <div className="relative h-16 w-28 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
          <Image src={imgSrc} alt={name} fill className="object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100 tracking-tight">
              {name}
            </p>
            <p className="text-[15px] font-semibold text-[#00529B]">
              ₦{new Intl.NumberFormat("en-NG").format(priceNgn)}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-slate-600 dark:text-slate-400">
            {typeof etaMins === "number" && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                {etaMins} min
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
              {passengers}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
