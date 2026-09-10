"use client";

import { cn } from "@/lib/utils";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  step?: number;
  error?: string;
  hint?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = 1,
  error,
  hint,
}: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="relative">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          step={step}
          onChange={(e) => onChange(e.target.valueAsNumber || 0)}
          className={cn(
            "h-9 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900 dark:text-slate-100",
            error ? "border-rose-400" : "border-slate-300 dark:border-slate-700",
            suffix && "pr-10",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <span className="text-xs text-rose-500">{error}</span>
      ) : hint ? (
        <span className="text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}
