"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../Command";

export interface MultiSelectComboboxOption {
  value: string;
  label: string;
}

export interface MultiSelectComboboxProps
  extends React.ComponentPropsWithoutRef<"div"> {
  options: MultiSelectComboboxOption[];
  value: string[];
  onValueChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

export default function MultiSelectCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  disabled,
  className,
  ...props
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    const set = new Set(value);
    return options.filter((o) => set.has(o.value));
  }, [options, value]);

  const toggle = (v: string) => {
    const set = new Set(value);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onValueChange(Array.from(set));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange([]);
  };

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.map((s) => s.label).join(", ")
        : `${selected.length} selected`;

  return (
    <div className={cn("w-full", className)} {...props}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg px-4 py-2 text-sm",
              "text-slate-900 dark:text-slate-100",
              "shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#00529B]/40",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span
              className={cn(
                "truncate",
                selected.length === 0 && "text-slate-500 dark:text-slate-400",
              )}
            >
              {summary}
            </span>
            <span className="flex items-center gap-2">
              {selected.length > 0 && (
                <span
                  className="inline-flex h-6 items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200"
                  aria-label={`${selected.length} selected`}
                >
                  {selected.length}
                </span>
              )}
              {selected.length > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={clearAll}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      clearAll(e as unknown as React.MouseEvent);
                    }
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4 opacity-70" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 opacity-70" />
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const isSelected = value.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => toggle(opt.value)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-[#00529B]" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={s.value}
              className="inline-flex items-center gap-1 rounded-full bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 px-3 py-1 text-xs text-slate-700 dark:text-slate-200"
            >
              {s.label}
              <button
                type="button"
                onClick={() => toggle(s.value)}
                className="rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`Remove ${s.label}`}
              >
                <X className="h-3 w-3 opacity-70" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
