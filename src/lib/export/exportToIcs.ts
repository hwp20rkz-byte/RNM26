import type { MaintenanceTaskComputed } from "@/lib/calculator/maintenanceCalendar";

// Статический сайт без бэкенда не может сам рассылать push/SMS/email —
// .ics подписывается в любом календаре (Google/Outlook/Apple), который
// затем присылает СВОИ напоминания на устройство ответственного. Это
// единственный канал оповещения, который реально работает без сервера.

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function toIcsDateTime(d: Date): string {
  return `${toIcsDate(d)}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
}

export function exportMaintenanceCalendarToIcs(
  tasks: MaintenanceTaskComputed[],
  buildingName: string,
): { blob: Blob; includedCount: number; skippedCount: number } {
  const now = new Date();
  const dtstamp = toIcsDateTime(now);

  const events: string[] = [];
  let skipped = 0;

  for (const t of tasks) {
    if (!t.nextServiceDate) {
      skipped += 1;
      continue;
    }
    const responsible = [t.task.responsibleName, t.task.responsibleOrg].filter(Boolean).join(", ");
    const descriptionParts = [
      `Периодичность: раз в ${t.task.periodicityMonths} мес.`,
      responsible ? `Ответственный: ${responsible}` : "",
      t.task.responsiblePhone ? `Телефон: ${t.task.responsiblePhone}` : "",
      t.task.regulationRef ? `Регламент: ${t.task.regulationRef}` : "",
      t.task.notes ?? "",
    ].filter(Boolean);

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:${t.task.id}@qazaqosi`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${toIcsDate(t.nextServiceDate)}`,
        `SUMMARY:${escapeText(`${buildingName}: ${t.task.name}`)}`,
        `DESCRIPTION:${escapeText(descriptionParts.join("\\n"))}`,
        "BEGIN:VALARM",
        "TRIGGER:-P7D",
        "ACTION:DISPLAY",
        "DESCRIPTION:Регламентная работа приближается",
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n"),
    );
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QazaqOSI//Maintenance Calendar//RU",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    blob: new Blob([ics], { type: "text/calendar;charset=utf-8" }),
    includedCount: events.length,
    skippedCount: skipped,
  };
}
