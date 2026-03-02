"use client";

import React from "react";
import Image from "next/image";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VehicleClassName } from "@/components/app/BookingProvider";

export interface VehicleClassListProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onSelect"> {
  selected?: VehicleClassName;
  onSelect?: (cls: VehicleClassName) => void;
  prices?: Partial<Record<VehicleClassName, number>>;
}

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

export default function VehicleClassList({
  selected,
  onSelect,
  prices,
  className,
  ...rest
}: VehicleClassListProps) {
  const estimateFor = React.useCallback((cls: VehicleClassName) => {
    // Simple visual-only estimate; can be replaced by server price later
    const base: Record<VehicleClassName, number> = {
      "Rider Economy": 450,
      "Rider General": 550,
      "Rider Coffee": 600,
      "Rider Dogon": 700,
      "Executive SUV": 950,
      "Group Van": 1100,
    } as const;
    const distance = 12;
    return Math.round(distance * base[cls]);
  }, []);

  return (
    <div className={cn("space-y-3", className)} {...rest}>
      {CLASS_ORDER.map((cls) => {
        const price = prices?.[cls] ?? estimateFor(cls);
        const isSelected = selected === cls;
        const isRecommended = cls === "Rider Economy";
        return (
          <button
            key={cls}
            type="button"
            onClick={() => onSelect?.(cls)}
            className={cn(
              "w-full flex items-center gap-4 rounded-2xl px-4 py-3 text-left",
              "bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60",
              "backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5",
              isSelected && "ring-2 ring-[#00529B]",
            )}
          >
            <div className="relative h-14 w-24 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              <Image
                src={CAR_IMAGES[cls]}
                alt={cls}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100 tracking-tight">
                  {cls}
                </p>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  ₦{new Intl.NumberFormat("en-NG").format(price)}
                </p>
              </div>
              <div className="mt-1 flex items-center gap-4 text-[12px] text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {PASSENGERS[cls]}
                </span>
                {isRecommended && (
                  <span className="ml-auto rounded-full bg-[#00529B] px-2 py-0.5 text-[11px] text-white">
                    Recommended
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
