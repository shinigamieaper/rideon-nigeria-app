"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AppHeader from "../../components/layout/AppHeader";
import PublicHeader from "../../components/layout/PublicHeader";
import DriverHeader from "../../components/driver/dashboard/DriverHeader";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
) {
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
  } catch (e: any) {
    const name = typeof e?.name === "string" ? e.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      const err = new Error(`Request timed out after ${timeoutMs}ms`);
      (err as any).code = "FETCH_TIMEOUT";
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

function initialsFrom(first?: string, last?: string, email?: string) {
  const a = (first || "").trim();
  const b = (last || "").trim();
  if (a || b)
    return (
      ((a[0] || "") + (b[0] || "")).toUpperCase() ||
      (a[0] || b[0] || "?").toUpperCase()
    );
  const e = (email || "").trim();
  return e ? e[0]!.toUpperCase() : "RN";
}

export default function HeaderSwitcher() {
  const pathname = usePathname();
  const isFullTimeDriverPortal = pathname?.startsWith("/full-time-driver");
  const isDriverPortal = pathname?.startsWith("/driver");
  const isCustomerPortal = pathname?.startsWith("/app") && !isDriverPortal;
  const isAdminPortal = pathname?.startsWith("/admin");
  const isPartnerPortal = pathname?.startsWith("/partner");
  const isPortal = isDriverPortal || isCustomerPortal || isFullTimeDriverPortal;
  const [initials, setInitials] = React.useState<string>("RN");
  const [avatarColor, setAvatarColor] = React.useState<string>("#00529B");
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [driverHeader, setDriverHeader] = React.useState<{ firstName: string }>(
    { firstName: "Driver" },
  );

  // Preload from localStorage (fast path) and subscribe to updates
  React.useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("rideon-profile")
          : null;
      if (raw) {
        const j = JSON.parse(raw);
        if (j) {
          const ini = initialsFrom(j.firstName, j.lastName, j.email);
          setInitials(ini || "RN");
          if (typeof j.avatarColor === "string" && j.avatarColor)
            setAvatarColor(j.avatarColor);
        }
      }
    } catch {}
    function onProfileUpdated(e: any) {
      try {
        const d = e?.detail || {};
        if (typeof d.initials === "string" && d.initials)
          setInitials(d.initials);
        if (typeof d.avatarColor === "string" && d.avatarColor)
          setAvatarColor(d.avatarColor);
      } catch {}
    }
    function onStorage(ev: StorageEvent) {
      if (ev.key === "rideon-profile" && ev.newValue) {
        try {
          const j = JSON.parse(ev.newValue);
          const ini = initialsFrom(j.firstName, j.lastName, j.email);
          setInitials(ini || "RN");
          if (typeof j.avatarColor === "string" && j.avatarColor)
            setAvatarColor(j.avatarColor);
        } catch {}
      }
    }
    window.addEventListener("rideon-profile-updated", onProfileUpdated as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(
        "rideon-profile-updated",
        onProfileUpdated as any,
      );
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  React.useEffect(() => {
    if (!isPortal && !isPartnerPortal) {
      return;
    }

    let cancelled = false;
    let refreshInterval: NodeJS.Timeout | null = null;
    let lastRefreshTime = Date.now();

    // Refresh session when user returns to tab after being away
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && auth.currentUser) {
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        // If more than 30 minutes since last refresh, refresh now
        if (timeSinceLastRefresh > 30 * 60 * 1000) {
          try {
            if (
              typeof navigator !== "undefined" &&
              navigator.onLine === false
            ) {
              console.warn(
                "[header-switcher] Skipping session refresh while offline",
              );
              return;
            }
            const freshToken = await auth.currentUser.getIdToken();
            await fetchWithTimeout("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: freshToken, remember: true }),
              timeoutMs: 3500,
            });
            lastRefreshTime = Date.now();
            console.log("[header-switcher] Session refreshed on tab focus");
          } catch (e: any) {
            if (e?.code === "auth/network-request-failed") {
              console.warn(
                "[header-switcher] Network unavailable during tab-focus refresh; will retry later",
              );
            } else {
              console.error("[header-switcher] Tab focus refresh failed:", e);
            }
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (cancelled) return;
      if (!u) {
        // Clear any existing refresh interval
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;

        // Delay session deletion to avoid premature logout during Firebase initialization
        // Only clear if user is still null after 1 second (confirms actual logout vs race condition)
        setTimeout(() => {
          if (cancelled) return;
          if (!auth.currentUser) {
            try {
              fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
            } catch {}
          }
        }, 1000);
        return;
      }
      try {
        // Prime header quickly from auth info before network
        const primed = initialsFrom(undefined, undefined, u.email || "");
        if (primed) setInitials(primed);
        let token = "";
        try {
          token = await getIdTokenWithTimeout(u, { timeoutMs: 2500 });
        } catch {
          setInitials(initialsFrom(undefined, undefined, u.email || ""));
          setUnreadCount(0);
          return;
        }
        // Kick off session cookie creation (do not block UI on it)
        const sessionPromise = fetchWithTimeout("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, remember: true }),
          timeoutMs: 3500,
        }).then(
          (r) => {
            if (!r.ok)
              console.error(
                "[header-switcher] Session creation failed with status:",
                r.status,
              );
          },
          (e) => {
            console.error("[header-switcher] Session creation error:", e);
          },
        );

        // Setup token refresh every 45 minutes (before 55-minute session expiry)
        if (!refreshInterval) {
          refreshInterval = setInterval(
            async () => {
              if (!auth.currentUser) return;
              if (
                typeof document !== "undefined" &&
                document.visibilityState === "hidden"
              )
                return;
              try {
                if (
                  typeof navigator !== "undefined" &&
                  navigator.onLine === false
                ) {
                  console.warn(
                    "[header-switcher] Skipping scheduled session refresh while offline",
                  );
                  return;
                }
                const freshToken = await auth.currentUser.getIdToken();
                await fetchWithTimeout("/api/auth/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken: freshToken, remember: true }),
                  timeoutMs: 3500,
                });
                lastRefreshTime = Date.now();
                console.log("[header-switcher] Session refreshed successfully");
              } catch (e: any) {
                if (e?.code === "auth/network-request-failed") {
                  console.warn(
                    "[header-switcher] Network unavailable during scheduled refresh; skipping",
                  );
                } else {
                  console.error("[header-switcher] Token refresh failed:", e);
                }
              }
            },
            45 * 60 * 1000,
          );
        }
        lastRefreshTime = Date.now(); // Mark initial session creation time

        const userPromise = fetchWithTimeout("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          timeoutMs: 3500,
        });

        const unreadPromise = isPortal
          ? fetchWithTimeout(
              `/api/notifications/unread-count?portal=${encodeURIComponent(
                isFullTimeDriverPortal
                  ? "full-time-driver"
                  : isDriverPortal
                    ? "driver"
                    : "app",
              )}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
                timeoutMs: 3500,
              },
            )
          : null;

        const [userResS, unreadResS] = await Promise.allSettled([
          userPromise,
          unreadPromise,
          sessionPromise,
        ]);

        let j: any = {};
        if (userResS.status === "fulfilled") {
          const userRes = userResS.value;
          j = await userRes.json().catch(() => ({}));
          if (userRes.ok) {
            const ini = initialsFrom(
              j?.firstName,
              j?.lastName,
              j?.email || u.email || "",
            );
            setInitials(ini);
            if (typeof j?.avatarColor === "string" && j.avatarColor)
              setAvatarColor(j.avatarColor);
          } else {
            setInitials(initialsFrom(undefined, undefined, u.email || ""));
          }
        } else {
          setInitials(initialsFrom(undefined, undefined, u.email || ""));
        }

        if (isDriverPortal) {
          setDriverHeader({ firstName: j?.firstName || "Driver" });
        }

        if (isPortal) {
          if (
            unreadResS &&
            unreadResS.status === "fulfilled" &&
            unreadResS.value
          ) {
            const cRes = unreadResS.value;
            const cJson = await cRes.json().catch(() => ({}));
            setUnreadCount(
              cRes.ok && typeof cJson?.count === "number" ? cJson.count : 0,
            );
          } else {
            setUnreadCount(0);
          }
        } else {
          setUnreadCount(0);
        }
      } catch {
        // ignore
      }
    });
    return () => {
      cancelled = true;
      unsub();
      if (refreshInterval) clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    isPortal,
    isDriverPortal,
    isCustomerPortal,
    isFullTimeDriverPortal,
    isPartnerPortal,
  ]);

  // Do not render any public/app headers on Admin pages; the Admin UI owns its header
  if (isAdminPortal) {
    return null;
  }

  if (isFullTimeDriverPortal) {
    return (
      <AppHeader
        homeHref="/full-time-driver"
        profileHref="/full-time-driver/profile"
        notificationsHref="/full-time-driver/notifications"
        userInitials={initials}
        avatarColor={avatarColor}
        unreadNotifications={unreadCount}
      />
    );
  }

  if (isDriverPortal) {
    return (
      <DriverHeader driver={driverHeader} unreadNotifications={unreadCount} />
    );
  }
  if (isCustomerPortal) {
    return (
      <AppHeader
        userInitials={initials}
        avatarColor={avatarColor}
        unreadNotifications={unreadCount}
      />
    );
  }
  if (isPartnerPortal) {
    return (
      <AppHeader
        brand="Partner Portal"
        homeHref="/partner"
        profileHref="/partner/settings"
        notificationsHref="/partner"
        userInitials={initials}
        avatarColor={avatarColor}
        unreadNotifications={0}
      />
    );
  }
  return <PublicHeader />;
}
