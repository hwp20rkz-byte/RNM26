import type { Task } from "@/types/domain";
import { demoCleaners, buildDemoTask } from "@/mocks/demoData";

// Если VITE_API_BASE_URL не задан (в т.ч. на статичном GitHub Pages, где backend
// физически не может работать — Pages отдаёт только статику), сервис переходит
// в demo-режим: имитирует ответы backend без сетевых вызовов. Это не заглушка
// "для галочки" — вкладка "Диспетчер" на GH Pages иначе просто падала бы на fetch.
const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const DEMO_MODE = !API_BASE;
const DEMO_LATENCY_MS = 500;

export interface BulkScheduleRequest {
  zoneId: string;
  workTemplateId: string;
  assigneeId: string;
  dates: string[]; // ISO даты
}

export interface DispatchResult {
  taskId: string;
  phone: string;
  status: "SENT" | "FAILED";
  error?: string;
}

// taskId -> assigneeId, заполняется demo-версией bulkScheduleTasks,
// чтобы demo-версия dispatch могла показать реалистичный номер телефона.
const demoTaskAssignees = new Map<string, string>();

function delay<T>(value: T, ms = DEMO_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Создаёт задачи на набор дат из одного шаблона (аналог bulk-schedule на бэкенде). */
export function bulkScheduleTasks(payload: BulkScheduleRequest): Promise<Task[]> {
  if (DEMO_MODE) {
    const tasks = payload.dates.map((date) => {
      const task = buildDemoTask(payload.zoneId, payload.workTemplateId, payload.assigneeId, date);
      demoTaskAssignees.set(task.id, payload.assigneeId);
      return task;
    });
    return delay(tasks);
  }
  return apiFetch<Task[]>("/tasks/bulk-schedule", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/**
 * Отправляет персональную ссылку на задачу через WhatsApp (magic link, авторизует
 * исполнителя без пароля). Идемпотентно — повторный вызов для той же задачи
 * не создаёт дублирующее сообщение (Idempotency-Key на бэкенде = taskId).
 */
export function dispatchTaskViaWhatsApp(taskId: string): Promise<DispatchResult> {
  if (DEMO_MODE) {
    const assigneeId = demoTaskAssignees.get(taskId);
    const cleaner = demoCleaners.find((c) => c.id === assigneeId);
    if (!cleaner) {
      return delay({ taskId, phone: "—", status: "FAILED", error: "Demo: исполнитель не найден" });
    }
    return delay({ taskId, phone: cleaner.phoneE164, status: "SENT" });
  }
  return apiFetch<DispatchResult>(`/tasks/${taskId}/dispatch-whatsapp`, {
    method: "POST",
    headers: { "Idempotency-Key": taskId }
  });
}

export function dispatchTasksViaWhatsApp(taskIds: string[]): Promise<DispatchResult[]> {
  return Promise.all(taskIds.map(dispatchTaskViaWhatsApp));
}

export const isDemoMode = DEMO_MODE;
