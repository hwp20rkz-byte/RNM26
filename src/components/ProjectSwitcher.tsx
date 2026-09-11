"use client";

import { useState } from "react";
import { Building, ChevronDown, FolderPlus, History, Save, Trash2 } from "lucide-react";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { OBJECT_TYPE_LABELS } from "@/lib/calculator/presets";
import { formatKzt, formatKztPrecise } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import type { ObjectType } from "@/lib/calculator/types";

export function ProjectSwitcher() {
  const t = useT();
  const projects = useProjectsStore((s) => s.projects);
  const projectOrder = useProjectsStore((s) => s.projectOrder);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const switchProject = useProjectsStore((s) => s.switchProject);
  const renameProject = useProjectsStore((s) => s.renameProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const createProject = useProjectsStore((s) => s.createProject);
  const saveSmeta = useProjectsStore((s) => s.saveSmeta);
  const deleteSmeta = useProjectsStore((s) => s.deleteSmeta);
  const restoreSmeta = useProjectsStore((s) => s.restoreSmeta);
  const savedSmetas = useProjectsStore((s) => s.savedSmetas);

  const project = useActiveProject();
  const tariff = useActiveTariff();

  const [showNewForm, setShowNewForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTemplate, setNewTemplate] = useState<"blank" | "korkem1">("blank");
  const [newObjectType, setNewObjectType] = useState<ObjectType>("residential");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);

  const mySmetas = Object.values(savedSmetas)
    .filter((s) => s.projectId === project.id)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  function handleCreate() {
    if (!newName.trim()) return;
    createProject(newName.trim(), newTemplate, newObjectType);
    setNewName("");
    setShowNewForm(false);
  }

  function handleSaveSmeta() {
    const name = window.prompt(
      t("psSaveSmetaPromptLabel"),
      `${t("psSaveSmetaPromptDefaultPrefix")} ${new Date().toLocaleDateString("ru-RU")}`,
    );
    if (name) saveSmeta(name);
    setShowHistory(true);
  }

  return (
    <div className="no-print mb-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <Building className="h-4 w-4 shrink-0 text-emerald-600" />

        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => {
              if (renameValue.trim()) renameProject(project.id, renameValue.trim());
              setRenaming(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-8 rounded-md border border-emerald-400 bg-white px-2 text-sm dark:bg-slate-950"
          />
        ) : (
          <select
            value={activeProjectId}
            onChange={(e) => switchProject(e.target.value)}
            onDoubleClick={() => {
              setRenameValue(project.name);
              setRenaming(true);
            }}
            className="h-8 max-w-[16rem] rounded-md border border-slate-200 bg-transparent px-2 text-sm font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100"
            title={t("psRenameTooltip")}
          >
            {projectOrder.map((id) => (
              <option key={id} value={id}>
                {projects[id]?.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => {
            setRenameValue(project.name);
            setRenaming(true);
          }}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          ✎
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
        >
          <FolderPlus className="h-3.5 w-3.5" /> {t("psNewProjectButton")}
        </button>

        <button
          onClick={handleSaveSmeta}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
        >
          <Save className="h-3.5 w-3.5" /> {t("psSaveSmetaButton")}
        </button>

        <button
          onClick={() => setShowHistory((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300"
        >
          <History className="h-3.5 w-3.5" /> {t("psSavedButtonPrefix")} ({mySmetas.length}) <ChevronDown className="h-3 w-3" />
        </button>

        {projectOrder.length > 1 && (
          <button
            onClick={() => {
              if (window.confirm(`${t("psDeleteProjectConfirmPrefix")}${project.name}${t("psDeleteProjectConfirmSuffix")}`)) {
                deleteProject(project.id);
              }
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("psDeleteProjectButton")}
          </button>
        )}
      </div>

      {showNewForm && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("psNewProjectNameLabel")}</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("psNewProjectNamePlaceholder")}
              className="h-9 w-64 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:bg-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("psObjectTypeLabel")}</span>
            <select
              value={newObjectType}
              onChange={(e) => setNewObjectType(e.target.value as ObjectType)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:bg-slate-900"
            >
              {(Object.keys(OBJECT_TYPE_LABELS) as ObjectType[]).map((ot) => (
                <option key={ot} value={ot}>
                  {OBJECT_TYPE_LABELS[ot]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("psInitialDataLabel")}</span>
            <select
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value as "blank" | "korkem1")}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:bg-slate-900"
            >
              <option value="blank">{t("psBlankTemplateOption")}</option>
              <option value="korkem1">{t("psKorkemTemplateOption")}</option>
            </select>
          </label>
          <button
            onClick={handleCreate}
            className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {t("psCreateButton")}
          </button>
          <button
            onClick={() => setShowNewForm(false)}
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            {t("psCancelButton")}
          </button>
        </div>
      )}

      {showHistory && (
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/40">
          {mySmetas.length === 0 && (
            <p className="text-xs text-slate-400">{t("psNoSavedVersions")}</p>
          )}
          {mySmetas.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white dark:hover:bg-slate-900">
              <span className="flex-1 truncate">{s.name}</span>
              <span className="text-xs text-slate-400">
                {new Date(s.savedAt).toLocaleString("ru-RU")}
              </span>
              <span className="text-xs font-medium tabular-nums text-slate-500">
                {formatKztPrecise(s.tariff.tariffPerSqm)} ₸/м²
              </span>
              <span className="text-xs tabular-nums text-slate-400">{formatKzt(s.tariff.monthlyBudget)}{t("orPerMonthSuffix")}</span>
              <button
                onClick={() => {
                  if (window.confirm(`${t("psRestoreConfirmPrefix")}${s.name}${t("psRestoreConfirmSuffix")}`)) {
                    restoreSmeta(s.id);
                  }
                }}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                {t("psRestoreButton")}
              </button>
              <button
                onClick={() => deleteSmeta(s.id)}
                className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        {t("psFooterPrefix")} {formatKztPrecise(tariff.tariffPerSqm)} ₸/м².
      </p>
    </div>
  );
}
