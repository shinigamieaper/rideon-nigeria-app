"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import BrandBanner from "../../components/shared/BrandBanner";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const EMAIL_VERIFY_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

function getAccountAgeMs(
  creationTime: string | null | undefined,
): number | null {
  if (!creationTime) return null;
  const created = Date.parse(creationTime);
  if (!Number.isFinite(created)) return null;
  return Date.now() - created;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 2500;
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

interface BannerData {
  id?: string;
  show: boolean;
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaLink?: string;
  dismissible?: boolean;
  dismissForHours?: number;
}

export default function BannerSwitcher() {
  const pathname = usePathname();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [accountAgeMs, setAccountAgeMs] = useState<number | null>(null);

  // Determine which portal we're on (admin never shows banners)
  const portal = pathname?.startsWith("/admin")
    ? null
    : pathname?.startsWith("/app")
      ? "customer"
      : pathname?.startsWith("/full-time-driver")
        ? "driver_full_time"
        : pathname?.startsWith("/driver")
          ? "driver_on_demand"
          : pathname?.startsWith("/partner")
            ? "partner"
            : "public";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setEmailVerified(null);
        setAccountAgeMs(null);
        return;
      }

      setEmailVerified(!!u.emailVerified);
      setAccountAgeMs(getAccountAgeMs(u.metadata?.creationTime));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!portal) {
      setBanner(null);
      return;
    }

    if (portal !== "public" && emailVerified === false) {
      const age = accountAgeMs;
      if (age !== null && age >= EMAIL_VERIFY_GRACE_MS) {
        (async () => {
          try {
            await fetch("/api/auth/session", { method: "DELETE" });
          } catch {
            // ignore
          }
          try {
            await signOut(auth);
          } catch {
            // ignore
          }
          const next = pathname || "/app/dashboard";
          if (typeof window !== "undefined") {
            window.location.href = `/verify-email?next=${encodeURIComponent(next)}`;
          }
        })();
        setBanner(null);
        return;
      }
    }

    const fetchBanner = async () => {
      try {
        const url =
          portal !== "public" && emailVerified === false
            ? `/api/config/banner?portal=${portal}&system=email_verification`
            : `/api/config/banner?portal=${portal}`;
        const res = await fetchWithTimeout(url, { timeoutMs: 2500 });
        if (res.ok) {
          const data = await res.json();
          if (portal !== "public" && emailVerified === false) {
            if (data?.show) {
              setBanner(data);
              return;
            }
            setBanner({
              show: true,
              title: "Verify your email",
              message:
                "Please verify your email address to keep your account active.",
              ctaLabel: "Verify now",
              ctaLink: "/verify-email",
              dismissible: false,
            });
            return;
          }

          setBanner(data);
        }
      } catch (err) {
        console.error("Failed to fetch banner:", err);
        setBanner({ show: false });
      }
    };

    fetchBanner();
  }, [accountAgeMs, emailVerified, pathname, portal]);

  if (!portal || !banner?.show) return null;

  const topOffset = portal === "public" ? 80 : 64;

  return (
    <BrandBanner
      bannerId={banner.id}
      title={banner.title}
      message={banner.message}
      ctaLabel={banner.ctaLabel}
      ctaLink={banner.ctaLink}
      topOffset={topOffset}
      dismissible={banner.dismissible}
      dismissForHours={banner.dismissForHours}
    />
  );
}
