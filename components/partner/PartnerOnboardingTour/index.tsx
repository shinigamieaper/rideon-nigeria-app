"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import { waitForUser } from "@/lib/firebase";

type TourStatus = "completed" | "dismissed";

type TourConfig = {
  id: string;
  requiredSelectors: string[];
  stepDefs: Array<{
    selector: string;
    popover: NonNullable<DriveStep["popover"]>;
    optional?: boolean;
  }>;
};

export interface PartnerOnboardingTourProps {
  enabled?: boolean;
}

function readLocalStatus(tourId: string): TourStatus | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`rideon:onboarding:${tourId}`);
    return raw === "completed" || raw === "dismissed" ? raw : null;
  } catch {
    return null;
  }
}

function writeLocalStatus(tourId: string, status: TourStatus) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`rideon:onboarding:${tourId}`, status);
  } catch {}
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
) {
  const timeoutMs = init?.timeoutMs ?? 4000;
  const { timeoutMs: _timeoutMs, ...rest } = init || {};
  if ((rest as any).signal) return await fetch(input, rest);

  const controller = new AbortController();
  const t = setTimeout(() => {
    try {
      controller.abort(
        new DOMException(`Timed out after ${timeoutMs}ms`, "TimeoutError"),
      );
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getRemoteStatus(
  token: string,
  tourId: string,
): Promise<TourStatus | null> {
  const res = await fetchWithTimeout("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    timeoutMs: 4000,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return null;

  const tours = j?.onboardingTours;
  const entry =
    tours && typeof tours === "object" ? (tours as any)[tourId] : null;
  const status =
    entry && typeof entry === "object" ? (entry as any).status : null;
  return status === "completed" || status === "dismissed" ? status : null;
}

async function setRemoteStatus(
  token: string,
  tourId: string,
  status: TourStatus,
) {
  await fetchWithTimeout("/api/users/me", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      onboardingTours: {
        [tourId]: {
          status,
          updatedAt: new Date().toISOString(),
        },
      },
    }),
    timeoutMs: 5000,
  }).catch(() => {});
}

function stepDefsToSteps(stepDefs: TourConfig["stepDefs"]): DriveStep[] {
  return stepDefs.map((s) => ({
    element: () => document.querySelector(s.selector) as Element,
    popover: s.popover,
  }));
}

async function waitForSelectors(
  selectors: string[],
  timeoutMs = 4500,
  intervalMs = 100,
) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const missing = selectors.some((sel) => !document.querySelector(sel));
    if (!missing) return true;
    await new Promise<void>((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function tourForPathname(pathname: string): TourConfig | null {
  if (pathname !== "/partner") return null;

  return {
    id: "partner_portal_overview_v1",
    requiredSelectors: [
      '[data-tour="partner-sidebar"]',
      '[data-tour="partner-overview-header"]',
    ],
    stepDefs: [
      {
        selector: '[data-tour="partner-sidebar"]',
        popover: {
          title: "Partner navigation",
          description:
            "Use the sidebar to manage reservations, vehicles, drivers, team members, billing, and settings.",
          side: "right",
          align: "start",
        },
      },
      {
        selector: '[data-tour="partner-context-switcher"]',
        optional: true,
        popover: {
          title: "Switch partner context",
          description:
            "If you manage multiple partner accounts, you can switch between them here.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selector: '[data-tour="partner-overview-header"]',
        popover: {
          title: "Overview",
          description: "Your key fleet and account status lives here.",
          side: "bottom",
          align: "start",
        },
      },
      {
        selector: '[data-tour="partner-overview-shortcuts"]',
        optional: true,
        popover: {
          title: "Shortcuts",
          description: "Quickly jump into the areas you manage most often.",
          side: "top",
          align: "start",
        },
      },
    ],
  };
}

export default function PartnerOnboardingTour({
  enabled = true,
}: PartnerOnboardingTourProps) {
  const pathname = usePathname();
  const tour = React.useMemo(() => tourForPathname(pathname), [pathname]);

  React.useEffect(() => {
    if (!enabled) return;
    if (!tour) return;

    const activeTour = tour;

    let cancelled = false;
    let driverObj: ReturnType<typeof driver> | null = null;
    const completionRef = { completed: false, dismissed: false };

    async function run() {
      const localStatus = readLocalStatus(activeTour.id);
      if (localStatus) return;

      const user = await waitForUser().catch(() => null);
      if (cancelled || !user) return;

      const token = await user.getIdToken().catch(() => "");
      if (cancelled || !token) return;

      const remoteStatus = await getRemoteStatus(token, activeTour.id).catch(
        () => null,
      );
      if (cancelled) return;
      if (remoteStatus) {
        writeLocalStatus(activeTour.id, remoteStatus);
        return;
      }

      const ready = await waitForSelectors(activeTour.requiredSelectors);
      if (cancelled || !ready) return;

      const presentStepDefs = activeTour.stepDefs.filter((s) => {
        if (s.optional) return Boolean(document.querySelector(s.selector));
        return true;
      });
      if (presentStepDefs.length === 0) return;

      driverObj = driver({
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 10,
        stageRadius: 10,
        showProgress: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Finish",
        popoverClass: "rideon-tour-popover",
        onCloseClick: async () => {
          if (completionRef.completed || completionRef.dismissed) return;
          completionRef.dismissed = true;
          writeLocalStatus(activeTour.id, "dismissed");
          await setRemoteStatus(token, activeTour.id, "dismissed");
          driverObj?.destroy();
        },
        onDestroyed: async () => {
          if (completionRef.completed || completionRef.dismissed) return;
          completionRef.dismissed = true;
          writeLocalStatus(activeTour.id, "dismissed");
          await setRemoteStatus(token, activeTour.id, "dismissed");
        },
      });

      const steps = stepDefsToSteps(presentStepDefs);
      const last = steps[steps.length - 1];
      last.popover = {
        ...(last.popover || {}),
        onNextClick: async (_el, _step, opts) => {
          if (completionRef.completed || completionRef.dismissed) return;
          completionRef.completed = true;
          writeLocalStatus(activeTour.id, "completed");
          await setRemoteStatus(token, activeTour.id, "completed");
          opts.driver.destroy();
        },
      };

      driverObj.setSteps(steps);
      driverObj.drive();
    }

    run().catch(() => {});

    return () => {
      cancelled = true;
      try {
        driverObj?.destroy();
      } catch {}
    };
  }, [enabled, tour]);

  return null;
}
