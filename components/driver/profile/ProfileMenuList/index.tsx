"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

export interface ProfileMenuItem {
  href: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

export interface ProfileMenuListProps
  extends React.ComponentPropsWithoutRef<"div"> {
  items: ProfileMenuItem[];
}

export default function ProfileMenuList({
  items,
  className,
}: ProfileMenuListProps) {
  return (
    <motion.div
      className={[
        "overflow-hidden rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg divide-y divide-slate-200/80 dark:divide-slate-800/60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {items.map((it, index) => (
        <motion.div
          key={it.href}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 + index * 0.05 }}
        >
          <Link
            href={it.href}
            className="group flex items-center gap-4 px-5 py-4 hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all"
          >
            <motion.span
              className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60 shadow-sm group-hover:shadow-md transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {it.icon}
            </motion.span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-slate-900 dark:text-slate-100 group-hover:text-[#00529B] dark:group-hover:text-[#4ea0ff] transition-colors">
                {it.title}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {it.description}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#00529B] dark:group-hover:text-[#4ea0ff] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
