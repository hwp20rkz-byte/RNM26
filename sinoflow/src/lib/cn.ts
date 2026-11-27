import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// text-display — наш размер шрифта из токенов; без этого twMerge принял бы его за цвет.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["display"] }] } },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
