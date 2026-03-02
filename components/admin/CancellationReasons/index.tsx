"use client";

import { useEffect, useState } from "react";
import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import { XCircle, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

export interface CancellationReasonsProps
  extends React.ComponentPropsWithoutRef<"section"> {}

type ServiceFilter = "all" | "chauffeur" | "rental" | "drive_my_car";

const serviceLabels: Record<ServiceFilter, string> = {
  all: "All Services",
  chauffeur: "Chauffeur",
  rental: "Rentals",
  drive_my_car: "Hire-a-Driver",
};

interface ReasonData {
  [key: string]: string | number;
  reason: string;
  count: number;
  percentage: number;
  color: string;
}

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{
        fontSize: "14px",
        fontWeight: "bold",
        textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
      }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const renderActiveSlice = (props: any) => {
  const outer = typeof props.outerRadius === "number" ? props.outerRadius : 140;
  return (
    <Sector
      {...props}
      outerRadius={outer + 10}
      stroke="rgba(255, 255, 255, 0.8)"
      strokeWidth={3}
    />
  );
};

export function CancellationReasons({
  className = "",
  ...props
}: CancellationReasonsProps) {
  const [data, setData] = useState<ReasonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [service, setService] = useState<ServiceFilter>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/dashboard/charts/cancellation-reasons?service=${service}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch cancellation data");
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

  const totalCancellations = data.reduce((sum, item) => sum + item.count, 0);
  const topReason = data.length > 0 ? data[0] : null;

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
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover/section:from-cyan-500/[0.02] group-hover/section:to-blue-500/[0.02] rounded-3xl transition-all duration-700 pointer-events-none" />

      <div className="relative mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-8 bg-gradient-to-b from-cyan-600 to-blue-600 rounded-full" />
              Cancellation Reasons
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-4">
              Why trips are cancelled
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-full backdrop-blur-sm">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                {totalCancellations.toLocaleString()} Total
              </span>
            </div>
            {topReason && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-full backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                  Top: {topReason.reason}
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

      <div className="relative h-96 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={140}
              innerRadius={60}
              fill="#8884d8"
              dataKey="count"
              {...(activeIndex !== null ? ({ activeIndex } as any) : undefined)}
              activeShape={renderActiveSlice}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="cursor-pointer transition-all duration-300 hover:opacity-90"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "12px",
                border: "1px solid rgba(226, 232, 240, 0.5)",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(8px)",
              }}
              labelStyle={{ fontWeight: "bold", color: "#1e293b" }}
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} cancellations (${props.payload.percentage}%)`,
                props.payload.reason,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Reason Details */}
      <div className="relative mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((reason, index) => (
          <div
            key={index}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl backdrop-blur-sm cursor-pointer transition-all duration-300 ${
              activeIndex === index
                ? "bg-white dark:bg-slate-800 shadow-lg scale-105 border-2 border-blue-400 dark:border-cyan-400"
                : "bg-white/50 dark:bg-slate-800/50 hover:scale-[1.02] hover:bg-white/70 dark:hover:bg-slate-800/70"
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`w-4 h-4 rounded-full flex-shrink-0 transition-all duration-300 ${
                  activeIndex === index ? "scale-125 shadow-lg" : ""
                }`}
                style={{
                  backgroundColor: reason.color,
                  boxShadow:
                    activeIndex === index ? `0 0 12px ${reason.color}` : "none",
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-bold truncate transition-colors duration-300 ${
                    activeIndex === index
                      ? "text-blue-600 dark:text-cyan-400"
                      : "text-slate-900 dark:text-white"
                  }`}
                >
                  {reason.reason}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {reason.percentage}% of total
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`text-lg font-bold transition-all duration-300 ${
                  activeIndex === index
                    ? "text-blue-600 dark:text-cyan-400 scale-110"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {reason.count.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
