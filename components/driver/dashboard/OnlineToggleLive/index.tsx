"use client";

import * as React from "react";
import { auth, db, waitForUser } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { OnlineToggle } from "@/components";

async function getIdTokenWithTimeout(
  user: { getIdToken: (forceRefresh?: boolean) => Promise<string> },
  timeoutMs = 2500,
): Promise<string> {
  return await Promise.race([
    user.getIdToken(),
    new Promise<string>((_, reject) =>
      setTimeout(
        () => reject(new Error(`getIdToken timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

export interface OnlineToggleLiveProps {
  initialStatus?: boolean;
  onStatusChange: (online: boolean) => void | Promise<void>;
  className?: string;
}

export default function OnlineToggleLive({
  initialStatus = false,
  onStatusChange,
  className,
}: OnlineToggleLiveProps) {
  const [online, setOnline] = React.useState<boolean>(!!initialStatus);
  const intervalRef = React.useRef<number | null>(null);

  const postLocation = React.useCallback(async () => {
    try {
      const u = await waitForUser(3500);
      const token = await getIdTokenWithTimeout(u, 2500);
      await new Promise<void>((resolve) => {
        if (!navigator.geolocation) return resolve();
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, heading } =
              pos.coords as GeolocationCoordinates & { heading?: number };
            try {
              await fetch("/api/drivers/me/location", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  lat: latitude,
                  lng: longitude,
                  heading: Number.isFinite(heading as any)
                    ? heading
                    : undefined,
                }),
              });
            } finally {
              resolve();
            }
          },
          () => resolve(),
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
        );
      });
    } catch {}
  }, []);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;
    (async () => {
      try {
        const u = await waitForUser(3500);
        if (!mounted) return;
        const ref = doc(db, "drivers", u.uid);
        unsub = onSnapshot(ref, (snap) => {
          const data = snap.data() as any;
          const val =
            typeof data?.onlineStatus === "boolean"
              ? !!data.onlineStatus
              : !!data?.online;
          setOnline(val);
        });
      } catch {
        // ignore; remain on initial
      }
    })();
    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  React.useEffect(() => {
    if (online) {
      void postLocation();
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        void postLocation();
      }, 120000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [online, postLocation]);

  const handleChange = React.useCallback(
    (val: boolean) => {
      setOnline(val);
      const r = onStatusChange(val);
      if (r && typeof (r as any).then === "function") {
        (r as Promise<void>).catch(() => {});
      }
    },
    [onStatusChange],
  );

  return (
    <OnlineToggle
      online={online}
      onToggle={handleChange}
      className={className}
    />
  );
}
