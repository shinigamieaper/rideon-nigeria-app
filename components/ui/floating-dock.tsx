"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

interface FloatingDockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  /**
   * Optional patterns that, when matched, mark this item as active.
   * Useful for nested routes like "/app/trips/*".
   */
  activePatterns?: string[];
  /**
   * How to match href when activePatterns is not provided.
   * - 'exact': pathname must equal href (ignoring trailing slash)
   * - 'prefix' (default): pathname starts with href as a path segment
   */
  match?: "exact" | "prefix";
}

export interface FloatingDockProps {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: FloatingDockProps) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

function normalizePath(p: string) {
  if (!p) return "";
  const base = p.split("?")[0]?.split("#")[0] ?? p;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

function startsWithPath(pathname: string, base: string) {
  const p = normalizePath(pathname);
  const b = normalizePath(base);
  return p === b || p.startsWith(b + "/");
}

function isPathActive(pathname: string | null, item: FloatingDockItem) {
  if (!pathname) return false;
  if (item.activePatterns && item.activePatterns.length) {
    return item.activePatterns.some((pat) => startsWithPath(pathname, pat));
  }
  const mode = item.match ?? "prefix";
  if (mode === "exact") {
    return normalizePath(pathname) === normalizePath(item.href);
  }
  return startsWithPath(pathname, item.href);
}

function useIsMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

interface FloatingDockMobileProps
  extends React.ComponentPropsWithoutRef<"div"> {
  items: FloatingDockItem[];
}

const FloatingDockMobile = ({
  items,
  className,
  ...rest
}: FloatingDockMobileProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const isMounted = useIsMounted();

  // Find active index
  const activeIdx = isMounted
    ? items.findIndex(
        (item) => item.href !== "#" && pathname && isPathActive(pathname, item),
      )
    : -1;

  // The index to show the indicator at (use pending while animating before route change)
  const displayIdx = pendingIdx ?? activeIdx;

  // Clear pending once route actually changes
  useEffect(() => {
    setPendingIdx(null);
  }, [pathname]);

  return (
    <div className={cn("relative block md:hidden", className)} {...rest}>
      <div
        className={cn(
          "mx-auto flex h-14 sm:h-16 w-[98vw] sm:w-[92vw] max-w-[560px] items-center justify-between sm:justify-evenly rounded-full px-2 sm:px-3 gap-0 sm:gap-2",
          // Compact on small phones
          "max-[420px]:h-14 max-[420px]:px-1 max-[420px]:justify-between",
          // Extra-compact on very small phones
          "max-[380px]:h-14 max-[380px]:px-1 max-[380px]:justify-between max-[380px]:w-[98vw]",
          // Glassmorphic light + dark
          "bg-white/60 text-foreground border border-slate-200/80 shadow-lg backdrop-blur-lg",
          "dark:bg-slate-900/80 dark:text-white dark:border-slate-800/60",
          "relative overflow-hidden",
        )}
        role="navigation"
        aria-label="Primary"
      >
        <LayoutGroup id="floating-dock-mobile">
          {items.map((item, idx) => {
            const isActive = displayIdx === idx;
            const isCTA = idx === items.length - 1;
            return (
              <div
                key={idx}
                className="relative flex h-full flex-1 flex-col items-center justify-between py-2"
              >
                {isActive && (
                  <motion.div
                    layoutId="dock-active-bg"
                    className={cn(
                      "absolute inset-0 rounded-2xl sm:rounded-3xl",
                      "bg-primary-blue/10 border border-primary-blue/20",
                      "dark:bg-primary-blue/20 dark:border-primary-blue/30",
                      "backdrop-blur-sm shadow-sm",
                    )}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Link
                  href={item.href}
                  aria-label={item.title}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full z-10",
                    "transition-all duration-200",
                    isActive
                      ? "text-primary-blue"
                      : isCTA
                        ? "border-transparent bg-transparent text-foreground/80 hover:ring-2 hover:ring-black/10 dark:hover:ring-white/10 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-black/15 dark:focus-visible:ring-white/15"
                        : "hover:ring-2 hover:ring-black/10 hover:bg-black/5 dark:hover:ring-white/10 dark:hover:bg-white/5 text-foreground/80",
                  )}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() =>
                    setHoveredIdx((cur) => (cur === idx ? null : cur))
                  }
                  onFocus={() => setHoveredIdx(idx)}
                  onBlur={() =>
                    setHoveredIdx((cur) => (cur === idx ? null : cur))
                  }
                  onClick={(e) => {
                    // Smooth pre-route animation
                    if (activeIdx !== idx) {
                      e.preventDefault();
                      setPendingIdx(idx);
                      setHoveredIdx(idx);
                      setTimeout(() => {
                        router.push(item.href);
                      }, 140);
                    }
                  }}
                >
                  {isActive && (
                    <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-primary-blue shadow-[0_0_0_3px_rgba(0,82,155,0.15)]" />
                  )}
                  <AnimatePresence>
                    {hoveredIdx === idx && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 4, x: "-50%" }}
                        transition={{ duration: 0.18 }}
                        className="absolute -top-8 left-1/2 w-max max-w-[160px] truncate rounded-md border px-2 py-0.5 text-xs shadow-sm backdrop-blur-sm border-slate-200/80 bg-white/80 text-foreground dark:border-slate-800/60 dark:bg-neutral-800/90 dark:text-white"
                      >
                        {item.title}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="h-5 w-5 sm:h-6 sm:w-6">{item.icon}</div>
                </Link>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none z-10 relative whitespace-nowrap",
                    "text-foreground/70 dark:text-white/80",
                    isActive && "text-primary-blue dark:text-primary-blue",
                  )}
                >
                  {item.title}
                </span>
              </div>
            );
          })}
        </LayoutGroup>
      </div>
    </div>
  );
};

