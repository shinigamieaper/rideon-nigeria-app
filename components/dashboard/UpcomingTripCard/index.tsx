"use client";

import React from "react";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export interface BookingSummary {
  _id: string;
  scheduledPickupTime: string; // ISO
  pickupAddress: string;
  dropoffAddress: string;
  status?: string;
}

export interface UpcomingTripCardProps extends React.ComponentPropsWithoutRef<"div"> {
  booking: BookingSummary | null;
  isLoading?: boolean;
}

export default function UpcomingTripCard({ booking, isLoading, className, ...rest }: UpcomingTripCardProps) {
  const cardCls = [
    "rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
    className ?? "",
  ].join(" ");

  if (isLoading) {
    return (
      <div className={cardCls} {...rest}>
        <div className="p-5">
          <Skeleton width={140} height={20} borderRadius={8} />
          <div className="mt-3">
            <Skeleton width={180} height={16} borderRadius={8} />
          </div>
          <div className="mt-2 space-y-2">
            <Skeleton height={14} borderRadius={8} />
            <Skeleton height={14} borderRadius={8} />
          </div>
          <div className="mt-4">
            <Skeleton height={36} borderRadius={999} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardCls} {...rest}>
      <div className="p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Your Next Trip</h2>
        {booking ? (
          <>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {formatWhen(booking.scheduledPickupTime)}
            </p>
            <div className="mt-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-slate-500">Pickup</p>
                  <p className="text-slate-800 dark:text-slate-200">{booking.pickupAddress}</p>
                </div>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-sky-500" />
                <div>
                  <p className="text-slate-500">Drop-off</p>
                  <p className="text-slate-800 dark:text-slate-200">{booking.dropoffAddress}</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href={`/app/trips/${booking._id}`}
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-white/10 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-white dark:hover:bg-white/5 transition-colors"
              >
                View Trip Details
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No upcoming trip scheduled.</p>
        )}
      </div>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const time = d.toLocaleTimeString(undefined, opts);
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}
