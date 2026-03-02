"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export interface CatalogGridCardProps
  extends React.ComponentPropsWithoutRef<"a"> {
  id: string;
  image?: string | null;
  category?: string;
  make?: string;
  model?: string;
  seats?: number | null;
  city?: string;
  dayRateNgn?: number | null;
  insured?: boolean;
  href?: string;
}

export default function CatalogGridCard({
  id,
  image,
  category,
  make,
  model,
  seats,
  city,
  dayRateNgn,
  insured,
  href,
  className,
  ...rest
}: CatalogGridCardProps) {
  const router = useRouter();
  const title =
    [make, model].filter(Boolean).join(" ") || category || "Vehicle";
  const rate =
    typeof dayRateNgn === "number"
      ? new Intl.NumberFormat("en-NG").format(dayRateNgn)
      : undefined;
  const link = href || `/app/catalog/${encodeURIComponent(id)}`;
  const imageSrc = image || undefined;
  const dayHref = `/app/book/step-3?listingId=${encodeURIComponent(id)}&rentalUnit=day${city ? `&city=${encodeURIComponent(city)}` : ""}`;
  const fourHref = `/app/book/step-3?listingId=${encodeURIComponent(id)}&rentalUnit=4h${city ? `&city=${encodeURIComponent(city)}` : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
      className={className}
    >
      <Link
        href={link}
        className="group block rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg"
        {...rest}
      >
        <div className="relative h-40 w-full bg-slate-100/70 dark:bg-slate-800/60 overflow-hidden">
          {imageSrc ? (
            <motion.div
              className="relative w-full h-full"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4 }}
            >
              <Image src={imageSrc} alt={title} fill className="object-cover" />
            </motion.div>
          ) : (
            <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">
              No image
            </div>
          )}
          {insured ? (
            <motion.div
              className="absolute left-3 top-3"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            >
              <motion.span
                className="inline-flex items-center rounded-full bg-emerald-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(16, 185, 129, 0.4)",
                    "0 0 0 8px rgba(16, 185, 129, 0)",
                    "0 0 0 0 rgba(16, 185, 129, 0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Insured
              </motion.span>
            </motion.div>
          ) : null}
        </div>
        <div className="p-4">
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </p>
            {city && (
              <motion.span
                className="ml-2 inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
              >
                {city}
              </motion.span>
            )}
          </motion.div>
          <motion.p
            className="mt-1 text-sm text-slate-600 dark:text-slate-400 truncate"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {category || ""}
            {seats ? ` • ${seats} seats` : ""}
          </motion.p>
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-[13px] text-slate-600 dark:text-slate-400">
              from{" "}
            </span>
            <span className="text-[15px] font-semibold text-[#00529B]">
              {rate ? `₦${rate}` : "—"}
            </span>
            <span className="text-[13px] text-slate-600 dark:text-slate-400">
              {" "}
              /day
            </span>
          </motion.div>
          <motion.div
            className="mt-3 flex items-center gap-2"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <motion.button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(dayHref);
              }}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-[12px] font-semibold text-white bg-[#00529B]"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 4px 12px rgba(0, 82, 155, 0.3)",
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Book • Day
            </motion.button>
            <motion.button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(fourHref);
              }}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-[12px] font-semibold text-[#00529B] bg-white border border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800/60"
              whileHover={{ scale: 1.05, borderColor: "rgba(0, 82, 155, 0.5)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Book • 4h
            </motion.button>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
