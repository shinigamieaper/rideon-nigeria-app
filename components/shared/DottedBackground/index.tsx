import React from 'react';

export interface DottedBackgroundProps extends React.ComponentPropsWithoutRef<'div'> {
  withGlow?: boolean;
  patternClassName?: string;
  glowClassName?: string;
}

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function DottedBackground({
  children,
  withGlow = true,
  className,
  patternClassName,
  glowClassName,
  ...rest
}: DottedBackgroundProps) {
  return (
    <div
      className={cx('relative isolate bg-background text-foreground min-h-screen', className)}
      {...rest}
    >
      <div
        aria-hidden
        className={cx(
          'pointer-events-none absolute inset-0 -z-10 h-full w-full',
          'bg-[radial-gradient(var(--color-gray-200)_1px,transparent_1px)]',
          'dark:bg-[radial-gradient(var(--color-slate-800)_1px,transparent_1px)]',
          '[background-size:16px_16px]',
          patternClassName
        )}
      />
      {withGlow && (
        <div
          aria-hidden
          className={cx(
            'absolute inset-0 -z-20',
            // Use brand token defined in globals.css: --brand-1: R G B
            'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgb(var(--brand-1)_/_0.20),transparent)]',
            glowClassName
          )}
        />
      )}
      {children}
    </div>
  );
}
