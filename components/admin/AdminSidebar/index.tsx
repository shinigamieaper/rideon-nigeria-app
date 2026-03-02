"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  Car,
  ClipboardList,
  Building2,
  Briefcase,
  BadgeDollarSign,
  Users,
  UserCircle,
  MessageSquare,
  Bell,
  Wallet,
  Settings2,
  Megaphone,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  X,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

type AdminRole =
  | "super_admin"
  | "admin"
  | "ops_admin"
  | "driver_admin"
  | "product_admin"
  | "finance_admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  activePatterns: string[];
  allowedRoles?: AdminRole[];
  tourAttr?: string;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    activePatterns: ["/admin"],
    allowedRoles: [
      "super_admin",
      "admin",
      "ops_admin",
      "driver_admin",
      "product_admin",
      "finance_admin",
    ],
  },
  {
    label: "Partners",
    href: "/admin/partners",
    icon: Building2,
    activePatterns: ["/admin/partners"],
    allowedRoles: ["super_admin", "admin", "ops_admin", "product_admin"],
    tourAttr: "admin-nav-partners",
  },
  {
    label: "Reservations",
    href: "/admin/reservations",
    icon: CalendarClock,
    activePatterns: ["/admin/reservations"],
    allowedRoles: ["super_admin", "admin", "ops_admin"],
    tourAttr: "admin-nav-reservations",
  },
  {
    label: "Catalog",
    href: "/admin/catalog",
    icon: Car,
    activePatterns: ["/admin/catalog"],
    allowedRoles: ["super_admin", "admin", "product_admin"],
  },
  {
    label: "Vehicle Apps",
    href: "/admin/vehicle-submissions",
    icon: ClipboardList,
    activePatterns: ["/admin/vehicle-submissions"],
    allowedRoles: ["super_admin", "admin", "product_admin"],
  },
  {
    label: "Partner Driver Apps",
    href: "/admin/partner-driver-submissions",
    icon: ClipboardList,
    activePatterns: ["/admin/partner-driver-submissions"],
    allowedRoles: ["super_admin", "admin", "ops_admin", "driver_admin"],
  },
  {
    label: "Drivers",
    href: "/admin/drivers",
    icon: Users,
    activePatterns: ["/admin/drivers"],
    allowedRoles: ["super_admin", "admin", "ops_admin", "driver_admin"],
    tourAttr: "admin-nav-drivers",
  },
  {
    label: "FT Driver Applications",
    href: "/admin/full-time-driver-applications",
    icon: Briefcase,
    activePatterns: ["/admin/full-time-driver-applications"],
    allowedRoles: ["super_admin", "admin", "driver_admin"],
  },
  {
    label: "FT Driver Pricing",
    href: "/admin/full-time-driver-pricing",
    icon: BadgeDollarSign,
    activePatterns: ["/admin/full-time-driver-pricing"],
    allowedRoles: ["super_admin", "admin", "ops_admin", "product_admin"],
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: UserCircle,
    activePatterns: ["/admin/customers"],
    allowedRoles: ["super_admin", "admin", "ops_admin"],
  },
  {
    label: "Messages",
    href: "/admin/messages",
    icon: MessageSquare,
    activePatterns: ["/admin/messages"],
    allowedRoles: ["super_admin", "admin", "ops_admin"],
    tourAttr: "admin-nav-messages",
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    activePatterns: ["/admin/notifications"],
    allowedRoles: ["super_admin", "admin", "ops_admin"],
  },
  {
    label: "Banners",
    href: "/admin/banners",
    icon: Megaphone,
    activePatterns: ["/admin/banners"],
    allowedRoles: ["super_admin", "admin", "product_admin"],
  },
  {
    label: "Finance",
    href: "/admin/finance",
    icon: Wallet,
    activePatterns: ["/admin/finance"],
    allowedRoles: ["super_admin", "finance_admin"],
    tourAttr: "admin-nav-finance",
  },
  {
    label: "Operations",
    href: "/admin/operations",
    icon: Settings2,
    activePatterns: ["/admin/operations"],
    allowedRoles: ["super_admin", "admin", "ops_admin"],
  },
  {
    label: "Config & Content",
    href: "/admin/config",
    icon: Megaphone,
    activePatterns: ["/admin/config"],
    allowedRoles: ["super_admin", "admin", "product_admin"],
  },
  {
    label: "On-Demand Driver",
    href: "/admin/on-demand-driver",
    icon: Car,
    activePatterns: ["/admin/on-demand-driver"],
    allowedRoles: ["super_admin", "admin", "ops_admin", "product_admin"],
  },
  {
    label: "System & Admins",
    href: "/admin/system",
    icon: ShieldCheck,
    activePatterns: ["/admin/system"],
    allowedRoles: ["super_admin"],
    tourAttr: "admin-nav-system",
  },
];

