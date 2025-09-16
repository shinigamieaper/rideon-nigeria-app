"use client";

import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export interface DashboardSkeletonProps extends React.ComponentPropsWithoutRef<"section"> {}

export default function DashboardSkeleton({ className, ...rest }: DashboardSkeletonProps) {
  return (
    <section className={className} {...rest}>
      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl px-4 pt-20 pb-16 bg-background">
        {/* Greeting placeholder */}
        <div className="mb-4">
          <Skeleton width="40%" height={32} borderRadius={8} />
        </div>

        {/* Primary Action Card placeholder */}
        <div className="mb-6">
          <Skeleton height={120} borderRadius={12} />
        </div>

        {/* Upcoming Trip placeholder */}
        <div className="mb-6 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg">
          <Skeleton width={140} height={20} borderRadius={8} />
          <div className="mt-3 space-y-2">
            <Skeleton height={14} borderRadius={8} />
            <Skeleton height={14} borderRadius={8} />
          </div>
          <div className="mt-4">
            <Skeleton height={36} borderRadius={999} />
          </div>
        </div>

        {/* Recent Activity placeholder */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg">
          <Skeleton width={140} height={20} borderRadius={8} />
          <div className="mt-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton circle width={36} height={36} />
                <div className="flex-1 min-w-0"><Skeleton height={14} borderRadius={8} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
