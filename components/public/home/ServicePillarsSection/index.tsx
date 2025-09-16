"use client";
import Link from 'next/link';
import React from 'react';
import BlurText from '../../../shared/BlurText';
import RevealOnScroll from '../../../shared/RevealOnScroll';

export interface ServicePillarsSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Controls the section background treatment */
  background?: 'solid' | 'tinted' | 'transparent';
}

const ServicePillarsSection = ({ className, background = 'solid', ...rest }: ServicePillarsSectionProps) => {
  const wrapperBgClass =
    background === 'transparent'
      ? 'bg-transparent'
      : background === 'tinted'
        ? 'bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800'
        : 'bg-background';
  return (
    <section className={["relative w-full overflow-hidden py-16 sm:py-24", wrapperBgClass, className || ''].join(' ')} {...rest}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
          >
            <BlurText as="span" text="A Service for Every Journey" animateBy="words" direction="top" delay={100} />
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-none">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Card 1: Pre-Booked Rides */}
            <RevealOnScroll
              as="div"
              className="flex flex-col rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-xl backdrop-blur-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl"
              style={{
                ['--tw-enter-opacity' as any]: 0,
                ['--tw-enter-blur' as any]: '8px',
                ['--tw-enter-translate-y' as any]: '2rem',
                animationDelay: '200ms',
                transitionTimingFunction: 'ease-in-out',
              }}
            >
              <img
                src="/pre-booked-rides-pillar.png"
                alt="Nigerian professional woman sitting comfortably in a premium car, representing reliable pre-booked rides"
                className="h-32 w-auto mx-auto mb-6 rounded-lg object-contain"
              />
              <h3 className="mt-0 text-lg font-semibold leading-8 text-slate-900 dark:text-white">
                <BlurText as="span" text="Pre-Booked Rides" animateBy="words" direction="top" delay={80} />
              </h3>
              <BlurText
                as="p"
                className="mt-2 text-sm text-slate-600 dark:text-slate-400"
                text="For the punctual professional. Book your trips in advance and enjoy peace of mind."
                animateBy="words"
                direction="top"
                delay={24}
              />
              <div className="mt-auto pt-6">
                <Link
                  href="/services/pre-booked-rides"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-300/70 dark:hover:bg-slate-700/70 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </RevealOnScroll>

            {/* Card 2: Hire a Full-Time Driver */}
            <RevealOnScroll
              as="div"
              className="flex flex-col rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-xl backdrop-blur-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl"
              style={{
                ['--tw-enter-opacity' as any]: 0,
                ['--tw-enter-blur' as any]: '8px',
                ['--tw-enter-translate-y' as any]: '2rem',
                animationDelay: '350ms',
                transitionTimingFunction: 'ease-in-out',
              }}
            >
              <img
                src="/hire-a-driver-pillar.png"
                alt="Professional Nigerian driver standing confidently next to a premium sedan, representing trusted full-time driver service"
                className="h-32 w-auto mx-auto mb-6 rounded-lg object-contain"
              />
              <h3 className="mt-0 text-lg font-semibold leading-8 text-slate-900 dark:text-white">
                <BlurText as="span" text="Hire a Full-Time Driver" animateBy="words" direction="top" delay={80} />
              </h3>
              <BlurText
                as="p"
                className="mt-2 text-sm text-slate-600 dark:text-slate-400"
                text="Your personal driver, managed. Access our pool of vetted professionals for a fixed monthly fee."
                animateBy="words"
                direction="top"
                delay={24}
              />
              <div className="mt-auto pt-6">
                <Link
                  href="/services/hire-a-driver/browse"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-300/70 dark:hover:bg-slate-700/70 transition-colors"
                >
                  Explore Drivers
                </Link>
              </div>
            </RevealOnScroll>

            {/* Card 3: Corporate Solutions */}
            <RevealOnScroll
              as="div"
              className="flex flex-col rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-xl backdrop-blur-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl"
              style={{
                ['--tw-enter-opacity' as any]: 0,
                ['--tw-enter-blur' as any]: '8px',
                ['--tw-enter-translate-y' as any]: '2rem',
                animationDelay: '500ms',
                transitionTimingFunction: 'ease-in-out',
              }}
            >
              <img
                src="/corporate-solutions-pillar.png"
                alt="Nigerian business executive coordinating with professional drivers and fleet vehicles, representing corporate transportation management"
                className="h-32 w-auto mx-auto mb-6 rounded-lg object-contain"
              />
              <h3 className="mt-0 text-lg font-semibold leading-8 text-slate-900 dark:text-white">
                <BlurText as="span" text="Corporate Solutions" animateBy="words" direction="top" delay={80} />
              </h3>
              <BlurText
                as="p"
                className="mt-2 text-sm text-slate-600 dark:text-slate-400"
                text="Streamline your company's travel. Manage trips, control spending, and source executive drivers from one portal."
                animateBy="words"
                direction="top"
                delay={24}
              />
              <div className="mt-auto pt-6">
                <Link
                  href="/solutions/corporate"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-300/70 dark:hover:bg-slate-700/70 transition-colors"
                >
                  Request a Demo
                </Link>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicePillarsSection;