export interface AdminSidebarProps
  extends React.ComponentPropsWithoutRef<"aside"> {
  defaultCollapsed?: boolean;
  adminRole?: AdminRole;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function AdminSidebar({
  defaultCollapsed = false,
  adminRole = "admin",
  collapsed: collapsedProp,
  onCollapsedChange,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
  className = "",
  ...props
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [uncontrolledCollapsed, setUncontrolledCollapsed] =
    useState(defaultCollapsed);
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] = useState(false);

  const collapsed =
    typeof collapsedProp === "boolean" ? collapsedProp : uncontrolledCollapsed;
  const setCollapsed = onCollapsedChange || setUncontrolledCollapsed;

  const mobileOpen =
    typeof mobileOpenProp === "boolean"
      ? mobileOpenProp
      : uncontrolledMobileOpen;
  const setMobileOpen = onMobileOpenChange || setUncontrolledMobileOpen;

  const sectionDefs: Array<{ id: string; label: string; hrefs: string[] }> = [
    {
      id: "core",
      label: "Core",
      hrefs: [
        "/admin",
        "/admin/reservations",
        "/admin/drivers",
        "/admin/customers",
      ],
    },
    {
      id: "partners",
      label: "Partners",
      hrefs: [
        "/admin/partners",
        "/admin/catalog",
        "/admin/vehicle-submissions",
        "/admin/partner-driver-submissions",
        "/admin/full-time-driver-applications",
      ],
    },
    {
      id: "comms",
      label: "Comms",
      hrefs: ["/admin/messages", "/admin/notifications", "/admin/banners"],
    },
    { id: "finance", label: "Finance", hrefs: ["/admin/finance"] },
    {
      id: "system",
      label: "System",
      hrefs: [
        "/admin/operations",
        "/admin/config",
        "/admin/full-time-driver-pricing",
        "/admin/on-demand-driver",
        "/admin/system",
      ],
    },
  ];

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const base: Record<string, boolean> = {
        core: false,
        partners: false,
        comms: false,
        finance: false,
        system: false,
      };

      const activeSection = sectionDefs.find((s) =>
        s.hrefs.some((h) =>
          h === "/admin" ? pathname === "/admin" : pathname.startsWith(h),
        ),
      );

      if (activeSection?.id) base[activeSection.id] = true;
      return base;
    },
  );

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };

      const activeSection = sectionDefs.find((s) =>
        s.hrefs.some((h) =>
          h === "/admin" ? pathname === "/admin" : pathname.startsWith(h),
        ),
      );

      for (const s of sectionDefs) {
        next[s.id] = s.id === activeSection?.id;
      }

      return next;
    });
  }, [pathname]);

  const visibleNavItems = navItems.filter((item) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    return item.allowedRoles.includes(adminRole);
  });

  const isActive = (item: NavItem) => {
    if (item.href === "/admin") {
      return pathname === "/admin";
    }

    if (item.href.includes("?")) {
      try {
        const url = new URL(item.href, "http://local");
        if (pathname !== url.pathname) return false;

        const targetSection = url.searchParams.get("section");
        if (targetSection) {
          return String(searchParams.get("section") || "") === targetSection;
        }
      } catch {}
    }

    return item.activePatterns.some((pattern) => pathname.startsWith(pattern));
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  const widthClass = collapsed ? "w-64 xl:w-20" : "w-64";
  const mobileTranslateClass = mobileOpen
    ? "translate-x-0"
    : "-translate-x-full";

  return (
    <aside
      className={`
        fixed left-0 top-0 z-50 h-dvh flex flex-col
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
        border-r border-slate-200/60 dark:border-slate-800/50
        shadow-xl shadow-slate-200/30 dark:shadow-slate-950/30
        transition-all duration-300 ease-in-out
        ${widthClass}
        ${mobileTranslateClass}
        xl:translate-x-0
        ${className}
      `}
      data-tour="admin-sidebar"
      {...props}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="hidden xl:inline-flex absolute -right-3 top-7 items-center justify-center h-8 w-8 rounded-full border border-slate-200/80 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg hover:shadow-xl transition"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200/60 dark:border-slate-800/50">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl blur opacity-60" />
          <div className="relative p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className={`overflow-hidden ${collapsed ? "xl:hidden" : ""}`}>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
            RideOn Admin
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Operations Center
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="xl:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg"
          >
            <X className="h-4 w-4 text-slate-700 dark:text-slate-200" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5 admin-sidebar-scroll">
        {collapsed ? (
          <div className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.tourAttr}
                  onClick={() => {
                    if (mobileOpen) setMobileOpen(false);
                  }}
                  className={`
                    group flex items-center gap-3 px-3 py-1.5 rounded-xl
                    transition-all duration-200 relative min-w-0
                    ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                    }
                    ${collapsed ? "xl:justify-center xl:px-2" : ""}
                  `}
                  title={item.label}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${
                      active
                        ? "text-white"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    }`}
                  />
                  <span
                    className={`font-medium text-[13px] truncate ${collapsed ? "xl:hidden" : ""}`}
                  >
                    {item.label}
                  </span>
                  {collapsed && active && (
                    <span className="hidden xl:block absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {sectionDefs.map((section) => {
              const items = visibleNavItems.filter((i) =>
                section.hrefs.includes(i.href),
              );
              if (items.length === 0) return null;
              const isOpen = openSections[section.id];
              return (
                <div key={section.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((s) => {
                        const next: Record<string, boolean> = {};
                        for (const def of sectionDefs) next[def.id] = false;
                        next[section.id] = !s[section.id];
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                  >
                    <span className="truncate">{section.label}</span>
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen ? (
                    <div className="space-y-1">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            data-tour={item.tourAttr}
                            onClick={() => {
                              if (mobileOpen) setMobileOpen(false);
                            }}
                            className={`
                              group flex items-center gap-3 px-3 py-1.5 rounded-xl
                              transition-all duration-200 relative min-w-0
                              ${
                                active
                                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                              }
                            `}
                            title={item.label}
                          >
                            <Icon
                              className={`h-5 w-5 flex-shrink-0 ${
                                active
                                  ? "text-white"
                                  : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                              }`}
                            />
                            <span className="font-medium text-[13px] truncate">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-200/60 dark:border-slate-800/50 p-2.5 space-y-2">
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            hidden xl:flex items-center gap-3 w-full px-3 py-2 rounded-xl
            text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70
            transition-all duration-200
            ${collapsed ? "xl:justify-center xl:px-2" : ""}
          `}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="font-medium text-sm">Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`
            flex items-center gap-3 w-full px-3 py-2 rounded-xl
            text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
            transition-all duration-200
            ${collapsed ? "xl:justify-center xl:px-2" : ""}
          `}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          <span
            className={`font-medium text-sm ${collapsed ? "xl:hidden" : ""}`}
          >
            Logout
          </span>
        </button>
      </div>

      <style jsx global>{`
        .admin-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
        }
        .admin-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 9999px;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.55);
        }
        .dark .admin-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.35);
        }
        .dark .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.55);
        }
        .dark .admin-sidebar-scroll {
          scrollbar-color: rgba(71, 85, 105, 0.35) transparent;
        }
      `}</style>
    </aside>
  );
}
