"use client";

import React, {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Shared GradualBlur overlay effect component.
// - Client-only (uses window/IntersectionObserver)
// - No external deps (uses Math.* instead of mathjs)
// - Type-safe props with full attribute passthrough for <div>
// - Presets and curve functions exported for reuse

export interface GradualBlurProps
  extends React.ComponentPropsWithoutRef<"div"> {
  position?: "top" | "bottom" | "left" | "right";
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  zIndex?: number;
  animated?: boolean | "scroll";
  duration?: string;
  easing?: string;
  opacity?: number;
  curve?: "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
  responsive?: boolean;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;

  preset?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "subtle"
    | "intense"
    | "smooth"
    | "sharp"
    | "header"
    | "footer"
    | "sidebar"
    | "page-header"
    | "page-footer";
  gpuOptimized?: boolean;
  hoverIntensity?: number;
  target?: "parent" | "page";

  onAnimationComplete?: () => void;
}

const DEFAULT_CONFIG: Required<Pick<GradualBlurProps,
  | "position"
  | "strength"
  | "height"
  | "divCount"
  | "exponential"
  | "zIndex"
  | "animated"
  | "duration"
  | "easing"
  | "opacity"
  | "curve"
  | "responsive"
  | "target"
>> = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: "0.3s",
  easing: "ease-out",
  opacity: 1,
  curve: "linear",
  responsive: false,
  target: "parent",
};

export const PRESETS: Record<string, Partial<GradualBlurProps>> = {
  top: { position: "top", height: "6rem" },
  bottom: { position: "bottom", height: "6rem" },
  left: { position: "left", height: "6rem" },
  right: { position: "right", height: "6rem" },

  subtle: { height: "4rem", strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: "10rem", strength: 4, divCount: 8, exponential: true },

  smooth: { height: "8rem", curve: "bezier", divCount: 10 },
  sharp: { height: "5rem", curve: "linear", divCount: 4 },

  header: { position: "top", height: "8rem", curve: "ease-out" },
  footer: { position: "bottom", height: "8rem", curve: "ease-out" },
  sidebar: { position: "left", height: "6rem", strength: 2.5 },

  "page-header": {
    position: "top",
    height: "10rem",
    target: "page",
    strength: 3,
  },
  "page-footer": {
    position: "bottom",
    height: "10rem",
    target: "page",
    strength: 3,
  },
};

export const CURVE_FUNCTIONS: Record<string, (p: number) => number> = {
  linear: (p) => p,
  // Smoothstep-ish
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

const mergeConfigs = (
  ...configs: Partial<GradualBlurProps>[]
): Partial<GradualBlurProps> => {
  return configs.reduce((acc, config) => ({ ...acc, ...config }), {});
};

const getGradientDirection = (position: string): string => {
  const directions: Record<string, string> = {
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right",
  };
  return directions[position] || "to bottom";
};

const debounce = <T extends (...a: any[]) => void>(fn: T, wait: number) => {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...a: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
};

const useResponsiveDimension = (
  responsive: boolean | undefined,
  config: Partial<GradualBlurProps>,
  key: keyof GradualBlurProps
) => {
  const [val, setVal] = useState<any>((config as any)[key]);
  useEffect(() => {
    if (!responsive) return;
    const calc = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 0;
      let v: any = (config as any)[key];
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const k = cap(key as string);
      if (w <= 480 && (config as any)["mobile" + k]) v = (config as any)["mobile" + k];
      else if (w <= 768 && (config as any)["tablet" + k]) v = (config as any)["tablet" + k];
      else if (w <= 1024 && (config as any)["desktop" + k]) v = (config as any)["desktop" + k];
      setVal(v);
    };
    const deb = debounce(calc, 100);
    calc();
    if (typeof window !== "undefined") window.addEventListener("resize", deb);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("resize", deb);
    };
  }, [responsive, config, key]);
  return responsive ? val : (config as any)[key];
};

