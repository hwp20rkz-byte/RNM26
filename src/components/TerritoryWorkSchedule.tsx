"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Info, ListChecks, PlusSquare, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { useT } from "@/lib/i18n/useT";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useUiPrefsStore } from "@/store/useUiPrefsStore";
import { TERRITORY_WORK_CATALOG } from "@/lib/calculator/data/territoryWorkCatalog";
import { defaultTerritoryVolume } from "@/lib/calculator/territoryWorkEngine";
import {
  computeTerritorySchedule,
  getDayRange,
  getMonthRange,
  getQuarterRange,
  getWeekRange,
  isTerritoryItemSchedulable,
  summarizeTerritorySchedule,
  type TerritoryScheduleEntry,
  type TerritoryScheduleStatus,
} from "@/lib/calculator/territoryScheduleEngine";
import { TERRITORY_WORK_CATEGORY_LABELS, TERRITORY_WORK_UNIT_LABELS, type TerritoryWorkItem } from "@/lib/calculator/types";
import { formatKzt } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month" | "quarter";

const LOCALE_TAG: Record<string, string> = { ru: "ru-RU", kz: "kk-KZ", en: "en-US" };

const STATUS_BADGE_KEY: Record<TerritoryScheduleStatus, TranslationKey> = {
  done: "twsStatusDone",
  overdue: "twsStatusOverdue",
  today: "twsStatusToday",
  upcoming: "twsStatusUpcoming",
};

const STATUS_VARIANT: Record<TerritoryScheduleStatus, "success" | "danger" | "warning" | "outline"> = {
  done: "success",
  overdue: "danger",
  today: "warning",
  upcoming: "outline",
};

function shiftDate(d: Date, viewMode: ViewMode, direction: 1 | -1): Date {
  const next = new Date(d);
  if (viewMode === "day") next.setUTCDate(next.getUTCDate() + direction);
  else if (viewMode === "week") next.setUTCDate(next.getUTCDate() + 7 * direction);
  else if (viewMode === "month") next.setUTCMonth(next.getUTCMonth() + direction);
  else next.setUTCMonth(next.getUTCMonth() + 3 * direction);
  return next;
}

function rangeFor(viewMode: ViewMode, anchor: Date): { start: string; end: string } {
  if (viewMode === "day") return getDayRange(anchor);
  if (viewMode === "week") return getWeekRange(anchor);
  if (viewMode === "month") return getMonthRange(anchor);
  return getQuarterRange(anchor);
}

