"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Power, Wifi, WifiOff } from "lucide-react";

export interface OnlineToggleProps {
  online: boolean;
  onToggle: (online: boolean) => void;
  className?: string;
}

export default function OnlineToggle({
  online,
  onToggle,
  className,
}: OnlineToggleProps) {
  const handleClick = () => {
    onToggle(!online);
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <motion.button
        type="button"
        onClick={handleClick}
        aria-pressed={online}
        aria-label={online ? "Go offline" : "Go online"}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium",
          "focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-transparent",
          online ? "bg-white/20 text-white" : "bg-white/10 text-white/70",
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {/* Animated background glow when online */}
        <AnimatePresence>
          {online && (
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        <motion.span
          className={cn(
            "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
            online
              ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/40"
              : "bg-white/20 text-white/60",
          )}
          animate={{
            scale: online ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: online ? 2 : 0.3,
            repeat: online ? Infinity : 0,
            repeatType: "reverse",
          }}
        >
          <AnimatePresence mode="wait">
            {online ? (
              <motion.div
                key="wifi"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <Wifi className="h-4 w-4" strokeWidth={2.5} />
              </motion.div>
            ) : (
              <motion.div
                key="power"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <Power className="h-4 w-4" strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.span>

        <span className="relative z-10 pr-1 min-w-[52px]">
          <AnimatePresence mode="wait">
            <motion.span
              key={online ? "online" : "offline"}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="block"
            >
              {online ? "Online" : "Offline"}
            </motion.span>
          </AnimatePresence>
        </span>

        {/* Pulse indicator when online */}
        <AnimatePresence>
          {online && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 flex h-3 w-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
