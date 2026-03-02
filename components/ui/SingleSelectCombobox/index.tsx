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

export interface SingleSelectComboboxOption {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
}

export interface SingleSelectComboboxProps
  extends React.ComponentPropsWithoutRef<"div"> {
  options: SingleSelectComboboxOption[];
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export default function SingleSelectCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  disabled,
  allowClear = true,
  className,
  ...props
}: SingleSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  );

  const clear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange("");
  };

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
                !selected && "text-slate-500 dark:text-slate-400",
              )}
            >
              {selected ? selected.label : placeholder}
            </span>
            <span className="flex items-center gap-2">
              {allowClear && value && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={clear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      clear(e as unknown as React.MouseEvent);
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
                  const isSelected = opt.value === value;
                  const searchValue =
                    `${opt.label} ${opt.keywords || ""}`.trim();
                  return (
                    <CommandItem
                      key={opt.value}
                      value={searchValue}
                      onSelect={() => {
                        onValueChange(opt.value);
                        setOpen(false);
                      }}
                      disabled={opt.disabled}
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
    </div>
  );
}
