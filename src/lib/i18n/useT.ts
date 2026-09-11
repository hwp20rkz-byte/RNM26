"use client";

import { useUiPrefsStore } from "@/store/useUiPrefsStore";
import { TRANSLATIONS, type TranslationKey } from "./translations";

/** Переводит ключи пилотного словаря (шапка + панель настроек) по текущему языку. */
export function useT() {
  const locale = useUiPrefsStore((s) => s.locale);
  return (key: TranslationKey) => TRANSLATIONS[locale][key] ?? TRANSLATIONS.ru[key];
}
