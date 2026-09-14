import type { TerritoryTaskCompletion, TerritoryWorkCategory, TerritoryWorkItem } from "./types";
import { computeTerritoryWorkOccurrencesPerYear } from "./territoryWorkEngine";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Минимальная кратность в год, начиная с которой позиция попадает в план
 * работ. Позиции с К=1 («по мере необходимости» — ремонт МАФ, скамей,
 * контейнеров и т.п.) не имеют осмысленной календарной даты — они не
 * планируются заранее, а создаются как наряд по факту обнаружения
 * повреждения. План работ показывает только реально РАСПИСАНИЕ уборки/
 * обслуживания.
 */
const SCHEDULABLE_MIN_OCCURRENCES_PER_YEAR = 2;

export function isTerritoryItemSchedulable(item: TerritoryWorkItem): boolean {
  return computeTerritoryWorkOccurrencesPerYear(item) >= SCHEDULABLE_MIN_OCCURRENCES_PER_YEAR;
}

/**
 * Дата начала сезона для позиции — эвристика по periodDays, т.к. Приложение
 * А не указывает точный стартовый день внутри сезона (только «с апреля по
 * октябрь» и т.п.). Это моё допущение для построения календаря, а не
 * норматив — помечено в UI отдельно от verified-статуса самой расценки.
 */
function seasonStart(item: TerritoryWorkItem, scheduleYear: number): Date {
  if (item.periodDays <= 90) return new Date(Date.UTC(scheduleYear, 3, 1)); // апрель-май
  if (item.periodDays <= 160) return new Date(Date.UTC(scheduleYear, 10, 1)); // холодный: ноябрь…
  return new Date(Date.UTC(scheduleYear, 3, 1)); // тёплый: апрель-октябрь
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Даты плановых выполнений позиции в рамках одного «сезонного года».
 * scheduleYear для холодного периода (ноябрь-март) — год начала сезона:
 * scheduleYear=2026 даёт даты с ноября 2026 по март 2027.
 */
export function computeTerritoryScheduleOccurrences(item: TerritoryWorkItem, scheduleYear: number): string[] {
  if (!isTerritoryItemSchedulable(item)) return [];
  const interval = Math.max(1, Math.round(item.intervalDays));
  const start = seasonStart(item, scheduleYear);
  const count = Math.round(item.periodDays / interval);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * interval * MS_PER_DAY);
    dates.push(toIsoDate(d));
  }
  return dates;
}

export type TerritoryScheduleStatus = "done" | "overdue" | "today" | "upcoming";

export interface TerritoryScheduleEntry {
  key: string;
  item: TerritoryWorkItem;
  date: string;
  status: TerritoryScheduleStatus;
  completion?: TerritoryTaskCompletion;
}

export function computeTerritoryScheduleStatus(date: string, completed: boolean, referenceDate: Date): TerritoryScheduleStatus {
  if (completed) return "done";
  const todayIso = toIsoDate(referenceDate);
  if (date < todayIso) return "overdue";
  if (date === todayIso) return "today";
  return "upcoming";
}

/**
 * План работ на диапазон дат [startDate, endDate] (включительно, ISO) по
 * набору позиций каталога. Перебирает сезонные годы, пересекающие диапазон,
 * чтобы не терять холодный период на стыке календарных лет.
 */
