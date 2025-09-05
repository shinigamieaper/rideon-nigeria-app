import * as React from 'react';
import Link from 'next/link';
import PhoneMockup, { PhoneScreenMedia } from '../../../shared/PhoneMockup';
import BlurText from '../../../shared/BlurText';

export interface FinalCTASectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
}

/**
 * Server Component: FinalCTASection (Drive With Us)
 * Concluding CTA with creative PhoneMockup usage (outside the hero).
 */
export default function FinalCTASection({ className, background = 'tinted', ...rest }: FinalCTASectionProps) {
  const enterBase = {
    ['--tw-enter-opacity' as any]: '0',
    ['--tw-enter-translate-y' as any]: '1rem',
    ['--tw-enter-blur' as any]: '8px',
  } as React.CSSProperties;

  return (
    <section
      className={[
        "py-24 sm:py-32",
        background === 'transparent'
          ? 'bg-transparent'
          : background === 'tinted'
            ? 'bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800'
            : 'bg-background',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Text + CTA */}
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              <BlurText as="span" text="Ready to take the next step?" animateBy="words" direction="top" delay={120} />
            </h2>
            <BlurText
              as="p"
              className="mt-4 text-lg text-slate-600 dark:text-slate-400"
              text="Join a trusted network of professional drivers. Predictable bookings, premium clients, and a team that puts your safety and professionalism first."
              animateBy="words"
              direction="top"
              delay={24}
            />
            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/register/driver"
                className="inline-flex items-center justify-center rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30"
                style={{ backgroundColor: '#00529B' }}
              >
                <BlurText as="span" text="Start Your Application" animateBy="words" direction="top" delay={60} />
              </Link>
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center lg:justify-end animate-in" style={{ ...enterBase, animationDelay: '300ms' }}>
            <PhoneMockup className="w-[300px] h-[600px] sm:w-[350px] sm:h-[700px]">
              <PhoneScreenMedia
                lightSrc="https://placehold.co/700x1400/ffffff/111111?text=Driver+Onboarding"
                darkSrc="https://placehold.co/700x1400/020617/e2e8f0?text=Driver+Onboarding"
              />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
}
