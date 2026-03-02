"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import BrandBanner from "../../components/shared/BrandBanner";

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
    if (!portal) {
      setBanner(null);
      return;
    }

    const fetchBanner = async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/config/banner?portal=${portal}`,
          { timeoutMs: 2500 },
        );
        if (res.ok) {
          const data = await res.json();
          setBanner(data);
        }
      } catch (err) {
        console.error("Failed to fetch banner:", err);
        setBanner({ show: false });
      }
    };

    fetchBanner();
  }, [portal]);

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
