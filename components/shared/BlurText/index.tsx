"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { Easing } from "motion";

export interface BlurTextProps extends React.ComponentPropsWithoutRef<"p"> {
  as?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  text?: string;
  delay?: number;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: Easing | Easing[];
  onAnimationComplete?: () => void;
  stepDuration?: number; // seconds per step
  /** Optional classes to apply on each animated child span (useful for gradient text). */
  childClassName?: string;
}

const buildKeyframes = (
  from: Record<string, string | number>,
  steps: Array<Record<string, string | number>>
): Record<string, Array<string | number>> => {
  const keys = new Set<string>([
    ...Object.keys(from),
    ...steps.flatMap((s) => Object.keys(s)),
  ]);

  const keyframes: Record<string, Array<string | number>> = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])];
  });
  return keyframes;
};

const BlurText: React.FC<BlurTextProps> = ({
  as = "p",
  text = "",
  delay = 200,
  className = "",
  childClassName = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t: number) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  ...pProps
}) => {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5,
      },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from(
    { length: stepCount },
    (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1))
  );

  const Wrapper: any = as ?? "p";
  const baseWrapperClass = as === "span" ? "inline-block" : "flex flex-wrap";

  return (
    <Wrapper
      ref={ref as any}
      className={["blur-text", baseWrapperClass, className].filter(Boolean).join(" ")}
      {...pProps}
    >
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

        const spanTransition = {
          duration: totalDuration,
          times,
          delay: (index * delay) / 1000,
          ease: easing,
        } as const;

        return (
          <motion.span
            key={index}
            initial={fromSnapshot as any}
            animate={inView ? (animateKeyframes as any) : (fromSnapshot as any)}
            transition={spanTransition as any}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
            className={childClassName}
            style={{ display: "inline-block", willChange: "transform, filter, opacity" }}
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </Wrapper>
  );
};

export default BlurText;
export type { BlurTextProps as IBlurTextProps };
