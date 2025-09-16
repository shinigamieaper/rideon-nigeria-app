"use client";
import React from 'react';
import { Plane, Briefcase, PartyPopper } from 'lucide-react';
import BlurText from '../../../shared/BlurText';

const useCases = [
  {
    icon: <Plane className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Airport Transfers',
    description: 'Start and end your travels stress-free. No last-minute scrambling for a ride or worrying about surge pricing.',
    iconBgColor: 'bg-green-100 dark:bg-green-950/50',
    iconTextColor: 'text-green-600 dark:text-green-400',
  },
  {
    icon: <Briefcase className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Business Meetings',
    description: 'Arrive prepared, punctual, and composed. No uncertainty, just a ride you can count on every time.',
    iconBgColor: 'bg-blue-100 dark:bg-blue-950/50',
    iconTextColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: <PartyPopper className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Events & Special Occasions',
    description: 'When it matters most, leave nothing to chance. Get there and back smoothly with a scheduled ride.',
    iconBgColor: 'bg-rose-100 dark:bg-rose-950/50',
    iconTextColor: 'text-rose-600 dark:text-rose-400',
  },
];

const UseCaseGallerySection = () => {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <BlurText as="span" text="Perfect For Every Important Journey" animateBy="words" direction="top" delay={120} />
          </h2>
          <BlurText
            as="p"
            className="mt-4 text-lg text-slate-600 dark:text-slate-400 mx-auto text-center justify-center"
            text="See how RideOn fits seamlessly into your life's most important moments."
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className={`flex flex-col overflow-hidden rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg shadow-lg border border-slate-200/80 dark:border-slate-700/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out`}
            >
              <div className="flex-shrink-0 p-8 flex items-center gap-4 border-b border-slate-200/80 dark:border-slate-700/60">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${useCase.iconBgColor} ${useCase.iconTextColor}`}>
                  {useCase.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  <BlurText as="span" text={useCase.title} animateBy="words" direction="top" delay={120} />
                </h3>
              </div>
              <div className="flex flex-1 flex-col justify-between p-8 pt-6">
                <BlurText as="p" className="text-base text-slate-600 dark:text-slate-400" text={useCase.description} animateBy="words" direction="top" delay={24} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCaseGallerySection;
