import * as React from 'react';

// Input props extend all native input attributes and add an optional error string
export interface InputProps extends React.ComponentPropsWithoutRef<'input'> {
  error?: string;
}

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}

const baseClasses =
  'block w-full rounded-lg px-4 py-2 text-sm transition-colors duration-200 ' +
  'bg-slate-100 text-slate-900 placeholder:text-slate-400 ' +
  'dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 ' +
  'border focus:outline-none '
  ;

const focusClasses =
  'focus:border-[#00529B] focus:ring-2 focus:ring-[#00529B]/40 ' +
  'dark:focus:border-[#00529B] dark:focus:ring-[#00529B]/50';

const errorClasses =
  'border-red-500 focus:ring-4 focus:ring-red-500/20 dark:focus:ring-red-500/30';

const disabledClasses =
  'cursor-not-allowed text-slate-500 bg-slate-200 dark:text-slate-400 dark:bg-slate-800/50';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, disabled, ...props }, ref) => {
    const isError = typeof error === 'string' && error.trim().length > 0;

    // Determine if the input is controlled by presence of 'value' prop
    const isControlled = Object.prototype.hasOwnProperty.call(props, 'value');
    // Normalize value when controlled so it never flips to undefined
    const valueProp = (props as { value?: string | number | readonly string[] | undefined }).value;
    const normalizedValue = isControlled ? (valueProp ?? '') : undefined;

    return (
      <div className="w-full">
        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={isError || undefined}
          aria-describedby={isError ? `${props.id || 'input'}-error` : undefined}
          className={cx(
            baseClasses,
            !isError && 'border-slate-300 dark:border-slate-700',
            !disabled && !isError && focusClasses,
            isError && errorClasses,
            disabled && disabledClasses,
            'rounded-lg border',
            className,
          )}
          // Preserve controlled vs uncontrolled for component lifetime
          {...(isControlled ? { ...(props as Omit<InputProps, 'value'>), value: normalizedValue } : props)}
        />
        {isError && (
          <p
            id={`${props.id || 'input'}-error`}
            role="alert"
            className="mt-1.5 text-xs text-red-600"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
