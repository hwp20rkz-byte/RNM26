"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Download, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { computeMaintenanceTasks, MAINTENANCE_STATUS_LABELS } from "@/lib/calculator/maintenanceCalendar";
import { MAINTENANCE_TASK_TEMPLATES } from "@/lib/calculator/data/maintenanceTaskTemplates";
import { EQUIPMENT_CATEGORY_LABELS } from "@/lib/calculator/data/equipmentTypes";
import { downloadBlob } from "@/lib/export/download";
import { useT } from "@/lib/i18n/useT";
import type { MaintenanceStatus } from "@/lib/calculator/types";

const STATUS_BADGE: Record<MaintenanceStatus, "success" | "warning" | "danger" | "outline"> = {
  ok: "success",
  upcoming: "warning",
  overdue: "danger",
  no_date: "outline",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MaintenanceCalendar() {
  const t = useT();
  const project = useActiveProject();
  const addMaintenanceTask = useProjectsStore((s) => s.addMaintenanceTask);
  const updateMaintenanceTask = useProjectsStore((s) => s.updateMaintenanceTask);
  const removeMaintenanceTask = useProjectsStore((s) => s.removeMaintenanceTask);
  const markMaintenanceTaskServiced = useProjectsStore((s) => s.markMaintenanceTaskServiced);

  const [templateId, setTemplateId] = useState(MAINTENANCE_TASK_TEMPLATES[0]?.id ?? "");
  const [icsBusy, setIcsBusy] = useState(false);

  const computed = useMemo(() => computeMaintenanceTasks(project.maintenanceTasks), [project.maintenanceTasks]);
  const overdueCount = computed.filter((c) => c.status === "overdue").length;
  const upcomingCount = computed.filter((c) => c.status === "upcoming").length;

  function handleAddFromTemplate() {
    const tpl = MAINTENANCE_TASK_TEMPLATES.find((mt) => mt.id === templateId);
    if (!tpl) return;
    addMaintenanceTask({
      name: tpl.name,
      equipmentCategory: tpl.equipmentCategory,
      periodicityMonths: tpl.periodicityMonths,
      regulationRef: tpl.regulationRef,
    });
  }

  async function handleExportIcs() {
    setIcsBusy(true);
    try {
      const { exportMaintenanceCalendarToIcs } = await import("@/lib/export/exportToIcs");
      const { blob, includedCount, skippedCount } = exportMaintenanceCalendarToIcs(computed, project.name);
      if (includedCount === 0) {
        alert(skippedCount > 0 ? t("mcNoDateAlert") : t("mcEmptyListAlert"));
        return;
      }
      downloadBlob(blob, `Календарь_ТО_${project.name.replace(/[^\p{L}\p{N}]+/gu, "_")}.ics`);
    } finally {
      setIcsBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("mcTitle")}</CardTitle>
        </div>
        <CardDescription>{t("mcDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" /> {t("mcOverdueLabel")} <b>{overdueCount}</b>
            </div>
          )}
          {upcomingCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <CalendarClock className="h-4 w-4" /> {t("mcUpcomingLabel")} <b>{upcomingCount}</b>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {MAINTENANCE_TASK_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} {t("mcFreqPrefix")}{tpl.periodicityMonths}{t("mcFreqSuffix")}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddFromTemplate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> {t("mcAddFromTemplateButton")}
          </button>
          <button
            onClick={() => addMaintenanceTask({ name: t("mcNewTaskName"), periodicityMonths: 12 })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Plus className="h-4 w-4" /> {t("mcCustomTaskButton")}
          </button>
          <button
            onClick={handleExportIcs}
            disabled={icsBusy}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="h-4 w-4" /> {icsBusy ? t("mcExportBusy") : t("mcExportIcsButton")}
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {computed.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">{t("mcEmptyCalendar")}</p>
          )}
          {computed.map(({ task, nextServiceDate, daysUntil, status }) => (
            <div key={task.id} className="flex flex-col gap-1.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <InlineText
                  value={task.name}
                  onChange={(v) => updateMaintenanceTask(task.id, { name: v })}
                  className="min-w-[14rem] flex-1 font-medium"
                />
                {task.equipmentCategory && (
                  <Badge variant="outline">{EQUIPMENT_CATEGORY_LABELS[task.equipmentCategory]}</Badge>
                )}
                <Badge variant={STATUS_BADGE[status]}>{MAINTENANCE_STATUS_LABELS[status]}</Badge>
                {nextServiceDate && daysUntil !== null && (
                  <span className="text-xs tabular-nums text-slate-500">
                    {t("mcNextPrefix")} {nextServiceDate.toLocaleDateString("ru-RU")}
                    {daysUntil < 0
                      ? ` ${t("mcOverduePrefix")}${-daysUntil}${t("mcOverdueSuffix")}`
                      : ` ${t("mcUpcomingPrefix")}${daysUntil}${t("mcUpcomingSuffix")}`}
                  </span>
                )}
                <button
                  onClick={() => removeMaintenanceTask(task.id)}
                  className="ml-auto rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <label className="flex items-center gap-1">
                  {t("mcPeriodicityLabel")}
                  <InlineNumber
                    value={task.periodicityMonths}
                    onChange={(v) => updateMaintenanceTask(task.id, { periodicityMonths: Math.max(1, Math.round(v)) })}
                    className="w-14"
                  />
                </label>
                <label className="flex items-center gap-1">
                  {t("mcLastServiceLabel")}
                  <input
                    type="date"
                    value={task.lastServiceDate ?? ""}
                    onChange={(e) => updateMaintenanceTask(task.id, { lastServiceDate: e.target.value || undefined })}
                    className="h-7 rounded-md border border-slate-200 bg-transparent px-1.5 text-xs dark:border-slate-700"
                  />
                </label>
                <button
                  onClick={() => markMaintenanceTaskServiced(task.id, todayIso())}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("mcDoneTodayButton")}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                <InlineText
                  value={task.responsibleName ?? ""}
                  onChange={(v) => updateMaintenanceTask(task.id, { responsibleName: v || undefined })}
                  className="w-36"
                  placeholder={t("mcResponsibleNamePlaceholder")}
                />
                <InlineText
                  value={task.responsibleOrg ?? ""}
                  onChange={(v) => updateMaintenanceTask(task.id, { responsibleOrg: v || undefined })}
                  className="w-36"
                  placeholder={t("mcResponsibleOrgPlaceholder")}
                />
                <InlineText
                  value={task.responsiblePhone ?? ""}
                  onChange={(v) => updateMaintenanceTask(task.id, { responsiblePhone: v || undefined })}
                  className="w-32"
                  placeholder={t("orPhonePlaceholder")}
                />
                <InlineText
                  value={task.responsibleEmail ?? ""}
                  onChange={(v) => updateMaintenanceTask(task.id, { responsibleEmail: v || undefined })}
                  className="w-40"
                  placeholder={t("orEmailPlaceholder")}
                />
                {task.responsiblePhone && (
                  <a href={`tel:${task.responsiblePhone}`} className="inline-flex items-center gap-1 text-emerald-600 hover:underline">
                    <Phone className="h-3 w-3" /> {t("mcCallLink")}
                  </a>
                )}
                {task.responsibleEmail && (
                  <a
                    href={`mailto:${task.responsibleEmail}?subject=${encodeURIComponent(
                      `Напоминание: ${task.name}`,
                    )}&body=${encodeURIComponent(
                      `Добрый день!\n\nНапоминаем о регламентной работе «${task.name}» по объекту «${project.name}»${
                        nextServiceDate ? `, плановая дата — ${nextServiceDate.toLocaleDateString("ru-RU")}` : ""
                      }.\n\nС уважением,\nОСИ «${project.name}»`,
                    )}`}
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                  >
                    <Mail className="h-3 w-3" /> {t("mcEmailLink")}
                  </a>
                )}
              </div>
              {task.regulationRef && <p className="text-xs text-slate-400">{task.regulationRef}</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
