import { useConfigurator } from "@/store/configurator";
import { kk } from "./kk";
import { ru, type Key } from "./ru";
import { zh } from "./zh";

export type Lang = "ru" | "kk" | "zh";
export type { Key };

export const LANGS: { id: Lang; label: string; html: string; locale: string }[] = [
  { id: "ru", label: "Рус", html: "ru", locale: "ru-RU" },
  { id: "kk", label: "Қаз", html: "kk", locale: "kk-KZ" },
  { id: "zh", label: "中文", html: "zh-CN", locale: "zh-CN" },
];

const DICTS: Record<Lang, Record<Key, string>> = { ru, kk, zh };

export type Vars = Record<string, string | number>;
export type T = (key: Key, vars?: Vars) => string;

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const s = DICTS[lang][key] ?? ru[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;
}

/** Translate a dynamic key (e.g. `product.${id}`), falling back to the raw id */
export function tryTranslate(lang: Lang, key: string): string {
  return (DICTS[lang] as Record<string, string>)[key] ?? (ru as Record<string, string>)[key] ?? key;
}

export function useT(): T & { lang: Lang; dyn: (key: string) => string } {
  const lang = useConfigurator((s) => s.lang);
  const t = ((key: Key, vars?: Vars) => translate(lang, key, vars)) as T & { lang: Lang; dyn: (key: string) => string };
  t.lang = lang;
  t.dyn = (key: string) => tryTranslate(lang, key);
  return t;
}

export const dictionaries = DICTS;
