"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PartnerOnboardingTour, PartnerSidebar } from "@/components";
import { Menu } from "lucide-react";

async function getIdTokenWithTimeout(
  user: { getIdToken: (forceRefresh?: boolean) => Promise<string> },
  opts: { forceRefresh?: boolean; timeoutMs?: number } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 2500;
  const forceRefresh = !!opts.forceRefresh;
  return await Promise.race([
    user.getIdToken(forceRefresh),
    new Promise<string>((_, reject) =>
      setTimeout(
        () => reject(new Error(`getIdToken timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 3500;
  const { timeoutMs: _timeoutMs, ...rest } = init || {};

  if ((rest as any).signal) {
    return await fetch(input, rest);
  }

  const controller = new AbortController();
  const t = setTimeout(() => {
    try {
      controller.abort(
        new DOMException(`Timed out after ${timeoutMs}ms`, "TimeoutError"),
      );
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionReady, setSessionReady] = React.useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        "rideon:partnerSidebarCollapsed",
      );
      if (saved === "1") setSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileSidebarOpen]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileSidebarOpen]);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSessionReady(true);
        router.replace("/login");
        return;
      }

      try {
        let token = await getIdTokenWithTimeout(user, { timeoutMs: 2500 });

        await fetchWithTimeout("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, remember: true }),
          timeoutMs: 3500,
        });

        const fetchMe = async (t: string) =>
          fetchWithTimeout("/api/partner/me", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
            timeoutMs: 3500,
          });

        let res = await fetchMe(token);
        if (res.status === 403) {
          token = await getIdTokenWithTimeout(user, {
            forceRefresh: true,
            timeoutMs: 2500,
          });
          res = await fetchMe(token);
        }

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        if (res.status === 403) {
          router.replace("/register/partner");
          return;
        }

        if (!res.ok) {
          setSessionReady(true);
          return;
        }

        const data = await res.json().catch(() => null);
        const status = data?.status as string | undefined;

        if (status && status !== "approved") {
          router.replace("/register/partner/thank-you");
          return;
        }

        setSessionReady(true);
      } catch (e) {
        console.warn("[PartnerLayout] Failed to bootstrap partner session", e);
        setSessionReady(true);
      }
    });

    return () => unsub();
  }, [router]);

  if (!sessionReady) {
    return (
      <div className="relative min-h-dvh bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          >
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Preparing your partner dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <PartnerOnboardingTour />
      <PartnerSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={(next) => {
          setSidebarCollapsed(next);
          try {
            window.localStorage.setItem(
              "rideon:partnerSidebarCollapsed",
              next ? "1" : "0",
            );
          } catch {
            // ignore
          }
        }}
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      />

      {mobileSidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className={`lg:hidden fixed top-20 left-4 z-40 inline-flex items-center justify-center h-11 w-11 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all ${
          mobileSidebarOpen ? "opacity-0 pointer-events-none" : ""
        }`}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <main
        className={`min-h-dvh pl-0 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
