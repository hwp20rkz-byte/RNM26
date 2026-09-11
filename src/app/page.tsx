"use client";

import { useEffect, useState } from "react";
import { Home as HomeIcon, ListTree } from "lucide-react";
import { StickyHud } from "@/components/StickyHud";
import { BuildingProfileForm } from "@/components/BuildingProfileForm";
import { CostCategoryTree } from "@/components/CostCategoryTree";
import { PriceCatalog } from "@/components/PriceCatalog";
import { PresetEditor } from "@/components/PresetEditor";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { ScenarioComparator } from "@/components/ScenarioComparator";
import { AssetRegistry } from "@/components/AssetRegistry";
import { EquipmentTypeCatalog } from "@/components/EquipmentTypeCatalog";
import { ReplacementPlan } from "@/components/ReplacementPlan";
import { OwnerRegistry } from "@/components/OwnerRegistry";
import { MaintenanceCalendar } from "@/components/MaintenanceCalendar";
import { BudgetActual } from "@/components/BudgetActual";
import { ProtocolBuilder } from "@/components/ProtocolBuilder";
import { SparePartsRegistry } from "@/components/SparePartsRegistry";
import { MaintenanceLog } from "@/components/MaintenanceLog";
import { WorkOrderBoard } from "@/components/WorkOrderBoard";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { BudgetCharts } from "@/components/charts/BudgetCharts";
import { ExportBar } from "@/components/ExportBar";
import { PrintSummary } from "@/components/PrintSummary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectsStore } from "@/store/useProjectsStore";

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.resolve(useProjectsStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-6">
        <p className="text-sm text-slate-400">Загрузка…</p>
      </main>
    );
  }

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
            Расчёт по Методике МИИР РК №166 и Закону «О жилищных отношениях» — для любого жилого
            и нежилого объекта
          </p>
        </div>
      </header>

      <ProjectSwitcher />

      <StickyHud />

      <div className="no-print flex flex-col gap-6">
        <BuildingProfileForm />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListTree className="h-5 w-5 text-emerald-600" />
              <CardTitle>Шаг 2. Конструктор статей расходов и справочник</CardTitle>
            </div>
            <CardDescription>
              Каждая величина — кол-во, ед. изм., цена, оклад — редактируется прямо в строке,
              тариф пересчитывается мгновенно. Во вкладке «Справочник» — общая база материалов и
              услуг с импортом прайс-листов, переиспользуемая между объектами.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="constructor">
              <TabsList>
                <TabsTrigger value="constructor">Конструктор</TabsTrigger>
                <TabsTrigger value="catalog">Справочник</TabsTrigger>
                <TabsTrigger value="presets">Пресеты</TabsTrigger>
                <TabsTrigger value="wear">Износ и капремонт</TabsTrigger>
                <TabsTrigger value="owners">Собственники</TabsTrigger>
                <TabsTrigger value="maintenance">Календарь ТО</TabsTrigger>
                <TabsTrigger value="budget">План/факт</TabsTrigger>
                <TabsTrigger value="protocol">Протокол собрания</TabsTrigger>
                <TabsTrigger value="inventory">Инженерия и ЗИП</TabsTrigger>
              </TabsList>
              <TabsContent value="constructor">
                <CostCategoryTree />
              </TabsContent>
              <TabsContent value="catalog">
                <PriceCatalog />
              </TabsContent>
              <TabsContent value="presets">
                <PresetEditor />
              </TabsContent>
              <TabsContent value="wear">
                <Tabs defaultValue="registry">
                  <TabsList>
                    <TabsTrigger value="registry">Реестр оборудования</TabsTrigger>
                    <TabsTrigger value="types">Справочник типов</TabsTrigger>
                    <TabsTrigger value="plan">План замены</TabsTrigger>
                  </TabsList>
                  <TabsContent value="registry">
                    <AssetRegistry />
                  </TabsContent>
                  <TabsContent value="types">
                    <EquipmentTypeCatalog />
                  </TabsContent>
                  <TabsContent value="plan">
                    <ReplacementPlan />
                  </TabsContent>
                </Tabs>
              </TabsContent>
              <TabsContent value="owners">
                <OwnerRegistry />
              </TabsContent>
              <TabsContent value="maintenance">
                <MaintenanceCalendar />
              </TabsContent>
              <TabsContent value="budget">
                <BudgetActual />
              </TabsContent>
              <TabsContent value="protocol">
                <ProtocolBuilder />
              </TabsContent>
              <TabsContent value="inventory">
                <Tabs defaultValue="stock">
                  <TabsList>
                    <TabsTrigger value="stock">Склад ЗИП</TabsTrigger>
                    <TabsTrigger value="log">Журнал работ</TabsTrigger>
                    <TabsTrigger value="orders">Наряды</TabsTrigger>
                  </TabsList>
                  <TabsContent value="stock">
                    <SparePartsRegistry />
                  </TabsContent>
                  <TabsContent value="log">
                    <MaintenanceLog />
                  </TabsContent>
                  <TabsContent value="orders">
                    <WorkOrderBoard />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <ScenarioComparator />

        <BudgetCharts />

        <AnalyticsDashboard />

        <ExportBar />

        <p className="pb-4 text-center text-xs text-slate-400">
          Расчёт носит справочный характер. Часть позиций (спецодежда, инвентарь, регламентные
          работы по инженерии, минимальные тарифы маслихатов) — рыночные оценки 2025-2026 гг.,
          требующие сверки перед утверждением сметы на общем собрании собственников. Объекты и
          сметы сохраняются локально в браузере.
        </p>
      </div>

      <PrintSummary />
    </main>
  );
}
