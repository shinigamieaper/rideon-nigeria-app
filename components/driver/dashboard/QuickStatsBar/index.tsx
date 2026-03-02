"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { Wallet, ChevronRight, TrendingUp } from "lucide-react";

export interface QuickStatsBarProps
  extends React.ComponentPropsWithoutRef<"section"> {
  stats: {
    todaysEarnings: number;
    weeklyRating: number;
  };
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

const QuickStatsBar: React.FC<QuickStatsBarProps> = ({ stats, className }) => {
  const animatedEarnings = useAnimatedCounter(stats.todaysEarnings, 1.2);

  const wrapperClasses = [
    // Glassmorphic card style (project standard)
    "relative overflow-hidden",
    "bg-white/60 dark:bg-slate-900/60",
    "backdrop-blur-xl",
    "border border-slate-200/80 dark:border-slate-800/60",
    "shadow-lg",
    "rounded-2xl",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.section
      className={wrapperClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      whileHover={{ y: -2, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }}
      aria-label="Today's earnings for fleet drivers"
    >
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-400/5"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      <Link
        href="/driver/earnings"
        className="relative z-10 flex items-center gap-4 p-4 sm:p-5 group"
      >
        {/* Icon */}
        <motion.div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <Wallet className="h-6 w-6" strokeWidth={2} />
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.p
            className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Today's Earnings
            {stats.todaysEarnings > 0 && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-3 h-3" />
              </span>
            )}
          </motion.p>
          <motion.p
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {formatCurrency(animatedEarnings)}
          </motion.p>
        </div>

        {/* Arrow */}
        <motion.div
          className="flex items-center gap-1 text-sm font-medium text-[#00529B] dark:text-[#4ea0ff] group-hover:translate-x-0.5 transition-transform"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <span className="hidden sm:inline">View details</span>
          <ChevronRight className="h-5 w-5" />
        </motion.div>
      </Link>
    </motion.section>
  );
};

export default QuickStatsBar;
