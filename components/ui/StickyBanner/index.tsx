"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type SVGProps,
} from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

export interface StickyBannerProps
  extends Omit<React.ComponentProps<typeof motion.div>, "ref" | "children"> {
  children?: React.ReactNode;
  hideOnScroll?: boolean;
}

export const StickyBanner: React.FC<StickyBannerProps> = ({
  className,
  children,
  hideOnScroll = false,
  ...rest
}) => {
  const [open, setOpen] = useState(true);
  const { scrollY } = useScroll();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const updateCssVar = useCallback(() => {
    try {
      const el = rootRef.current as HTMLElement | null;
      const h = open && el ? Math.round(el.getBoundingClientRect().height) : 0;
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--banner-h", `${h}px`);
      }
    } catch {}
  }, [open]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (!hideOnScroll) return;
    if (latest > 40) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  });

  // Keep --banner-h in sync with visibility/size
  useEffect(() => {
    updateCssVar();
  }, [open, updateCssVar]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateCssVar());
    ro.observe(el);
    return () => {
      ro.disconnect();
      try {
        document.documentElement.style.removeProperty("--banner-h");
      } catch {}
    };
  }, [updateCssVar]);

  if (!open) return null;

  return (
    <motion.div
      ref={rootRef as any}
      className={cn(
        "sticky inset-x-0 top-0 z-40 flex w-full items-center justify-center bg-transparent px-4 min-h-14 py-1",
        className,
      )}
      initial={{
        y: -100,
        opacity: 0,
      }}
      animate={{
        y: 0,
        opacity: 1,
      }}
      exit={{
        y: -100,
        opacity: 0,
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      {...rest}
    >
      {children}

      <motion.button
        type="button"
        initial={{
          scale: 0,
        }}
        animate={{
          scale: 1,
        }}
        className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          open ? "Hide announcement banner" : "Show announcement banner"
        }
      >
        <CloseIcon className="h-5 w-5 text-white" />
      </motion.button>
    </motion.div>
  );
};

const CloseIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </svg>
  );
};

export default StickyBanner;
