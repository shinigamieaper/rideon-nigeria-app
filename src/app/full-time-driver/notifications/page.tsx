import Link from "next/link";
import { NotificationsFeedClient } from "@/components";

export const runtime = "nodejs";

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Placement updates, application alerts, messages, and announcements.
          </p>
        </div>
        <Link
          href="/full-time-driver/profile/notifications"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#00529B] hover:underline"
          aria-label="Notification settings"
        >
          Settings
        </Link>
      </div>

      <div className="mt-5">
        <NotificationsFeedClient portal="full-time-driver" />
      </div>
    </div>
  );
}
