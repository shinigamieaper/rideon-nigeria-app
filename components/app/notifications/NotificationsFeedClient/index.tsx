"use client";

import React from "react";
import { waitForUser } from "@/lib/firebase";
import {
  NotificationsList,
  type NotificationEntry,
  StickyBanner,
} from "@/components";

export interface NotificationsFeedClientProps
  extends React.ComponentPropsWithoutRef<"div"> {
  portal?: "app" | "driver" | "full-time-driver";
}

type FetchState = {
  loading: boolean;
  items: NotificationEntry[];
  error: string | null;
};

const initialState: FetchState = {
  loading: true,
  items: [],
  error: null,
};

export default function NotificationsFeedClient({
  portal = "app",
  className,
  ...rest
}: NotificationsFeedClientProps) {
  const [{ loading, items, error }, setState] =
    React.useState<FetchState>(initialState);

  const fetchNotifications = React.useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const user = await waitForUser();
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/notifications?portal=${encodeURIComponent(portal)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(payload?.error || "Failed to load notifications");
      const list = Array.isArray(payload?.notifications)
        ? payload.notifications
        : [];
      setState({ loading: false, items: list, error: null });
    } catch (e: any) {
      console.error(e);
      setState({
        loading: false,
        items: [],
        error: e?.message || "Failed to load notifications.",
      });
    }
  }, [portal]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className={className} {...rest}>
      {error && (
        <StickyBanner className="mb-4">
          <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-700 dark:text-red-200 shadow">
            {error}
          </div>
        </StickyBanner>
      )}

      <NotificationsList loading={loading} items={items} />

      {!loading && items.length === 0 && !error && (
        <div className="mt-4 text-xs text-slate-500">
          Notifications update automatically when new messages arrive.
        </div>
      )}
    </div>
  );
}
