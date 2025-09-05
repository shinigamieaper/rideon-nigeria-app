import * as React from 'react';

// Variants supported by the Button component
export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

// Button props extend all native button attributes
export interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}

const baseClasses =
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 '
  + 'transition-all duration-200 ease-out transform-gpu '
  + 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00529B]/40 dark:focus-visible:ring-[#00529B]/50 '
  + 'disabled:opacity-50 disabled:cursor-not-allowed '
  + 'backdrop-blur-md overflow-hidden '
  + 'shadow-lg hover:shadow-xl active:shadow-md hover:-translate-y-[1px] active:translate-y-0 '
  + 'shadow-slate-900/10 dark:shadow-black/40';

const variantClasses: Record<ButtonVariant, string> = {
  // Slightly translucent backgrounds with soft borders and subtle inner light for glass effect
  primary:
    'bg-[#00529B]/90 text-white hover:bg-[#004785]/90 border border-white/20 dark:border-white/10 '
    + 'shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
  secondary:
    'bg-white/30 text-[#00529B] hover:bg-white/40 border border-[#00529B]/40 '
    + 'dark:bg-white/10 dark:hover:bg-white/20 dark:text-[#00529B] dark:border-[#00529B]/40 '
    + 'shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]',
  destructive:
    'bg-red-600/90 text-white hover:bg-red-700/90 border border-white/20 dark:border-white/10 '
    + 'shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', isLoading = false, disabled, className, children, type = 'button', ...props }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cx(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {/* Glossy highlight overlay for glass effect */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent dark:from-white/20"
        />
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        <span className={cx('relative', isLoading && 'opacity-0')}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
