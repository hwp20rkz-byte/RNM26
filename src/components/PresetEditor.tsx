"use client";

import { Copy, Layers, Lock, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { PRESET_FIELD_HELP, SERVICE_CLASS_LABELS } from "@/lib/calculator/presets";
import type { ServiceClass } from "@/lib/calculator/types";

export function PresetEditor() {
  const presets = useProjectsStore((s) => s.presets);
  const updatePreset = useProjectsStore((s) => s.updatePreset);
  const createPreset = useProjectsStore((s) => s.createPreset);
  const duplicatePreset = useProjectsStore((s) => s.duplicatePreset);
  const deletePreset = useProjectsStore((s) => s.deletePreset);
  const setPreset = useProjectsStore((s) => s.setPreset);
  const project = useActiveProject();

  function handleCreate() {
    createPreset({
      label: "Новый пресет",
      description: "Опишите, что входит и чем он отличается от других пресетов…",
      priceMultiplier: 1.0,
      maxServiceClass: "comfort",
      capitalRepairMrpMultiplier: 0.007,
      commercialRateCoefficient: 1.3,
      forceEnabledItemIds: [],
      forceDisabledItemIds: [],
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-600" />
          <CardTitle>Конструктор пресетов обслуживания</CardTitle>
        </div>
        <CardDescription>
          Пресет — это набор из 4 настроек, применяемых одним кликом (в Шаге 1 или Шаге 3):
          множитель цен всех статей, потолок класса доступных статей, взнос на капремонт и
          коэффициент для нежилых. Отредактируйте встроенные пресеты под свою организацию или
          создайте новые — они сразу появятся в выборе класса обслуживания и в сравнении.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
          {Object.values(PRESET_FIELD_HELP).map((f) => (
            <span key={f.label}>
              <b className="text-slate-600 dark:text-slate-300">{f.label}</b> — {f.help}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`rounded-xl border p-3 ${
                project.presetId === preset.id
                  ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <InlineText
                  value={preset.label}
                  onChange={(v) => updatePreset(preset.id, { label: v })}
                  className="min-w-[10rem] flex-1 font-semibold"
                />
                {preset.builtIn && (
                  <Badge variant="outline" className="shrink-0 gap-1">
                    <Lock className="h-3 w-3" /> встроенный
                  </Badge>
                )}
                {project.presetId === preset.id && <Badge variant="success">применён к «{project.name}»</Badge>}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => setPreset(preset.id)}
                    disabled={project.presetId === preset.id}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:border-emerald-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                  >
                    Применить
                  </button>
                  <button
                    onClick={() => duplicatePreset(preset.id)}
                    title="Дублировать как свой пресет"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {!preset.builtIn && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Удалить пресет «${preset.label}»?`)) deletePreset(preset.id);
                      }}
                      title="Удалить"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <InlineText
                value={preset.description}
                onChange={(v) => updatePreset(preset.id, { description: v })}
                className="mt-1 w-full text-slate-500 dark:text-slate-400"
              />

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <label className="flex items-center gap-1.5">
                  <span className="text-slate-400">{PRESET_FIELD_HELP.priceMultiplier.label}</span>
                  <span>×</span>
                  <InlineNumber
                    value={preset.priceMultiplier}
                    onChange={(v) => updatePreset(preset.id, { priceMultiplier: v })}
                    step={0.01}
                    className="w-16"
                  />
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-slate-400">{PRESET_FIELD_HELP.maxServiceClass.label}</span>
                  <select
                    value={preset.maxServiceClass}
                    onChange={(e) => updatePreset(preset.id, { maxServiceClass: e.target.value as ServiceClass })}
                    className="h-7 rounded-md border border-slate-200 bg-transparent px-1 text-xs dark:border-slate-700"
                  >
                    {(Object.keys(SERVICE_CLASS_LABELS) as ServiceClass[]).map((sc) => (
                      <option key={sc} value={sc}>
                        {SERVICE_CLASS_LABELS[sc]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-slate-400">{PRESET_FIELD_HELP.capitalRepairMrpMultiplier.label}</span>
                  <InlineNumber
                    value={preset.capitalRepairMrpMultiplier}
                    onChange={(v) => updatePreset(preset.id, { capitalRepairMrpMultiplier: v })}
                    step={0.001}
                    className="w-16"
                  />
                  <span className="text-slate-400">МРП</span>
                </label>

                <label className="flex items-center gap-1.5">
                  <span className="text-slate-400">{PRESET_FIELD_HELP.commercialRateCoefficient.label}</span>
                  <span>×</span>
                  <InlineNumber
                    value={preset.commercialRateCoefficient}
                    onChange={(v) => updatePreset(preset.id, { commercialRateCoefficient: v })}
                    step={0.1}
                    className="w-16"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        >
          <Plus className="h-4 w-4" /> Новый пресет
        </button>
      </CardContent>
    </Card>
  );
}
