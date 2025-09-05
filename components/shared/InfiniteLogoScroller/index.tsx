import * as React from 'react';

export interface InfiniteLogoScrollerProps extends React.ComponentPropsWithoutRef<'div'> {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  /** How many times to duplicate the provided images within a single lane (visual density). Default: 5 */
  duplicate?: number;
  /** Duration of one full marquee cycle in seconds. Default: 40 */
  durationSeconds?: number;
  /** Scroll direction */
  direction?: 'left' | 'right';
  /** Apply grayscale to logos by default (helps visual balance). Default: true */
  grayscale?: boolean;
  /** Whether to apply a gradient mask at edges. Default: true */
  masked?: boolean;
  /** Optional classes to apply to each <img> logo element (e.g., to control height). */
  imgClassName?: string;
}

/**
 * Server Component: Accessible, CSS-only infinite logo scroller.
 * - No client JS needed
 * - Content duplicated seamlessly for continuous marquee
 * - Accepts any local/public images
 */
export default function InfiniteLogoScroller({
  images,
  duplicate = 5,
  durationSeconds = 40,
  direction = 'left',
  grayscale = true,
  masked = true,
  className,
  style,
  imgClassName,
  ...props
}: InfiniteLogoScrollerProps) {
  const track = React.useMemo(() => {
    const out: typeof images = [];
    for (let i = 0; i < Math.max(1, duplicate); i += 1) {
      out.push(...images);
    }
    return out;
  }, [images, duplicate]);

  const maskStyle: React.CSSProperties = {
    maskImage: 'linear-gradient(to right, transparent 0%, white 10%, white 90%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, white 10%, white 90%, transparent 100%)',
  } as React.CSSProperties;

  return (
    <div
      className={[
        'w-full overflow-hidden',
        className,
      ].filter(Boolean).join(' ')}
      style={{ ...style, ...(masked ? maskStyle : undefined) }}
      {...props}
    >
      <div
        className="relative"
      >
        <div
          className="flex w-[200%] will-change-transform"
          style={{
            animation: `marquee ${durationSeconds}s linear infinite`,
            animationDirection: direction === 'right' ? 'reverse' : 'normal',
          }}
        >
          {/* Lane A */}
          <ul className="flex items-center gap-16 pr-16 min-w-full flex-shrink-0">
            {track.map((img, idx) => (
              <li key={`laneA-${idx}`} className="flex items-center">
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className={[
                    imgClassName ?? 'h-8 w-auto',
                    grayscale ? 'opacity-70 grayscale hover:opacity-100 transition-opacity' : 'opacity-100',
                  ].join(' ')}
                />
              </li>
            ))}
          </ul>

          {/* Lane B (duplicate, aria-hidden for a11y) */}
          <ul className="flex items-center gap-16 pr-16 min-w-full flex-shrink-0" aria-hidden="true">
            {track.map((img, idx) => (
              <li key={`laneB-${idx}`} className="flex items-center">
                <img
                  src={img.src}
                  alt=""
                  loading="lazy"
                  className={[
                    imgClassName ?? 'h-8 w-auto',
                    grayscale ? 'opacity-70 grayscale hover:opacity-100 transition-opacity' : 'opacity-100',
                  ].join(' ')}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
