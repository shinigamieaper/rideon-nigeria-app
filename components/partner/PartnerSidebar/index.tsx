"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  Car,
  IdCard,
  Users2,
  FileText,
  Settings2,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Loader2,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  activePatterns: string[];
};

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/partner",
    icon: LayoutDashboard,
    activePatterns: ["/partner"],
  },
  {
    label: "Reservations",
    href: "/partner/reservations",
    icon: CalendarClock,
    activePatterns: ["/partner/reservations"],
  },
  {
    label: "Vehicles",
    href: "/partner/vehicles",
    icon: Car,
    activePatterns: ["/partner/vehicles"],
  },
  {
    label: "Drivers",
    href: "/partner/drivers",
    icon: IdCard,
    activePatterns: ["/partner/drivers"],
  },
  {
    label: "Team",
    href: "/partner/team",
    icon: Users2,
    activePatterns: ["/partner/team"],
  },
  {
    label: "Billing",
    href: "/partner/billing",
    icon: FileText,
    activePatterns: ["/partner/billing"],
  },
  {
    label: "Settings",
    href: "/partner/settings",
    icon: Settings2,
    activePatterns: ["/partner/settings"],
  },
];

export interface PartnerSidebarProps
  extends React.ComponentPropsWithoutRef<"aside"> {
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PartnerSidebar({
  defaultCollapsed = false,
  collapsed,
  onCollapsedChange,
  open,
  onOpenChange,
  className = "",
  ...props
}: PartnerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [uncontrolledCollapsed, setUncontrolledCollapsed] =
    useState(defaultCollapsed);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
  const effectiveCollapsed = collapsed ?? uncontrolledCollapsed;
  const setCollapsed = React.useCallback(
    (next: boolean) => {
      if (onCollapsedChange) onCollapsedChange(next);
      else setUncontrolledCollapsed(next);
    },
    [onCollapsedChange],
  );

  const effectiveOpen = open ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (onOpenChange) onOpenChange(next);
      else setUncontrolledOpen(next);
    },
    [onOpenChange],
  );

  const [contextLoading, setContextLoading] = React.useState(true);
  const [contexts, setContexts] = React.useState<
    Array<{
      partnerId: string;
      kind: "owner" | "team";
      teamRole: "admin" | "manager" | "viewer" | null;
      label: string;
    }>
  >([]);
  const [activePartnerId, setActivePartnerId] = React.useState<string | null>(
    null,
  );
  const [switchingContext, setSwitchingContext] = React.useState(false);

  const loadContexts = React.useCallback(async (user = auth.currentUser) => {
    try {
      if (!user) {
        setContexts([]);
        setActivePartnerId(null);
        return;
      }

      let token = await user.getIdToken();

      const fetchAll = async (t: string) =>
        Promise.all([
          fetch("/api/partner/me", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
          }),
          fetch("/api/partner/contexts", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
          }),
        ]);

      let [meRes, ctxRes] = await fetchAll(token);
      if (meRes.status === 403 || ctxRes.status === 403) {
        token = await user.getIdToken(true);
        [meRes, ctxRes] = await fetchAll(token);
      }

      if (!meRes.ok || !ctxRes.ok) {
        setContexts([]);
        setActivePartnerId(null);
        return;
      }

      const me = (await meRes.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const partnerId = typeof me?.partnerId === "string" ? me.partnerId : "";
      setActivePartnerId(partnerId || null);

      const ctxJson = (await ctxRes.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const listRaw = ctxJson?.contexts;
      const list = Array.isArray(listRaw)
        ? (listRaw as Array<Record<string, unknown>>)
        : [];

      const parsed = list
        .map((c) => {
          const pid = typeof c?.partnerId === "string" ? c.partnerId : "";
          const kind =
            c?.kind === "owner" || c?.kind === "team"
              ? (c.kind as "owner" | "team")
              : "team";
          const tr = c?.teamRole;
          const teamRole =
            tr === "admin" || tr === "manager" || tr === "viewer"
              ? (tr as "admin" | "manager" | "viewer")
              : null;
          const label = typeof c?.label === "string" ? c.label : "";

          if (!pid) return null;
          return { partnerId: pid, kind, teamRole, label: label.trim() || pid };
        })
        .filter(Boolean) as Array<{
        partnerId: string;
        kind: "owner" | "team";
        teamRole: "admin" | "manager" | "viewer" | null;
        label: string;
      }>;

      setContexts(parsed);
    } finally {
      setContextLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    setContextLoading(true);
    loadContexts();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setContextLoading(true);
      await loadContexts(user || null);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [loadContexts]);

  const isActive = useCallback(
    (item: NavItem) => {
      if (item.href === "/partner") return pathname === "/partner";
      return item.activePatterns.some((p) => pathname.startsWith(p));
    },
    [pathname],
  );

  const activeLabel = useMemo(() => {
    const found = navItems.find((i) => isActive(i));
    return found?.label || "Partner";
  }, [isActive]);

  const activeContext = useMemo(() => {
    if (!activePartnerId) return null;
    return contexts.find((c) => c.partnerId === activePartnerId) || null;
  }, [activePartnerId, contexts]);

  const contextDisplay = useMemo(() => {
    if (!activeContext) return "";
    if (activeContext.kind === "owner") return `${activeContext.label} (owner)`;
    return `${activeContext.label}${activeContext.teamRole ? ` (${activeContext.teamRole})` : ""}`;
  }, [activeContext]);

  const visibleItems = useMemo(() => {
    return navItems;
  }, []);

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 z-40 flex flex-col bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border-r border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 lg:translate-x-0 ${
        effectiveOpen ? "translate-x-0" : "-translate-x-full"
      } ${effectiveCollapsed ? "w-64 lg:w-20" : "w-64"} ${className}`}
      data-tour="partner-sidebar"
      {...props}
    >
      <button
        type="button"
        onClick={() => setCollapsed(!effectiveCollapsed)}
        className="hidden lg:inline-flex absolute -right-3 top-7 items-center justify-center h-8 w-8 rounded-full border border-slate-200/80 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg hover:shadow-xl transition"
        aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {effectiveCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div
        className={`flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/60 px-4 py-5 ${
          effectiveCollapsed ? "lg:px-2 lg:justify-center" : ""
        }`}
      >
        <div
          className={`flex items-center gap-2 min-w-0 ${effectiveCollapsed ? "lg:justify-center" : ""}`}
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div className={`min-w-0 ${effectiveCollapsed ? "lg:hidden" : ""}`}>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              Partner Portal
            </p>
            {contextLoading ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Loading…
              </p>
            ) : contexts.length > 1 ? (
              <div className="mt-1" data-tour="partner-context-switcher">
                <Select
                  value={activePartnerId || ""}
                  onValueChange={async (next) => {
                    if (switchingContext) return;
                    const user = auth.currentUser;
                    if (!user) return;
                    if (next === activePartnerId) return;

                    setSwitchingContext(true);
                    try {
                      let token = await user.getIdToken();

                      const doPost = async (t: string) =>
                        fetch("/api/partner/context", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${t}`,
                          },
                          body: JSON.stringify({ partnerId: next || "" }),
                        });

                      let res = await doPost(token);
                      if (res.status === 403) {
                        token = await user.getIdToken(true);
                        res = await doPost(token);
                      }

                      if (res.ok) {
                        setActivePartnerId(next || null);
                        window.location.reload();
                      }
                    } finally {
                      setSwitchingContext(false);
                    }
                  }}
                  disabled={switchingContext}
                >
                  <SelectTrigger className="h-9 bg-white/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60">
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {contexts.map((c) => (
                      <SelectItem key={c.partnerId} value={c.partnerId}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                {contextDisplay || "—"}
              </p>
            )}
          </div>
        </div>

        <div
          className={`flex items-center gap-2 ${effectiveCollapsed ? "lg:hidden" : ""}`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80 transition"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                effectiveCollapsed ? "lg:justify-center lg:px-2" : ""
              } ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60"
              }`}
              title={effectiveCollapsed ? item.label : undefined}
            >
              <span
                className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                  active
                    ? "bg-white/15"
                    : "bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={`truncate ${effectiveCollapsed ? "lg:hidden" : ""}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/60">
        <button
          type="button"
          onClick={async () => {
            try {
              await signOut(auth);
            } finally {
              router.replace("/login");
            }
          }}
          className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition ${
            effectiveCollapsed ? "lg:justify-center lg:px-2" : ""
          }`}
        >
          <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <LogOut className="h-4 w-4" />
          </span>
          <span className={effectiveCollapsed ? "lg:hidden" : ""}>Log out</span>
        </button>
      </div>
    </aside>
  );
}
