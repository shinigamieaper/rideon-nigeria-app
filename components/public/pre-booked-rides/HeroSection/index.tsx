"use client";
import React from 'react';
import Image from 'next/image';
import BlurText from '../../../shared/BlurText';

interface HeroSectionProps {
  children: React.ReactNode;
}

const HeroSection: React.FC<HeroSectionProps> = ({ children }) => {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden min-h-[600px]">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.pexels.com/photos/13801866/pexels-photo-13801866.jpeg"
          alt="A bustling street scene in Nigeria with yellow buses."
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
              text="The End of 'Maybe'."
              animateBy="words"
              direction="top"
              delay={120}
            />
            <br />
            <BlurText
              as="span"
              text="The Beginning of 'Guaranteed'."
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h1>
          <BlurText
            as="p"
            text="For airport transfers, important meetings, and every trip that matters. Book your RideOn car in advance and travel with complete confidence."
            className="mt-6 text-lg leading-8 text-slate-200"
            animateBy="words"
            direction="top"
            delay={24}
          />
        </div>

        {/* Children container for the PriceEstimationWidget */}
        <div className="mt-12">
          {children}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

