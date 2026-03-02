"use client";

import * as React from "react";
import { motion } from "motion/react";

export interface WeeklyCalendarProps
  extends React.ComponentPropsWithoutRef<"div"> {
  weekStart: Date; // Monday of the week
  onDayClick?: (date: Date) => void;
  availabilityDates?: string[] | Set<string>; // YYYY-MM-DD strings
  bookingDates?: string[] | Set<string>; // YYYY-MM-DD strings
  selectedDate?: Date | null;
}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function formatDayCell(date: Date) {
  return {
    label: date.toLocaleDateString(undefined, { weekday: "short" }),
    day: date.getDate(),
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WeeklyCalendar({
  weekStart,
  onDayClick,
  availabilityDates,
  bookingDates,
  selectedDate,
  className,
}: WeeklyCalendarProps) {
  const days = React.useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  const availSet = React.useMemo(() => {
    if (!availabilityDates) return new Set<string>();
    return availabilityDates instanceof Set
      ? availabilityDates
      : new Set(availabilityDates);
  }, [availabilityDates]);

  const bookingSet = React.useMemo(() => {
    if (!bookingDates) return new Set<string>();
    return bookingDates instanceof Set ? bookingDates : new Set(bookingDates);
  }, [bookingDates]);

  return (
    <motion.div
      className={cx(
        "relative overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-4 md:p-5",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      whileHover={{ y: -2, boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.12)" }}
    >
      {/* Background decoration */}
      <motion.div
        className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/8 to-green-500/8 pointer-events-none"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      <div className="relative z-10 grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((d, index) => {
          const { label, day } = formatDayCell(d);
          const key = ymd(d);
          const hasAvail = availSet.has(key);
          const hasBooking = bookingSet.has(key);
          const isSelected = selectedDate ? ymd(selectedDate) === key : false;
          return (
            <motion.button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick?.(startOfDay(d))}
              className={cx(
                "group rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80 px-2 sm:px-3 py-3 sm:py-4 text-left",
                isSelected &&
                  "ring-2 ring-[#00529B] ring-offset-2 ring-offset-white dark:ring-offset-slate-900",
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 * index }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {label}
              </div>
              <div className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                {day}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <motion.span
                  className={cx(
                    "h-2 w-2 rounded-full",
                    hasAvail
                      ? "bg-[#00529B]"
                      : "bg-slate-200/70 dark:bg-slate-700/70",
                  )}
                  animate={hasAvail ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.span
                  className={cx(
                    "h-2 w-2 rounded-full",
                    hasBooking
                      ? "bg-emerald-500"
                      : "bg-slate-200/70 dark:bg-slate-700/70",
                  )}
                  animate={hasBooking ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
