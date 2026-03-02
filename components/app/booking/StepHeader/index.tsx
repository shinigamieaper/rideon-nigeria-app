"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface StepHeaderProps
  extends Omit<
    React.ComponentPropsWithoutRef<"div">,
    "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
  > {
  step: number;
  total: number;
  title: string;
}

export default function StepHeader({
  step,
  total,
  title,
  className,
  ...rest
}: StepHeaderProps) {
  const pct = Math.max(0, Math.min(100, Math.round((step / total) * 100)));
  return (
    <motion.div
      className={cn("w-full", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...rest}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.p
          className="text-xs font-medium text-slate-600 dark:text-slate-400"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Step {step} of {total}:{" "}
          <span className="text-slate-900 dark:text-slate-100 font-semibold">
            {title}
          </span>
        </motion.p>
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          {Array.from({ length: total }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                i < step ? "bg-[#00529B]" : "bg-slate-300 dark:bg-slate-700",
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.2 + i * 0.05,
                type: "spring",
                stiffness: 300,
              }}
            />
          ))}
        </motion.div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200/70 dark:bg-slate-800/70 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#00529B] to-[#0077E6]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}
