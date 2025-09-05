"use client";

import React from 'react';
import { CalendarPlus, UserCheck, ShieldCheck, MapPin } from 'lucide-react';
import BlurText from '../../../shared/BlurText';

const HowItWorksSection = () => {
  return (
    <section className="relative py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/70 border-y border-slate-200/80 dark:border-slate-800 overflow-hidden">
      {/* Background aesthetic */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-blue-400/20 via-cyan-400/10 to-blue-400/0 blur-2xl dark:from-blue-600/20 dark:via-cyan-600/10" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/10 via-indigo-400/10 to-emerald-400/0 blur-2xl dark:from-sky-600/10 dark:via-indigo-600/10" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-12">
          {/* Left copy */}
          <div className="lg:col-span-4">
            <h2>
              <BlurText
                as="span"
                text="How It Works"
                className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
                animateBy="words"
                direction="top"
                delay={120}
              />
            </h2>
            <BlurText
              as="p"
              text="A simple, effortless process for guaranteed peace of mind."
              className="mt-4 text-lg leading-7 text-slate-600 dark:text-slate-400"
              animateBy="words"
              direction="top"
              delay={24}
            />
          </div>

          {/* Road map (desktop) */}
          <div className="relative lg:col-span-8">
            <div className="relative hidden h-[500px] w-full lg:block">
              <svg viewBox="0 0 1200 500" fill="none" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="roadGradient" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgb(6 182 212)" />
                    <stop offset="50%" stopColor="rgb(0 119 230)" />
                    <stop offset="100%" stopColor="rgb(6 182 212)" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Soft shadow path */}
                <path d="M 0 120 C 300 120, 350 380, 600 380 C 850 380, 900 120, 1200 120" stroke="rgb(0 119 230)" strokeOpacity="0.15" strokeWidth="14" strokeLinecap="round" />
                {/* Main gradient road */}
                <path id="roadPath" d="M 0 120 C 300 120, 350 380, 600 380 C 850 380, 900 120, 1200 120" stroke="url(#roadGradient)" strokeWidth="4" strokeLinecap="round" filter="url(#glow)" strokeDasharray="12 10">
                  <animate attributeName="stroke-dashoffset" values="0;22" dur="2.8s" repeatCount="indefinite" />
                </path>
              </svg>

              {/* Step markers (map pins) */}
              <div className="absolute left-[8%] top-[21%] text-blue-600 dark:text-blue-400">
                <MapPin className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <div className="absolute left-[50%] top-[73%] text-blue-600 dark:text-blue-400">
                <MapPin className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <div className="absolute left-[92%] top-[21%] text-blue-600 dark:text-blue-400">
                <MapPin className="h-8 w-8" strokeWidth={1.5} />
              </div>

              {/* Step cards */}
              <div className="absolute left-[2%] top-[-5%] w-[280px]">
                <div className="relative rounded-2xl bg-white/50 dark:bg-slate-800/50 p-4 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute -right-2 -top-2 text-6xl font-semibold text-slate-200/70 dark:text-slate-700/50 select-none">1</div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-slate-800 dark:text-slate-200">
                      <CalendarPlus className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                        <BlurText as="span" text="Schedule Your Ride" animateBy="words" direction="top" delay={120} />
                      </h3>
                      <BlurText
                        as="p"
                        className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                        text="Enter your pickup, destination, and desired time. Get a fixed, upfront price instantly."
                        animateBy="words"
                        direction="top"
                        delay={24}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute left-[35%] top-[85%] w-[300px]">
                <div className="relative rounded-2xl bg-white/50 dark:bg-slate-800/50 p-4 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute -right-2 -top-2 text-6xl font-semibold text-slate-200/70 dark:text-slate-700/50 select-none">2</div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-slate-800 dark:text-slate-200">
                      <UserCheck className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                        <BlurText as="span" text="Get Driver Details" animateBy="words" direction="top" delay={120} />
                      </h3>
                      <BlurText
                        as="p"
                        className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                        text="We assign a vetted, professional driver and send you their details in advance."
                        animateBy="words"
                        direction="top"
                        delay={24}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute left-[72%] top-[-5%] w-[280px]">
                <div className="relative rounded-2xl bg-white/50 dark:bg-slate-800/50 p-4 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute -right-2 -top-2 text-6xl font-semibold text-slate-200/70 dark:text-slate-700/50 select-none">3</div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-slate-800 dark:text-slate-200">
                      <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                        <BlurText as="span" text="Travel with Confidence" animateBy="words" direction="top" delay={120} />
                      </h3>
                      <BlurText
                        as="p"
                        className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                        text="Your driver arrives on time for a safe, professional, and comfortable journey."
                        animateBy="words"
                        direction="top"
                        delay={24}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile fallback: vertical cards */}
            <div className="lg:hidden">
              <div className="relative space-y-8">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/70 via-blue-500/60 to-cyan-400/70" />

                <div className="relative pl-12">
                  <div className="absolute -left-1 top-1.5 h-8 w-8 rounded-full bg-white/70 dark:bg-slate-800/70 ring-4 ring-slate-50 dark:ring-slate-900/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <CalendarPlus className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="rounded-2xl bg-white/50 dark:bg-slate-800/50 p-4 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-lg shadow-sm">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                      <BlurText as="span" text="1. Schedule Your Ride" animateBy="words" direction="top" delay={120} />
                    </h3>
                    <BlurText
                      as="p"
                      className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                      text="Enter your pickup, destination, and desired time. Get a fixed, upfront price instantly."
                      animateBy="words"
                      direction="top"
                      delay={24}
                    />
                  </div>
                </div>

                <div className="relative pl-12">
                  <div className="absolute -left-1 top-1.5 h-8 w-8 rounded-full bg-white/70 dark:bg-slate-800/70 ring-4 ring-slate-50 dark:ring-slate-900/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <UserCheck className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="rounded-2xl bg-white/50 dark:bg-slate-800/50 p-4 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-lg shadow-sm">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                      <BlurText as="span" text="2. Get Driver Details" animateBy="words" direction="top" delay={120} />
                    </h3>
                    <BlurText
                      as="p"
                      className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                      text="We assign a vetted driver and send you their details in advance."
                      animateBy="words"
                      direction="top"
                      delay={24}
                    />
                  </div>
                </div>

                <div className="relative pl-12">
                  <div className="absolute -left-1 top-1.5 h-8 w-8 rounded-full bg-white/70 dark:bg-slate-800/70 ring-4 ring-slate-50 dark:ring-slate-900/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="rounded-2xl bg-white/50 dark:bg-slate-800/50 p-4 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-lg shadow-sm">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                      <BlurText as="span" text="3. Travel with Confidence" animateBy="words" direction="top" delay={120} />
                    </h3>
                    <BlurText
                      as="p"
                      className="mt-1 text-sm text-slate-600 dark:text-slate-400"
                      text="Your driver arrives on time for a safe, professional, and comfortable journey."
                      animateBy="words"
                      direction="top"
                      delay={24}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

