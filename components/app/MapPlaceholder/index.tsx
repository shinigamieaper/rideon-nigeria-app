"use client";

import Image from "next/image";
import React from "react";
import { cn } from "@/lib/utils";

export interface MapPlaceholderProps
  extends React.ComponentPropsWithoutRef<"div"> {
  height?: number | string;
  children?: React.ReactNode;
}

export default function MapPlaceholder({
  height = 240,
  className,
  children,
  ...rest
}: MapPlaceholderProps) {
  return (
    <div
      className={cn(
        "relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg",
        typeof height === "number" ? `h-[${height}px]` : "",
        className,
      )}
      style={typeof height === "number" ? { height } : undefined}
      {...rest}
    >
      <Image
        src="https://images.unsplash.com/photo-1533674689012-136b487f0651?q=80&w=1600&auto=format&fit=crop"
        alt="Map preview"
        fill
        priority
        className="object-cover opacity-30"
      />
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <path
            d="M40 150 C 110 110, 140 50, 210 80 S 300 170, 360 120"
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <g>
            <circle cx="40" cy="150" r="14" fill="#3b82f6" opacity=".25" />
            <circle cx="40" cy="150" r="6" fill="#3b82f6" />
          </g>
          <g>
            <circle cx="360" cy="120" r="16" fill="#06b6d4" opacity=".25" />
            <circle cx="360" cy="120" r="7" fill="#06b6d4" />
          </g>
        </svg>
      </div>
      <div className="relative z-10 p-4 sm:p-5">{children}</div>
    </div>
  );
}
