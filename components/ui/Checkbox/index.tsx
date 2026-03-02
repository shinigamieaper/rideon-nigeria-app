"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<
    React.ComponentPropsWithoutRef<"input">,
    "type" | "checked" | "onChange"
  > {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}

export default function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  onClick,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange(e.target.checked)}
      onClick={(e) => {
        onClick?.(e as any);
      }}
      className={cn(
        "h-4 w-4 rounded border border-slate-300 dark:border-slate-600",
        "bg-white dark:bg-slate-900",
        "accent-[#00529B] text-[#00529B] focus:ring-2 focus:ring-[#00529B]/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}
