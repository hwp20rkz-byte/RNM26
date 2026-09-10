"use client";

import { Home as HomeIcon, ListTree } from "lucide-react";
import { StickyHud } from "@/components/StickyHud";
import { BuildingProfileForm } from "@/components/BuildingProfileForm";
import { CostCategoryTree } from "@/components/CostCategoryTree";
import { ScenarioComparator } from "@/components/ScenarioComparator";
import { BudgetCharts } from "@/components/charts/BudgetCharts";
import { ExportBar } from "@/components/ExportBar";
import { PrintSummary } from "@/components/PrintSummary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="no-print mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-slate-900 p-2 dark:bg-white">
          <HomeIcon className="h-5 w-5 text-white dark:text-slate-900" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            QazaqOSI — Тарифный калькулятор сметы ОСИ / ПТ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Расчёт по Методике МИИР РК №166 и Закону «О жилищных отношениях»
          </p>
        </div>
      </header>

      <StickyHud />

      <div className="no-print flex flex-col gap-6">
        <BuildingProfileForm />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListTree className="h-5 w-5 text-emerald-600" />
              <CardTitle>Шаг 2. Конструктор статей расходов</CardTitle>
            </div>
            <CardDescription>
              Включайте/отключайте статьи, переключайте штат/аутсорс, наводите на ⓘ для
              технологической карты. Итог по каждой позиции — ежемесячный вклад в тариф.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CostCategoryTree />
          </CardContent>
        </Card>

        <ScenarioComparator />

        <BudgetCharts />

        <ExportBar />

        <p className="pb-4 text-center text-xs text-slate-400">
          Расчёт носит справочный характер. Часть позиций (спецодежда, инвентарь, регламентные
          работы по инженерии, минимальные тарифы маслихатов) — рыночные оценки 2025-2026 гг.,
          требующие сверки перед утверждением сметы на общем собрании собственников.
        </p>
      </div>

      <PrintSummary />
    </main>
  );
}
