import React from "react";
import UpcomingTripCard from "../UpcomingTripCard";
import RecentActivityFeed from "../RecentActivityFeed";

export interface BookingSummary {
  _id: string;
  scheduledPickupTime: string; // ISO string
  pickupAddress: string;
  dropoffAddress: string;
  status?: string;
}

export interface ActivityItem {
  id: string;
  type: "completed" | "hired_driver" | "cancelled" | "requested" | "confirmed" | "other";
  description: string;
  amount?: number;
  timestamp: string; // ISO
}

export interface DashboardViewProps extends React.ComponentPropsWithoutRef<"section"> {
  firstName?: string;
  upcomingTrip: BookingSummary | null;
  recentActivity: ActivityItem[];
}

export default function DashboardView({ firstName, upcomingTrip, recentActivity, className, ...rest }: DashboardViewProps) {
  return (
    <section className={["min-h-screen", className ?? ""].join(" ")} {...rest}>
      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl px-4 pt-20 pb-16 bg-background">
        {/* Greeting */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {getGreeting()}, {firstName ? `${firstName}.` : "there."}
          </h1>
        </div>

        {/* Primary Action Card */}
        <div className="rounded-xl shadow-md overflow-hidden mb-6 border border-slate-200/80 dark:border-slate-800/60"
             style={{ background: "linear-gradient(135deg, #00529B 0%, #003f7a 100%)" }}>
          <div className="grid grid-cols-2 divide-x divide-white/15">
            <a href="/services/pre-booked-rides" className="flex flex-col items-center justify-center py-6 text-white hover:bg-white/10 transition-colors">
              <span className="text-sm font-semibold">Book a Ride</span>
            </a>
            <a href="/services/hire-a-driver" className="flex flex-col items-center justify-center py-6 text-white hover:bg-white/10 transition-colors">
              <span className="text-sm font-semibold">Hire a Driver</span>
            </a>
          </div>
        </div>

        {/* Data Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4 gap-6">
          <div>
            <UpcomingTripCard booking={upcomingTrip} isLoading={!upcomingTrip && recentActivity.length === 0} />
          </div>
          <div>
            <RecentActivityFeed activity={recentActivity} isLoading={!upcomingTrip && recentActivity.length === 0} />
          </div>
        </div>
      </div>
    </section>
  );
}

function getGreeting(): string {
  const now = new Date();
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
