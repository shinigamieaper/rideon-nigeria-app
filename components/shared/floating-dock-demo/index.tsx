"use client";

import React from "react";

import {
  Home,
  Car,
  Calendar,
  MessageCircle,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { FloatingDock } from "../../ui/floating-dock";

export interface FloatingDockDemoProps extends React.ComponentPropsWithoutRef<"div"> {
  userType?: "customer" | "driver";
}

export default function FloatingDockDemo({ 
  userType = "customer", 
  className,
  ...props 
}: FloatingDockDemoProps) {
  const customerLinks = [
    {
      title: "Dashboard",
      icon: <Home className="h-full w-full" />,
      href: "/app/dashboard",
    },
    {
      title: "Book Ride",
      icon: <Car className="h-full w-full" />,
      href: "/app/book-ride",
    },
    {
      title: "My Trips",
      icon: <Calendar className="h-full w-full" />,
      href: "/app/trips",
    },
    {
      title: "Messages",
      icon: <MessageCircle className="h-full w-full" />,
      href: "/app/messages",
    },
    {
      title: "Profile",
      icon: <User className="h-full w-full" />,
      href: "/app/profile",
    },
    {
      title: "Settings",
      icon: <Settings className="h-full w-full" />,
      href: "/app/settings",
    },
    {
      title: "Sign Out",
      icon: <LogOut className="h-full w-full" />,
      href: "/logout",
    },
  ];

  const driverLinks = [
    {
      title: "Dashboard",
      icon: <Home className="h-full w-full" />,
      href: "/driver/dashboard",
    },
    {
      title: "Active Trips",
      icon: <Car className="h-full w-full" />,
      href: "/driver/trips",
    },
    {
      title: "Schedule",
      icon: <Calendar className="h-full w-full" />,
      href: "/driver/schedule",
    },
    {
      title: "Messages",
      icon: <MessageCircle className="h-full w-full" />,
      href: "/driver/messages",
    },
    {
      title: "Profile",
      icon: <User className="h-full w-full" />,
      href: "/driver/profile",
    },
    {
      title: "Settings",
      icon: <Settings className="h-full w-full" />,
      href: "/driver/settings",
    },
    {
      title: "Sign Out",
      icon: <LogOut className="h-full w-full" />,
      href: "/logout",
    },
  ];

  const links = userType === "driver" ? driverLinks : customerLinks;

  return (
    <div className="flex items-center justify-center h-[35rem] w-full" {...props}>
      <FloatingDock
        mobileClassName="translate-y-20" // only for demo, remove for production
        items={links}
        className={className}
      />
    </div>
  );
}
