import * as React from 'react';

export interface PhoneMockupProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Additional className for the outer wrapper */
  className?: string;
  /** ClassName applied on the inner screen container */
  screenClassName?: string;
  /** Optional inline style to tweak drop-shadows, etc. */
  style?: React.CSSProperties;
}

/**
 * Server Component: PhoneMockup
 *
 * A reusable phone frame that renders any children inside a rounded screen.
 * Designed to match the corporate design reference and be theme-aware via Tailwind's dark: variants.
 */
export default function PhoneMockup({ className, screenClassName, style, children, ...rest }: PhoneMockupProps) {
  return (
    <div
      className={[
        'relative mx-auto w-[300px] h-[600px] sm:w-[350px] sm:h-[700px] transition-all',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        filter:
          'drop-shadow(0 20px 25px rgba(0, 82, 155, 0.15)) drop-shadow(0 0px 30px rgba(0, 82, 155, 0.20))',
        ...style,
      }}
      {...rest}
    >
      <div className="w-full h-full bg-slate-900 border-4 border-slate-700 dark:border-slate-800 rounded-[48px] p-2">
        <div className={['w-full h-full bg-slate-950 rounded-[40px] overflow-hidden relative', screenClassName].filter(Boolean).join(' ')}>
          {children}
        </div>
      </div>
    </div>
  );
}

export interface PhoneScreenMediaProps {
  /** Source to render when in light mode */
  lightSrc: string;
  /** Optional source to render when in dark mode; falls back to lightSrc if omitted */
  darkSrc?: string;
  /** Media type: defaults to image */
  type?: 'image' | 'video';
  /** Alt text for images */
  alt?: string;
  /** For video */
  poster?: string;
  /** Additional classes for the media element */
  className?: string;
  /** Video props */
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

/**
 * Server Component helper: PhoneScreenMedia
 *
 * Renders either an <img> or <video> and switches sources using Tailwind dark: variants.
 */
export function PhoneScreenMedia({
  lightSrc,
  darkSrc,
  type = 'image',
  alt = '',
  poster,
  className,
  autoPlay,
  loop,
  muted,
  controls,
}: PhoneScreenMediaProps) {
  const baseClass = ['h-full w-full object-cover', className].filter(Boolean).join(' ');

  if (type === 'video') {
    if (darkSrc) {
      return (
        <>
          <video
            className={['block dark:hidden', baseClass].join(' ')}
            src={lightSrc}
            poster={poster}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            controls={controls}
          />
          <video
            className={['hidden dark:block', baseClass].join(' ')}
            src={darkSrc}
            poster={poster}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            controls={controls}
          />
        </>
      );
    }
    return (
      <video
        className={baseClass}
        src={lightSrc}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
      />
    );
  }

  // image
  if (darkSrc) {
    return (
      <>
        <img className={['block dark:hidden', baseClass].join(' ')} src={lightSrc} alt={alt} />
        <img className={['hidden dark:block', baseClass].join(' ')} src={darkSrc} alt={alt} />
      </>
    );
  }
  return <img className={baseClass} src={lightSrc} alt={alt} />;
}
