"use client";

import React, { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = pathname || window.location.pathname;

    const ensureManifest = (href: string) => {
      const absolute = new URL(href, window.location.origin).href;
      const existing = document.querySelector(
        'link[rel="manifest"][data-portal="true"]',
      ) as HTMLLinkElement | null;
      if (existing && existing.href !== absolute) {
        existing.parentNode?.removeChild(existing);
      }
      let link = document.querySelector(
        'link[rel="manifest"][data-portal="true"]',
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "manifest");
        link.setAttribute("data-portal", "true");
        link.href = href;
        document.head.appendChild(link);
      } else {
        link.href = href;
      }
    };

    const registerSW = async (swUrl: string, scope: string) => {
      if (
        !("serviceWorker" in navigator) ||
        process.env.NODE_ENV !== "production"
      )
        return;
      try {
        // Unregister any legacy root-scoped SW
        const regs = await navigator.serviceWorker.getRegistrations();
        regs.forEach((r) => {
          try {
            const u = new URL(r.scope);
            if (u.pathname === "/" && scope !== "/") {
              r.unregister();
            }
          } catch {}
        });
        await navigator.serviceWorker.register(swUrl, { scope });
      } catch (err) {
        console.error("[SW] registration failed", err);
      }
    };

    if (path.startsWith("/app")) {
      ensureManifest("/app/manifest.webmanifest");
      registerSW("/app/sw.js", "/app/");
    } else if (path.startsWith("/driver")) {
      ensureManifest("/driver/manifest.webmanifest");
      registerSW("/driver/sw.js", "/driver/");
    } else if (path.startsWith("/full-time-driver")) {
      ensureManifest("/full-time-driver/manifest.webmanifest");
      registerSW("/full-time-driver/sw.js", "/full-time-driver/");
    } else if (path.startsWith("/admin")) {
      ensureManifest("/admin/manifest.webmanifest");
      registerSW("/admin/sw.js", "/admin/");
    } else if (path.startsWith("/partner")) {
      ensureManifest("/partner/manifest.webmanifest");
      registerSW("/partner/sw.js", "/partner/");
    } else {
      // Public site: ensure no portal manifest is attached and no root SW is active
      const existing = document.querySelector(
        'link[rel="manifest"][data-portal="true"]',
      );
      if (existing) existing.parentNode?.removeChild(existing);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) =>
            regs.forEach((r) => {
              try {
                const u = new URL(r.scope);
                if (u.pathname === "/") r.unregister();
              } catch {}
            }),
          )
          .catch(() => {});
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { code?: string } | undefined;
      if (reason && reason.code === "messaging/unsupported-browser") {
        event.preventDefault();
        console.warn("[FCM] Swallowed unsupported-browser promise rejection");
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="rideon-theme"
    >
      {children}
    </ThemeProvider>
  );
}
