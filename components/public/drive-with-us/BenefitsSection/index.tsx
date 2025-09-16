import * as React from 'react';
import { ShieldCheck, CalendarCheck, BadgeDollarSign } from 'lucide-react';
import BlurText from '../../../shared/BlurText';
import RevealOnScroll from '../../../shared/RevealOnScroll';

export interface BenefitsSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
}

/**
 * Server Component: BenefitsSection (Drive With Us)
 * Three-column benefits layout highlighting why drivers should partner with RideOn.
 */
export default function BenefitsSection({ className, background = 'solid', ...rest }: BenefitsSectionProps) {
  const baseEnter = {
    ['--tw-enter-opacity' as any]: '0',
    ['--tw-enter-translate-y' as any]: '1rem',
    ['--tw-enter-blur' as any]: '8px',
  } as React.CSSProperties;

  const wrapperBgClass =
    background === 'transparent'
      ? 'bg-transparent'
      : background === 'tinted'
        ? 'bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800'
        : 'bg-background';

  return (
    <section className={["py-24 sm:py-32", wrapperBgClass, className].filter(Boolean).join(' ')} {...rest}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll as="div" className="mx-auto max-w-2xl text-center" style={baseEnter}>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <BlurText as="span" text="Why Partner with RideOn?" animateBy="words" direction="top" delay={120} />
          </h2>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400"
            text="Stable earnings, predictable schedules, and a trusted brand that puts safety first."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </RevealOnScroll>

        <div className="mx-auto mt-16 max-w-none">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Predictable Earnings */}
            <RevealOnScroll
              as="div"
              className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl"
              style={{ ...baseEnter, animationDelay: '200ms' }}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
                <BadgeDollarSign className="h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                <BlurText as="span" text="Predictable Earnings" animateBy="words" direction="top" delay={120} />
              </h3>
              <BlurText
                as="p"
                className="mt-2 text-slate-600 dark:text-slate-400"
                text="Access pre-booked trips and contracted clients. No surge uncertainty—earn with confidence."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </RevealOnScroll>

            {/* Consistent Schedule */}
            <RevealOnScroll
              as="div"
              className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl"
              style={{ ...baseEnter, animationDelay: '300ms' }}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/50">
                <CalendarCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                <BlurText as="span" text="Consistent, Pre‑Booked Jobs" animateBy="words" direction="top" delay={120} />
              </h3>
              <BlurText
                as="p"
                className="mt-2 text-slate-600 dark:text-slate-400"
                text="Plan your week. Our pre-booked model provides a steady pipeline of rides."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </RevealOnScroll>

            {/* Safety & Support */}
            <RevealOnScroll
              as="div"
              className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl"
              style={{ ...baseEnter, animationDelay: '400ms' }}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50">
                <ShieldCheck className="h-8 w-8 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                <BlurText as="span" text="Safety & Ongoing Support" animateBy="words" direction="top" delay={120} />
              </h3>
              <BlurText
                as="p"
                className="mt-2 text-slate-600 dark:text-slate-400"
                text="We prioritize your safety and success with verification, guidance, and professional standards."
                animateBy="words"
                direction="top"
                delay={24}
              />
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
