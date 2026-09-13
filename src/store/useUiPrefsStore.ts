"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Настройки интерфейса — отдельный стор от useProjectsStore: это не данные
// сметы, это личные предпочтения браузера (масштаб, тема, язык, плотность).
// Хранится под собственным ключом localStorage, чтобы не путать версии со
// сметными данными и не тянуть за собой их миграции.
// ---------------------------------------------------------------------------

export type FontScale = "sm" | "md" | "lg";
export type IconScale = "sm" | "md" | "lg";
export type Density = "compact" | "comfortable" | "spacious";
export type ThemePreference = "light" | "dark" | "system";
export type Locale = "ru" | "kz" | "en";
/**
 * Цветовая тема — задаёт только акцентный/брендовый цвет (шапка, HUD,
 * бейджи по умолчанию, активная вкладка), а не полную перекраску всего
 * интерфейса: семантические цвета (успех/предупреждение/долг-опасность)
 * остаются фиксированными независимо от темы — иначе теряется смысл.
 */
export type ColorTheme = "emerald" | "sky" | "violet" | "amber" | "teal";

export const FONT_SCALE_VALUES: Record<FontScale, number> = { sm: 0.9, md: 1, lg: 1.15 };
export const ICON_SCALE_VALUES: Record<IconScale, number> = { sm: 0.85, md: 1, lg: 1.2 };
export const COLOR_THEME_VALUES: ColorTheme[] = ["emerald", "sky", "violet", "amber", "teal"];

export interface UiPrefsState {
  fontScale: FontScale;
  iconScale: IconScale;
  density: Density;
  theme: ThemePreference;
  colorTheme: ColorTheme;
  locale: Locale;
  setFontScale: (v: FontScale) => void;
  setIconScale: (v: IconScale) => void;
  setDensity: (v: Density) => void;
  setTheme: (v: ThemePreference) => void;
  setColorTheme: (v: ColorTheme) => void;
  setLocale: (v: Locale) => void;
  reset: () => void;
}

const DEFAULTS = {
  fontScale: "md" as FontScale,
  iconScale: "md" as IconScale,
  density: "comfortable" as Density,
  theme: "system" as ThemePreference,
  colorTheme: "emerald" as ColorTheme,
  locale: "ru" as Locale,
};

/**
 * Применяет текущие настройки к <html> как data-атрибуты — синхронный источник
 * истины для CSS-правил в globals.css (data-theme/data-font-scale/
 * data-icon-scale/data-density) и для html[lang]. Вызывается и из стора при
 * каждом изменении, и из инлайн-скрипта в layout.tsx до гидратации (чтобы не
 * было мигания неверной темой/масштабом при загрузке).
 */
export function applyUiPrefsToDocument(prefs: {
  theme: ThemePreference;
  colorTheme: ColorTheme;
  fontScale: FontScale;
  iconScale: IconScale;
  density: Density;
  locale: Locale;
}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolvedDark =
    prefs.theme === "dark" ||
    (prefs.theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  root.setAttribute("data-theme", resolvedDark ? "dark" : "light");
  root.setAttribute("data-color-theme", prefs.colorTheme);
  root.setAttribute("data-font-scale", prefs.fontScale);
  root.setAttribute("data-icon-scale", prefs.iconScale);
  root.setAttribute("data-density", prefs.density);
  root.setAttribute("lang", prefs.locale === "kz" ? "kk" : prefs.locale === "en" ? "en" : "ru");
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setFontScale: (fontScale) => {
        set({ fontScale });
        applyUiPrefsToDocument({ ...get(), fontScale });
      },
      setIconScale: (iconScale) => {
        set({ iconScale });
        applyUiPrefsToDocument({ ...get(), iconScale });
      },
      setDensity: (density) => {
        set({ density });
        applyUiPrefsToDocument({ ...get(), density });
      },
      setTheme: (theme) => {
        set({ theme });
        applyUiPrefsToDocument({ ...get(), theme });
      },
      setColorTheme: (colorTheme) => {
        set({ colorTheme });
        applyUiPrefsToDocument({ ...get(), colorTheme });
      },
      setLocale: (locale) => {
        set({ locale });
        applyUiPrefsToDocument({ ...get(), locale });
      },
      reset: () => {
        set({ ...DEFAULTS });
        applyUiPrefsToDocument({ ...get(), ...DEFAULTS });
      },
    }),
    {
      name: "qazaqosi-ui-prefs-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
