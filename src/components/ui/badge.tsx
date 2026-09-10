import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  outline: "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
