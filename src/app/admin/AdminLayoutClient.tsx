"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AdminOnboardingTour, AdminSidebar } from "@/components";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
  appExpired = false,
}: {
  children: ReactNode;
  adminRole: AdminRole;
  appExpired?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isXlUp, setIsXlUp] = useState(false);

  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    const getIdTokenWithTimeout = async (
      user: { getIdToken: (forceRefresh?: boolean) => Promise<string> },
      timeoutMs = 2500,
    ) => {
      return await Promise.race([
        user.getIdToken(),
        new Promise<string>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`getIdToken timed out after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);
    };

    const refreshSession = async (u: {
      getIdToken: (forceRefresh?: boolean) => Promise<string>;
    }) => {
      const token = await getIdTokenWithTimeout(u, 2500);
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token, remember: true }),
      });
    };

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        return;
      }
      try {
        await refreshSession(u);
      } catch {
        // ignore
      }

      if (!refreshInterval) {
        refreshInterval = setInterval(
          () => {
            refreshSession(u).catch(() => {});
          },
          45 * 60 * 1000,
        );
      }
    });

    return () => {
      unsub();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

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

        {appExpired ? (
          <div className="sticky top-14 xl:top-0 z-20 bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-2xl border-b border-amber-200/70 dark:border-amber-800/50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Service disabled — please contact the developer.
                </div>
                <div className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  Customer/driver/partner access is disabled until renewed.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
