import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Car, type LucideIcon } from "lucide-react";

export interface DashboardEmptyStateProps
  extends React.ComponentPropsWithoutRef<"section"> {
  firstName?: string;
  /** Existing CTA props (kept for backward compatibility) */
  ctaHref?: string;
  ctaLabel?: string;
  /** Optional override props used by various pages */
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Aliases for CTA props used in some pages */
  actionHref?: string;
  actionLabel?: string;
}

export default function DashboardEmptyState({
  firstName = "there",
  ctaHref = "/app/book",
  ctaLabel = "Book Your First Ride",
  title,
  description,
  icon,
  actionHref,
  actionLabel,
  className,
  /** Do not forward non-DOM props to the DOM element */
  ...rest
}: DashboardEmptyStateProps) {
  const DisplayIcon = icon ?? Car;
  const finalTitle = title ?? `Welcome to RideOn, ${firstName}!`;
  const finalDescription =
    description ??
    "Your professional and reliable ride is just a few taps away. Book a pre-scheduled trip or hire a dedicated full-time driver for your personal or business needs.";
  const finalCtaHref = actionHref ?? ctaHref;
  const finalCtaLabel = actionLabel ?? ctaLabel;
  return (
    <section className={className} {...rest}>
      <motion.div
        className="rounded-2xl text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-8 sm:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{
          y: -2,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <motion.div
          className="mx-auto h-16 w-16 rounded-2xl bg-[#00529B]/10 text-[#00529B] flex items-center justify-center mb-4"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <DisplayIcon className="h-8 w-8" />
          </motion.div>
        </motion.div>
        <motion.h2
          className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {finalTitle}
        </motion.h2>
        <motion.p
          className="mt-3 text-slate-600 dark:text-slate-400 max-w-prose mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {finalDescription}
        </motion.p>
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href={finalCtaHref}
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-[#0077E6] to-[#00529B] shadow-lg"
            >
              {finalCtaLabel}
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
