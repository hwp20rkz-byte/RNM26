import { WORK_ORDER_COMPLEXITY_LABELS, WORK_ORDER_SEASONALITY_LABELS, type WorkOrder } from "./types";

const ACTIVE_STATUSES = new Set<WorkOrder["status"]>(["scheduled", "in_progress", "review"]);
const DUE_SOON_WINDOW_HOURS = 6;

export type SlaStatus = "ok" | "due_soon" | "overdue" | "n_a";

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  ok: "В графике",
  due_soon: "Скоро дедлайн",
  overdue: "Просрочено",
  n_a: "—",
};

/** Читаемый номер наряда WO-<год>-<порядковый номер за год>, генерируется последовательно в рамках проекта. */
export function generateTicketNumber(existingOrders: WorkOrder[], referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const prefix = `WO-${year}-`;
  const countThisYear = existingOrders.filter((o) => o.ticketNumber.startsWith(prefix)).length;
  return `${prefix}${String(countThisYear + 1).padStart(4, "0")}`;
}

/** SLA-статус считается от дедлайна на момент просмотра — не хранится, чтобы не разъезжаться с реальностью. */
export function computeSlaStatus(order: WorkOrder, referenceDate: Date = new Date()): SlaStatus {
  if (order.status === "completed" || order.status === "cancelled") return "n_a";
  if (!order.deadline) return "n_a";
  const deadline = new Date(order.deadline);
  if (Number.isNaN(deadline.getTime())) return "n_a";
  const hoursLeft = (deadline.getTime() - referenceDate.getTime()) / (60 * 60 * 1000);
  if (hoursLeft < 0) return "overdue";
  if (hoursLeft <= DUE_SOON_WINDOW_HOURS) return "due_soon";
  return "ok";
}

/** Часы просрочки (положительное число) — 0, если наряд ещё не просрочен или SLA неприменим. */
export function computeOverdueHours(order: WorkOrder, referenceDate: Date = new Date()): number {
  if (computeSlaStatus(order, referenceDate) !== "overdue") return 0;
  const deadline = new Date(order.deadline);
  return Math.round((referenceDate.getTime() - deadline.getTime()) / (60 * 60 * 1000));
}

export interface ChecklistProgress {
  completed: number;
  total: number;
  percent: number;
}

export function computeChecklistProgress(order: WorkOrder): ChecklistProgress {
  const total = order.checklist.length;
  const completed = order.checklist.filter((i) => i.isCompleted).length;
  return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

export interface WorkOrderCounts {
  active: number;
  night: number;
  pendingApproval: number;
  overdue: number;
  seasonal: number;
}

/** Счётчики для KPI-бара операционной доски. */
export function computeWorkOrderCounts(orders: WorkOrder[], referenceDate: Date = new Date()): WorkOrderCounts {
  return {
    active: orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length,
    night: orders.filter((o) => o.isNightShift && ACTIVE_STATUSES.has(o.status)).length,
    pendingApproval: orders.filter((o) => o.status === "pending_approval").length,
    overdue: orders.filter((o) => computeSlaStatus(o, referenceDate) === "overdue").length,
    seasonal: orders.filter((o) => o.seasonality !== "all_year" && ACTIVE_STATUSES.has(o.status)).length,
  };
}

/** Текст для отправки в мессенджер (WhatsApp/Telegram) — короткая сводка наряда. */
export function buildWorkOrderMessage(order: WorkOrder, buildingName: string): string {
  const lines = [
    `*Наряд ${order.ticketNumber}*${order.isNightShift ? " (ночная смена)" : ""}`,
    `Объект: ${buildingName}`,
    `${order.title}`,
    order.description,
    `Сложность: ${WORK_ORDER_COMPLEXITY_LABELS[order.complexity]}`,
    order.seasonality !== "all_year" ? `Сезон: ${WORK_ORDER_SEASONALITY_LABELS[order.seasonality]}` : "",
    `Дедлайн: ${order.deadline ? new Date(order.deadline).toLocaleString("ru-RU") : "не задан"}`,
    order.assignedStaffNames.length > 0 ? `Исполнители: ${order.assignedStaffNames.join(", ")}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

/** wa.me-ссылка с предзаполненным текстом — открывается в WhatsApp без сервера. */
export function buildWaLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Короткий статус для QR — полноценный отчёт в QR не помещается читаемо, для него используйте мессенджер-ссылку. */
export function buildStatusQrValue(order: WorkOrder): string {
  return `${order.ticketNumber}|${order.status}|${new Date().toISOString().slice(0, 10)}`;
}