interface FloatingDockDesktopProps extends HTMLMotionProps<"div"> {
  items: FloatingDockItem[];
}

const FloatingDockDesktop = ({
  items,
  className,
  ...rest
}: FloatingDockDesktopProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const isMounted = useIsMounted();
  useEffect(() => setPendingIdx(null), [pathname]);
  const activeIdx = isMounted
    ? items.findIndex(
        (it) => it.href !== "#" && pathname && isPathActive(pathname, it),
      )
    : -1;
  return (
    <motion.div
      className={cn(
        "mx-auto hidden h-16 w-[92vw] max-w-[720px] items-center justify-evenly rounded-full overflow-hidden",
        "bg-white/60 text-foreground border border-slate-200/80 shadow-lg backdrop-blur-lg",
        "dark:bg-slate-900/80 dark:text-white dark:border-slate-800/60",
        "md:flex",
        className,
      )}
      {...rest}
    >
      <LayoutGroup id="floating-dock-desktop">
        {items.map((item, idx) => {
          const realActive = activeIdx === idx;
          const displayActive = (pendingIdx ?? activeIdx) === idx;
          const isCTA = idx === items.length - 1;
          return (
            <div
              key={idx}
              className="relative flex h-full flex-1 items-center justify-center py-2"
            >
              {displayActive && (
                <motion.div
                  layoutId="dock-active-bg-desktop"
                  className={cn(
                    "absolute inset-y-1 left-1 right-1 rounded-3xl",
                    "bg-primary-blue/10 border border-primary-blue/20",
                    "dark:bg-primary-blue/20 dark:border-primary-blue/30",
                    "backdrop-blur-sm shadow-sm",
                  )}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Link
                href={item.href}
                aria-label={item.title}
                aria-current={realActive ? "page" : undefined}
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full z-10",
                  "transition-all duration-200",
                  displayActive
                    ? "text-primary-blue"
                    : isCTA
                      ? "border-transparent bg-transparent text-foreground/80 hover:ring-2 hover:ring-black/10 dark:hover:ring-white/10 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-black/15 dark:focus-visible:ring-white/15"
                      : "hover:ring-2 hover:ring-black/10 hover:bg-black/5 dark:hover:ring-white/10 dark:hover:bg-white/5 text-foreground/80",
                )}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() =>
                  setHoveredIdx((cur) => (cur === idx ? null : cur))
                }
                onFocus={() => setHoveredIdx(idx)}
                onBlur={() =>
                  setHoveredIdx((cur) => (cur === idx ? null : cur))
                }
                onClick={(e) => {
                  if (!realActive) {
                    e.preventDefault();
                    setPendingIdx(idx);
                    setHoveredIdx(idx);
                    setTimeout(() => router.push(item.href), 140);
                  }
                }}
              >
                {realActive && (
                  <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-primary-blue shadow-[0_0_0_3px_rgba(0,82,155,0.15)]" />
                )}
                <AnimatePresence>
                  {hoveredIdx === idx && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, x: "-50%" }}
                      exit={{ opacity: 0, y: 4, x: "-50%" }}
                      transition={{ duration: 0.18 }}
                      className="absolute -top-8 left-1/2 w-max max-w-[200px] truncate rounded-md border px-2 py-0.5 text-xs shadow-sm backdrop-blur-sm border-slate-200/80 bg-white/80 text-foreground dark:border-slate-800/60 dark:bg-neutral-800/90 dark:text-white"
                    >
                      {item.title}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="h-6 w-6">{item.icon}</div>
              </Link>
            </div>
          );
        })}
      </LayoutGroup>
    </motion.div>
  );
};
