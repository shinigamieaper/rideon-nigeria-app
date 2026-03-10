"use client";

import * as React from "react";
import { FloatingDock } from "@/components";
import type { FloatingDockProps } from "@/components/ui/floating-dock";
import { Home, CalendarClock, MessageSquare, Wallet, User } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { DriverOnboardingTour } from "@/components";

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

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionReady, setSessionReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        if (redirectTimer) clearTimeout(redirectTimer);
        redirectTimer = setTimeout(() => {
          if (cancelled) return;
          if (!auth.currentUser) {
            router.replace(
              `/login?next=${encodeURIComponent(pathname || "/driver")}`,
            );
          }
        }, 1500);
        return;
      }

      if (redirectTimer) {
        clearTimeout(redirectTimer);
        redirectTimer = null;
      }
      try {
        let token = await getIdTokenWithTimeout(user, { timeoutMs: 2500 });

        // Ensure session cookie is created before rendering server pages
        await fetchWithTimeout("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, remember: true }),
          timeoutMs: 3500,
        });

        // Fetch driver data
        const fetchMe = async (t: string) =>
          fetchWithTimeout("/api/drivers/me", {
            headers: { Authorization: `Bearer ${t}` },
            timeoutMs: 3500,
          });

        let res = await fetchMe(token);

        // If custom claims were just set (role=driver), the current token may be stale.
        // Force refresh once and retry.
        if (res.status === 403) {
          token = await getIdTokenWithTimeout(user, {
            forceRefresh: true,
            timeoutMs: 2500,
          });
          res = await fetchMe(token);
        }

        if (res.status === 403) {
          router.replace("/register/driver");
          return;
        }
        if (res.ok) {
          const data = await res.json();

          // Gate access: require admin approval before entering driver app
          const status = data?.status as
            | "pending_review"
            | "approved"
            | "rejected"
            | undefined;
          if (status && status !== "approved") {
            // Redirect to thank-you/status page
            router.replace("/register/driver/thank-you");
            return;
          }
        }

        setSessionReady(true); // Auth complete, safe to render server pages
      } catch (e) {
        console.warn("[DriverLayout] Failed to fetch driver data", e);
        setSessionReady(true); // Allow rendering even if fetch failed
      }
    });
    return () => {
      cancelled = true;
      unsub();
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [router, pathname]);

  const items = React.useMemo(() => {
    const nav: FloatingDockProps["items"] = [
      {
        title: "Home",
        icon: <Home className="h-full w-full" strokeWidth={1.75} />,
        href: "/driver",
        match: "exact" as const,
      },
    ];

    // Schedule/Requests always visible
    nav.push({
      title: "Requests",
      icon: <CalendarClock className="h-full w-full" strokeWidth={1.75} />,
      href: "/driver/bookings/new",
      activePatterns: ["/driver/bookings", "/driver/schedule", "/driver/trips"],
    });

    // Messages - All drivers
    nav.push({
      title: "Messages",
      icon: <MessageSquare className="h-full w-full" strokeWidth={1.75} />,
      href: "/driver/messages",
      activePatterns: ["/driver/messages"],
    });

    // Earnings - All drivers
    nav.push({
      title: "Earnings",
      icon: <Wallet className="h-full w-full" strokeWidth={1.75} />,
      href: "/driver/earnings",
      activePatterns: ["/driver/earnings"],
    });

    // Always include Profile
    nav.push({
      title: "Profile",
      icon: <User className="h-full w-full" strokeWidth={1.75} />,
      href: "/driver/profile",
      activePatterns: ["/driver/profile", "/driver/notifications"],
    });

    // Placement track deprecated - no Opportunities link needed

    // Ensure we never exceed 5 items
    return nav.slice(0, 5);
  }, []);

  // Show loading state while establishing session
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
            Preparing your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <DriverOnboardingTour />
      <div className="min-h-dvh pb-32">{children}</div>

      {/* Floating dock overlay (safe-area aware), pointer-events consistent with customer app */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-3"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        role="navigation"
        aria-label="Primary"
      >
        <div className="pointer-events-auto" data-tour="driver-floating-dock">
          <FloatingDock
            items={items}
            desktopClassName="bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all"
            mobileClassName=""
          />
        </div>
      </div>
    </div>
  );
}
