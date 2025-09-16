"use client";

import React from 'react';
import Image from 'next/image';
import BlurText from '../../../shared/BlurText';

type MissionSectionProps = Record<string, never>;

const MissionSection: React.FC<MissionSectionProps> = () => {
  return (
    <>
      {/* Hero Background Section */}
      <section className="relative py-24 sm:py-32 overflow-hidden min-h-[600px]">
        {/* Background Image */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.pexels.com/photos/15200595/pexels-photo-15200595.jpeg"
            alt="Professional transportation service in Nigeria"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70 -z-0"></div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              <BlurText
                as="span"
                text="Redefining Mobility in Nigeria,"
                animateBy="words"
                direction="top"
                delay={120}
              />
              <br />
              <BlurText
                as="span"
                text="One Professional Journey at a Time."
                animateBy="words"
                direction="top"
                delay={120}
              />
            </h1>
            <BlurText
              as="p"
              text="Join our community of professional drivers and be part of Nigeria's transportation revolution."
              className="mt-6 text-lg leading-8 text-slate-200 justify-center"
              animateBy="words"
              direction="top"
              delay={24}
            />
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="/drive-with-us"
                className="inline-flex items-center justify-center gap-2 rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30"
                style={{ backgroundColor: '#00529B' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <BlurText as="span" text="Drive With Us" animateBy="words" direction="top" delay={60} />
              </a>
              <a
                href="/services/pre-booked-rides"
                className="inline-flex items-center justify-center gap-2 rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/30"
                style={{ backgroundColor: '#10b981' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <BlurText as="span" text="Book a Ride" animateBy="words" direction="top" delay={60} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Mission and Vision Cards Section */}
      <section className="py-24 sm:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <BlurText as="span" text="Our Foundation" animateBy="words" direction="top" delay={120} />
            </h2>
            <BlurText
              as="p"
              className="mt-4 text-lg text-slate-600 dark:text-slate-400 justify-center"
              text="The principles that drive everything we do at RideOn Nigeria."
              animateBy="words"
              direction="top"
              delay={24}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Mission Card */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-2xl p-6 sm:p-8 lg:p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl mb-6">
                  <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">
                  <BlurText as="span" text="Our Mission" animateBy="words" direction="top" delay={120} />
                </h2>
                <BlurText
                  as="p"
                  className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed justify-center"
                  text="Our mission is to provide Nigeria's professionals and businesses with a mobility solution that is the gold standard in safety, reliability, and professionalism."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>
            </div>

            {/* Vision Card */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-2xl p-6 sm:p-8 lg:p-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-6">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">
                  <BlurText as="span" text="Our Vision" animateBy="words" direction="top" delay={120} />
                </h2>
                <BlurText
                  as="p"
                  className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed justify-center"
                  text="To be the most trusted name in premium, pre-booked transportation, empowering economic growth and building a community of respected drivers and satisfied clients."
                  animateBy="words"
                  direction="top"
                  delay={24}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default MissionSection;
