import * as React from 'react';

export interface CardProps extends React.ComponentPropsWithoutRef<'div'> {
  className?: string;
  children?: React.ReactNode;
}

const baseClass = [
  'relative',
  'w-full',
  'rounded-lg',
  // Glass background tuned for light and dark
  'bg-white/60 dark:bg-white/10',
  'p-6',
  'shadow-lg',
  // Softer shadow in light, stronger in dark
  'shadow-slate-900/5 dark:shadow-slate-950/30',
  'ring-1',
  // Subtle ring in light, bright in dark
  'ring-slate-900/10 dark:ring-white/20',
  'backdrop-blur-xl',
  'backdrop-saturate-150',
].join(' ');

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    const classes = [baseClass, className].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {/* Subtle inner highlight to enhance glass feel */}
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/80 via-white/40 to-transparent opacity-90 dark:from-white/30 dark:via-white/10 dark:opacity-80" />

        {/* Content */}
        <div className="relative">{children}</div>

        {/* Soft outer glow */}
        <div className="pointer-events-none absolute -inset-px -z-10 rounded-[0.625rem] bg-gradient-to-br from-cyan-300/20 via-fuchsia-300/10 to-indigo-400/20 blur-xl" />
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
export type { CardProps as TCardProps };
