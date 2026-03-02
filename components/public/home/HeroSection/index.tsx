import * as React from "react";

export interface HeroSectionProps
  extends React.ComponentPropsWithoutRef<"section"> {
  /**
   * Background image URL. Defaults to a city street image from the reference.
   */
  backgroundUrl?: string;
  /**
   * Optional gradient overlay classes applied on top of the image.
   * Provide Tailwind utility classes for the overlay. A sensible default is provided.
   */
  overlayGradientClassName?: string;
  /**
   * Optional container width class (e.g., max-w-7xl). Defaults to max-w-7xl.
   */
  containerWidthClassName?: string;
}

/**
 * Server Component: Presentational container for the home page hero.
 * Renders the background image and layout chrome, and composes children
 * into the designated content area so consumers can inject interactive widgets
 * like `PriceEstimationWidget`.
 */
export default function HeroSection({
  backgroundUrl = "/hero-home.png",
  overlayGradientClassName = "bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent",
  containerWidthClassName = "max-w-7xl",
  className,
  children,
  ...rest
}: HeroSectionProps) {
  return (
    <section
      className={[
        "relative isolate w-full overflow-hidden min-h-[600px] lg:min-h-[75vh] flex items-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        {/* Using img to match reference visual and allow external URL */}
        <img
          src={backgroundUrl}
          alt="Stylized Nigerian cityscape with roads and vehicles, brand-aligned city hero"
          className="h-full w-full object-cover lg:object-[center_39%] animate-zoom"
        />
        <div
          className={`absolute inset-0 z-0 ${overlayGradientClassName}`}
        ></div>
      </div>

      {/* Content container */}
      <div
        className={`relative z-10 mx-auto ${containerWidthClassName} px-4 sm:px-6 lg:px-8 w-full`}
      >
        <div className="py-20 sm:py-24 lg:py-28">{children}</div>
      </div>
    </section>
  );
}
