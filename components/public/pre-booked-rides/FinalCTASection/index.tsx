"use client";
import React from 'react';
import Link from 'next/link';
import BlurText from '../../../shared/BlurText';

const FinalCTASection = () => {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            <BlurText as="span" text="Ready for a better way to travel in Lagos?" animateBy="words" direction="top" delay={120} />
          </h2>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/register/customer"
              className="inline-flex items-center justify-center rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30"
              style={{ backgroundColor: '#00529B' }}
            >
              <BlurText as="span" text="Sign Up and Book Your First Ride" animateBy="words" direction="top" delay={60} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;

