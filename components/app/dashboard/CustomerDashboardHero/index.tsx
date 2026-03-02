"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Car, CarFront, Users, Bell } from "lucide-react";

export interface CustomerDashboardHeroProps
  extends React.ComponentPropsWithoutRef<"div"> {
  firstName?: string;
  unreadNotifications?: number;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function CustomerDashboardHero({
  firstName = "",
  unreadNotifications = 0,
  className,
  ...rest
}: CustomerDashboardHeroProps) {
  const greeting = getGreeting();

  const setCustomerAppMode = React.useCallback(
    (next: "chauffeur" | "driver" | "fulltime") => {
      try {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("rideon:customerAppMode", next);
      } catch {}
    },
    [],
  );

  return (
    <div className={["space-y-5", className || ""].join(" ")} {...rest}>
      {/* Hero Section: Greeting + Primary Actions */}
      <motion.section
        data-tour="customer-dashboard-hero"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 sm:p-6 text-white shadow-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Animated background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-white/10"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-white/5"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <motion.p
                className="text-sm text-white/70 font-medium"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {greeting}
              </motion.p>
              <motion.h1
                className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {firstName ? `${firstName}.` : "Welcome."}
              </motion.h1>
            </div>
            {unreadNotifications > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Link
                  href="/app/notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  <motion.span
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
                  >
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </motion.span>
                </Link>
              </motion.div>
            )}
          </div>

          <motion.p
            className="mt-2 text-sm text-white/80"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            What would you like to book today?
          </motion.p>

          {/* Quick Action Grid */}
          <motion.div
            className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {/* Chauffeur */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2, scale: 1.02 }}
            >
              <Link
                href="/app/catalog"
                onClick={() => setCustomerAppMode("chauffeur")}
                data-tour="customer-dashboard-flow-chauffeur"
                className="group block rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 p-4 transition-all text-center"
              >
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.35 }}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg mb-2 bg-white/15 text-white">
                    <Car className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-sm">Book a Chauffeur</p>
                  <p className="text-xs text-white/60 mt-1">
                    Rent a car with driver
                  </p>
                </motion.div>
              </Link>
            </motion.div>

            {/* Drive My Car */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ y: -2, scale: 1.02 }}
            >
              <Link
                href="/app/drive-my-car"
                onClick={() => setCustomerAppMode("driver")}
                data-tour="customer-dashboard-flow-drive-my-car"
                className="group block rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 p-4 transition-all text-center"
              >
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg mb-2 bg-white/15 text-white">
                    <CarFront className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-sm">Hire a Driver</p>
                  <p className="text-xs text-white/60 mt-1">For your own car</p>
                </motion.div>
              </Link>
            </motion.div>

            {/* Full-Time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -2, scale: 1.02 }}
            >
              <Link
                href="/app/hire-a-driver"
                onClick={() => setCustomerAppMode("fulltime")}
                data-tour="customer-dashboard-flow-fulltime"
                className="group block rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 p-4 transition-all text-center"
              >
                <motion.div
                  className="flex flex-col items-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.45 }}
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg mb-2 bg-white/15 text-white">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-sm">Hire Full-Time</p>
                  <p className="text-xs text-white/60 mt-1">
                    Professional drivers
                  </p>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
