"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { Filter, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

export interface TripLifecycleFunnelProps
  extends React.ComponentPropsWithoutRef<"section"> {}

type ServiceFilter = "all" | "chauffeur" | "rental" | "drive_my_car";

const serviceLabels: Record<ServiceFilter, string> = {
  all: "All Services",
  chauffeur: "Chauffeur",
  rental: "Rentals",
  drive_my_car: "Hire-a-Driver",
};

interface StageData {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

export function TripLifecycleFunnel({
  className = "",
  ...props
}: TripLifecycleFunnelProps) {
  const [data, setData] = useState<StageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<ServiceFilter>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/dashboard/charts/trip-lifecycle-funnel?range=30d&service=${service}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch trip lifecycle data");
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
  }, [service]);

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
        <div className="h-96 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-2xl animate-pulse" />
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
        <div className="flex items-center justify-center h-96 text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const conversionRate =
    data.length > 1
      ? ((data[data.length - 1].count / data[0].count) * 100).toFixed(1)
      : "0.0";

  const biggestDropStage = data.reduce(
    (max, item, index, arr) => {
      if (index === 0) return max;
      const dropRate =
        ((arr[index - 1].count - item.count) / arr[index - 1].count) * 100;
      return dropRate > max.dropRate ? { stage: item.stage, dropRate } : max;
    },
    { stage: "", dropRate: 0 },
  );

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
              Trip Lifecycle Funnel
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-4">
              Journey from booking request to completion
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full backdrop-blur-sm">
              <Filter className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-bold text-green-600 dark:text-green-400">
                {conversionRate}% Conversion
              </span>
            </div>
            {biggestDropStage.dropRate > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-full backdrop-blur-sm">
                <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Biggest Drop: {biggestDropStage.stage}
                </span>
              </div>
            )}

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

      <div className="relative h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data].reverse()}
            layout="vertical"
            margin={{ top: 20, right: 50, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#cbd5e1"
              opacity={0.2}
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="#64748b"
              style={{ fontSize: "12px", fontWeight: "600" }}
              tick={{ fill: "#64748b" }}
            />
            <YAxis
              type="category"
              dataKey="stage"
              stroke="#64748b"
              style={{ fontSize: "12px", fontWeight: "600" }}
              width={100}
              tick={{ fill: "#64748b" }}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "12px",
                border: "1px solid rgba(226, 232, 240, 0.5)",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(8px)",
              }}
              labelStyle={{ fontWeight: "bold", color: "#1e293b" }}
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} trips (${props.payload.percentage}%)`,
                "Count",
              ]}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={50}>
              {[...data].reverse().map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                style={{
                  fill: "#1e293b",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
                formatter={(value: any) =>
                  typeof value === "number" ? value.toLocaleString() : value
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stage Legend */}
      <div className="relative mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.map((stage, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                {stage.stage}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stage.percentage}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
