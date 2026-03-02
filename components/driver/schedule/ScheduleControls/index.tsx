"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Calendar, List } from "lucide-react";
import Button from "@/components/ui/Button";

export type ScheduleView = "week" | "agenda";

export interface ScheduleControlsProps
  extends React.ComponentPropsWithoutRef<"section"> {
  currentView: ScheduleView;
  onViewChange: (view: ScheduleView) => void;
  currentWeekDisplay: string;
  onNextWeek: () => void;
  onPrevWeek: () => void;
}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function ScheduleControls({
  currentView,
  onViewChange,
  currentWeekDisplay,
  onNextWeek,
  onPrevWeek,
  className,
}: ScheduleControlsProps) {
  return (
    <motion.section
      className={cx(
        "relative overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg rounded-2xl p-4 md:p-5",
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2, boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.12)" }}
    >
      {/* Background decoration */}
      <motion.div
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#00529B]/8 to-[#0077E6]/8 pointer-events-none"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Segmented control */}
      <motion.div
        className="relative z-10 flex items-center gap-2"
        role="tablist"
        aria-label="Schedule view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.button
          type="button"
          onClick={() => onViewChange("week")}
          role="tab"
          aria-selected={currentView === "week"}
          aria-pressed={currentView === "week"}
          className={cx(
            "flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
            currentView === "week"
              ? "bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white shadow-lg shadow-blue-500/25"
              : "bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80",
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Calendar className="w-4 h-4" />
          Week
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onViewChange("agenda")}
          role="tab"
          aria-selected={currentView === "agenda"}
          aria-pressed={currentView === "agenda"}
          className={cx(
            "flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
            currentView === "agenda"
              ? "bg-gradient-to-r from-[#00529B] to-[#0077E6] text-white shadow-lg shadow-blue-500/25"
              : "bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80",
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <List className="w-4 h-4" />
          Agenda
        </motion.button>
      </motion.div>

      {/* Week navigator */}
      <motion.div
        className="relative z-10 mt-4 flex items-center justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            type="button"
            variant="secondary"
            aria-label="Previous week"
            className="h-10 px-3"
            onClick={onPrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div
          className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 select-none"
          key={currentWeekDisplay}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currentWeekDisplay}
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            type="button"
            variant="secondary"
            aria-label="Next week"
            className="h-10 px-3"
            onClick={onNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
