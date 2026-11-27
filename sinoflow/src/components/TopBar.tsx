"use client";

import { Headphones, LayoutDashboard, Moon, Presentation, RefreshCw, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/state/AppProvider";
import { TOUR_EVENT } from "@/components/NarratedDemoPlayer";

export function TopBar() {
  const { mode, setMode, theme, toggleTheme, rates, ratesStatus, refreshRates } = useApp();
  return (
    <header className="glass sticky top-0 z-30 border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 py-2 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="zh grid size-9 place-items-center rounded-xl bg-accent text-lg font-semibold text-white">源</span>
          <span className="font-display text-sm font-bold tracking-tight">SinoFlow AI</span>
        </div>

        <div role="tablist" aria-label="Режим" className="order-3 flex w-full rounded-xl border border-border bg-surface-2 p-1 sm:order-none sm:w-auto">
          {([
            ["prototype", "Прототип", LayoutDashboard],
            ["deck", "Презентация", Presentation],
          ] as const).map(([m, label, Icon]) => (
            <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)}
              className={cn("flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none", mode === m ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg")}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={refreshRates} title="Обновить курсы"
            className="hidden min-h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs md:inline-flex">
            <span className={cn("size-2 rounded-full", ratesStatus === "live" ? "bg-success" : ratesStatus === "loading" ? "bg-warning" : "bg-muted")} aria-hidden />
            <span className="num">
              $1 = {rates.perUsd.RUB.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽ · {rates.perUsd.KZT.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ₸ · {rates.perUsd.CNY.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} ¥
            </span>
            <span className="text-muted">{ratesStatus === "live" ? "ЦБ РФ" : ratesStatus === "loading" ? "загрузка" : "снимок"}</span>
            <RefreshCw className={cn("size-3.5 text-muted", ratesStatus === "loading" && "animate-spin")} />
          </button>
          <button type="button" onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-fg sm:min-h-9">
            <Headphones className="size-4" /> <span className="hidden sm:inline">Гид с озвучкой</span>
          </button>
          <button type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg sm:size-9">
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
