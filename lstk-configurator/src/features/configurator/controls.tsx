"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

const fmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  const [text, setText] = useState(fmt.format(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(fmt.format(value));
  }, [value, focused]);
  // Commit on blur/Enter only: regenerating a truss on every keystroke of "12000" would
  // build trusses with spans 1, 12, 120 … on the way
  const commit = () => {
    const v = Number(text.replace(/[\s  ]/g, "").replace(",", "."));
    if (Number.isFinite(v)) {
      const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Math.round(v / step) * step));
      onChange(clamped);
      setText(fmt.format(clamped));
    } else setText(fmt.format(value));
  };
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm text-ink-mute">
        {label}
      </label>
      <div className="flex h-11 items-center rounded-lg border border-line bg-surface focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-base tabular-nums outline-none"
          value={text}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onChange={(e) => setText(e.target.value)}
        />
        {unit && <span className="pr-2 text-sm text-ink-mute">{unit}</span>}
      </div>
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; group?: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  const groups = [...new Set(options.map((o) => o.group ?? ""))];
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm text-ink-mute">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-11 rounded-lg border border-line bg-surface px-2 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options
                .filter((o) => o.group === g)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ) : (
            options
              .filter((o) => !o.group)
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
          ),
        )}
      </select>
    </div>
  );
}

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm text-ink-mute">{legend}</legend>
      <div className="flex flex-wrap gap-1 rounded-lg bg-sunken p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={`relative flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
              o.value === value ? "bg-surface font-semibold text-primary shadow-sm" : "text-ink-mute"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[hsl(var(--primary))]" />
      {label}
    </label>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "ghost";
  title?: string;
}) {
  const styles = {
    default: "border border-line bg-surface hover:bg-sunken",
    primary: "border border-primary bg-primary text-surface hover:opacity-90",
    ghost: "text-primary hover:bg-primary-soft",
  }[variant];
  return (
    <button type="button" title={title} onClick={onClick} className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${styles}`}>
      {children}
    </button>
  );
}

export function Range({ label, value, onChange, min = 0, max = 1, step = 0.01 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="shrink-0 text-sm text-ink-mute">
        {label}
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full accent-[hsl(var(--primary))]" />
    </div>
  );
}
