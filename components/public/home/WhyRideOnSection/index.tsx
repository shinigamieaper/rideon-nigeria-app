"use client";

import React from 'react';
import { Shield, CalendarCheck, Briefcase, BadgeDollarSign } from 'lucide-react';
import BlurText from '../../../shared/BlurText';

type CSSVars = React.CSSProperties & {
  '--tw-enter-opacity'?: number | string;
  '--tw-enter-blur'?: string | number;
  '--tw-enter-translate-y'?: string;
};

export interface WhyRideOnSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
}

export default function WhyRideOnSection({ className, background = 'solid', ...rest }: WhyRideOnSectionProps) {
  const wrapperBgClass =
    background === 'transparent'
      ? 'bg-transparent'
      : background === 'tinted'
        ? 'bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800'
        : 'bg-background';
  return (
    <section
      className={[
        'relative w-full overflow-hidden py-16 sm:py-24',
        wrapperBgClass,
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="animate-in"
            style={{
              '--tw-enter-opacity': 0,
              '--tw-enter-blur': '8px',
              '--tw-enter-translate-y': '2rem',
              transitionTimingFunction: 'ease-in-out',
            } as CSSVars}
          >
            <BlurText
              as="span"
              text="Why RideOn?"
              className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
              animateBy="words"
            />
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-none">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Absolute Safety */}
            <div
              className="flex flex-col items-center rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl animate-in"
              style={{
                '--tw-enter-opacity': 0,
                '--tw-enter-blur': '8px',
                '--tw-enter-translate-y': '2rem',
                animationDelay: '200ms',
                transitionTimingFunction: 'ease-in-out',
              } as CSSVars}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold leading-8 text-slate-900 dark:text-white">
                <BlurText as="span" text="Absolute Safety" animateBy="words" />
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                <BlurText
                  as="span"
                  text="Rigorous vetting, comprehensive background checks, and professional training. Your safety is our non-negotiable priority."
                  animateBy="words"
                />
              </p>
            </div>

            {/* Guaranteed Reliability */}
            <div
              className="flex flex-col items-center rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl animate-in"
              style={{
                '--tw-enter-opacity': 0,
                '--tw-enter-blur': '8px',
                '--tw-enter-translate-y': '2rem',
                animationDelay: '300ms',
                transitionTimingFunction: 'ease-in-out',
              } as CSSVars}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50">
                <CalendarCheck className="h-8 w-8 text-green-600 dark:text-green-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold leading-8 text-slate-900 dark:text-white">
                <BlurText as="span" text="Guaranteed Reliability" animateBy="words" />
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                <BlurText
                  as="span"
                  text="Pre-booking means your ride is confirmed. We're there when we say we'll be. No last-minute cancellations."
                  animateBy="words"
                />
              </p>
            </div>

            {/* Unmatched Professionalism */}
            <div
              className="flex flex-col items-center rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl animate-in"
              style={{
                '--tw-enter-opacity': 0,
                '--tw-enter-blur': '8px',
                '--tw-enter-translate-y': '2rem',
                animationDelay: '400ms',
                transitionTimingFunction: 'ease-in-out',
              } as CSSVars}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50">
                <Briefcase className="h-8 w-8 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold leading-8 text-slate-900 dark:text-white">
                <BlurText as="span" text="Unmatched Professionalism" animateBy="words" />
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                <BlurText
                  as="span"
                  text="Courteous, experienced drivers and immaculate vehicles. We deliver a premium experience, every time."
                  animateBy="words"
                />
              </p>
            </div>

            {/* Transparent Pricing */}
            <div
              className="flex flex-col items-center rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl animate-in"
              style={{
                '--tw-enter-opacity': 0,
                '--tw-enter-blur': '8px',
                '--tw-enter-translate-y': '2rem',
                animationDelay: '500ms',
                transitionTimingFunction: 'ease-in-out',
              } as CSSVars}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
                <BadgeDollarSign className="h-8 w-8 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold leading-8 text-slate-900 dark:text-white">
                <BlurText as="span" text="Transparent Pricing" animateBy="words" />
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                <BlurText
                  as="span"
                  text="The price you see is the price you pay. Enjoy fixed, all-inclusive fares with no hidden costs or surge surprises."
                  animateBy="words"
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
