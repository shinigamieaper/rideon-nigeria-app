"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Info, User, Briefcase } from "lucide-react";
import { ProfileMenu, type ProfileMenuSection } from "@/components";
import { waitForUser } from "@/lib/firebase";

export default function Page() {
  const [isDualRoleApproved, setIsDualRoleApproved] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const user = await waitForUser();
        const token = await user.getIdToken();

        const fetchJson = async (url: string) => {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const j = await res.json().catch(() => ({}));
          return { ok: res.ok, json: j };
        };

        const [driverRes, ftRes] = await Promise.all([
          fetchJson("/api/drivers/me"),
          fetchJson("/api/full-time-driver/me"),
        ]);

        const driverApproved =
          driverRes.ok && String(driverRes.json?.status || "") === "approved";
        const fullTimeApproved =
          ftRes.ok && String(ftRes.json?.status || "") === "approved";

        if (!cancelled)
          setIsDualRoleApproved(driverApproved && fullTimeApproved);
      } catch {
        if (!cancelled) setIsDualRoleApproved(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections: ProfileMenuSection[] = [
    {
      title: "Full-Time Placement",
      items: [
        {
          id: "status",
          href: "/full-time-driver/application/status",
          title: "Application Status",
          description: "Track your placement application and review progress",
          icon: "Briefcase",
        },
        {
          id: "details",
          href: "/full-time-driver/application/apply",
          title: "Application Details",
          description:
            "Update your experience, preferences, and contact details",
          icon: "ClipboardList",
        },
        {
          id: "documents",
          href: "/full-time-driver/application/documents",
          title: "Recruitment Documents",
          description: "Upload required documents to complete your application",
          icon: "FileText",
        },
        {
          id: "messages",
          href: "/full-time-driver/messages",
          title: "Messages",
          description: "View conversations with potential employers",
          icon: "MessageSquare",
        },
      ],
    },
    {
      title: "Account",
      items: [
        ...(isDualRoleApproved
          ? [
              {
                id: "switch-driver",
                href: "/driver",
                title: "Switch to Drive-My-Car Portal",
                description:
                  "Go to your Drive-My-Car driver dashboard and trips",
                icon: "Car" as const,
                badge: "Switch",
              },
            ]
          : []),
        {
          id: "notifications",
          href: "/full-time-driver/profile/notifications",
          title: "Notification Settings",
          description: "Choose what updates you want to receive",
          icon: "Bell",
        },
        {
          id: "personal",
          href: "/full-time-driver/profile/personal",
          title: "Personal Profile",
          description: "Manage your basic information and profile photo",
          icon: "User",
        },
        {
          id: "support",
          href: "/full-time-driver/profile/support",
          title: "Contact Support",
          description: "Get help from our support team",
          icon: "LifeBuoy",
        },
        {
          id: "account",
          href: "/full-time-driver/profile/account-settings",
          title: "Account Settings",
          description: "Manage sign-out and account security",
          icon: "Shield",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">
      {/* Header Banner */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00529B] via-[#0066BB] to-[#0077E6] p-5 sm:p-6 shadow-xl"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Profile & Settings
              </h1>
              <p className="text-sm text-white/80 mt-0.5">
                Manage your application and account
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Application
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                In Progress
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/60 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Profile
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Complete
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Menu Sections */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ProfileMenu sections={sections} />
      </motion.div>

      {/* Tip Card */}
      <motion.div
        className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200/50 dark:border-blue-800/30 px-4 py-3.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Quick Tip
          </p>
          <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-0.5">
            Keep your phone number and documents up to date to avoid delays in
            your application review.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