export function computeTerritorySchedule(
  items: TerritoryWorkItem[],
  completions: Record<string, TerritoryTaskCompletion>,
  startDate: string,
  endDate: string,
  referenceDate: Date = new Date(),
): TerritoryScheduleEntry[] {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  const entries: TerritoryScheduleEntry[] = [];
  for (const item of items) {
    if (!isTerritoryItemSchedulable(item)) continue;
    for (let scheduleYear = startYear - 1; scheduleYear <= endYear; scheduleYear++) {
      for (const date of computeTerritoryScheduleOccurrences(item, scheduleYear)) {
        if (date < startDate || date > endDate) continue;
        const key = `${item.id}__${date}`;
        const completion = completions[key];
        entries.push({
          key,
          item,
          date,
          status: computeTerritoryScheduleStatus(date, completion?.completed ?? false, referenceDate),
          completion,
        });
      }
    }
  }
  return entries.sort((a, b) => (a.date === b.date ? a.item.name.localeCompare(b.item.name, "ru") : a.date.localeCompare(b.date)));
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Понедельник-воскресенье недели, содержащей date. */
export function getWeekRange(date: Date): { start: string; end: string } {
  const d = startOfDay(date);
  const dow = d.getUTCDay(); // 0=вс
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const start = new Date(d.getTime() + diffToMonday * MS_PER_DAY);
  const end = new Date(start.getTime() + 6 * MS_PER_DAY);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function getQuarterRange(date: Date): { start: string; end: string } {
  const q = Math.floor(date.getUTCMonth() / 3);
  const start = new Date(Date.UTC(date.getUTCFullYear(), q * 3, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), q * 3 + 3, 0));
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function getDayRange(date: Date): { start: string; end: string } {
  const iso = toIsoDate(startOfDay(date));
  return { start: iso, end: iso };
}

export interface TerritoryScheduleSummary {
  total: number;
  completed: number;
  overdue: number;
  byCategory: { category: TerritoryWorkCategory; total: number; completed: number }[];
  byCompletedBy: { name: string; count: number }[];
}

export function summarizeTerritorySchedule(entries: TerritoryScheduleEntry[]): TerritoryScheduleSummary {
  const byCategoryMap = new Map<TerritoryWorkCategory, { total: number; completed: number }>();
  const byCompletedByMap = new Map<string, number>();
  let completed = 0;
  let overdue = 0;
  for (const e of entries) {
    const isDone = e.status === "done";
    if (isDone) completed++;
    if (e.status === "overdue") overdue++;
    const bucket = byCategoryMap.get(e.item.category) ?? { total: 0, completed: 0 };
    bucket.total++;
    if (isDone) bucket.completed++;
    byCategoryMap.set(e.item.category, bucket);
    if (isDone && e.completion?.completedBy) {
      byCompletedByMap.set(e.completion.completedBy, (byCompletedByMap.get(e.completion.completedBy) ?? 0) + 1);
    }
  }
  return {
    total: entries.length,
    completed,
    overdue,
    byCategory: [...byCategoryMap.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.total - a.total),
    byCompletedBy: [...byCompletedByMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
}

// ---------------------------------------------------------------------------
// WhatsApp-оповещения жителей по территории — тот же паттерн, что
// buildWorkOrderMessage (workOrderEngine.ts) и buildDebtNoticeMessage
// (ownerRegistryEngine.ts): массив строк -> filter(Boolean) -> join("\n"),
// *жирный* заголовок. Без ссылок на номер пункта Приказа №22-НҚ в тексте —
// как и в технологических картах (data/territoryGenericWorkSteps.ts), у
// точной формулировки соответствующих пунктов нет проверяемого источника
// в этой сессии. Ссылка для отправки строится существующим buildWaLink
// (workOrderEngine.ts) — без адресата, «поделиться в любой чат».
// ---------------------------------------------------------------------------

/** Уведомление о механизированной уборке/вывозе снега — просьба освободить парковочные места. */
export function buildSnowRemovalNoticeMessage(buildingName: string, date: string, startTime?: string): string {
  const lines = [
    "*Уважаемые жители!*",
    buildingName,
    startTime
      ? `${date} с ${startTime} будет производиться механизированная уборка и вывоз снега с придомовой территории.`
      : `${date} будет производиться механизированная уборка и вывоз снега с придомовой территории.`,
    "Убедительная просьба освободить парковочные места на этот период — автомобили, мешающие проезду техники, могут быть перемещены.",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Предупреждение о сбросе снега/наледи с кровли — просьба не приближаться к ограждённой зоне. */
export function buildRoofSnowWarningMessage(buildingName: string, date?: string): string {
  const lines = [
    "*Внимание! Сброс снега и наледи с кровли*",
    buildingName,
    date ? `Работы запланированы на ${date}.` : "Работы проводятся в ближайшее время.",
    "Возле дома будет огорожена опасная зона — просьба не приближаться, не парковать автомобили и не оставлять детей без присмотра рядом с домом на это время.",
  ];
  return lines.filter(Boolean).join("\n");
}