function formatRangeLabel(viewMode: ViewMode, anchor: Date, localeTag: string): string {
  if (viewMode === "day") return anchor.toLocaleDateString(localeTag, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (viewMode === "week") {
    const { start, end } = getWeekRange(anchor);
    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    return `${s.toLocaleDateString(localeTag, { day: "numeric", month: "short" })} – ${e.toLocaleDateString(localeTag, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (viewMode === "month") return anchor.toLocaleDateString(localeTag, { month: "long", year: "numeric" });
  const q = Math.floor(anchor.getUTCMonth() / 3) + 1;
  return `Q${q} ${anchor.getUTCFullYear()}`;
}

export function TerritoryWorkSchedule() {
  const t = useT();
  const locale = useUiPrefsStore((s) => s.locale);
  const localeTag = LOCALE_TAG[locale] ?? "ru-RU";
  const project = useActiveProject();
  const passport = project.territoryPassport;
  const setTerritoryTaskCompletion = useProjectsStore((s) => s.setTerritoryTaskCompletion);
  const createWorkOrderFromTerritoryTask = useProjectsStore((s) => s.createWorkOrderFromTerritoryTask);
  const applyNormativeTerritoryPlan = useProjectsStore((s) => s.applyNormativeTerritoryPlan);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [batchResultCount, setBatchResultCount] = useState<number | null>(null);

  const schedulableItems = useMemo(() => {
    if (!passport) return [];
    return TERRITORY_WORK_CATALOG.filter((item) => isTerritoryItemSchedulable(item) && defaultTerritoryVolume(item, passport) > 0);
  }, [passport]);

  const range = useMemo(() => rangeFor(viewMode, anchor), [viewMode, anchor]);

  const entries = useMemo(
    () => computeTerritorySchedule(schedulableItems, project.territoryTaskCompletions, range.start, range.end),
    [schedulableItems, project.territoryTaskCompletions, range.start, range.end],
  );

  const summary = useMemo(() => summarizeTerritorySchedule(entries), [entries]);

  const uniqueScheduledItems = useMemo(() => {
    const seen = new Map<string, TerritoryWorkItem>();
    for (const e of entries) if (!seen.has(e.item.id)) seen.set(e.item.id, e.item);
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [entries]);

  const allSelected = uniqueScheduledItems.length > 0 && uniqueScheduledItems.every((i) => selectedItemIds.has(i.id));

  const byDay = useMemo(() => {
    const map = new Map<string, TerritoryScheduleEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries]);

  const mrpValue = project.db.taxRates.mrpValue;

  function toggleCompleted(entry: TerritoryScheduleEntry, completed: boolean) {
    setTerritoryTaskCompletion(entry.key, entry.item.id, entry.date, { completed });
  }

  function setCompletedBy(entry: TerritoryScheduleEntry, completedBy: string) {
    setTerritoryTaskCompletion(entry.key, entry.item.id, entry.date, { completedBy });
  }

  function setNote(entry: TerritoryScheduleEntry, note: string) {
    setTerritoryTaskCompletion(entry.key, entry.item.id, entry.date, { note });
  }

  function handleCreateOrder(entry: TerritoryScheduleEntry) {
    const title = `${entry.item.sourceCode ? `${entry.item.sourceCode} ` : ""}${entry.item.name} — ${entry.date}`;
    createWorkOrderFromTerritoryTask(entry.key, entry.item.id, entry.date, title);
  }

  function toggleItemSelected(itemId: string, checked: boolean) {
    setBatchResultCount(null);
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  function toggleSelectAll() {
    setBatchResultCount(null);
    setSelectedItemIds(allSelected ? new Set() : new Set(uniqueScheduledItems.map((i) => i.id)));
  }

  function handleBatchGenerate() {
    const ids = uniqueScheduledItems.filter((i) => selectedItemIds.has(i.id)).map((i) => i.id);
    if (ids.length === 0) return;
    const created = applyNormativeTerritoryPlan(range.start, range.end, ids);
    setBatchResultCount(created.length);
    setSelectedItemIds(new Set());
  }

  function entryRow(entry: TerritoryScheduleEntry) {
    const isOpen = openKey === entry.key;
    const rate = entry.item.ratePerUnitMrp * mrpValue;
    const linkedOrder = entry.completion?.workOrderId
      ? project.workOrders.find((o) => o.id === entry.completion?.workOrderId)
      : undefined;
    return (
      <div key={entry.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start gap-2">
          <label className="mt-0.5 inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={entry.completion?.completed ?? false}
              onChange={(e) => toggleCompleted(entry, e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
              aria-label={t("twsCheckboxLabel")}
            />
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {entry.item.sourceCode ? `${entry.item.sourceCode}. ` : ""}
                {entry.item.name}
              </span>
              <Badge variant={STATUS_VARIANT[entry.status]}>{t(STATUS_BADGE_KEY[entry.status])}</Badge>
              {entry.item.verified ? (
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                  {t("twsFieldVerifiedBadge")}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400">
                  {t("twsFieldUnverifiedBadge")}
                </Badge>
              )}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {TERRITORY_WORK_CATEGORY_LABELS[entry.item.category]} · {entry.date}
              {linkedOrder && (
                <>
                  {" · "}
                  {t("twsOrderLinkedPrefix")} №{linkedOrder.ticketNumber}
                </>
              )}
            </div>
            <button
              onClick={() => setOpenKey(isOpen ? null : entry.key)}
              className="mt-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {t("twsDetailsToggle")}
            </button>
            {isOpen && (
              <div className="mt-2 flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/40">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
                  <div>
                    <div className="text-slate-400">{t("twsFieldCategory")}</div>
                    <div className="text-slate-700 dark:text-slate-200">{TERRITORY_WORK_CATEGORY_LABELS[entry.item.category]}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">{t("twsFieldUnit")}</div>
                    <div className="text-slate-700 dark:text-slate-200">
                      {entry.item.unitSize === 1 ? "" : `${entry.item.unitSize} `}
                      {TERRITORY_WORK_UNIT_LABELS[entry.item.unit]}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">{t("twsFieldRate")}</div>
                    <div className="text-slate-700 dark:text-slate-200">{formatKzt(rate)}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-slate-400">{t("twsFieldSource")}</div>
                    <div className="text-slate-700 dark:text-slate-200">{entry.item.source}</div>
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-400">{t("twsCompletedByLabel")}</span>
                  <input
                    type="text"
                    value={entry.completion?.completedBy ?? ""}
                    onChange={(e) => setCompletedBy(entry, e.target.value)}
                    placeholder={t("twsCompletedByPlaceholder")}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-400">{t("twsNoteLabel")}</span>
                  <textarea
                    value={entry.completion?.note ?? ""}
                    onChange={(e) => setNote(entry, e.target.value)}
                    placeholder={t("twsNotePlaceholder")}
                    rows={2}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <button
                  onClick={() => handleCreateOrder(entry)}
                  disabled={!!linkedOrder}
                  className="inline-flex w-fit items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <ClipboardList className="h-3.5 w-3.5" /> {t("twsCreateOrderButton")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("twsTitle")}</CardTitle>
        </div>
        <CardDescription>{t("twsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!passport ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            {t("twsNoPassportHint")}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="day">{t("twsTabDay")}</TabsTrigger>
                  <TabsTrigger value="week">{t("twsTabWeek")}</TabsTrigger>
                  <TabsTrigger value="month">{t("twsTabMonth")}</TabsTrigger>
                  <TabsTrigger value="quarter">{t("twsTabQuarter")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAnchor((d) => shiftDate(d, viewMode, -1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
                  aria-label={t("twsPrevButton")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[9rem] text-center text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
                  {formatRangeLabel(viewMode, anchor, localeTag)}
                </span>
                <button
                  onClick={() => setAnchor((d) => shiftDate(d, viewMode, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
                  aria-label={t("twsNextButton")}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setAnchor(new Date())}
                  className="ml-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
                >
                  {t("twsTodayButton")}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <PlusSquare className="h-3.5 w-3.5" /> {t("twsBatchTitle")}
              </div>
              <p className="mb-2 text-xs text-slate-400">{t("twsBatchHint")}</p>
              {uniqueScheduledItems.length === 0 ? (
                <div className="text-xs text-slate-400">{t("twsBatchNoItems")}</div>
              ) : (
                <>
                  <label className="mb-1.5 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 accent-emerald-600"
                    />
                    {t("twsBatchSelectAll")}
                  </label>
                  <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-slate-100 p-2 dark:border-slate-800">
                    {uniqueScheduledItems.map((item) => (
                      <label key={item.id} className="inline-flex cursor-pointer items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.has(item.id)}
                          onChange={(e) => toggleItemSelected(item.id, e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
                        />
                        <span>
                          {item.sourceCode ? `${item.sourceCode}. ` : ""}
                          {item.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleBatchGenerate}
                      disabled={selectedItemIds.size === 0}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <ClipboardList className="h-3.5 w-3.5" /> {t("twsBatchButton")}
                    </button>
                    {batchResultCount !== null && (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400">
                        {t("twsBatchResultPrefix")} {batchResultCount}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ListChecks className="h-3.5 w-3.5" /> {t("twsSummaryTotal")}
                </div>
                <div className="mt-0.5 text-lg font-semibold text-slate-800 dark:text-slate-100">{summary.total}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("twsSummaryCompleted")}
                </div>
                <div className="mt-0.5 text-lg font-semibold text-emerald-600">
                  {summary.completed} / {summary.total}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5" /> {t("twsSummaryOverdue")}
                </div>
                <div className={cn("mt-0.5 text-lg font-semibold", summary.overdue > 0 ? "text-rose-600" : "text-slate-800 dark:text-slate-100")}>
                  {summary.overdue}
                </div>
              </div>
            </div>

            {(summary.byCategory.length > 0 || summary.byCompletedBy.length > 0) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {summary.byCategory.length > 0 && (
                  <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs dark:border-slate-800">
                    <div className="mb-1.5 font-medium text-slate-500 dark:text-slate-400">{t("twsByCategoryTitle")}</div>
                    <div className="flex flex-col gap-1">
                      {summary.byCategory.map((c) => (
                        <div key={c.category} className="flex items-center justify-between gap-2">
                          <span className="truncate text-slate-600 dark:text-slate-300">{TERRITORY_WORK_CATEGORY_LABELS[c.category]}</span>
                          <span className="tabular-nums text-slate-400">
                            {c.completed}/{c.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {summary.byCompletedBy.length > 0 && (
                  <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs dark:border-slate-800">
                    <div className="mb-1.5 font-medium text-slate-500 dark:text-slate-400">{t("twsByWorkerTitle")}</div>
                    <div className="flex flex-col gap-1">
                      {summary.byCompletedBy.map((w) => (
                        <div key={w.name} className="flex items-center justify-between gap-2">
                          <span className="truncate text-slate-600 dark:text-slate-300">{w.name || t("twsWorkerUnknown")}</span>
                          <span className="tabular-nums text-slate-400">{w.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {byDay.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
                {t("twsEmptyState")}
              </div>
            ) : viewMode === "day" ? (
              <div className="flex flex-col gap-2">{byDay[0][1].map(entryRow)}</div>
            ) : (
              <Accordion type="multiple" defaultValue={byDay.slice(0, 3).map(([date]) => date)}>
                {byDay.map(([date, dayEntries]) => (
                  <AccordionItem key={date} value={date}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <span className="capitalize">{new Date(`${date}T00:00:00Z`).toLocaleDateString(localeTag, { weekday: "short", day: "numeric", month: "short" })}</span>
                        <Badge variant="outline">{dayEntries.length}</Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-2">{dayEntries.map(entryRow)}</div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{t("twsOrdersIntegrationHint")}</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{t("twsExcludedNote")}</span>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              <div className="mb-1 font-medium">{t("twsAssumptionsTitle")}</div>
              <p>{t("twsSeasonAssumptionNote")}</p>
              <p className="mt-1">{t("twsNoLaborHoursNote")}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
