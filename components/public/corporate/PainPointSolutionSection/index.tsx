import * as React from 'react';
import { CreditCard, ShieldCheck, Users } from 'lucide-react';
import PhoneMockup, { PhoneScreenMedia } from '../../../shared/PhoneMockup';
import BlurText from '../../../shared/BlurText';
import RevealOnScroll from '../../../shared/RevealOnScroll';

export interface PainPointSolutionSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
}

/**
 * Server Component: PainPointSolutionSection
 *
 * Static, presentational section highlighting corporate pain points and our solutions.
 * Mirrors the provided HTML/Tailwind reference while adhering to our theme tokens and utilities.
 */
export default function PainPointSolutionSection({ className, background = 'solid', ...rest }: PainPointSolutionSectionProps) {
  const enterVars = {
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
        {/* Header */}
        <RevealOnScroll as="div" className="mx-auto max-w-2xl lg:text-center" style={enterVars}>
          <h2 className="text-base font-semibold leading-7" style={{ color: '#00529B' }}>
            <BlurText as="span" text="Business Solutions" animateBy="words" direction="top" delay={100} />
          </h2>
          <BlurText
            as="p"
            className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
            text="Solutions to Your Toughest Mobility Challenges"
            animateBy="words"
            direction="top"
            delay={100}
          />
          <BlurText
            as="p"
            className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400"
            text="Focus on your business, we'll handle the driving. Our platform is built to solve the key pain points of corporate travel management."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </RevealOnScroll>

        {/* Grid */}
        <div className="mt-16 sm:mt-20 lg:mt-24">
          <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-10 lg:gap-x-8 lg:items-start">
            {/* Left Card */}
            <div className="lg:col-span-3">
              <RevealOnScroll
                as="div"
                className="flex flex-col p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out"
                style={{ ...enterVars, animationDelay: '400ms' }}
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                  <BlurText as="span" text="Eliminate Expense Reports. Gain Full Control." animateBy="words" direction="top" delay={100} />
                </h3>
                <BlurText
                  as="p"
                  className="mt-2 flex-auto text-base leading-7 text-slate-600 dark:text-slate-400"
                  text="Set granular travel policies and spending limits for individuals or departments. Receive a single, consolidated monthly invoice for all trips. No more chasing receipts."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </RevealOnScroll>
            </div>

            {/* Phone Mockup Center */}
            <RevealOnScroll as="div" className="lg:col-span-4 order-first lg:order-none" style={{ ...enterVars, animationDelay: '200ms' }}>
              <PhoneMockup>
                <PhoneScreenMedia
                  lightSrc="https://placehold.co/700x1400/ffffff/111111?text=Light+Screen"
                  darkSrc="https://placehold.co/700x1400/020617/e2e8f0?text=Dark+Screen"
                />
              </PhoneMockup>
            </RevealOnScroll>

            {/* Right Cards */}
            <div className="lg:col-span-3 space-y-12">
              <RevealOnScroll
                as="div"
                className="flex flex-col p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out"
                style={{ ...enterVars, animationDelay: '600ms' }}
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                  <BlurText as="span" text="A Duty of Care, Delivered." animateBy="words" direction="top" delay={100} />
                </h3>
                <BlurText
                  as="p"
                  className="mt-2 flex-auto text-base leading-7 text-slate-600 dark:text-slate-400"
                  text="Provide your team with safe, reliable transportation through our network of fully vetted professional drivers. A valuable employee perk that ensures they get to and from meetings safely and on time."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </RevealOnScroll>

              <RevealOnScroll
                as="div"
                className="flex flex-col p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-800/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out"
                style={{ ...enterVars, animationDelay: '800ms' }}
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                  <BlurText as="span" text="Hire Executive Drivers from the Same Platform." animateBy="words" direction="top" delay={100} />
                </h3>
                <BlurText
                  as="p"
                  className="mt-2 flex-auto text-base leading-7 text-slate-600 dark:text-slate-400"
                  text="Our integrated marketplace allows you to source, contract, and manage long-term drivers for your executives. A key cross-selling feature, providing a single vendor for all your corporate mobility needs."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </RevealOnScroll>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
