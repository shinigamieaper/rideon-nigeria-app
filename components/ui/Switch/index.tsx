"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ComponentPropsWithoutRef<"button"> {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function Switch({
  checked,
  onCheckedChange,
  disabled,
  size = "md",
  className,
  onClick,
  ...props
}: SwitchProps) {
  const sizes = {
    sm: { track: "h-5 w-8", thumb: "h-3.5 w-3.5", translate: "translate-x-3" },
    md: { track: "h-6 w-11", thumb: "h-4 w-4", translate: "translate-x-5" },
  } as const;

  const s = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      className={cn(
        "inline-flex items-center rounded-full transition-colors duration-200",
        "bg-slate-300 dark:bg-slate-700",
        checked && "bg-[#00529B] dark:bg-[#00529B]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        s.track,
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "ml-1 inline-block rounded-full bg-white shadow-sm transition-transform duration-200",
          s.thumb,
          checked && s.translate,
        )}
      />
    </button>
  );
}
