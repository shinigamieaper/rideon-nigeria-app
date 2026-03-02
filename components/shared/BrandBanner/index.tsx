"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type SVGProps,
} from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandBannerProps {
  bannerId?: string;
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaLink?: string;
  topOffset?: number;
  hideOnScroll?: boolean;
  dismissible?: boolean;
  dismissForHours?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DISMISS_KEY_PREFIX = "rideon:banner:dismissed:";

function isDismissed(
  bannerId: string | undefined,
  dismissForHours: number,
): boolean {
  if (!bannerId) return false;
  try {
    const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${bannerId}`);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    const expiresAt = dismissedAt + dismissForHours * 60 * 60 * 1000;
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

function markDismissed(bannerId: string | undefined) {
  if (!bannerId) return;
  try {
    localStorage.setItem(
      `${DISMISS_KEY_PREFIX}${bannerId}`,
      String(Date.now()),
    );
  } catch {}
}

export default function BrandBanner({
  bannerId,
  title,
  message,
  ctaLabel,
  ctaLink,
  topOffset = 64,
  hideOnScroll = false,
  dismissible = true,
  dismissForHours = 24,
  className,
  style,
}: BrandBannerProps) {
  const [open, setOpen] = useState(
    () => !isDismissed(bannerId, dismissForHours),
  );
  const { scrollY } = useScroll();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const updateCssVar = useCallback(() => {
    try {
      const el = rootRef.current as HTMLElement | null;
      const h = open && el ? Math.round(el.getBoundingClientRect().height) : 0;
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--brand-banner-h",
          `${h}px`,
        );
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
        document.documentElement.style.removeProperty("--brand-banner-h");
      } catch {}
    };
  }, [updateCssVar]);

  // Reset CSS var on unmount
  useEffect(() => {
    return () => {
      try {
        document.documentElement.style.removeProperty("--brand-banner-h");
      } catch {}
    };
  }, []);

  if (!open) return null;

  const hasContent = title || message;
  if (!hasContent) return null;

  return (
    <motion.div
      ref={rootRef}
      className={cn(
        "sticky inset-x-0 z-40 flex w-full items-center justify-center bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white px-4 py-2",
        className,
      )}
      style={{ top: topOffset, ...style }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      aria-live="polite"
    >
      {/* Single-line layout: title • message [CTA] — no flex-col on mobile */}
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-1.5 pr-8 sm:gap-2 sm:pr-10 overflow-hidden">
        <p className="truncate text-xs font-medium leading-tight sm:text-sm sm:leading-snug">
          {title && <span className="font-semibold">{title}</span>}
          {title && message && <span className="mx-1 text-blue-200/80">•</span>}
          {message && <span className="text-blue-100">{message}</span>}
        </p>

        {ctaLabel && ctaLink && (
          <Link
            href={ctaLink}
            className="flex-none inline-flex items-center gap-0.5 text-xs font-medium underline decoration-white/60 underline-offset-2 hover:decoration-white transition-colors sm:text-sm whitespace-nowrap"
          >
            {ctaLabel}
            <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Link>
        )}
      </div>

      {dismissible && (
        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-1"
          onClick={() => {
            markDismissed(bannerId);
            setOpen(false);
          }}
          aria-label="Hide announcement banner"
        >
          <CloseIcon className="h-4 w-4 text-white/80 hover:text-white transition-colors" />
        </motion.button>
      )}
    </motion.div>
  );
}

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
