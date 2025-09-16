"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Menu, X } from "lucide-react";
import BlurText from "../../shared/BlurText";
import RevealOnScroll from "../../shared/RevealOnScroll";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface PublicHeaderProps extends React.ComponentPropsWithoutRef<"header"> {
  // Optional brand text, defaults to RideOn Nigeria
  brand?: string;
  // Override navigation URLs
  links?: {
    label: string;
    href: string;
  }[];
  // Optional handlers for auth buttons
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

const defaultLinks = [
  { label: "Pre-Booked Rides", href: "/services/pre-booked-rides" },
  { label: "Hire a Driver", href: "/services/hire-a-driver" },
  { label: "Corporate", href: "/solutions/corporate" },
  { label: "Drive With Us", href: "/drive-with-us" },
  { label: "About", href: "/about" },
  { label: "Support", href: "/support" },
];

export default function PublicHeader({
  brand = "RideOn Nigeria",
  links = defaultLinks,
  onLoginClick,
  onSignupClick,
  className,
  ...rest
}: PublicHeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = (resolvedTheme ?? theme) === "dark";

  // Hide the public marketing header on authenticated app routes
  if (pathname?.startsWith("/app")) {
    return null;
  }

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <RevealOnScroll
      as="header"
      className={[
        "sticky top-0 z-50 w-full",
        className ?? "",
      ].join(" ")}
      style={{
        "--tw-enter-opacity": "0",
        "--tw-enter-translate-y": "-1rem",
        "--tw-enter-blur": "8px"
      } as React.CSSProperties}
      {...rest}
    >
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <RevealOnScroll as="div" className="flex items-center justify-start" style={{ animationDelay: "100ms", "--tw-enter-opacity": "0" } as React.CSSProperties}>
            <Link href="/" className="flex items-center" aria-label="Home">
              <BlurText
                as="span"
                className="text-lg sm:text-xl font-semibold tracking-tighter text-slate-900 dark:text-white"
                text={brand}
                animateBy="words"
                direction="top"
                delay={60}
              />
            </Link>
          </RevealOnScroll>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center md:gap-x-1 lg:gap-x-2 text-sm">
            {links.map((link, index) => (
              <RevealOnScroll key={link.label} as="div" style={{ animationDelay: `${200 + (index * 100)}ms`, "--tw-enter-opacity": "0" } as React.CSSProperties}>
                <Link
                  href={link.href}
                  className="px-3 py-2 rounded-md font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-slate-200 dark:active:bg-slate-700 hover:-translate-y-0.5 hover:scale-105 active:scale-100 active:translate-y-0 transform-gpu transition-all duration-200 ease-in-out"
                >
                  <BlurText
                    as="span"
                    className="inline-block"
                    text={link.label}
                    animateBy="letters"
                    direction="top"
                    delay={18}
                  />
                </Link>
              </RevealOnScroll>
            ))}
          </nav>

          {/* Right-side controls */}
          <div className="flex items-center justify-end gap-x-1 sm:gap-x-2 md:gap-x-3">
            {/* Neon Theme Toggle */}
            <RevealOnScroll as="div" style={{ animationDelay: "550ms", "--tw-enter-opacity": "0" } as React.CSSProperties}>
              <button
                type="button"
                role="switch"
                aria-checked={mounted ? !isDark : undefined}
                onClick={toggleTheme}
                className={[
                  "relative inline-flex h-7 w-12 md:h-8 md:w-16 items-center rounded-full p-0.5 transition-all duration-500 ease-out focus:outline-none backdrop-blur-sm",
                  // Light mode styles
                  "bg-slate-200 ring-1 ring-slate-300 shadow-inner",
                  // Dark mode styles
                  "dark:bg-black/70 dark:ring-white/10 dark:shadow-[inset_0_-10px_30px_rgba(0,0,0,0.65),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                  mounted ? (!isDark ? "justify-end" : "justify-start") : "justify-start"
                ].join(" ")}
              >
              <span className="sr-only">Toggle theme</span>
              {/* Subtle inner vignette (Dark mode only) */}
              <span className="pointer-events-none absolute inset-0 rounded-full opacity-70 dark:opacity-70" style={{
                background: "radial-gradient(30px 20px at 60% 50%, rgba(255,255,255,0.04), transparent 65%)"
              }} />
              {/* Brand gradient glow along the track (Dark mode only) */}
              <span 
                className={[
                  "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ease-out",
                  mounted ? (isDark ? "opacity-100" : "opacity-0") : "opacity-0"
                ].join(" ")}
                style={{
                  background: "radial-gradient(35px 25px at 75% 50%, rgba(6,182,212,0.25), transparent 60%), radial-gradient(40px 25px at 80% 50%, rgba(0,119,230,0.22), transparent 65%)",
                  filter: "blur(4px)"
                }}
              />
              {/* Thumb */}
              <span className={[
                "relative z-10 flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full transition-all duration-500 ease-out",
                // Light mode thumb
                "bg-white shadow-md ring-1 ring-slate-200",
                // Dark mode thumb
                "dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-800 dark:ring-1 dark:ring-white/15 dark:shadow-[0_8px_20px_rgba(0,0,0,0.55)]"
              ].join(" ")}>
                {/* Light mode halo */}
                <span 
                  className={[
                    "pointer-events-none absolute -inset-[2px] rounded-full transition-all duration-500 ease-out",
                    mounted ? (!isDark ? "opacity-100 scale-100" : "opacity-0 scale-90") : "opacity-0 scale-90"
                  ].join(" ")}
                  style={{
                    boxShadow: "0 0 15px rgba(245, 158, 11, 0.4), 0 0 30px rgba(245, 158, 11, 0.2)",
                    background: "radial-gradient(15px 15px at 50% 50%, rgba(245, 158, 11, 0.25), transparent 80%)"
                  }}
                />
                {/* Dark mode halo */}
                <span 
                  className={[
                    "pointer-events-none absolute -inset-[2px] rounded-full transition-all duration-500 ease-out",
                    mounted ? (isDark ? "opacity-100 scale-100" : "opacity-0 scale-90") : "opacity-0 scale-90"
                  ].join(" ")}
                  style={{
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.09), inset 0 0 10px rgba(255,255,255,0.06), 0 0 20px rgba(0,119,230,0.40), 0 0 35px rgba(6,182,212,0.30)",
                    background: "radial-gradient(25px 20px at 65% 40%, rgba(6,182,212,0.55), transparent 55%)"
                  }}
                />
                {/* Inner glass sheen (Dark mode only) */}
                <span className="pointer-events-none absolute inset-0 rounded-full dark:opacity-100 opacity-0" style={{
                  background: "conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.06), rgba(255,255,255,0) 20%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.06))",
                  mixBlendMode: "screen"
                }} />
                {/* Icons */}
                {!mounted ? (
                  <Moon className="h-3 w-3 md:h-4 md:w-4 text-slate-400 transition-all duration-500 ease-out" />
                ) : (
                  <>
                    <Moon className={[
                      "h-3 w-3 md:h-4 md:w-4 text-cyan-300/90 transition-all duration-500 ease-out",
                      isDark ? "opacity-100 scale-100" : "opacity-0 scale-90 absolute"
                    ].join(" ")}/>
                    <Sun className={[
                      "h-3 w-3 md:h-4 md:w-4 text-amber-500 transition-all duration-500 ease-out",
                      !isDark ? "opacity-100 scale-100" : "opacity-0 scale-90 absolute"
                    ].join(" ")} />
                  </>
                )}
              </span>
              </button>
            </RevealOnScroll>

            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center justify-end gap-x-3">
              <RevealOnScroll as="div" style={{ animationDelay: "600ms", "--tw-enter-opacity": "0" } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => {
                    if (onLoginClick) return onLoginClick();
                    router.push("/login");
                  }}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <BlurText as="span" text="Log In" animateBy="letters" direction="top" delay={18} />
                </button>
              </RevealOnScroll>
              <RevealOnScroll as="div" style={{ animationDelay: "700ms", "--tw-enter-opacity": "0" } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => {
                    if (onSignupClick) return onSignupClick();
                    router.push("/register");
                  }}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium text-white h-9 px-4 transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "#00529B",
                  } as React.CSSProperties}
                >
                  <BlurText as="span" text="Sign Up" animateBy="letters" direction="top" delay={18} />
                </button>
              </RevealOnScroll>
            </div>

            {/* Mobile Auth Buttons */}
            <div className="flex md:hidden items-center gap-x-1">
              <RevealOnScroll as="div" style={{ animationDelay: "600ms", "--tw-enter-opacity": "0" } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => {
                    if (onLoginClick) return onLoginClick();
                    router.push("/login");
                  }}
                  className="inline-flex items-center justify-center rounded-md text-xs font-medium h-8 px-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <BlurText as="span" text="Log In" animateBy="letters" direction="top" delay={18} />
                </button>
              </RevealOnScroll>
              <RevealOnScroll as="div" style={{ animationDelay: "700ms", "--tw-enter-opacity": "0" } as React.CSSProperties}>
                <button
                  type="button"
                  onClick={() => {
                    if (onSignupClick) return onSignupClick();
                    router.push("/register");
                  }}
                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold text-white h-8 px-3 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#00529B" } as React.CSSProperties}
                >
                  <BlurText as="span" text="Sign Up" animateBy="letters" direction="top" delay={18} />
                </button>
              </RevealOnScroll>
            </div>

            {/* Mobile Menu Button */}
            <RevealOnScroll as="div" className="flex items-center md:hidden" style={{
              animationDelay: "550ms",
              "--tw-enter-opacity": "0"
            } as React.CSSProperties}>
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500 transition-colors"
                aria-controls="public-header-mobile-menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" aria-hidden />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden />
                )}
              </button>
            </RevealOnScroll>
          </div>

        </div>

{/* Mobile menu */}
<div
  id="public-header-mobile-menu"
  className={[mobileOpen ? "block" : "hidden", "md:hidden"].join(" ")}
>
  <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 animate-in fade-in slide-in-from-top-4 duration-300">
    {links.map((link) => (
      <Link
        key={link.label}
        href={link.href}
        className="block px-3 py-2 rounded-md text-base sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setMobileOpen(false)}
      >
        <BlurText as="span" className="inline-block" text={link.label} animateBy="letters" direction="top" delay={18} />
      </Link>
    ))}
  </div>
</div>
</div>
</RevealOnScroll>
);
}
