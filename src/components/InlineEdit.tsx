"use client";

import { cn } from "@/lib/utils";

export function InlineNumber({
  value,
  onChange,
  className,
  step = 1,
  title,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: number;
  title?: string;
}) {
  return (
    <input
      type="number"
      title={title}
      defaultValue={value}
      step={step}
      onChange={(e) => {
        const v = e.target.valueAsNumber;
        if (Number.isFinite(v)) onChange(v);
      }}
      className={cn(
        "h-7 rounded-md border border-transparent bg-transparent px-1.5 text-right text-sm tabular-nums text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-emerald-500 focus:bg-white dark:text-slate-200 dark:hover:border-slate-700 dark:focus:bg-slate-900",
        className,
      )}
    />
  );
}

export function InlineText({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-7 rounded-md border border-transparent bg-transparent px-1.5 text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-emerald-500 focus:bg-white dark:text-slate-200 dark:hover:border-slate-700 dark:focus:bg-slate-900",
        className,
      )}
    />
  );
}
