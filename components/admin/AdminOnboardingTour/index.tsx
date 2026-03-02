"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import { auth, waitForUser } from "@/lib/firebase";

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

export interface AdminOnboardingTourProps {
  enabled?: boolean;
}

type AdminRole =
  | "super_admin"
  | "admin"
  | "ops_admin"
  | "driver_admin"
  | "product_admin"
  | "finance_admin";

const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  ops_admin: "Ops Admin",
  driver_admin: "Driver Admin",
  product_admin: "Product Admin",
  finance_admin: "Finance Admin",
};

type WorkflowKey =
  | "reservations"
  | "drivers"
  | "partners"
  | "finance"
  | "comms"
  | "system";

const WORKFLOW_LABEL: Record<WorkflowKey, string> = {
  reservations: "Reservations",
  drivers: "Drivers",
  partners: "Partners",
  finance: "Finance",
  comms: "Comms",
  system: "System",
};

const ROLE_WORKFLOW_ACCESS: Record<AdminRole, WorkflowKey[]> = {
  super_admin: [
    "reservations",
    "drivers",
    "partners",
    "finance",
    "comms",
    "system",
  ],
  admin: ["reservations", "drivers", "partners", "comms"],
  ops_admin: ["reservations", "drivers", "partners", "comms"],
  driver_admin: ["drivers", "partners"],
  product_admin: ["partners", "system"],
  finance_admin: ["finance"],
};

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

async function resolveTourStatus(
  token: string,
  tourId: string,
): Promise<TourStatus | null> {
  const local = readLocalStatus(tourId);
  if (local) return local;

  const remote = await getRemoteStatus(token, tourId).catch(() => null);
  if (remote) {
    writeLocalStatus(tourId, remote);
    return remote;
  }

  return null;
}

async function resolveAdminRole(): Promise<AdminRole> {
  const current = auth.currentUser;
  if (!current) return "admin";

  const tokenResult = await current.getIdTokenResult().catch(() => null);
  const roleClaim = tokenResult?.claims?.adminRole;
  if (
    roleClaim === "super_admin" ||
    roleClaim === "admin" ||
    roleClaim === "ops_admin" ||
    roleClaim === "driver_admin" ||
    roleClaim === "product_admin" ||
    roleClaim === "finance_admin"
  ) {
    return roleClaim;
  }

  return "admin";
}

function resolveAvailableWorkflows(role: AdminRole): WorkflowKey[] {
  const configured = ROLE_WORKFLOW_ACCESS[role] || [];
  return configured.filter((wf) => {
    switch (wf) {
      case "reservations":
        return Boolean(
          document.querySelector('[data-tour="admin-nav-reservations"]'),
        );
      case "drivers":
        return Boolean(
          document.querySelector('[data-tour="admin-nav-drivers"]'),
        );
      case "partners":
        return Boolean(
          document.querySelector('[data-tour="admin-nav-partners"]'),
        );
      case "finance":
        return Boolean(
          document.querySelector('[data-tour="admin-nav-finance"]'),
        );
      case "comms":
        return Boolean(
          document.querySelector('[data-tour="admin-nav-messages"]'),
        );
      case "system":
        return Boolean(
          document.querySelector('[data-tour="admin-nav-system"]'),
        );
      default:
        return false;
    }
  });
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
  if (pathname === "/admin") {
    return {
      id: "admin_portal_overview_v2",
      requiredSelectors: [
        '[data-tour="admin-sidebar"]',
        '[data-tour="admin-quick-links"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="admin-sidebar"]',
          popover: {
            title: "Admin navigation",
            description:
              "Your sidebar is organized by operational workflows. Start with Reservations for end-to-end booking operations.",
            side: "right",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-quick-links"]',
          popover: {
            title: "Quick Links",
            description:
              "These links are role-aware shortcuts into the sections you can manage.",
            side: "top",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-dashboard-welcome"]',
          optional: true,
          popover: {
            title: "Role dashboard",
            description:
              "Your dashboard gives live operational context. Use it to decide where to act next.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-onboarding-library"]',
          optional: true,
          popover: {
            title: "Workflow library",
            description:
              "Open a guided workflow tour any time. Start with Reservations to learn the core operational flow.",
            side: "top",
            align: "start",
          },
        },
      ],
    };
  }

  if (pathname === "/admin/reservations") {
    return {
      id: "admin_workflow_reservations_v1",
      requiredSelectors: [
        '[data-tour="admin-reservations-header"]',
        '[data-tour="admin-reservations-status-tabs"]',
        '[data-tour="admin-reservations-list"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="admin-reservations-header"]',
          popover: {
            title: "Reservations workflow",
            description:
              "This is your primary queue for booking operations from assignment to completion or cancellation.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-reservations-filters"]',
          optional: true,
          popover: {
            title: "Narrow the queue",
            description:
              "Filter by service, date range, and search to quickly locate impacted bookings.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-reservations-status-tabs"]',
          popover: {
            title: "Work by status",
            description:
              "Focus Ops Queue and Requested first, then move through Assigned, In Progress, and Completed.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-reservations-row-actions"]',
          optional: true,
          popover: {
            title: "Take action",
            description:
              "Open row actions to assign or unassign drivers, reassign vehicles, cancel, or inspect full booking details.",
            side: "left",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-reservations-detail-modal"]',
          optional: true,
          popover: {
            title: "Deep context",
            description:
              "Use details to validate customer, route, fare, and payment state before making changes.",
            side: "left",
            align: "start",
          },
        },
      ],
    };
  }

  if (pathname === "/admin/drivers") {
    return {
      id: "admin_workflow_drivers_v1",
      requiredSelectors: [
        '[data-tour="admin-drivers-header"]',
        '[data-tour="admin-drivers-status-tabs"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="admin-drivers-header"]',
          popover: {
            title: "Drivers workflow",
            description:
              "Manage approvals, suspensions, and profile quality for operational reliability.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-drivers-status-tabs"]',
          popover: {
            title: "Driver pipeline",
            description:
              "Use Pending Review, Approved, and Suspended tabs to move drivers through lifecycle states.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-drivers-content"]',
          optional: true,
          popover: {
            title: "Evaluate and act",
            description:
              "Review experience, rating, cities, and compliance, then approve, suspend, or reinstate.",
            side: "top",
            align: "start",
          },
        },
      ],
    };
  }

  if (pathname === "/admin/partners") {
    return {
      id: "admin_workflow_partners_v1",
      requiredSelectors: [
        '[data-tour="admin-partners-header"]',
        '[data-tour="admin-partners-tab-switch"]',
      ],
      stepDefs: [
        {
          selector: '[data-tour="admin-partners-header"]',
          popover: {
            title: "Partners workflow",
            description:
              "Manage partner applications, KYC readiness, and account state.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-partners-tab-switch"]',
          popover: {
            title: "Applications vs active partners",
            description:
              "Switch between application review and active partner account management.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-partners-list"]',
          optional: true,
          popover: {
            title: "Partner actions",
            description:
              "Approve, reject, suspend, or reinstate with clear audit-safe reasons.",
            side: "top",
            align: "start",
          },
        },
      ],
    };
  }

  if (pathname === "/admin/finance") {
    return {
      id: "admin_workflow_finance_v1",
      requiredSelectors: ['[data-tour="admin-finance-header"]'],
      stepDefs: [
        {
          selector: '[data-tour="admin-finance-header"]',
          popover: {
            title: "Finance workflow",
            description:
              "Track GMV, revenue, pending payouts, and refund trends.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-finance-tabs"]',
          optional: true,
          popover: {
            title: "Operational finance tabs",
            description:
              "Use Overview, Payouts, and History to monitor and execute payout operations.",
            side: "bottom",
            align: "start",
          },
        },
      ],
    };
  }

  if (pathname === "/admin/messages") {
    return {
      id: "admin_workflow_comms_v1",
      requiredSelectors: ['[data-tour="admin-messages-header"]'],
      stepDefs: [
        {
          selector: '[data-tour="admin-messages-header"]',
          popover: {
            title: "Comms workflow",
            description:
              "Handle support and trip conversations by status, priority, and assignment.",
            side: "bottom",
            align: "start",
          },
        },
        {
          selector: '[data-tour="admin-messages-filters"]',
          optional: true,
          popover: {
            title: "Prioritize workload",
            description:
              "Filter by type, status, and urgency to process the highest-impact conversations first.",
            side: "bottom",
            align: "start",
          },
        },
      ],
    };
  }

  if (pathname === "/admin/system") {
    return {
      id: "admin_workflow_system_v1",
      requiredSelectors: ['[data-tour="admin-system-header"]'],
      stepDefs: [
        {
          selector: '[data-tour="admin-system-header"]',
          popover: {
            title: "System workflow",
            description:
              "Super admins can manage access, governance, and platform-level controls here.",
            side: "bottom",
            align: "start",
          },
        },
      ],
    };
  }

  return null;
}

