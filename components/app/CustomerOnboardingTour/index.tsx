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

export interface CustomerOnboardingTourProps {
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

function tourForPathname(pathname: string): TourConfig | null {
  if (pathname === "/app/dashboard") {
    return {
      id: "customer_app_dashboard_v1",
      requiredSelectors: [
        '[data-tour="customer-dashboard-hero"]',
        '[data-tour="customer-dashboard-flow-chauffeur"]',
        '[data-tour="customer-dashboard-flow-drive-my-car"]',
        '[data-tour="customer-dashboard-flow-fulltime"]',
        '[data-tour="customer-floating-dock"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="customer-dashboard-hero"]',
          popover: {
            title: "Welcome to RideOn",
            description:
              "Quick tour: pick what you want to book today, and we’ll show you where things live.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="customer-dashboard-flow-chauffeur"]',
          popover: {
            title: "Book a Chauffeur",
            description: "Rent a car with a professional driver.",
            side: "bottom",
            align: "center",
          },
        },
        {
          selector: '[data-tour="customer-dashboard-flow-drive-my-car"]',
          popover: {
            title: "Hire a Driver (for your own car)",
            description:
              "Need a vetted driver to drive your own vehicle? Start here.",
            side: "bottom",
            align: "center",
          },
        },
        {
          selector: '[data-tour="customer-dashboard-flow-fulltime"]',
          popover: {
            title: "Hire Full‑Time",
            description:
              "Get matched with a full‑time driver for personal or business needs.",
            side: "bottom",
            align: "center",
          },
        },
        {
          selector: '[data-tour="customer-floating-dock"]',
          popover: {
            title: "Navigation",
            description:
              "Use this dock to jump between Home, Reservations, Messages, and your Account.",
            side: "top",
            align: "center",
          },
        },
      ],
    };
  }

  if (pathname === "/app/catalog") {
    return {
      id: "customer_app_catalog_v1",
      requiredSelectors: [
        '[data-tour="catalog-header"]',
        '[data-tour="catalog-grid"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="catalog-header"]',
          popover: {
            title: "Chauffeur Catalog",
            description:
              "Browse available vehicles. Tap any card to see details and choose dates.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="catalog-featured"]',
          optional: true,
          popover: {
            title: "Featured picks",
            description:
              "These are popular options based on pricing and availability.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="catalog-grid"]',
          popover: {
            title: "All vehicles",
            description:
              "Scroll to see more. Open a vehicle to start your reservation.",
            side: "top",
            align: "center",
          },
        },
      ],
    };
  }

  if (pathname === "/app/drive-my-car/request") {
    return {
      id: "customer_app_drive_my_car_request_v1",
      requiredSelectors: [
        '[data-tour="drive-my-car-step-header"]',
        '[data-tour="drive-my-car-pickup"]',
        '[data-tour="drive-my-car-city"]',
        '[data-tour="drive-my-car-duration"]',
        '[data-tour="drive-my-car-start-date"]',
        '[data-tour="drive-my-car-start-time"]',
        '[data-tour="drive-my-car-continue"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="drive-my-car-step-header"]',
          popover: {
            title: "Drive My Car",
            description: "Request a professional driver to drive your own car.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="drive-my-car-pickup"]',
          popover: {
            title: "Pickup address",
            description: "Tell us where the driver should meet you.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="drive-my-car-city"]',
          popover: {
            title: "City",
            description: "Choose the city where you need the service.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="drive-my-car-duration"]',
          popover: {
            title: "Duration",
            description: "Select how many hours you need the driver.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="drive-my-car-start-date"]',
          popover: {
            title: "Schedule",
            description: "Pick a future date and time.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="drive-my-car-continue"]',
          popover: {
            title: "Review and pay",
            description: "Continue to review pricing and complete payment.",
            side: "top",
            align: "center",
          },
        },
      ],
    };
  }

  if (pathname === "/app/hire-a-driver") {
    return {
      id: "customer_app_hire_a_driver_v1",
      requiredSelectors: [
        '[data-tour="hire-a-driver-header"]',
        '[data-tour="hire-a-driver-city"]',
        '[data-tour="hire-a-driver-access"]',
        '[data-tour="hire-a-driver-cta"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="hire-a-driver-header"]',
          popover: {
            title: "Hire Full‑Time",
            description:
              "Browse vetted drivers and manage access for messaging and engagement.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="hire-a-driver-city"]',
          popover: {
            title: "Choose your city",
            description: "We’ll show availability for your selected city.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="hire-a-driver-access"]',
          popover: {
            title: "Access",
            description: "Access unlocks contact and engagement features.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="hire-a-driver-cta"]',
          popover: {
            title: "Next step",
            description:
              "Get access or browse drivers if your access is active.",
            side: "top",
            align: "center",
          },
        },
      ],
    };
  }

  return null;
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

export default function CustomerOnboardingTour({
  enabled = true,
}: CustomerOnboardingTourProps) {
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
