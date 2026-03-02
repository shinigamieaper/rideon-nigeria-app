"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

export interface RevenueByDayProps
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
  gmv: number;
  fees: number;
  discounts: number;
  refunds: number;
  net: number;
}

export function RevenueByDay({
  timeRange = "30d",
  className = "",
  ...props
}: RevenueByDayProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNet, setShowNet] = useState(false);
  const [service, setService] = useState<ServiceFilter>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/dashboard/charts/revenue-by-day?range=${timeRange}&service=${service}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch revenue data");
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

  const totalGMV = data.reduce((sum, item) => sum + item.gmv, 0);
  const totalNet = data.reduce((sum, item) => sum + item.net, 0);
  const avgDailyRevenue =
    data.length > 0 ? (totalGMV / data.length).toFixed(2) : "0.00";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
              Revenue by Day
            </h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-4">
              Business performance and financial health
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full backdrop-blur-sm">
              <span className="text-sm font-black text-green-600 dark:text-green-400">
                ₦
              </span>
              <span className="text-xs font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalGMV)} GMV
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(parseFloat(avgDailyRevenue))} Avg/Day
              </span>
            </div>
            <button
              onClick={() => setShowNet(!showNet)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 ${
                showNet
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-100/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {showNet ? "Showing Net" : "Show Net"}
            </button>

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
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
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
              tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
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
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            />
            {showNet ? (
              <Bar
                dataKey="net"
                fill="#06b6d4"
                radius={[8, 8, 0, 0]}
                name="Net Revenue"
                activeBar={{ fill: "#06b6d4", opacity: 1 }}
              />
            ) : (
              <>
                <Bar
                  dataKey="gmv"
                  stackId="a"
                  fill="#0ea5e9"
                  radius={[0, 0, 0, 0]}
                  name="GMV"
                  activeBar={{ fill: "#0ea5e9", opacity: 1 }}
                />
                <Bar
                  dataKey="fees"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  name="Fees"
                  activeBar={{ fill: "#10b981", opacity: 1 }}
                />
                <Bar
                  dataKey="discounts"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[0, 0, 0, 0]}
                  name="Discounts"
                  activeBar={{ fill: "#f59e0b", opacity: 1 }}
                />
                <Bar
                  dataKey="refunds"
                  stackId="a"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                  name="Refunds"
                  activeBar={{ fill: "#ef4444", opacity: 1 }}
                />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50/70 dark:bg-blue-900/20 rounded-xl backdrop-blur-sm">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase">
            GMV
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalGMV)}
          </p>
        </div>
        <div className="p-4 bg-green-50/70 dark:bg-green-900/20 rounded-xl backdrop-blur-sm">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 uppercase">
            Fees
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(data.reduce((sum, item) => sum + item.fees, 0))}
          </p>
        </div>
        <div className="p-4 bg-orange-50/70 dark:bg-orange-900/20 rounded-xl backdrop-blur-sm">
          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1 uppercase">
            Discounts
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(
              data.reduce((sum, item) => sum + item.discounts, 0),
            )}
          </p>
        </div>
        <div className="p-4 bg-cyan-50/70 dark:bg-cyan-900/20 rounded-xl backdrop-blur-sm">
          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1 uppercase">
            Net
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(totalNet)}
          </p>
        </div>
      </div>
    </section>
  );
}
