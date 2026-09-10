"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { useProjectsStore } from "@/store/useProjectsStore";
import { downloadBlob } from "@/lib/export/download";

export function ExportBar() {
  const project = useActiveProject();
  const db = project.db;
  const building = project.building;
  const priceMultiplier = project.priceMultiplier;
  const presets = useProjectsStore((s) => s.presets);
  const tariff = useActiveTariff();
  const [busy, setBusy] = useState<string | null>(null);

  const scenarioLabel = presets.find((p) => p.id === project.presetId)?.label ?? project.presetId;
  const filenameBase = building.name.replace(/[^\p{L}\p{N}]+/gu, "_");

  async function handleExcel() {
    setBusy("xlsx");
    try {
      const { exportToExcelBlob } = await import("@/lib/export/exportToExcel");
      const blob = await exportToExcelBlob(db, building, priceMultiplier, scenarioLabel);
      downloadBlob(blob, `Смета_${filenameBase}.xlsx`);
    } finally {
      setBusy(null);
    }
  }

  async function handleDocx() {
    setBusy("docx");
    try {
      const { exportToDocxBlob } = await import("@/lib/export/exportToDocx");
      const blob = await exportToDocxBlob(db, building, tariff, priceMultiplier, scenarioLabel);
      downloadBlob(blob, `Смета_${filenameBase}.docx`);
    } finally {
      setBusy(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle>Шаг 4. Экспорт и презентация для собрания жильцов</CardTitle>
        <CardDescription>
          Полная смета в Excel с формулами, официальный документ для утверждения в Word,
          либо PDF-версия для печати.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <ExportButton
          icon={<FileSpreadsheet className="h-4 w-4" />}
          label="Скачать в Excel (.xlsx)"
          busy={busy === "xlsx"}
          onClick={handleExcel}
        />
        <ExportButton
          icon={<FileText className="h-4 w-4" />}
          label="Скачать смету в Word (.docx)"
          busy={busy === "docx"}
          onClick={handleDocx}
        />
        <ExportButton
          icon={<Printer className="h-4 w-4" />}
          label="Распечатать отчёт (PDF)"
          onClick={handlePrint}
        />
      </CardContent>
    </Card>
  );
}

function ExportButton({
  icon,
  label,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      {icon}
      {busy ? "Формирование…" : label}
    </button>
  );
}