export default function AdminOnboardingTour({
  enabled = true,
}: AdminOnboardingTourProps) {
  const pathname = usePathname();
  const tour = React.useMemo(() => tourForPathname(pathname), [pathname]);

  React.useEffect(() => {
    if (!enabled) return;
    if (!tour) return;

    const activeTour = tour;

    let cancelled = false;
    let driverObj: ReturnType<typeof driver> | null = null;
    const completionRef = { completed: false, dismissed: false };

    const startTour = async (
      token: string,
      activeTour: TourConfig,
      opts?: {
        gateByStatus?: boolean;
        beforeStart?: () => Promise<void> | void;
      },
    ) => {
      if (opts?.gateByStatus) {
        const status = await resolveTourStatus(token, activeTour.id);
        if (status) return;
      }

      await opts?.beforeStart?.();
      if (cancelled) return;

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
        onNextClick: async (_el, _step, tourOpts) => {
          if (completionRef.completed || completionRef.dismissed) return;
          completionRef.completed = true;
          writeLocalStatus(activeTour.id, "completed");
          await setRemoteStatus(token, activeTour.id, "completed");
          tourOpts.driver.destroy();
        },
      };

      driverObj.setSteps(steps);
      driverObj.drive();
    };

    async function run() {
      const user = await waitForUser().catch(() => null);
      if (cancelled || !user) return;

      const token = await user.getIdToken().catch(() => "");
      if (cancelled || !token) return;

      if (pathname === "/admin") {
        const role = await resolveAdminRole();
        if (cancelled) return;

        await startTour(token, activeTour, {
          gateByStatus: true,
          beforeStart: async () => {
            const workflows = resolveAvailableWorkflows(role);
            const libraryTitle = `Workflow library for ${ROLE_LABEL[role]}`;
            const libraryDescription = workflows.length
              ? `Start with ${WORKFLOW_LABEL.reservations}, then continue with ${workflows
                  .filter((w) => w !== "reservations")
                  .map((w) => WORKFLOW_LABEL[w])
                  .join(", ")}.`
              : "Use your sidebar links to open any section and run its guided workflow.";

            const workflowNode = document.querySelector(
              '[data-tour="admin-onboarding-library"]',
            );
            if (workflowNode) {
              workflowNode.setAttribute("data-tour-title", libraryTitle);
              workflowNode.setAttribute(
                "data-tour-description",
                libraryDescription,
              );
            }
          },
        });
        return;
      }

      await startTour(token, activeTour, { gateByStatus: true });
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
