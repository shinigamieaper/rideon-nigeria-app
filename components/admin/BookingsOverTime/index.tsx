"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Calendar, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

export interface BookingsOverTimeProps
  extends React.ComponentPropsWithoutRef<"section"> {
  timeRange?: "7d" | "30d" | "90d";
}

type ServiceFilter = "all" | "chauffeur" | "rental" | "drive_my_car";

const serviceLabels: Record<ServiceFilter, string> = {
  all: "All Services",
  chauffeur: "Chauffeur",
  rental: "Rentals",
  drive_my_car: "Hire-a-Driver",
};

interface ChartData {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

export function BookingsOverTime({
  timeRange = "30d",
  className = "",
  ...props
}: BookingsOverTimeProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<ServiceFilter>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/dashboard/charts/bookings-timeseries?range=${timeRange}&service=${service}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch bookings data");
        }

        const result = await response.json();
        setData(result.data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, service]);

  if (loading) {
    return (
      <section
        className={[
          "bg-white/60 dark:bg-slate-900/60",
          "backdrop-blur-xl",
          "border border-slate-200/50 dark:border-slate-800/50",
          "rounded-3xl p-7",
          "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        <div className="mb-6">
          <div className="h-8 w-64 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg animate-pulse" />
        </div>
        <div className="h-80 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-2xl animate-pulse" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={[
          "bg-white/60 dark:bg-slate-900/60",
          "backdrop-blur-xl",
          "border border-slate-200/50 dark:border-slate-800/50",
          "rounded-3xl p-7",
          "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        <div className="flex items-center justify-center h-80 text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const totalBookings = data.reduce((sum, item) => sum + item.total, 0);
  const completionRate =
    data.length > 0
      ? (
          (data.reduce((sum, item) => sum + item.completed, 0) /
            totalBookings) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <section
      className={[
        "group/section relative",
        "bg-white/60 dark:bg-slate-900/60",
        "backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-800/50",
        "rounded-3xl p-7",
        "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
        "transition-all duration-500",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover/section:from-blue-500/[0.02] group-hover/section:to-cyan-500/[0.02] rounded-3xl transition-all duration-700 pointer-events-none" />

      <div className="relative mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full" />
              Bookings Over Time
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-4">
              Booking trends and completion rates
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {completionRate}% Complete
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800/50 rounded-full backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {timeRange === "7d"
                  ? "Last 7 Days"
                  : timeRange === "30d"
                    ? "Last 30 Days"
                    : "Last 90 Days"}
              </span>
            </div>

            <div className="w-[170px]">
              <Select
                value={service}
                onValueChange={(v) => setService(v as ServiceFilter)}
              >
                <SelectTrigger className="h-8 px-3 rounded-full border border-slate-200/70 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-slate-100 focus:ring-blue-500/50 shadow-none">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{serviceLabels.all}</SelectItem>
                  <SelectItem value="chauffeur">
                    {serviceLabels.chauffeur}
                  </SelectItem>
                  <SelectItem value="rental">{serviceLabels.rental}</SelectItem>
                  <SelectItem value="drive_my_car">
                    {serviceLabels.drive_my_car}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              opacity={0.2}
            />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              style={{ fontSize: "12px", fontWeight: "600" }}
            />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: "12px", fontWeight: "600" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "12px",
                border: "1px solid rgba(226, 232, 240, 0.5)",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(8px)",
              }}
              labelStyle={{ fontWeight: "bold", color: "#1e293b" }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#0ea5e9"
              fillOpacity={1}
              fill="url(#colorTotal)"
              strokeWidth={2}
              name="Total Bookings"
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorCompleted)"
              strokeWidth={2}
              name="Completed"
            />
            <Area
              type="monotone"
              dataKey="cancelled"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorCancelled)"
              strokeWidth={2}
              name="Cancelled"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
