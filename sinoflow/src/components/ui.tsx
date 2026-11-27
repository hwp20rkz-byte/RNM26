"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { currencySymbol, formatMoney } from "@/lib/currencyEngine";
import { useApp } from "@/state/AppProvider";
import { CURRENCIES, type CurrencyCode, type MultiCurrencyAmount } from "@/types/sourcing";

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-border bg-surface shadow-card", className)} {...p} />;
}

/** Секция дашборда с якорем для гида. */
export const Section = forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & { tourId: string }>(function Section(
  { tourId, className, ...p },
  ref,
) {
  const { focusId } = useApp();
  return (
    <section
      ref={ref}
      id={tourId}
      data-tour-focus={focusId === tourId ? "true" : undefined}
      className={cn("scroll-mt-24", className)}
      {...p}
    />
  );
});

export function SectionHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        {eyebrow && <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-balance">{title}</h2>
      </div>
      {right}
    </div>
  );
}

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "accent";
const TONE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent",
};

export function Badge({ tone = "neutral", className, children, icon }: { tone?: Tone; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "success";
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }>(
  function Button({ variant = "secondary", size = "md", className, ...p }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          size === "md" ? "min-h-11 px-4 text-sm" : "min-h-9 px-3 text-xs",
          variant === "primary" && "bg-primary text-primary-fg hover:bg-primary/90",
          variant === "secondary" && "border border-border bg-surface text-fg hover:bg-surface-2",
          variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
          variant === "success" && "bg-success text-white hover:bg-success/90 dark:text-bg",
          className,
        )}
        {...p}
      />
    );
  },
);

/** Сумма сразу в четырёх валютах: выбранная — крупно, остальные — строкой ниже. */
export function MoneyQuad({ amount, primary, size = "md", className }: { amount: MultiCurrencyAmount; primary?: CurrencyCode; size?: "md" | "lg"; className?: string }) {
  const { displayCurrency } = useApp();
  const main = primary ?? displayCurrency;
  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn("num font-semibold tracking-tight", size === "lg" ? "text-display" : "text-lg")}>{formatMoney(amount[main], main)}</div>
      <div className="num mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {CURRENCIES.filter((c) => c !== main).map((c) => (
          <span key={c}>{formatMoney(amount[c], c)}</span>
        ))}
      </div>
    </div>
  );
}

export function CurrencySwitch({ className }: { className?: string }) {
  const { displayCurrency, setDisplayCurrency } = useApp();
  return (
    <div role="group" aria-label="Валюта отображения" className={cn("inline-flex rounded-xl border border-border bg-surface-2 p-1", className)}>
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={displayCurrency === c}
          onClick={() => setDisplayCurrency(c)}
          className={cn(
            "num min-h-9 min-w-11 rounded-lg px-2 text-sm font-semibold transition-colors",
            displayCurrency === c ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {currencySymbol(c)}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-surface-2 text-muted">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted">{hint}</p>
    </div>
  );
}
