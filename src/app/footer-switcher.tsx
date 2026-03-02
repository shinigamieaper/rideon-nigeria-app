"use client";

import React from "react";
import { usePathname } from "next/navigation";
import PublicFooter from "../../components/layout/PublicFooter";

export default function FooterSwitcher() {
  const pathname = usePathname();
  const isPortal =
    pathname?.startsWith("/app") ||
    pathname?.startsWith("/driver") ||
    pathname?.startsWith("/full-time-driver") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/partner");
  if (isPortal) return null;
  return <PublicFooter />;
}
