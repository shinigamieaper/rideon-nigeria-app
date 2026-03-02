"use client";

import * as React from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive";

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

const base =
  "inline-flex items-center justify-center rounded-md px-4 h-10 text-sm font-semibold transition-all shadow";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#00529B] text-white shadow-lg shadow-blue-900/30 hover:opacity-90 disabled:opacity-60",
  secondary:
    "bg-white/60 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 shadow hover:bg-white/70 dark:hover:bg-slate-800/80",
  destructive:
    "bg-red-600 text-white shadow-lg shadow-red-900/30 hover:opacity-90 disabled:opacity-60",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cx(base, variants[variant], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export default Button;
