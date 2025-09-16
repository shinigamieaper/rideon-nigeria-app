"use client";

import React, { useEffect, useRef, useState } from "react";

export interface RevealOnScrollProps extends React.ComponentPropsWithoutRef<"div"> {
  /**
   * Render as a different element, e.g. 'section', 'h2', etc.
   * Defaults to 'div'.
   */
  as?: React.ElementType;
  /** IntersectionObserver threshold; defaults to 0.1 */
  threshold?: number;
  /** IntersectionObserver rootMargin; defaults to '0px' */
  rootMargin?: string;
  /** If true, reveal only once; otherwise toggles when entering/leaving */
  once?: boolean;
  /** Class to apply when in-view; defaults to the global 'animate-in' */
  inViewClassName?: string;
}

const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  as: As = "div",
  threshold = 0.1,
  rootMargin = "0px",
  once = true,
  inViewClassName = "animate-in",
  className,
  style,
  children,
  ...rest
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(node);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  // Pre-animate style so element is hidden/moved until in-view
  const preStyle: React.CSSProperties = !inView
    ? {
        opacity: 0,
        filter: "blur(var(--tw-enter-blur, 0))",
        transform:
          "translate(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0)) scale(var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0))",
      }
    : {};

  const mergedStyle = { ...(preStyle as any), ...(style as any) };
  const mergedClassName = [className, inView ? inViewClassName : ""]
    .filter(Boolean)
    .join(" ");

  const Component: any = As;
  return (
    <Component ref={ref as any} className={mergedClassName} style={mergedStyle} {...rest}>
      {children}
    </Component>
  );
};

export default RevealOnScroll;
export type { RevealOnScrollProps as IRevealOnScrollProps };
