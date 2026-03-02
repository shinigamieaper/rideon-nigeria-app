"use client";

import React from "react";
import RentalProvider from "@/components/app/RentalProvider";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RentalProvider>
      <div className="min-h-dvh bg-background text-foreground pt-4 pb-28">
        {children}
      </div>
    </RentalProvider>
  );
}
