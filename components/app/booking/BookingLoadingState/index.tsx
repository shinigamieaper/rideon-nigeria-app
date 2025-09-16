'use client';

import * as React from 'react';

export interface BookingLoadingStateProps extends React.ComponentPropsWithoutRef<'div'> {}

export default function BookingLoadingState({ className, ...props }: BookingLoadingStateProps) {
  return (
    <div
      className={[
        'fixed inset-0 z-50 bg-black/40 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center',
        className,
      ].join(' ')}
      aria-live="polite"
      aria-busy="true"
      {...props}
    >
      <div className="h-16 w-16 rounded-full border-4 border-white/60 border-t-[#00529B] animate-spin" aria-hidden />
      <span className="sr-only">Processing your booking…</span>
    </div>
  );
}
