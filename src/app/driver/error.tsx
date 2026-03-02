"use client";

import * as React from "react";
import { DashboardErrorState } from "@/components";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error for server/client visibility
  // Avoid leaking details to users; UI shows a friendly message
  console.error("[driver/dashboard] route error:", error);
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8">
        <DashboardErrorState onRetry={reset} />
      </div>
    </main>
  );
}
