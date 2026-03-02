"use client";

import * as React from "react";
import { LogoutButton } from "@/components";

export default function LogoutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Logout
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        You can safely sign out of your RideOn account below.
      </p>

      <div className="mt-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          After logging out, you may need to sign in again to access your
          dashboard.
        </p>
        <LogoutButton className="w-full" />
      </div>
    </div>
  );
}
