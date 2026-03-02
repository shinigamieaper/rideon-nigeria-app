"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AdminOnboardingTour, AdminSidebar } from "@/components";

type AdminRole =
  | "super_admin"
  | "admin"
  | "ops_admin"
  | "driver_admin"
  | "product_admin"
  | "finance_admin";

export default function AdminLayoutClient({
  children,
  adminRole,
}: {
  children: ReactNode;
  adminRole: AdminRole;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isXlUp, setIsXlUp] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("rideon:adminSidebarCollapsed");
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    const onChange = (e: MediaQueryListEvent) => setIsXlUp(e.matches);
    setIsXlUp(mql.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (isXlUp) setMobileOpen(false);
  }, [isXlUp]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const effectiveCollapsed = isXlUp ? collapsed : false;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <div className="relative min-h-dvh bg-background text-foreground overflow-x-hidden">
      <AdminOnboardingTour />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <AdminSidebar
        adminRole={adminRole}
        collapsed={effectiveCollapsed}
        onCollapsedChange={(next) => {
          setCollapsed(next);
          try {
            window.localStorage.setItem(
              "rideon:adminSidebarCollapsed",
              next ? "1" : "0",
            );
          } catch {}
        }}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <div
        className={`transition-all duration-300 ${effectiveCollapsed ? "xl:pl-20" : "xl:pl-64"}`}
      >
        <div className="sticky top-0 z-30 xl:hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg shadow-lg"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </button>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                RideOn Admin
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                Operations Center
              </div>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
