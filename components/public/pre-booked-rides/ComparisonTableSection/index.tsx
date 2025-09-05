"use client";
import React from 'react';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import BlurText from '../../../shared/BlurText';

const comparisonData = [
  {
    feature: 'Pricing',
    rideOn: 'Fixed & Guaranteed',
    onDemand: 'Surge Pricing',
  },
  {
    feature: 'Availability',
    rideOn: 'Confirmed in Advance',
    onDemand: 'Variable',
  },
  {
    feature: 'Driver',
    rideOn: 'Vetted Professional',
    onDemand: 'Varies',
  },
  {
    feature: 'Peace of Mind',
    rideOn: <CheckCircle2 className="h-6 w-6 text-green-500" strokeWidth={1.5} />,
    onDemand: <HelpCircle className="h-6 w-6 text-amber-500" strokeWidth={1.5} />,
  },
];

const ComparisonTableSection = () => {
  return (
    <section className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <BlurText as="span" className="mx-auto" text="The RideOn Difference" animateBy="words" direction="top" delay={120} />
          </h2>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400 text-center justify-center"
            text="A clear choice for professionals who value their time and peace of mind."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>
        <div className="mt-16 mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
            <div className="grid grid-cols-3 text-center font-semibold text-slate-900 dark:text-white bg-slate-100/70 dark:bg-slate-900/50">
              <div className="p-4 text-left">Feature</div>
              <div className="p-4 border-x border-slate-200/80 dark:border-slate-700/60">RideOn</div>
              <div className="p-4">On-Demand Apps</div>
            </div>
            <div className="text-sm sm:text-base">
              {comparisonData.map((row) => (
                <div key={row.feature} className="grid grid-cols-3 text-center text-slate-600 dark:text-slate-400">
                  <div className="p-4 text-left font-semibold text-slate-700 dark:text-slate-300 border-t border-slate-200/80 dark:border-slate-700/60">{row.feature}</div>
                  <div className={`p-4 flex justify-center items-center border-x border-slate-200/80 border-t dark:border-slate-700/60`}>
                    {row.rideOn}
                  </div>
                  <div className={`p-4 flex justify-center items-center border-t border-slate-200/80 dark:border-slate-700/60`}>
                    {row.onDemand}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTableSection;
