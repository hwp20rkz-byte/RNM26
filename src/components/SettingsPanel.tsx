"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/useT";
import {
  useUiPrefsStore,
  type Density,
  type FontScale,
  type IconScale,
  type Locale,
  type ThemePreference,
} from "@/store/useUiPrefsStore";

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>}
    </div>
  );
}

function SegGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === v
              ? "bg-white text-slate-900 shadow dark:bg-slate-950 dark:text-slate-50"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel() {
  const t = useT();
  const fontScale = useUiPrefsStore((s) => s.fontScale);
  const iconScale = useUiPrefsStore((s) => s.iconScale);
  const density = useUiPrefsStore((s) => s.density);
  const theme = useUiPrefsStore((s) => s.theme);
  const locale = useUiPrefsStore((s) => s.locale);
  const setFontScale = useUiPrefsStore((s) => s.setFontScale);
  const setIconScale = useUiPrefsStore((s) => s.setIconScale);
  const setDensity = useUiPrefsStore((s) => s.setDensity);
  const setTheme = useUiPrefsStore((s) => s.setTheme);
  const setLocale = useUiPrefsStore((s) => s.setLocale);
  const reset = useUiPrefsStore((s) => s.reset);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          title={t("settingsButton")}
          aria-label={t("settingsButton")}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <div className="flex items-start gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
            <SettingsIcon className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div className="min-w-0 pr-6">
            <DialogTitle>{t("settingsTitle")}</DialogTitle>
            <DialogDescription>{t("settingsSubtitle")}</DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <Section label={t("fontSizeLabel")}>
            <SegGroup<FontScale>
              value={fontScale}
              onChange={setFontScale}
              options={[
                ["sm", t("sizeSm")],
                ["md", t("sizeMd")],
                ["lg", t("sizeLg")],
              ]}
            />
          </Section>

          <Section label={t("iconSizeLabel")}>
            <SegGroup<IconScale>
              value={iconScale}
              onChange={setIconScale}
              options={[
                ["sm", t("iconSm")],
                ["md", t("iconMd")],
                ["lg", t("iconLg")],
              ]}
            />
          </Section>

          <Section label={t("densityLabel")} hint={t("densityHint")}>
            <SegGroup<Density>
              value={density}
              onChange={setDensity}
              options={[
                ["compact", t("densityCompact")],
                ["comfortable", t("densityComfortable")],
                ["spacious", t("densitySpacious")],
              ]}
            />
          </Section>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          <Section label={t("themeLabel")}>
            <SegGroup<ThemePreference>
              value={theme}
              onChange={setTheme}
              options={[
                ["light", t("themeLight")],
                ["dark", t("themeDark")],
                ["system", t("themeSystem")],
              ]}
            />
          </Section>

          <Section label={t("languageLabel")} hint={t("languageHint")}>
            <SegGroup<Locale>
              value={locale}
              onChange={setLocale}
              options={[
                ["ru", "РУС"],
                ["kz", "ҚАЗ"],
                ["en", "ENG"],
              ]}
            />
          </Section>

          <button
            type="button"
            onClick={reset}
            className="w-fit text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {t("resetButton")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
