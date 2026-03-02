"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarClock,
  MessageSquare,
  User,
  Car,
  Users,
  ClipboardList,
} from "lucide-react";
import { FloatingDock } from "../../ui/floating-dock";

type CustomerAppMode = "chauffeur" | "driver" | "fulltime";

const CUSTOMER_APP_MODE_KEY = "rideon:customerAppMode";

function readCustomerAppMode(): CustomerAppMode | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(CUSTOMER_APP_MODE_KEY);
    if (raw === "chauffeur" || raw === "driver" || raw === "fulltime")
      return raw;
    return null;
  } catch {
    return null;
  }
}

function writeCustomerAppMode(next: CustomerAppMode) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOMER_APP_MODE_KEY, next);
  } catch {}
}

export interface RideOnFloatingDockProps
  extends React.ComponentPropsWithoutRef<"div"> {
  desktopClassName?: string;
  mobileClassName?: string;
}

export default function RideOnFloatingDock({
  desktopClassName,
  mobileClassName,
  ...rest
}: RideOnFloatingDockProps) {
  const pathname = usePathname();
  const [mode, setMode] = React.useState<CustomerAppMode>("chauffeur");

  const derivedMode = React.useMemo<CustomerAppMode>(() => {
    if (pathname && pathname.startsWith("/app/hire-a-driver"))
      return "fulltime";
    if (pathname && pathname.startsWith("/app/drive-my-car")) return "driver";
    if (
      pathname &&
      (pathname.startsWith("/app/catalog") || pathname.startsWith("/app/book"))
    )
      return "chauffeur";
    return readCustomerAppMode() ?? "chauffeur";
  }, [pathname]);

  React.useEffect(() => {
    if (derivedMode !== mode) setMode(derivedMode);
  }, [derivedMode, mode]);

  React.useEffect(() => {
    writeCustomerAppMode(derivedMode);
  }, [derivedMode]);

  const inDriverMode = mode === "driver";
  const inFullTimeMode = mode === "fulltime";

  const customerItems = React.useMemo(
    () => [
      {
        title: "Home",
        icon: <Home className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/dashboard",
      },
      {
        title: "Reservations",
        icon: <CalendarClock className="h-full w-full" strokeWidth={1.75} />,
        href: inDriverMode
          ? "/app/reservations?service=drive_my_car"
          : "/app/reservations",
        activePatterns: ["/app/reservations"],
      },
      {
        title: "Messages",
        icon: <MessageSquare className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/messages",
      },
      {
        title: "Account",
        icon: <User className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/profile",
      },
      {
        title: inDriverMode ? "Driver" : "Catalog",
        icon: <Car className="h-full w-full" strokeWidth={1.75} />,
        href: inDriverMode ? "/app/drive-my-car/request" : "/app/catalog",
        activePatterns: inDriverMode ? ["/app/drive-my-car"] : ["/app/catalog"],
      },
    ],
    [inDriverMode],
  );

  const fullTimeItems = React.useMemo(
    () => [
      {
        title: "Home",
        icon: <Home className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/dashboard",
        match: "exact",
      },
      {
        title: "Browse",
        icon: <Users className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/hire-a-driver/browse",
        activePatterns: [
          "/app/hire-a-driver/browse",
          "/app/hire-a-driver/driver",
        ],
      },
      {
        title: "Messages",
        icon: <MessageSquare className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/hire-a-driver/messages",
        activePatterns: ["/app/hire-a-driver/messages"],
      },
      {
        title: "Engagements",
        icon: <ClipboardList className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/hire-a-driver/engagements",
        activePatterns: ["/app/hire-a-driver/engagements"],
      },
      {
        title: "Account",
        icon: <User className="h-full w-full" strokeWidth={1.75} />,
        href: "/app/profile",
        activePatterns: ["/app/profile"],
      },
    ],
    [],
  );

  return (
    <div {...rest}>
      <FloatingDock
        items={inFullTimeMode ? fullTimeItems : customerItems}
        desktopClassName={desktopClassName}
        mobileClassName={mobileClassName}
      />
    </div>
  );
}
