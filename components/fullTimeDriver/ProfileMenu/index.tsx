"use client";

import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  ChevronRight,
  Bell,
  Car,
  Briefcase,
  ClipboardList,
  FileText,
  IdCard,
  LifeBuoy,
  MessageSquare,
  Shield,
  User,
} from "lucide-react";

export type ProfileMenuIcon =
  | "Bell"
  | "Car"
  | "Briefcase"
  | "ClipboardList"
  | "IdCard"
  | "FileText"
  | "LifeBuoy"
  | "MessageSquare"
  | "Shield"
  | "User";

export interface ProfileMenuItem {
  id: string;
  href: string;
  title: string;
  description?: string;
  icon: ProfileMenuIcon;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "error";
}

export interface ProfileMenuSection {
  title?: string;
  items: ProfileMenuItem[];
}

export interface ProfileMenuProps
  extends React.ComponentPropsWithoutRef<"div"> {
  sections: ProfileMenuSection[];
}

const badgeVariants = {
  default: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  success:
    "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  warning:
    "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  error: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
};

const iconMap = {
  Bell,
  Car,
  Briefcase,
  ClipboardList,
  FileText,
  IdCard,
  LifeBuoy,
  MessageSquare,
  Shield,
  User,
} satisfies Record<ProfileMenuIcon, React.ElementType>;

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  sections,
  className,
  ...rest
}) => {
  return (
    <div className={["space-y-5", className || ""].join(" ")} {...rest}>
      {sections.map((section, sectionIndex) => (
        <motion.div
          key={sectionIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sectionIndex * 0.1 }}
        >
          {section.title && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
              {section.title}
            </h3>
          )}

          <div
            className={[
              "rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl",
              "border border-slate-200/80 dark:border-slate-800/60 shadow-lg",
              "overflow-hidden divide-y divide-slate-200/80 dark:divide-slate-800/60",
            ].join(" ")}
          >
            {section.items.map((item, itemIndex) => {
              const Icon = iconMap[item.icon];

              return (
                <Link key={item.id} href={item.href}>
                  <motion.div
                    className={[
                      "flex items-center gap-4 px-5 py-4",
                      "hover:bg-white/80 dark:hover:bg-slate-900/80 transition-colors",
                      "cursor-pointer",
                    ].join(" ")}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: sectionIndex * 0.1 + itemIndex * 0.05,
                    }}
                    whileHover={{ x: 2 }}
                  >
                    {/* Icon */}
                    <div
                      className={[
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        "bg-gradient-to-br from-slate-100 to-slate-50",
                        "dark:from-slate-800 dark:to-slate-900",
                        "border border-slate-200/80 dark:border-slate-700/60",
                      ].join(" ")}
                    >
                      <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={[
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                              badgeVariants[item.badgeVariant || "default"],
                            ].join(" ")}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ProfileMenu;
