import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const kztFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatKzt(value: number): string {
  return `${kztFormatter.format(Math.round(value))} ₸`;
}

export function formatKztPrecise(value: number, digits = 2): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
