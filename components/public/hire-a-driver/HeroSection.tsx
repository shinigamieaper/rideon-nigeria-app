import Image from 'next/image';
import Link from 'next/link';
import { FC } from 'react';
import BlurText from '../../shared/BlurText';

const HeroSection: FC = () => {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <Image
        src="https://media.istockphoto.com/id/1317866925/photo/happy-african-american-businessman-driving-his-car.jpg?b=1&s=612x612&w=0&k=20&c=OLeYMLF_4xziwzgCl3uzLRqTDlBVwtR7LMzt7mRMuPs="
        alt="A professional driver in uniform standing next to a luxury black car."
        layout="fill"
        objectFit="cover"
        className="absolute inset-0 h-full w-full"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70"></div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            <BlurText
              as="span"
              className="block"
              text="The Right Driver."
              animateBy="words"
              direction="top"
              delay={120}
            />
            <BlurText
              as="span"
              className="block"
              text="Without the Risk."
              animateBy="words"
              direction="top"
              delay={120}
            />
          </h1>
          <BlurText
            as="p"
            className="mt-6 text-lg leading-8 text-slate-200"
            text="Access a marketplace of professionally vetted, fully compliant drivers ready for long-term placement. We handle the HR, you enjoy the peace of mind."
            animateBy="words"
            direction="top"
            delay={24}
          />
          <div
            className="mt-10 flex items-center justify-center gap-x-6 animate-in"
            style={{ '--tw-enter-opacity': '0', '--tw-enter-translate-y': '1rem', '--tw-enter-blur': '8px', animationDelay: '900ms' } as React.CSSProperties}
          >
            <Link
              href="/services/hire-a-driver/browse"
              className="inline-flex items-center justify-center rounded-lg text-base font-semibold text-white h-12 px-8 transition-all duration-300 ease-in-out hover:opacity-90 hover:scale-105 active:scale-100 shadow-lg shadow-blue-500/20 dark:shadow-blue-500/30"
              style={{ backgroundColor: '#00529B' }}
            >
              <BlurText as="span" text="Browse Available Drivers" animateBy="words" direction="top" delay={60} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

