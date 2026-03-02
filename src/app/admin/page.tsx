"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  DashboardWelcome,
  RecentActivity,
  BookingsOverTime,
  TripLifecycleFunnel,
  CancellationReasons,
  RevenueByDay,
  SupportHealthCard,
  SupportMetrics,
  AdminNotificationPermissionCard,
} from "@/components";
import {
  Loader2,
  CalendarClock,
  Car,
  Users,
  Wallet,
  Megaphone,
  Handshake,
  Truck,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type AdminRole =
  | "super_admin"
  | "admin"
  | "ops_admin"
  | "driver_admin"
  | "product_admin"
  | "finance_admin";

interface QuickLink {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AdminRole[] | "all";
}

const ALL_QUICK_LINKS: QuickLink[] = [
  {
    href: "/admin/reservations",
    label: "Manage Reservations",
    icon: CalendarClock,
    roles: "all",
  },
  {
    href: "/admin/catalog",
    label: "Catalog & Pricing",
    icon: Car,
    roles: ["super_admin", "admin", "product_admin", "ops_admin"],
  },
  {
    href: "/admin/drivers",
    label: "Driver Management",
    icon: Users,
    roles: ["super_admin", "admin", "driver_admin", "ops_admin"],
  },
  {
    href: "/admin/partners",
    label: "Partners",
    icon: Handshake,
    roles: ["super_admin", "admin", "product_admin"],
  },
  {
    href: "/admin/vehicle-submissions",
    label: "Vehicle Submissions",
    icon: Truck,
    roles: ["super_admin", "admin", "product_admin"],
  },
  {
    href: "/admin/partner-driver-submissions",
    label: "Partner Drivers",
    icon: Users,
    roles: ["super_admin", "admin", "product_admin"],
  },
  {
    href: "/admin/full-time-driver-applications",
    label: "Full-Time Driver Apps",
    icon: ClipboardList,
    roles: ["super_admin", "admin", "driver_admin"],
  },
  {
    href: "/admin/messages",
    label: "Messages",
    icon: MessageSquare,
    roles: "all",
  },
  {
    href: "/admin/finance",
    label: "Finance & Payouts",
    icon: Wallet,
    roles: ["super_admin", "admin", "finance_admin"],
  },
  {
    href: "/admin/config",
    label: "Brand Banner & Config",
    icon: Megaphone,
    roles: ["super_admin", "admin"],
  },
];

function getQuickLinks(role: AdminRole): QuickLink[] {
  return ALL_QUICK_LINKS.filter(
    (ql) => ql.roles === "all" || ql.roles.includes(role),
  ).slice(0, 7);
}

const WORKFLOW_LIBRARY: Array<{
  key: string;
  href: string;
  label: string;
  roles: AdminRole[];
}> = [
  {
    key: "reservations",
    href: "/admin/reservations",
    label: "Reservations workflow",
    roles: ["super_admin", "admin", "ops_admin"],
  },
  {
    key: "drivers",
    href: "/admin/drivers",
    label: "Drivers workflow",
    roles: ["super_admin", "admin", "ops_admin", "driver_admin"],
  },
  {
    key: "partners",
    href: "/admin/partners",
    label: "Partners workflow",
    roles: [
      "super_admin",
      "admin",
      "ops_admin",
      "product_admin",
      "driver_admin",
    ],
  },
  {
    key: "finance",
    href: "/admin/finance",
    label: "Finance workflow",
    roles: ["super_admin", "finance_admin"],
  },
  {
    key: "comms",
    href: "/admin/messages",
    label: "Comms workflow",
    roles: ["super_admin", "admin", "ops_admin"],
  },
  {
    key: "system",
    href: "/admin/system",
    label: "System workflow",
    roles: ["super_admin"],
  },
];

function getWorkflowLibrary(role: AdminRole) {
  return WORKFLOW_LIBRARY.filter((wf) => wf.roles.includes(role));
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState<
    | "super_admin"
    | "admin"
    | "ops_admin"
    | "driver_admin"
    | "product_admin"
    | "finance_admin"
  >("admin");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Get the ID token result to check custom claims
        const tokenResult = await user.getIdTokenResult();
        const isAdmin = tokenResult.claims.admin === true;

        if (!isAdmin) {
          router.push("/app");
          return;
        }

        // Set admin name and role from claims
        const name = user.displayName || user.email?.split("@")[0] || "Admin";
        setAdminName(name);

        const role = (tokenResult.claims.adminRole as string) || "admin";
        const validRoles = [
          "super_admin",
          "admin",
          "ops_admin",
          "driver_admin",
          "product_admin",
          "finance_admin",
        ] as const;
        setAdminRole(
          validRoles.includes(role as any)
            ? (role as (typeof validRoles)[number])
            : "admin",
        );

        setIsAuthorized(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Verifying authorization...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content - no AdminHeader since sidebar handles nav */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 relative">
        {/* Welcome Header with Quick Stats */}
        <div data-tour="admin-dashboard-welcome">
          <DashboardWelcome adminName={adminName} adminRole={adminRole} />
        </div>

        <AdminNotificationPermissionCard compact />

        <section
          data-tour="admin-onboarding-library"
          className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 md:p-7 shadow-xl shadow-slate-200/40 dark:shadow-slate-950/40"
        >
          <div className="flex flex-col gap-2 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
              Workflow Library
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Guided onboarding by role. Start with Reservations, then continue
              through each workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {getWorkflowLibrary(adminRole).map((wf) => (
              <Link
                key={wf.key}
                href={wf.href}
                className="inline-flex items-center justify-between rounded-2xl border border-slate-200/70 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300/70 dark:hover:border-blue-700/70 transition-all"
              >
                <span>{wf.label}</span>
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Stat cards are shown in DashboardWelcome; removing duplicate KeyMetrics */}

        {/* Operational Monitoring - High Priority */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Recent Activity Feed */}
          <RecentActivity />

          <SupportMetrics defaultRange="7d" />
        </div>

        {/* Analytics Charts Section - Detailed Exploration */}
        <div className="space-y-8">
          {/* Full Width Charts */}
          <BookingsOverTime />
          <RevenueByDay />

          {/* Two Column Chart Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <TripLifecycleFunnel />
          </div>

          {/* Cancellation Reasons */}
          <CancellationReasons />
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Quick Links Card (role-aware) */}
          <div
            data-tour="admin-quick-links"
            className="group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-7 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 rounded-3xl transition-all duration-500" />
            <h3 className="relative text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full" />
              Quick Links
            </h3>
            <div className="relative space-y-2.5">
              {getQuickLinks(adminRole).map((ql) => (
                <Link
                  key={ql.href}
                  href={ql.href}
                  className="group/link flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                >
                  <span className="flex items-center gap-2">
                    <ql.icon className="h-4 w-4" />
                    {ql.label}
                  </span>
                  <span className="text-slate-400 group-hover/link:text-blue-600 group-hover/link:translate-x-1 transition-all duration-300">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* System Health Card */}
          <div className="group relative bg-gradient-to-br from-green-50/70 to-emerald-50/70 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl border border-green-200/50 dark:border-green-800/50 rounded-3xl p-7 shadow-xl shadow-green-200/30 dark:shadow-green-950/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/0 to-emerald-400/0 group-hover:from-green-400/10 group-hover:to-emerald-400/10 rounded-3xl transition-all duration-500" />
            <div className="relative flex items-center gap-3 mb-5">
              <div className="relative">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                System Status
              </h3>
            </div>
            <div className="relative space-y-4 text-sm">
              <div className="flex items-center justify-between p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl backdrop-blur-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  API
                </span>
                <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl backdrop-blur-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Database
                </span>
                <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl backdrop-blur-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Payment Gateway
                </span>
                <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl backdrop-blur-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Notifications
                </span>
                <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Support Card */}
          <div className="group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-7 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 rounded-3xl transition-all duration-500" />
            <h3 className="relative text-xl font-bold text-slate-900 dark:text-white mb-3">
              Admin Tools
            </h3>
            <p className="relative text-sm font-medium text-slate-600 dark:text-slate-400 mb-5">
              System management and settings
            </p>
            <div className="relative space-y-2.5">
              <Link
                href="/admin/system"
                className="group/link flex items-center justify-between px-5 py-3.5 text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02]"
              >
                <span>Manage Admin Roles</span>
                <span className="group-hover/link:translate-x-1 transition-all duration-300">
                  →
                </span>
              </Link>
              <Link
                href="/admin/operations"
                className="group/link flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
              >
                <span>Operations</span>
                <span className="text-slate-400 group-hover/link:text-slate-700 dark:group-hover/link:text-slate-300 group-hover/link:translate-x-1 transition-all duration-300">
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* Support Health Card */}
          <SupportHealthCard />
        </div>
      </main>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.3);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.5);
        }
      `}</style>
    </div>
  );
}
