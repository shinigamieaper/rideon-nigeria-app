import Link from 'next/link';
import { FC } from 'react';
import BlurText from '../../shared/BlurText';

const FinalCTASection: FC = () => {
  return (
    <section className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-2xl text-center animate-in"
          style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem', '--tw-enter-blur': '8px', animationDelay: '400ms' } as React.CSSProperties}
        >
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <BlurText as="span" text="Find Your Perfect Driver Today" animateBy="words" direction="top" delay={120} />
          </h2>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400"
            text="Step into a world of convenience and security. Your professional driver is just a few clicks away."
            animateBy="words"
            direction="top"
            delay={24}
          />
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/services/hire-a-driver/browse"
              className="inline-flex items-center justify-center rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30"
              style={{ backgroundColor: '#00529B' }}
            >
              <BlurText as="span" text="Explore the Marketplace" animateBy="words" direction="top" delay={60} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;

