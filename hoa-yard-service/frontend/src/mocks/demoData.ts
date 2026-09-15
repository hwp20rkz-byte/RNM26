import type { ChecklistItem, Task, User, WorkTemplate } from "@/types/domain";
import { zones } from "@/components/map/zones.data";

/**
 * Демо-данные для standalone-режима (GitHub Pages без backend).
 * Идентификаторы стабильны — на них ссылаются mock-функции в whatsappService.ts.
 */
export const demoCleaners: User[] = [
  {
    id: "u-nikita",
    fullName: "Никита",
    personnelCode: "N",
    phoneE164: "+77010000001",
    role: "CLEANER",
    gamificationScore: 120,
    active: true
  },
  {
    id: "u-vladimir",
    fullName: "Владимир",
    personnelCode: "W",
    phoneE164: "+77010000002",
    role: "CLEANER",
    gamificationScore: 95,
    active: true
  }
];

export const demoWorkTemplates: WorkTemplate[] = [
  {
    id: "wt-sweep",
    name: "Подметание дорожек",
    category: "Уборка",
    estimatedMinutes: 30,
    referencePhotoUrl: null,
    checklistSchema: [
      { key: "sweep-main", label: "Основные дорожки подметены", requiresPhoto: false },
      { key: "sweep-entrances", label: "Приствольные зоны у входов очищены", requiresPhoto: false }
    ]
  },
  {
    id: "wt-lawn",
    name: "Полив и очистка газона",
    category: "Благоустройство",
    estimatedMinutes: 45,
    referencePhotoUrl: null,
    checklistSchema: [
      { key: "lawn-water", label: "Газон полит", requiresPhoto: false },
      { key: "lawn-litter", label: "Мусор с газона убран", requiresPhoto: true }
    ]
  },
  {
    id: "wt-bins",
    name: "Опорожнение урн",
    category: "Уборка",
    estimatedMinutes: 20,
    referencePhotoUrl: null,
    checklistSchema: [
      { key: "bins-empty", label: "Все урны опорожнены", requiresPhoto: false },
      { key: "bins-bags", label: "Установлены новые мешки", requiresPhoto: false }
    ]
  }
];

export const demoZones = zones;

export function buildDemoTask(zoneId: string, workTemplateId: string, assigneeId: string, date: string): Task {
  return {
    id: `demo-task-${Math.random().toString(36).slice(2, 10)}`,
    zoneId,
    workTemplateId,
    assigneeId,
    scheduledDate: date,
    status: "PLANNED",
    startedAt: null,
    completedAt: null,
    checkInLocation: null,
    geoValidated: false
  };
}

export function buildDemoChecklistItems(taskId: string, template: WorkTemplate): ChecklistItem[] {
  return template.checklistSchema.map((schema) => ({
    id: `${taskId}-${schema.key}`,
    taskId,
    label: schema.label,
    checked: false,
    checkedAt: null
  }));
}
