"use client";

import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import DriverRatingStats from "../DriverRatingStats";
import RecentFeedback from "../RecentFeedback";
import type { FeedbackItem } from "../RecentFeedback";

export interface DriverRatingsSectionProps
  extends React.ComponentPropsWithoutRef<"div"> {
  /** Initial thumbs up count from server */
  initialThumbsUp?: number;
  /** Initial thumbs down count from server */
  initialThumbsDown?: number;
}

export default function DriverRatingsSection({
  initialThumbsUp = 0,
  initialThumbsDown = 0,
  className,
  ...rest
}: DriverRatingsSectionProps) {
  const [loading, setLoading] = React.useState(true);
  const [thumbsUp, setThumbsUp] = React.useState(initialThumbsUp);
  const [thumbsDown, setThumbsDown] = React.useState(initialThumbsDown);
  const [recentFeedback, setRecentFeedback] = React.useState<FeedbackItem[]>(
    [],
  );

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/driver/ratings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          setThumbsUp(data.stats?.thumbsUp ?? 0);
          setThumbsDown(data.stats?.thumbsDown ?? 0);
          setRecentFeedback(data.recentFeedback ?? []);
        }
      } catch (e) {
        console.error("Failed to fetch driver ratings:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Skeleton loading state
  if (loading) {
    return (
      <div
        className={[
          "grid grid-cols-1 lg:grid-cols-2 gap-6",
          className || "",
        ].join(" ")}
        {...rest}
      >
        {/* Rating Stats Skeleton */}
        <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-32 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
          </div>
          <div className="mb-4">
            <div className="h-10 w-24 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse mb-2" />
            <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/30"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse mb-1.5" />
                <div className="h-6 w-8 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse mb-1" />
                <div className="h-3 w-16 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Feedback Skeleton */}
        <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-32 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/30"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200/80 dark:bg-slate-700/60 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 w-24 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
                      <div className="h-3 w-16 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
                    </div>
                    <div className="h-3 w-3/4 bg-slate-200/80 dark:bg-slate-700/60 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "grid grid-cols-1 lg:grid-cols-2 gap-6",
        className || "",
      ].join(" ")}
      {...rest}
    >
      <DriverRatingStats thumbsUp={thumbsUp} thumbsDown={thumbsDown} />
      <RecentFeedback items={recentFeedback} />
    </div>
  );
}