const useIntersectionObserver = (
  ref:
    | React.RefObject<HTMLDivElement | null>
    | React.MutableRefObject<HTMLDivElement | null>,
  shouldObserve: boolean = false
) => {
  const [isVisible, setIsVisible] = useState(!shouldObserve);

  useEffect(() => {
    if (!shouldObserve || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, shouldObserve]);

  return isVisible;
};

const GradualBlur: React.FC<GradualBlurProps> = (props) => {
  const {
    children,
    className,
    style,
    position,
    strength,
    height,
    width,
    divCount,
    exponential,
    zIndex,
    animated,
    duration,
    easing,
    opacity,
    curve,
    responsive,
    mobileHeight,
    tabletHeight,
    desktopHeight,
    mobileWidth,
    tabletWidth,
    desktopWidth,
    preset,
    gpuOptimized,
    hoverIntensity,
    target,
    onAnimationComplete,
    ...divProps
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Merge config in order: defaults -> preset -> explicit props
  const config = useMemo(() => {
    const presetConfig = preset && PRESETS[preset] ? PRESETS[preset] : {};
    return mergeConfigs(
      DEFAULT_CONFIG,
      presetConfig,
      {
        position,
        strength,
        height,
        width,
        divCount,
        exponential,
        zIndex,
        animated,
        duration,
        easing,
        opacity,
        curve,
        responsive,
        mobileHeight,
        tabletHeight,
        desktopHeight,
        mobileWidth,
        tabletWidth,
        desktopWidth,
        target,
        hoverIntensity,
        onAnimationComplete,
      }
    );
  }, [
    position,
    strength,
    height,
    width,
    divCount,
    exponential,
    zIndex,
    animated,
    duration,
    easing,
    opacity,
    curve,
    responsive,
    mobileHeight,
    tabletHeight,
    desktopHeight,
    mobileWidth,
    tabletWidth,
    desktopWidth,
    preset,
    target,
    hoverIntensity,
    onAnimationComplete,
  ]);

  const responsiveHeight = useResponsiveDimension(
    config.responsive,
    config,
    "height"
  );
  const responsiveWidth = useResponsiveDimension(
    config.responsive,
    config,
    "width"
  );

  const isVisible = useIntersectionObserver(
    containerRef,
    config.animated === "scroll"
  );

  const blurDivs = useMemo(() => {
    const divs: React.ReactNode[] = [];
    const count = Math.max(1, Number(config.divCount ?? DEFAULT_CONFIG.divCount));
    const increment = 100 / count;
    const currentStrength =
      isHovered && config.hoverIntensity
        ? (config.strength ?? DEFAULT_CONFIG.strength) * config.hoverIntensity
        : (config.strength ?? DEFAULT_CONFIG.strength);

    const curveFunc = CURVE_FUNCTIONS[config.curve ?? DEFAULT_CONFIG.curve] || CURVE_FUNCTIONS.linear;

    for (let i = 1; i <= count; i++) {
      let progress = i / count;
      progress = curveFunc(progress);

      let blurValue: number;
      if (config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength;
      } else {
        blurValue = 0.0625 * (progress * count + 1) * currentStrength;
      }

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(String(config.position ?? DEFAULT_CONFIG.position));

      const divStyle: CSSProperties = {
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity ?? DEFAULT_CONFIG.opacity,
        transition:
          config.animated && config.animated !== "scroll"
            ? `backdrop-filter ${config.duration ?? DEFAULT_CONFIG.duration} ${config.easing ?? DEFAULT_CONFIG.easing}`
            : undefined,
      } as CSSProperties;

      divs.push(<div key={i} className="absolute inset-0" style={divStyle} />);
    }

    return divs;
  }, [config, isHovered]);

  const containerStyle: CSSProperties = useMemo(() => {
    const isVertical = ["top", "bottom"].includes(String(config.position ?? DEFAULT_CONFIG.position));
    const isHorizontal = ["left", "right"].includes(String(config.position ?? DEFAULT_CONFIG.position));
    const isPageTarget = (config.target ?? DEFAULT_CONFIG.target) === "page";

    const base: CSSProperties = {
      position: isPageTarget ? "fixed" : "absolute",
      pointerEvents: config.hoverIntensity ? "auto" : "none",
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration ?? DEFAULT_CONFIG.duration} ${config.easing ?? DEFAULT_CONFIG.easing}` : undefined,
      zIndex: (isPageTarget ? (config.zIndex ?? DEFAULT_CONFIG.zIndex) + 100 : (config.zIndex ?? DEFAULT_CONFIG.zIndex)) as number,
      ...style,
    };

    const pos = String(config.position ?? DEFAULT_CONFIG.position);
    if (isVertical) {
      base.height = (responsiveHeight as any) || DEFAULT_CONFIG.height;
      base.width = (responsiveWidth as any) || "100%";
      base.left = 0;
      base.right = 0;
      if (pos === "top") base.top = 0;
      if (pos === "bottom") base.bottom = 0;
    } else if (isHorizontal) {
      base.width = (responsiveWidth as any) || (responsiveHeight as any) || DEFAULT_CONFIG.height;
      base.height = "100%";
      base.top = 0;
      base.bottom = 0;
      if (pos === "left") base.left = 0;
      if (pos === "right") base.right = 0;
    }

    return base;
  }, [config, responsiveHeight, responsiveWidth, isVisible, style]);

  useEffect(() => {
    if (isVisible && config.animated === "scroll" && config.onAnimationComplete) {
      const seconds = parseFloat(String(config.duration ?? DEFAULT_CONFIG.duration)) || 0;
      const t = setTimeout(() => config.onAnimationComplete?.(), seconds * 1000);
      return () => clearTimeout(t);
    }
    return;
  }, [isVisible, config]);

  return (
    <div
      ref={containerRef}
      className={[
        "gradual-blur",
        "relative",
        "isolate",
        (config.target ?? DEFAULT_CONFIG.target) === "page" ? "gradual-blur-page" : "gradual-blur-parent",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
      {...divProps}
    >
      <div className="relative w-full h-full">{blurDivs}</div>
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
};

const GradualBlurMemo = React.memo(GradualBlur);
GradualBlurMemo.displayName = "GradualBlur";
(GradualBlurMemo as any).PRESETS = PRESETS;
(GradualBlurMemo as any).CURVE_FUNCTIONS = CURVE_FUNCTIONS;
export default GradualBlurMemo;

// Minimal CSS injection for base class (safe on client only)
const injectStyles = () => {
  if (typeof document === "undefined") return;
  const id = "gradual-blur-styles";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = `.gradual-blur{pointer-events:none;transition:opacity .3s ease-out}.gradual-blur-inner{pointer-events:none}`;
  document.head.appendChild(el);
};
if (typeof document !== "undefined") {
  injectStyles();
}
