import * as React from 'react';

export interface HeroSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /**
   * Background image URL. Defaults to the Lagos street image from the reference.
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
  backgroundUrl = 'https://images.unsplash.com/photo-1659772338512-2d597aee508c?w=2560&q=80',
  overlayGradientClassName = 'bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent',
  containerWidthClassName = 'max-w-7xl',
  className,
  children,
  ...rest
}: HeroSectionProps) {
  return (
    <section
      className={[
        'relative isolate w-full overflow-hidden',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        {/* Using img to match reference visual and allow external URL */}
        <img
          src={backgroundUrl}
          alt="Night view of a bustling city street in Lagos with light trails from cars"
          className="h-full w-full object-cover animate-zoom"
        />
        <div className={`absolute inset-0 ${overlayGradientClassName}`}></div>
      </div>

      {/* Content container */}
      <div className={`relative mx-auto ${containerWidthClassName} px-4 sm:px-6 lg:px-8`}>
        <div className="flex min-h-[calc(100vh-4rem)] sm:py-24 pt-20 pb-20 items-center">
          {/* Column that mirrors the reference width where the widget will live */}
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
