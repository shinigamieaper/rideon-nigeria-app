"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BottomSheetProps
  extends React.ComponentPropsWithoutRef<"div"> {
  header?: React.ReactNode;
  snapPoints?: number[]; // fractions 0..1 of viewport height
  initialSnap?: number; // fraction 0..1
  onSnapChange?: (value: number) => void;
  // Reserve this many pixels from the top, so the sheet never overlaps the page header
  topReservePx?: number;
}

// A simple, lightweight bottom sheet with touch/mouse drag + snap points.
export default function BottomSheet({
  className,
  header,
  children,
  snapPoints = [0.35, 0.6, 0.9],
  initialSnap = 0.6,
  onSnapChange,
  topReservePx = 16,
  ...rest
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const [vh, setVh] = React.useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  const [safeBottom, setSafeBottom] = React.useState<number>(0);
  const [dockOffset, setDockOffset] = React.useState<number>(112);
  const [snap, setSnap] = React.useState<number>(() =>
    clamp(initialSnap, 0.2, 0.95),
  );
  const [dragging, setDragging] = React.useState(false);
  const startYRef = React.useRef(0);
  const startSnapRef = React.useRef(snap);

  React.useEffect(() => {
    const readMetrics = () => {
      setVh(window.innerHeight);
      // Detect safe area bottom (iOS)
      const probe = document.createElement("div");
      probe.style.position = "fixed";
      probe.style.bottom = "env(safe-area-inset-bottom)";
      probe.style.height = "0px";
      probe.style.visibility = "hidden";
      document.body.appendChild(probe);
      const val = parseFloat(getComputedStyle(probe).bottom || "0");
      document.body.removeChild(probe);
      if (Number.isFinite(val)) setSafeBottom(val);
      // Read dock offset from CSS variable if present
      const cssVar = getComputedStyle(document.documentElement)
        .getPropertyValue("--dock-offset")
        .trim();
      const parsed = cssVar.endsWith("px")
        ? parseFloat(cssVar)
        : parseFloat(cssVar);
      if (Number.isFinite(parsed)) setDockOffset(parsed);
    };
    readMetrics();
    window.addEventListener("resize", readMetrics);
    return () => window.removeEventListener("resize", readMetrics);
  }, []);

  React.useEffect(() => {
    onSnapChange?.(snap);
  }, [snap, onSnapChange]);

  // Compute dynamic snap clamps so the sheet never hides the header off-screen
  const bottomOffsetPx = dockOffset + safeBottom; // must match container bottom style
  const minFrac = 0.2;
  const topMarginPx = topReservePx; // keep header visible at the very top
  const maxFrac = Math.max(
    0.3,
    Math.min(0.92, (vh - (bottomOffsetPx + topMarginPx)) / Math.max(vh, 1)),
  );
  const clampSnap = (n: number) => clamp(n, minFrac, maxFrac);

  const setFromClientY = (clientY: number) => {
    const topPx = clientY; // pointer position from top
    const fromTopFrac = topPx / vh;
    const desired = 1 - fromTopFrac; // convert to from-bottom fraction
    const clamped = clampSnap(desired);
    setSnap(clamped);
  };

  // If viewport or safe area changes and our current snap exceeds max, clamp it
  React.useEffect(() => {
    setSnap((s) => clampSnap(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vh, safeBottom]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    startYRef.current = e.clientY;
    startSnapRef.current = snap;
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientY - startYRef.current;
    const deltaFrac = -delta / vh; // negative when dragging up
    const next = clampSnap(startSnapRef.current + deltaFrac);
    setSnap(next);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    // snap to nearest point
    const nearest = nearestSnap(snapPoints.map(clampSnap), clampSnap(snap));
    setSnap(nearest);
  };

  const heightPx = Math.min(Math.round(vh * snap), Math.round(vh * maxFrac));

  return (
    <div
      className={cn("pointer-events-none fixed inset-x-0", className)}
      style={{
        bottom: "calc(var(--dock-offset, 112px) + env(safe-area-inset-bottom))",
      }}
      {...rest}
    >
      <div
        ref={sheetRef}
        className={cn(
          "pointer-events-auto mx-4 sm:mx-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg flex flex-col transition-[height] duration-200",
        )}
        style={{ height: heightPx }}
      >
        <div
          className="shrink-0 select-none cursor-grab active:cursor-grabbing py-2 flex flex-col items-center touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mt-1 h-1.5 w-12 rounded-full bg-slate-400/60 dark:bg-slate-500/50" />
          {header && <div className="mt-2 w-full px-4 sm:px-5">{header}</div>}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nearestSnap(points: number[], value: number) {
  if (!points || points.length === 0) return value;
  let best = points[0];
  let bestDist = Math.abs(points[0] - value);
  for (let i = 1; i < points.length; i++) {
    const d = Math.abs(points[i] - value);
    if (d < bestDist) {
      best = points[i];
      bestDist = d;
    }
  }
  return best;
}
