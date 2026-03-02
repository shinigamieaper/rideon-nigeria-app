"use client";

import { useEffect, useState } from "react";
import {
  UserCheck,
  Calendar,
  Car,
  CreditCard,
  Users,
  AlertTriangle,
  Briefcase,
  Truck,
  ClipboardList,
  Handshake,
  MessageSquare,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { auth } from "@/lib/firebase";
import type { LucideIcon } from "lucide-react";

type AdminRole =
  | "super_admin"
  | "admin"
  | "ops_admin"
  | "driver_admin"
  | "product_admin"
  | "finance_admin";

export interface DashboardWelcomeProps
  extends React.ComponentPropsWithoutRef<"section"> {
  adminName?: string;
  adminRole?: AdminRole;
}

interface DashboardSummary {
  reservationsTodayTotal: number;
  reservationsTodayChauffeur: number;
  reservationsTodayRental: number;
  reservationsTodayDriveMyCar: number;
  activeTrips: number;
  needsReassignmentCount: number;
  pendingOnDemandDriverApprovals: number;
  pendingPartnerApplications: number;
  pendingVehicleSubmissions: number;
  pendingPartnerDriverSubmissions: number;
  pendingFullTimeDriverApplications: number;
  pendingInterviews: number;
  placementHireRequestsOpen: number;
  placementInterviewRequestsOpen: number;
  paymentSuccessRate24h: number;
}

const EMPTY: DashboardSummary = {
  reservationsTodayTotal: 0,
  reservationsTodayChauffeur: 0,
  reservationsTodayRental: 0,
  reservationsTodayDriveMyCar: 0,
  activeTrips: 0,
  needsReassignmentCount: 0,
  pendingOnDemandDriverApprovals: 0,
  pendingPartnerApplications: 0,
  pendingVehicleSubmissions: 0,
  pendingPartnerDriverSubmissions: 0,
  pendingFullTimeDriverApplications: 0,
  pendingInterviews: 0,
  placementHireRequestsOpen: 0,
  placementInterviewRequestsOpen: 0,
  paymentSuccessRate24h: 100,
};

interface CardDef {
  key: string;
  title: string;
  value: number;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  suffix?: string;
  href?: string;
}

function buildCards(m: DashboardSummary, role: AdminRole): CardDef[] {
  const all: Record<string, CardDef> = {
    reassignment: {
      key: "reassignment",
      title: "Needs Reassignment",
      value: m.needsReassignmentCount,
      icon: AlertTriangle,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      href: "/admin/reservations?status=needs_reassignment",
    },
    resToday: {
      key: "resToday",
      title: "Reservations Today",
      value: m.reservationsTodayTotal,
      icon: Calendar,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      href: "/admin/reservations",
    },
    resChauffeur: {
      key: "resChauffeur",
      title: "Chauffeur Today",
      value: m.reservationsTodayChauffeur,
      icon: Car,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    resRental: {
      key: "resRental",
      title: "Rentals Today",
      value: m.reservationsTodayRental,
      icon: Truck,
      iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    resDMC: {
      key: "resDMC",
      title: "Hire-a-Driver Today",
      value: m.reservationsTodayDriveMyCar,
      icon: Briefcase,
      iconBgColor: "bg-teal-100 dark:bg-teal-900/30",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    active: {
      key: "active",
      title: "Active Trips",
      value: m.activeTrips,
      icon: Car,
      iconBgColor: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    payRate: {
      key: "payRate",
      title: "Payment Success (24h)",
      value: m.paymentSuccessRate24h,
      icon: CreditCard,
      iconBgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      suffix: "%",
    },
    pendingDrivers: {
      key: "pendingDrivers",
      title: "Pending Driver Approvals",
      value: m.pendingOnDemandDriverApprovals,
      icon: UserCheck,
      iconBgColor: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      href: "/admin/drivers",
    },
    pendingPartners: {
      key: "pendingPartners",
      title: "Pending Partner Apps",
      value: m.pendingPartnerApplications,
      icon: Handshake,
      iconBgColor: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      href: "/admin/partners",
    },
    pendingVehicles: {
      key: "pendingVehicles",
      title: "Pending Vehicles",
      value: m.pendingVehicleSubmissions,
      icon: Truck,
      iconBgColor: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      href: "/admin/vehicle-submissions",
    },
    pendingPDrivers: {
      key: "pendingPDrivers",
      title: "Pending Partner Drivers",
      value: m.pendingPartnerDriverSubmissions,
      icon: Users,
      iconBgColor: "bg-pink-100 dark:bg-pink-900/30",
      iconColor: "text-pink-600 dark:text-pink-400",
      href: "/admin/partner-driver-submissions",
    },
    pendingFT: {
      key: "pendingFT",
      title: "Pending FT Driver Apps",
      value: m.pendingFullTimeDriverApplications,
      icon: ClipboardList,
      iconBgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      href: "/admin/full-time-driver-applications",
    },
    interviews: {
      key: "interviews",
      title: "Pending Interviews",
      value: m.pendingInterviews,
      icon: Users,
      iconBgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    placementHire: {
      key: "placementHire",
      title: "Placement Hire Requests",
      value: m.placementHireRequestsOpen,
      icon: MessageSquare,
      iconBgColor: "bg-slate-100 dark:bg-slate-800/50",
      iconColor: "text-slate-700 dark:text-slate-200",
      href: "/admin/messages",
    },
    placementInterview: {
      key: "placementInterview",
      title: "Placement Interview Requests",
      value: m.placementInterviewRequestsOpen,
      icon: Users,
      iconBgColor: "bg-slate-100 dark:bg-slate-800/50",
      iconColor: "text-slate-700 dark:text-slate-200",
      href: "/admin/messages",
    },
  };

  switch (role) {
    case "ops_admin":
      return [
        all.reassignment,
        all.resToday,
        all.resChauffeur,
        all.resRental,
        all.resDMC,
        all.active,
        all.pendingVehicles,
        all.pendingPDrivers,
        all.placementHire,
        all.placementInterview,
      ];
    case "product_admin":
      return [
        all.pendingPartners,
        all.pendingVehicles,
        all.pendingPDrivers,
        all.resChauffeur,
        all.resRental,
        all.resDMC,
        all.placementHire,
      ];
    case "driver_admin":
      return [
        all.pendingDrivers,
        all.pendingFT,
        all.placementHire,
        all.placementInterview,
        all.reassignment,
        all.resDMC,
        all.active,
        all.resToday,
      ];
    case "finance_admin":
      return [
        all.payRate,
        all.resToday,
        all.resChauffeur,
        all.resRental,
        all.resDMC,
        all.active,
      ];
    case "super_admin":
    case "admin":
    default:
      return [
        all.reassignment,
        all.resToday,
        all.payRate,
        all.pendingDrivers,
        all.pendingPartners,
        all.pendingVehicles,
        all.pendingPDrivers,
        all.pendingFT,
        all.placementHire,
        all.placementInterview,
      ];
  }
}

export function DashboardWelcome({
  adminName = "Admin",
  adminRole = "admin",
  className = "",
  ...props
}: DashboardWelcomeProps) {
  const [metrics, setMetrics] = useState<DashboardSummary>(EMPTY);
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setCurrentDate(today.toLocaleDateString("en-US", options));

    const hour = today.getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const fetchSummary = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/dashboard/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error("Error fetching admin summary:", error);
      }
    };

    fetchSummary();
  }, []);

  const statCards = buildCards(metrics, adminRole);

  return (
    <section
      className={[
        "relative",
        "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900/50 dark:to-slate-800/50",
        "backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-700/50",
        "rounded-3xl p-5 sm:p-6 lg:p-8",
        "shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50",
        "transition-all duration-500",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-3xl pointer-events-none" />

      <div className="relative grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Welcome Card */}
        <div className="xl:col-span-4 flex flex-col justify-center">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
            {currentDate}
          </p>
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 leading-tight">
            {greeting}, {adminName}!{" "}
            <span className="text-3xl sm:text-4xl">👋</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
            Track & manage your platform operations here
          </p>
        </div>

        {/* Stats Cards (using shared StatCard UI) */}
        <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
          {statCards.map((stat) => (
            <StatCard
              key={stat.key}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              iconBgColor={stat.iconBgColor}
              iconColor={stat.iconColor}
              suffix={stat.suffix || ""}
              href={stat.href}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
