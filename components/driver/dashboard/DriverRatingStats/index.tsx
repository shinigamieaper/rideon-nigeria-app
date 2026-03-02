"use client";

import * as React from "react";
import { motion, animate } from "motion/react";
import { ThumbsUp, ThumbsDown, TrendingUp, Users, Star } from "lucide-react";

export interface DriverRatingStatsProps
  extends React.ComponentPropsWithoutRef<"section"> {
  thumbsUp: number;
  thumbsDown: number;
  totalTrips?: number;
}

// Animated counter hook
function useAnimatedCounter(value: number, duration: number = 1) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(0, value, {
      duration,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, duration]);

  return displayValue;
}

export default function DriverRatingStats({
  thumbsUp,
  thumbsDown,
  totalTrips,
  className,
}: DriverRatingStatsProps) {
  const total = thumbsUp + thumbsDown;
  const approvalRate = total > 0 ? Math.round((thumbsUp / total) * 100) : 100;

  // Animated values
  const animatedRate = useAnimatedCounter(approvalRate, 1);
  const animatedThumbsUp = useAnimatedCounter(thumbsUp, 0.8);
  const animatedThumbsDown = useAnimatedCounter(thumbsDown, 0.8);
  const animatedTotal = useAnimatedCounter(
    totalTrips !== undefined ? totalTrips : total,
    0.8,
  );

  // Determine rating status
  const getStatusInfo = () => {
    if (total === 0)
      return {
        label: "No ratings yet",
        color: "text-slate-500",
        bg: "bg-slate-100 dark:bg-slate-800",
      };
    if (approvalRate >= 95)
      return {
        label: "Excellent",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/30",
      };
    if (approvalRate >= 85)
      return {
        label: "Great",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/30",
      };
    if (approvalRate >= 70)
      return {
        label: "Good",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/30",
      };
    return {
      label: "Needs Improvement",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/30",
    };
  };

  const status = getStatusInfo();

  const statItems = [
    {
      icon: ThumbsUp,
      value: animatedThumbsUp,
      label: "Thumbs Up",
      bgClass: "bg-emerald-50/50 dark:bg-emerald-900/20",
      borderClass: "border-emerald-200/50 dark:border-emerald-800/30",
      iconBgClass: "bg-emerald-500/20",
      iconClass: "text-emerald-600 dark:text-emerald-400",
      valueClass: "text-emerald-700 dark:text-emerald-300",
      labelClass: "text-emerald-600/80 dark:text-emerald-400/80",
    },
    {
      icon: ThumbsDown,
      value: animatedThumbsDown,
      label: "Thumbs Down",
      bgClass: "bg-red-50/50 dark:bg-red-900/20",
      borderClass: "border-red-200/50 dark:border-red-800/30",
      iconBgClass: "bg-red-500/20",
      iconClass: "text-red-600 dark:text-red-400",
      valueClass: "text-red-700 dark:text-red-300",
      labelClass: "text-red-600/80 dark:text-red-400/80",
    },
    {
      icon: totalTrips !== undefined ? Users : TrendingUp,
      value: animatedTotal,
      label: totalTrips !== undefined ? "Total Reservations" : "Total Ratings",
      bgClass: "bg-blue-50/50 dark:bg-blue-900/20",
      borderClass: "border-blue-200/50 dark:border-blue-800/30",
      iconBgClass: "bg-blue-500/20",
      iconClass: "text-blue-600 dark:text-blue-400",
      valueClass: "text-blue-700 dark:text-blue-300",
      labelClass: "text-blue-600/80 dark:text-blue-400/80",
    },
  ];

  return (
    <motion.section
      className={[
        "relative overflow-hidden p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 shadow-lg",
        className || "",
      ].join(" ")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }}
    >
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/8 to-emerald-400/5"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 7, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/5 to-blue-400/5"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Customer Ratings
            </h3>
          </div>
          <motion.span
            className={[
              "text-xs font-medium px-2.5 py-1 rounded-full",
              status.color,
              status.bg,
            ].join(" ")}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {status.label}
          </motion.span>
        </motion.div>

        {/* Approval Rate */}
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-slate-900 dark:text-white">
              {animatedRate}%
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              approval rate
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
              initial={{ width: 0 }}
              animate={{ width: `${approvalRate}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              className={[
                "flex flex-col items-center p-3 rounded-xl border",
                item.bgClass,
                item.borderClass,
              ].join(" ")}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.03, y: -2 }}
            >
              <motion.div
                className={[
                  "w-10 h-10 rounded-full flex items-center justify-center mb-1.5",
                  item.iconBgClass,
                ].join(" ")}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  delay: 0.3 + index * 0.1,
                }}
              >
                <item.icon className={["w-5 h-5", item.iconClass].join(" ")} />
              </motion.div>
              <span
                className={["text-xl font-bold", item.valueClass].join(" ")}
              >
                {item.value}
              </span>
              <span
                className={["text-xs text-center", item.labelClass].join(" ")}
              >
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Tip message */}
        {total > 0 && approvalRate < 95 && (
          <motion.p
            className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            💡 Keep up the great work! Customers love professional, on-time
            drivers.
          </motion.p>
        )}
      </div>
    </motion.section>
  );
}
