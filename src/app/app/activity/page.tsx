import Link from "next/link";
import { ActivityFeedClient } from "@/components";

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Link href="/app/dashboard" className="hover:underline">
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          All Activity
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          View updates across Hire a Driver and Chauffeur reservations.
        </p>
      </div>

      <div className="mt-5">
        <ActivityFeedClient />
      </div>
    </div>
  );
}
