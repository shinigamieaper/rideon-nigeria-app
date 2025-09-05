import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import InfiniteLogoScroller from '../../../shared/InfiniteLogoScroller';
import BlurText from '../../../shared/BlurText';

export interface CorporateHeroSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  /** Background image URL for the hero */
  backgroundImageUrl?: string;
  /** CTA link target (anchor to lead form on the page) */
  ctaHref?: string;
  /** Optional logos for the scroller; falls back to a sensible default from /public */
  logos?: Array<{ src: string; alt: string }>;
}

/**
 * Server Component: Corporate Hero Section
 * - Ken-burns style animated background (matches homepage hero via .animate-zoom)
 * - Word-by-word animated headline using the existing .animate-in utility
 * - Accessible, CSS-only InfiniteLogoScroller directly below CTA
 */
export default function HeroSection({
  backgroundImageUrl = 'https://images.pexels.com/photos/4928607/pexels-photo-4928607.jpeg?auto=compress&cs=tinysrgb&w=2560&q=80',
  ctaHref = '/solutions/corporate#lead-form',
  logos,
  className,
  ...rest
}: CorporateHeroSectionProps) {
  const headline = ['The', 'All-in-One', 'Mobility', 'Platform', 'for', 'Your', 'Business.'];

  const defaultLogos: Array<{ src: string; alt: string }> = [
    { src: '/dell.png', alt: 'Dell' },
    { src: '/hp.png', alt: 'HP' },
    { src: '/d-link.png', alt: 'D-Link' },
    { src: '/kersperskey.png', alt: 'Kaspersky' },
    { src: '/vercel.svg', alt: 'Vercel' },
    { src: '/next.svg', alt: 'Next.js' },
    { src: '/globe.svg', alt: 'Globe' },
    { src: '/file.svg', alt: 'File' },
    { src: '/window.svg', alt: 'Windows' },
  ];

  const usedLogos = logos && logos.length > 0 ? logos : defaultLogos;

  type CSSVars = React.CSSProperties & {
    '--tw-enter-opacity'?: string | number;
    '--tw-enter-translate-y'?: string;
    '--tw-enter-blur'?: string | number;
  };

  const enterVars: CSSVars = {
    '--tw-enter-opacity': '0',
    '--tw-enter-translate-y': '1rem',
    '--tw-enter-blur': '8px',
  };

  return (
    <section
      className={['relative isolate overflow-hidden py-24 sm:py-32 lg:py-40', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* Background image with ken-burns-like zoom (uses .animate-zoom from globals.css) */}
      <div className="absolute inset-0 -z-20">
        <Image
          src={backgroundImageUrl}
          alt="Corporate mobility background"
          fill
          className="object-cover animate-zoom"
          sizes="100vw"
          priority={false}
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-slate-950/70 dark:bg-slate-950/80" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
          <BlurText
            as="span"
            text={headline.join(' ')}
            animateBy="words"
            direction="top"
            delay={100}
          />
        </h1>

        <BlurText
          as="p"
          className="mt-6 max-w-3xl mx-auto text-lg sm:text-xl text-slate-300"
          text="Manage employee travel, control costs, and source vetted executive drivers—all with one trusted partner."
          animateBy="words"
          direction="top"
          delay={24}
        />

        <div
          className="mt-10 flex items-center justify-center gap-x-6 animate-in"
          style={{ ...enterVars, animationDelay: '900ms' }}
        >
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-md text-base font-semibold text-white py-3 px-6 shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00529B]"
            style={{ backgroundColor: '#00529B' }}
          >
            Request a Demo
          </Link>
        </div>

        <div className="mt-16 sm:mt-20 w-full relative z-20">
          <BlurText
            as="p"
            className="text-sm sm:text-base font-medium text-slate-200 uppercase tracking-wide text-center"
            text="Trusted by businesses of all sizes"
            animateBy="words"
            direction="top"
            delay={24}
          />
          <div className="mt-3 bg-white/5 rounded-lg ring-1 ring-white/10">
            <InfiniteLogoScroller
              images={usedLogos}
              duplicate={5}
              durationSeconds={40}
              direction="left"
              grayscale={false}
              masked={false}
              className="py-8 min-h-[64px]"
              imgClassName="h-10 w-auto brightness-0 invert contrast-200"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
