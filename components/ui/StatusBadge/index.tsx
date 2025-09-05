import * as React from 'react';

export type StatusBadgeVariant =
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'in_progress'
  | 'verified';

export interface StatusBadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  variant: StatusBadgeVariant;
  label?: string;
  /** If true, shows a colored dot for non-verified variants */
  showDot?: boolean;
}

const VARIANT_STYLES: Record<Exclude<StatusBadgeVariant, 'verified'>, { container: string; dot: string; defaultLabel: string }> = {
  confirmed: {
    container: 'bg-blue-100/80 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
    dot: 'bg-blue-500 dark:bg-blue-400',
    defaultLabel: 'Confirmed',
  },
  completed: {
    container: 'bg-green-100/80 text-green-800 dark:bg-green-500/20 dark:text-green-200',
    dot: 'bg-green-500 dark:bg-green-400',
    defaultLabel: 'Completed',
  },
  cancelled: {
    container: 'bg-red-100/80 text-red-800 dark:bg-red-500/20 dark:text-red-200',
    dot: 'bg-red-500 dark:bg-red-400',
    defaultLabel: 'Cancelled',
  },
  in_progress: {
    container: 'bg-orange-100/80 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
    dot: 'bg-orange-500 dark:bg-orange-400',
    defaultLabel: 'In Progress',
  },
};

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}

/**
 * StatusBadge - a compact, rounded status label.
 *
 * Examples:
 *  <StatusBadge variant="confirmed" />
 *  <StatusBadge variant="completed" />
 *  <StatusBadge variant="cancelled" />
 *  <StatusBadge variant="in_progress" />
 *  <StatusBadge variant="verified" />
 */
const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ variant, label, showDot = true, className, children, ...rest }, ref) => {
    const base = 'inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium';

    if (variant === 'verified') {
      return (
        <span
          ref={ref}
          className={cx(base, 'bg-[#34A853] text-white shadow-sm dark:bg-[#34A853]/90', className)}
          {...rest}
        >
          {/* Inline SVG to avoid extra icon dependencies */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="-ms-0.5"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>{children ?? label ?? 'Verified'}</span>
        </span>
      );
    }

    const styles = VARIANT_STYLES[variant];

    return (
      <span
        ref={ref}
        className={cx(base, styles.container, className)}
        {...rest}
      >
        {showDot && <span className={cx('h-2 w-2 rounded-full', styles.dot)} />}
        <span>{children ?? label ?? styles.defaultLabel}</span>
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
