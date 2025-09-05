'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';

// Utility to join class names
function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
}

const throttle = (func: (...args: any[]) => void, limit: number) => {
  let lastCall = 0;
  return function (this: any, ...args: any[]) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function parseRgb(input: string, fallback: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  // #RRGGBB
  if (input.startsWith('#')) return hexToRgb(input);
  // rgb/rgba(…)
  const rgbMatch = input.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgbMatch) {
    return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3] };
  }
  // var(--brand-1) where CSS var is defined as "R G B"
  if (typeof window !== 'undefined' && input.includes('var(')) {
    const varNameMatch = input.match(/var\((--[\w-]+)\)/);
    const varName = varNameMatch?.[1] ?? '--brand-1';
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    // Expected formats: "82 39 255" or "82, 39, 255"
    const parts = value.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 3) {
      const [r, g, b] = parts.map((v) => parseInt(v, 10));
      if ([r, g, b].every((n) => Number.isFinite(n))) return { r, g, b };
    }
  }
  return fallback;
}

export interface DotGridProps extends React.ComponentPropsWithoutRef<'div'> {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  withGlow?: boolean;
}

const DotGrid: React.FC<DotGridProps> = ({
  children,
  className,
  style,
  dotSize = 3,
  gap = 16,
  // Use CSS brand token by default, fallback to brand hex
  baseColor = 'var(--brand-1)',
  activeColor = 'var(--brand-1)',
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  withGlow = true,
  ...rest
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const pluginAvailableRef = useRef(false);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0,
  });

  const baseRgb = useMemo(() => parseRgb(baseColor, { r: 82, g: 39, b: 255 }), [baseColor]);
  const activeRgb = useMemo(() => parseRgb(activeColor, { r: 82, g: 39, b: 255 }), [activeColor]);

  // Try to load InertiaPlugin dynamically; fall back gracefully if unavailable
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('gsap/InertiaPlugin');
        if (!mounted) return;
        // The plugin export type isn't declared in gsap types in all installs; cast to unknown to satisfy TS without suppressions
        const inertia = (mod as unknown as { InertiaPlugin?: unknown }).InertiaPlugin as unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gsap as any).registerPlugin(inertia);
        pluginAvailableRef.current = true;
      } catch {
        pluginAvailableRef.current = false; // fall back to regular tweens
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !('Path2D' in window)) return null;
    const p = new Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;

    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;

    const extraX = Math.max(0, width - gridW);
    const extraY = Math.max(0, height - gridH);

    const startX = extraX / 2 + dotSize / 2;
    const startY = extraY / 2 + dotSize / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false });
      }
    }
    dotsRef.current = dots;
  }, [dotSize, gap]);

  // Draw loop
  useEffect(() => {
    if (!circlePath) return;
    let rafId: number;
    const proxSq = proximity * proximity;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const { x: px, y: py } = pointerRef.current;

      for (const dot of dotsRef.current) {
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;

        // Subtle base dots; brighten slightly within proximity
        const baseAlpha = 0.16;
        const activeAlpha = 0.45;
        let r = baseRgb.r, g = baseRgb.g, b = baseRgb.b, a = baseAlpha;
        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / proximity;
          r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          a = baseAlpha + (activeAlpha - baseAlpha) * t;
        }

        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fill(circlePath);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [proximity, baseColor, activeRgb, baseRgb, circlePath]);

  // Build grid and listen for resize
  useEffect(() => {
    buildGrid();
    let ro: ResizeObserver | null = null;
    // Prefer native ResizeObserver if available
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(buildGrid);
      if (wrapperRef.current) ro.observe(wrapperRef.current);
    }
    // Fallback to window resize listener only when RO is not available
    if (typeof window !== 'undefined' && typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', buildGrid);
    }
    return () => {
      if (ro) ro.disconnect();
      if (typeof window !== 'undefined' && typeof ResizeObserver === 'undefined') {
        window.removeEventListener('resize', buildGrid);
      }
    };
  }, [buildGrid]);

  // Pointer interactions
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const pr = pointerRef.current;
      const dt = pr.lastTime ? now - pr.lastTime : 16;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;
      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        speed = maxSpeed;
      }
      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;
      pr.vx = vx;
      pr.vy = vy;
      pr.speed = speed;

      const wrap = wrapperRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      pr.x = e.clientX - rect.left;
      pr.y = e.clientY - rect.top;

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
        if (speed > speedTrigger && dist < proximity && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          gsap.killTweensOf(dot);
          const pushX = dot.cx - pr.x + vx * 0.005;
          const pushY = dot.cy - pr.y + vy * 0.005;

          if (pluginAvailableRef.current) {
            // Use InertiaPlugin when available
            gsap.to(dot as any, {
          
              inertia: { xOffset: pushX, yOffset: pushY, resistance },
              onComplete: () => {
                gsap.to(dot, {
                  xOffset: 0,
                  yOffset: 0,
                  duration: returnDuration,
                  ease: 'elastic.out(1,0.75)',
                  onComplete: () => { dot._inertiaApplied = false; },
                });
              },
            });
          } else {
            // Fallback without plugin: quick push then return
            const magnitude = Math.hypot(pushX, pushY);
            const outDur = Math.min(0.6, Math.max(0.2, magnitude / (resistance * 4)));
            gsap.to(dot, {
              xOffset: pushX,
              yOffset: pushY,
              duration: outDur,
              ease: 'power2.out',
              onComplete: () => {
                gsap.to(dot, {
                  xOffset: 0,
                  yOffset: 0,
                  duration: returnDuration,
                  ease: 'elastic.out(1,0.75)',
                  onComplete: () => { dot._inertiaApplied = false; },
                });
              },
            });
          }
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < shockRadius && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          gsap.killTweensOf(dot);
          const falloff = Math.max(0, 1 - dist / shockRadius);
          const pushX = (dot.cx - cx) * shockStrength * falloff;
          const pushY = (dot.cy - cy) * shockStrength * falloff;

          if (pluginAvailableRef.current) {
            gsap.to(dot as any, {
             
              inertia: { xOffset: pushX, yOffset: pushY, resistance },
              onComplete: () => {
                gsap.to(dot, {
                  xOffset: 0,
                  yOffset: 0,
                  duration: returnDuration,
                  ease: 'elastic.out(1,0.75)',
                  onComplete: () => { dot._inertiaApplied = false; },
                });
              },
            });
          } else {
            const magnitude = Math.hypot(pushX, pushY);
            const outDur = Math.min(0.6, Math.max(0.2, magnitude / (resistance * 4)));
            gsap.to(dot, {
              xOffset: pushX,
              yOffset: pushY,
              duration: outDur,
              ease: 'power2.out',
              onComplete: () => {
                gsap.to(dot, {
                  xOffset: 0,
                  yOffset: 0,
                  duration: returnDuration,
                  ease: 'elastic.out(1,0.75)',
                  onComplete: () => { dot._inertiaApplied = false; },
                });
              },
            });
          }
        }
      }
    };

    const throttledMove = throttle(onMove, 50);
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', throttledMove, { passive: true });
      window.addEventListener('click', onClick);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', throttledMove as unknown as EventListener);
        window.removeEventListener('click', onClick);
      }
    };
  }, [maxSpeed, speedTrigger, proximity, resistance, returnDuration, shockRadius, shockStrength]);

  return (
    <div
      ref={wrapperRef}
      className={cx('relative isolate bg-background text-foreground min-h-screen overflow-hidden', className)}
      style={style}
      {...rest}
    >
      {/* Canvas background */}
      <canvas className="absolute inset-0 w-full h-full pointer-events-none -z-10" ref={canvasRef} />

      {/* Optional brand glow to match previous background aesthetics */}
      {withGlow && (
        <div
          aria-hidden
          className={cx(
            'absolute inset-0 -z-20',
            'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgb(var(--brand-1)_/_0.20),transparent)]'
          )}
        />
      )}

      {children}
    </div>
  );
};

export default DotGrid;
export type { DotGridProps as IDotGridProps };
