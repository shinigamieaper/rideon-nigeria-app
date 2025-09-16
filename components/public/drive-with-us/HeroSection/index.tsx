import * as React from 'react';
import Link from 'next/link';
import BlurText from '../../../shared/BlurText';
import RevealOnScroll from '../../../shared/RevealOnScroll';

export interface HeroSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Optional background image URL */
  backgroundImageUrl?: string;
}

/**
 * Server Component: HeroSection (Drive With Us)
 * Static, presentational hero based on the provided HTML/Tailwind reference.
 * CTA uses Next.js Link to /register/driver.
 */
export default function HeroSection({ backgroundImageUrl = 'https://i.pinimg.com/736x/18/8b/9a/188b9a30786bb986d145d7bec71049ba.jpg', className, ...rest }: HeroSectionProps) {
  const enterVars = {
    ['--tw-enter-opacity' as any]: '0',
    ['--tw-enter-translate-y' as any]: '1rem',
    ['--tw-enter-blur' as any]: '8px',
  } as React.CSSProperties;

  return (
    <section className={["relative isolate overflow-hidden py-24 sm:py-32 lg:py-40", className].filter(Boolean).join(' ')} {...rest}>
      {/* Background image */}
      <div className="absolute inset-0 -z-20">
        <img src={backgroundImageUrl} alt="Professional driver in a modern car" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            <BlurText as="span" text="Build Your Driving Career with RideOn." animateBy="words" direction="top" delay={100} />
          </h1>
          <BlurText
            as="p"
            className="mt-6 text-lg leading-8 text-slate-200"
            text="We partner with Nigeria's best professional drivers, offering stable contracts, predictable income, and access to a network of premium clients."
            animateBy="words"
            direction="top"
            delay={24}
          />
          <RevealOnScroll as="div" className="mt-10 flex items-center justify-center gap-x-6" style={{ ...enterVars, animationDelay: '400ms' }}>
            <Link
              href="/register/driver"
              className="inline-flex items-center justify-center rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30"
              style={{ backgroundColor: '#00529B' }}
            >
              Apply to Drive
            </Link>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
