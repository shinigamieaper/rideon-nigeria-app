"use client";

import React from "react";
import { usePathname } from "next/navigation";
import PublicHeader from "../PublicHeader";
import PublicFooter from "../PublicFooter";
import DotGrid from "../../shared/DotGrid";

export interface PublicChromeProps {
  children: React.ReactNode;
}

export default function PublicChrome({ children }: PublicChromeProps) {
  const pathname = usePathname();
  const isApp = pathname?.startsWith("/app");

  // For app routes, render children only (no marketing chrome)
  if (isApp) return <>{children}</>;

  // For public routes, wrap with marketing chrome
  return (
    <DotGrid>
      <PublicHeader />
      {children}
      <PublicFooter />
    </DotGrid>
  );
}
