"use client";

import React from "react";
import { usePathname } from "next/navigation";
import DotGrid from "../../components/shared/DotGrid";
import GradualBlur from "../../components/shared/GradualBlur";

export default function DotGridWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPortal =
    pathname?.startsWith("/app") ||
    pathname?.startsWith("/driver") ||
    pathname?.startsWith("/full-time-driver") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/partner");
  // For portal pages (customer, driver, admin), remove DotGrid and GradualBlur entirely; use minimal container
  if (isPortal) {
    return (
      <div className="relative min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }
  // Public site retains DotGrid + glow and brand GradualBlur overlays
  return (
    <DotGrid withGlow>
      <GradualBlur target="page" preset="page-header" curve="bezier" />
      <GradualBlur target="page" preset="page-footer" curve="bezier" />
      {children}
    </DotGrid>
  );
}
