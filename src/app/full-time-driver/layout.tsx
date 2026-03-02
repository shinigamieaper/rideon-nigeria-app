"use client";

import * as React from "react";
import { FloatingDock } from "@/components";
import type { FloatingDockProps } from "@/components/ui/floating-dock";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FileText, Home, MessageSquare, UploadCloud, User } from "lucide-react";

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

export default function FullTimeDriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionReady, setSessionReady] = React.useState(false);

  const items = React.useMemo(() => {
    const nav: FloatingDockProps["items"] = [
      {
        title: "Home",
        icon: <Home className="h-full w-full" strokeWidth={1.75} />,
        href: "/full-time-driver",
        match: "exact" as const,
      },
      {
        title: "Apply",
        icon: <FileText className="h-full w-full" strokeWidth={1.75} />,
        href: "/full-time-driver/application/apply",
        activePatterns: ["/full-time-driver/application/apply"],
      },
      {
        title: "Documents",
        icon: <UploadCloud className="h-full w-full" strokeWidth={1.75} />,
        href: "/full-time-driver/application/documents",
        activePatterns: ["/full-time-driver/application/documents"],
      },
      {
        title: "Messages",
        icon: <MessageSquare className="h-full w-full" strokeWidth={1.75} />,
        href: "/full-time-driver/messages",
        activePatterns: ["/full-time-driver/messages"],
      },
      {
        title: "Profile",
        icon: <User className="h-full w-full" strokeWidth={1.75} />,
        href: "/full-time-driver/profile",
        activePatterns: ["/full-time-driver/profile"],
      },
    ];
    return nav.slice(0, 5);
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSessionReady(true);
        router.replace(
          `/login?next=${encodeURIComponent(pathname || "/full-time-driver")}`,
        );
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
          fetchWithTimeout("/api/full-time-driver/me", {
            headers: { Authorization: `Bearer ${t}` },
            cache: "no-store",
            timeoutMs: 3500,
          });

        let res = await fetchMe(token);
        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        if (!res.ok) {
          token = await getIdTokenWithTimeout(user, {
            forceRefresh: true,
            timeoutMs: 2500,
          });
          res = await fetchMe(token);
        }

        setSessionReady(true);
      } catch (e) {
        console.warn("[FullTimeDriverLayout] Failed to bootstrap session", e);
        setSessionReady(true);
      }
    });

    return () => unsub();
  }, [router, pathname]);

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
            Preparing your full-time driver portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div className="min-h-dvh pb-32">{children}</div>

      {/* Floating dock overlay (safe-area aware), consistent with customer + driver portals */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-3"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        role="navigation"
        aria-label="Primary"
      >
        <div className="pointer-events-auto">
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
