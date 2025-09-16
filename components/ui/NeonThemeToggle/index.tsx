"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export interface NeonThemeToggleProps extends React.ComponentPropsWithoutRef<"button"> {
  size?: "sm" | "md";
}

export default function NeonThemeToggle({
  className,
  size = "sm",
  onClick,
  ...rest
}: NeonThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = (resolvedTheme ?? theme) === "dark";

  const trackSize = size === "sm" ? "h-7 w-12 md:h-8 md:w-16" : "h-8 w-16 md:h-9 md:w-20";
  const thumbSize = size === "sm" ? "h-6 w-6 md:h-7 md:w-7" : "h-7 w-7 md:h-8 md:w-8";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setTheme(isDark ? "light" : "dark");
    if (onClick) onClick(e);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted ? !isDark : undefined}
      onClick={handleClick}
      className={[
        "relative inline-flex items-center rounded-full p-0.5 transition-all duration-500 ease-out focus:outline-none backdrop-blur-sm",
        trackSize,
        // Light mode styles
        "bg-slate-200 ring-1 ring-slate-300 shadow-inner",
        // Dark mode styles
        "dark:bg-black/70 dark:ring-white/10 dark:shadow-[inset_0_-10px_30px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
        mounted ? (!isDark ? "justify-end" : "justify-start") : "justify-start",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      <span className="sr-only">Toggle theme</span>
      {/* Subtle inner vignette (Dark mode only) */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full opacity-70 dark:opacity-70"
        style={{
          background:
            "radial-gradient(30px 20px at 60% 50%, rgba(255,255,255,0.04), transparent 65%)",
        }}
      />
      {/* Brand gradient glow along the track (Dark mode only) */}
      <span
        className={[
          "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ease-out",
          mounted ? (isDark ? "opacity-100" : "opacity-0") : "opacity-0",
        ].join(" ")}
        style={{
          background:
            "radial-gradient(35px 25px at 75% 50%, rgba(6,182,212,0.25), transparent 60%), radial-gradient(40px 25px at 80% 50%, rgba(0,119,230,0.22), transparent 65%)",
          filter: "blur(4px)",
        }}
      />
      {/* Thumb */}
      <span
        className={[
          "relative z-10 flex items-center justify-center rounded-full transition-all duration-500 ease-out",
          thumbSize,
          // Light mode thumb
          "bg-white shadow-md ring-1 ring-slate-200",
          // Dark mode thumb
          "dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-800 dark:ring-1 dark:ring-white/15 dark:shadow-[0_8px_20px_rgba(0,0,0,0.55)]",
        ].join(" ")}
      >
        {/* Light mode halo */}
        <span
          className={[
            "pointer-events-none absolute -inset-[2px] rounded-full transition-all duration-500 ease-out",
            mounted ? (!isDark ? "opacity-100 scale-100" : "opacity-0 scale-90") : "opacity-0 scale-90",
          ].join(" ")}
          style={{
            boxShadow:
              "0 0 15px rgba(245, 158, 11, 0.4), 0 0 30px rgba(245, 158, 11, 0.2)",
            background:
              "radial-gradient(15px 15px at 50% 50%, rgba(245, 158, 11, 0.25), transparent 80%)",
          }}
        />
        {/* Dark mode halo */}
        <span
          className={[
            "pointer-events-none absolute -inset-[2px] rounded-full transition-all duration-500 ease-out",
            mounted ? (isDark ? "opacity-100 scale-100" : "opacity-0 scale-90") : "opacity-0 scale-90",
          ].join(" ")}
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.09), inset 0 0 10px rgba(255,255,255,0.06), 0 0 20px rgba(0,119,230,0.40), 0 0 35px rgba(6,182,212,0.30)",
            background:
              "radial-gradient(25px 20px at 65% 40%, rgba(6,182,212,0.55), transparent 55%)",
          }}
        />
        {/* Inner glass sheen (Dark mode only) */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full dark:opacity-100 opacity-0"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 20%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.06))",
            mixBlendMode: "screen",
          }}
        />
        {/* Icons */}
        {!mounted ? (
          <Moon className="h-3 w-3 md:h-4 md:w-4 text-slate-400 transition-all duration-500 ease-out" />
        ) : (
          <>
            <Moon
              className={[
                "h-3 w-3 md:h-4 md:w-4 text-cyan-300/90 transition-all duration-500 ease-out",
                isDark ? "opacity-100 scale-100" : "opacity-0 scale-90 absolute",
              ].join(" ")}
            />
            <Sun
              className={[
                "h-3 w-3 md:h-4 md:w-4 text-amber-500 transition-all duration-500 ease-out",
                !isDark ? "opacity-100 scale-100" : "opacity-0 scale-90 absolute",
              ].join(" ")}
            />
          </>
        )}
      </span>
    </button>
  );
}
