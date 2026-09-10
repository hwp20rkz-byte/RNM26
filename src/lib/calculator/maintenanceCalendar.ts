import type { MaintenanceStatus, MaintenanceTask } from "./types";

const UPCOMING_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Следующая дата обслуживания = дата последнего + периодичность (мес.). */
export function computeNextServiceDate(task: Pick<MaintenanceTask, "lastServiceDate" | "periodicityMonths">): Date | null {
  if (!task.lastServiceDate) return null;
  const last = new Date(task.lastServiceDate);
  if (Number.isNaN(last.getTime())) return null;
  const next = new Date(last);
  next.setMonth(next.getMonth() + task.periodicityMonths);
  return next;
}

export function computeDaysUntil(nextDate: Date, referenceDate: Date): number {
  const diffMs = nextDate.getTime() - referenceDate.getTime();
  return Math.ceil(diffMs / MS_PER_DAY);
}

export function computeMaintenanceStatus(
  task: Pick<MaintenanceTask, "lastServiceDate" | "periodicityMonths">,
  referenceDate: Date = new Date(),
): MaintenanceStatus {
  const next = computeNextServiceDate(task);
  if (!next) return "no_date";
  const days = computeDaysUntil(next, referenceDate);
  if (days < 0) return "overdue";
  if (days <= UPCOMING_WINDOW_DAYS) return "upcoming";
  return "ok";
}

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  ok: "В графике",
  upcoming: "Скоро",
  overdue: "Просрочено",
  no_date: "Дата не указана",
};

export interface MaintenanceTaskComputed {
  task: MaintenanceTask;
  nextServiceDate: Date | null;
  daysUntil: number | null;
  status: MaintenanceStatus;
}

export function computeMaintenanceTasks(
  tasks: MaintenanceTask[],
  referenceDate: Date = new Date(),
): MaintenanceTaskComputed[] {
  return tasks
    .map((task) => {
      const nextServiceDate = computeNextServiceDate(task);
      return {
        task,
        nextServiceDate,
        daysUntil: nextServiceDate ? computeDaysUntil(nextServiceDate, referenceDate) : null,
        status: computeMaintenanceStatus(task, referenceDate),
      };
    })
    .sort((a, b) => {
      // без даты — в конец; иначе по возрастанию срока (просроченные — раньше)
      if (a.daysUntil === null) return 1;
      if (b.daysUntil === null) return -1;
      return a.daysUntil - b.daysUntil;
    });
}
