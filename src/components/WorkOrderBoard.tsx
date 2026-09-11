"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers,
  LayoutGrid,
  List,
  Moon,
  Plus,
  Send,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import {
  buildWaLink,
  buildWorkOrderMessage,
  computeChecklistProgress,
  computeOverdueHours,
  computeSlaStatus,
  computeWorkOrderCounts,
  SLA_STATUS_LABELS,
  type SlaStatus,
} from "@/lib/calculator/workOrderEngine";
import { downloadBlob } from "@/lib/export/download";
import { genId } from "@/lib/id";
import {
  WORK_ORDER_COMPLEXITY_LABELS,
  WORK_ORDER_SEASONALITY_LABELS,
  WORK_ORDER_STATUS_FLOW,
  WORK_ORDER_STATUS_LABELS,
  type MaterialUsage,
  type WorkOrder,
  type WorkOrderComplexity,
  type WorkOrderSeasonality,
  type WorkOrderStatus,
} from "@/lib/calculator/types";

const STATUS_BADGE: Record<WorkOrderStatus, "success" | "warning" | "danger" | "outline"> = {
  draft: "outline",
  pending_approval: "warning",
  scheduled: "outline",
  in_progress: "warning",
  review: "warning",
  completed: "success",
  cancelled: "danger",
};

const SLA_BADGE: Record<SlaStatus, "success" | "warning" | "danger" | "outline"> = {
  ok: "success",
  due_soon: "warning",
  overdue: "danger",
  n_a: "outline",
};

const COMPLEXITIES = Object.keys(WORK_ORDER_COMPLEXITY_LABELS) as WorkOrderComplexity[];
const SEASONALITIES = Object.keys(WORK_ORDER_SEASONALITY_LABELS) as WorkOrderSeasonality[];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextStatus(status: WorkOrderStatus): WorkOrderStatus | null {
  const idx = WORK_ORDER_STATUS_FLOW.indexOf(status);
  if (idx === -1 || idx === WORK_ORDER_STATUS_FLOW.length - 1) return null;
  return WORK_ORDER_STATUS_FLOW[idx + 1];
}

export function WorkOrderBoard() {
  const project = useActiveProject();
  const createWorkOrder = useProjectsStore((s) => s.createWorkOrder);
  const removeWorkOrder = useProjectsStore((s) => s.removeWorkOrder);
  const setWorkOrderStatus = useProjectsStore((s) => s.setWorkOrderStatus);
  const approveWorkOrder = useProjectsStore((s) => s.approveWorkOrder);
  const completeWorkOrder = useProjectsStore((s) => s.completeWorkOrder);

  const [view, setView] = useState<"table" | "kanban">("table");
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [complexity, setComplexity] = useState<WorkOrderComplexity>("L1_ROUTINE");
  const [seasonality, setSeasonality] = useState<WorkOrderSeasonality>("all_year");
  const [isNightShift, setIsNightShift] = useState(false);
  const [isBatch, setIsBatch] = useState(false);
  const [targetAssetIds, setTargetAssetIds] = useState<string[]>([]);
  const [assignedStaff, setAssignedStaff] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState(todayIso());
  const [deadline, setDeadline] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [costItemId, setCostItemId] = useState("");
  const [checklistDraft, setChecklistDraft] = useState<{ id: string; text: string }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completionMaterials, setCompletionMaterials] = useState<MaterialUsage[]>([]);
  const [materialToAdd, setMaterialToAdd] = useState(project.spareParts[0]?.id ?? "");

  const counts = useMemo(() => computeWorkOrderCounts(project.workOrders), [project.workOrders]);
  const maintenanceCategories = project.db.categories.filter((c) => c.group === "maintenance");
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const sparePartById = new Map(project.spareParts.map((p) => [p.id, p]));

  function resetForm() {
    setTitle("");
    setDescription("");
    setComplexity("L1_ROUTINE");
    setSeasonality("all_year");
    setIsNightShift(false);
    setIsBatch(false);
    setTargetAssetIds([]);
    setAssignedStaff("");
    setPlannedStartDate(todayIso());
    setDeadline("");
    setApprovalRequired(false);
    setCostItemId("");
    setChecklistDraft([]);
  }

  function submit() {
    if (!title.trim() || !deadline) return;
    createWorkOrder({
      title: title.trim(),
      description: description.trim(),
      deadline,
      complexity,
      seasonality,
      isNightShift,
      isBatch,
      targetAssetIds,
      assignedStaffNames: assignedStaff
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      plannedStartDate,
      approval: { required: approvalRequired, status: approvalRequired ? "pending" : "none" },
      status: approvalRequired ? "pending_approval" : "scheduled",
      checklist: checklistDraft.map((c) => ({ id: c.id, text: c.text, isCompleted: false })),
      costItemId: costItemId || undefined,
    });
    resetForm();
    setFormOpen(false);
  }

  function autoGenerateChecklist() {
    setChecklistDraft(
      targetAssetIds.map((id) => ({ id: genId("check"), text: `Проверить: ${assetById.get(id)?.name ?? id}` })),
    );
  }

  async function handleExportIcs(order: WorkOrder) {
    const { exportWorkOrdersToIcs } = await import("@/lib/export/exportToIcs");
    const { blob, includedCount } = exportWorkOrdersToIcs([order], project.name);
    if (includedCount === 0) {
      alert("У наряда не задан дедлайн — нечего экспортировать в календарь.");
      return;
    }
    downloadBlob(blob, `${order.ticketNumber}.ics`);
  }

  async function handlePrintApproval(order: WorkOrder) {
    const { exportWorkOrderApprovalToDocxBlob } = await import("@/lib/export/exportWorkOrderApprovalToDocx");
    const blob = await exportWorkOrderApprovalToDocxBlob(project.building, order, project.assets);
    downloadBlob(blob, `Наряд-допуск_${order.ticketNumber}.docx`);
  }

  function handleShare(order: WorkOrder) {
    window.open(buildWaLink(buildWorkOrderMessage(order, project.name)), "_blank");
  }

  function openCompletion(order: WorkOrder) {
    setCompletingId(order.id);
    setCompletionMaterials([]);
  }

  function addCompletionMaterial() {
    const part = project.spareParts.find((p) => p.id === materialToAdd);
    if (!part) return;
    setCompletionMaterials((m) => [...m, { sparePartId: part.id, quantity: 1, unitPrice: part.avgUnitPrice }]);
  }

  function confirmCompletion(order: WorkOrder) {
    completeWorkOrder(order.id, { materialsUsed: completionMaterials });
    setCompletingId(null);
    setCompletionMaterials([]);
  }

  const columns: WorkOrderStatus[] = ["draft", "pending_approval", "scheduled", "in_progress", "review", "completed"];

  function renderOrderCard(order: WorkOrder) {
    const sla = computeSlaStatus(order);
    const overdueHours = computeOverdueHours(order);
    const progress = computeChecklistProgress(order);
    const next = nextStatus(order.status);
    return (
      <div key={order.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400">{order.ticketNumber}</span>
          <span className="font-medium">{order.title}</span>
          <Badge variant={STATUS_BADGE[order.status]}>{WORK_ORDER_STATUS_LABELS[order.status]}</Badge>
          {sla !== "n_a" && (
            <Badge variant={SLA_BADGE[sla]} className={sla === "overdue" ? "animate-pulse" : ""}>
              {sla === "overdue" ? `Просрочено на ${overdueHours} ч` : SLA_STATUS_LABELS[sla]}
            </Badge>
          )}
          {order.isNightShift && (
            <Badge variant="outline" className="gap-1">
              <Moon className="h-3 w-3" /> ночь
            </Badge>
          )}
          {order.isBatch && (
            <Badge variant="outline" className="gap-1">
              <Layers className="h-3 w-3" /> групповой
            </Badge>
          )}
          <Badge variant="outline">{WORK_ORDER_COMPLEXITY_LABELS[order.complexity]}</Badge>
          <button
            onClick={() => removeWorkOrder(order.id)}
            className="ml-auto rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mt-1 text-xs text-slate-500">{order.description}</p>

        {order.isNightShift && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Требуется уведомление жителей о ночных работах
          </p>
        )}

        {progress.total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Чек-лист: {progress.completed} из {progress.total}
              </span>
              <span>{progress.percent}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">
            Дедлайн: {order.deadline ? new Date(order.deadline).toLocaleString("ru-RU") : "—"}
          </span>
          {order.assignedStaffNames.length > 0 && (
            <span className="text-slate-400">· {order.assignedStaffNames.join(", ")}</span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {order.approval.required && order.approval.status === "pending" && (
            <button
              onClick={() => approveWorkOrder(order.id, "Председатель")}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
            >
              <ClipboardCheck className="h-3.5 w-3.5" /> Согласовать
            </button>
          )}
          {next && order.status !== "review" && (
            <button
              onClick={() => setWorkOrderStatus(order.id, next)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-emerald-400 dark:border-slate-700"
            >
              → {WORK_ORDER_STATUS_LABELS[next]}
            </button>
          )}
          {(order.status === "in_progress" || order.status === "review") && (
            <button
              onClick={() => openCompletion(order)}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Завершить
            </button>
          )}
          <button
            onClick={() => handleShare(order)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-emerald-400 dark:border-slate-700"
          >
            <Send className="h-3.5 w-3.5" /> WhatsApp
          </button>
          <button
            onClick={() => handleExportIcs(order)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-emerald-400 dark:border-slate-700"
          >
            <Calendar className="h-3.5 w-3.5" /> .ics
          </button>
          <button
            onClick={() => handlePrintApproval(order)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-emerald-400 dark:border-slate-700"
          >
            <FileText className="h-3.5 w-3.5" /> Акт согласования
          </button>
        </div>

        {completingId === order.id && (
          <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Списанные материалы при завершении
            </p>
            {completionMaterials.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="flex-1">{sparePartById.get(m.sparePartId)?.name ?? m.sparePartId}</span>
                <span>{m.quantity}</span>
                <button
                  onClick={() => setCompletionMaterials((ms) => ms.filter((_, idx) => idx !== i))}
                  className="text-slate-300 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {project.spareParts.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <select
                  value={materialToAdd}
                  onChange={(e) => setMaterialToAdd(e.target.value)}
                  className="h-8 flex-1 rounded-md border border-slate-200 bg-transparent px-1.5 text-xs dark:border-slate-700"
                >
                  {project.spareParts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button onClick={addCompletionMaterial} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => confirmCompletion(order)}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Подтвердить закрытие
              </button>
              <button
                onClick={() => setCompletingId(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Наряды на работы</CardTitle>
        <CardDescription>
          Планирование, согласование и SLA поверх журнала работ. При закрытии наряда автоматически
          создаётся запись в журнале работ со списанием материалов — как и при обычном быстром
          наряде во вкладке «Журнал работ».
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          <KpiTile label="Активные" value={counts.active} />
          <KpiTile label="Ночные" value={counts.night} icon={<Moon className="h-3.5 w-3.5" />} />
          <KpiTile label="На согласовании" value={counts.pendingApproval} />
          <KpiTile
            label="Просроченные"
            value={counts.overdue}
            danger={counts.overdue > 0}
          />
          <KpiTile label="Сезонные" value={counts.seasonal} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsBatch(false);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> Одиночный наряд
          </button>
          <button
            onClick={() => {
              setIsBatch(true);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Layers className="h-4 w-4" /> Групповой обход
          </button>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
            <button
              onClick={() => setView("table")}
              className={`rounded-md p-1.5 ${view === "table" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-400"}`}
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`rounded-md p-1.5 ${view === "kanban" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-400"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {formOpen && (
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center gap-2">
              <List className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-semibold">{isBatch ? "Групповой регламентный обход" : "Новый наряд"}</h4>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <label className="col-span-2 flex flex-col gap-1 text-xs text-slate-500 sm:col-span-1">
                Название
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Сложность
                <select value={complexity} onChange={(e) => setComplexity(e.target.value as WorkOrderComplexity)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  {COMPLEXITIES.map((c) => (
                    <option key={c} value={c}>{WORK_ORDER_COMPLEXITY_LABELS[c]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Сезонность
                <select value={seasonality} onChange={(e) => setSeasonality(e.target.value as WorkOrderSeasonality)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  {SEASONALITIES.map((s) => (
                    <option key={s} value={s}>{WORK_ORDER_SEASONALITY_LABELS[s]}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
              Описание
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Начало
                <input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Дедлайн
                <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="col-span-2 flex flex-col gap-1 text-xs text-slate-500">
                Исполнители (через запятую)
                <input value={assignedStaff} onChange={(e) => setAssignedStaff(e.target.value)} placeholder="Иванов И.И., Петров П.П." className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isNightShift} onChange={(e) => setIsNightShift(e.target.checked)} />
                Ночная смена (22:00–06:00)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} />
                Требуется согласование председателя
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isBatch} onChange={(e) => setIsBatch(e.target.checked)} />
                Групповой наряд (пул оборудования)
              </label>
            </div>
            {isNightShift && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Не забудьте уведомить жителей о шуме/отключении систем
              </p>
            )}

            <div className="mt-3">
              <p className="mb-1 text-xs text-slate-500">
                {isBatch ? "Оборудование в пуле" : "Оборудование (необязательно)"}
              </p>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                {project.assets.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-xs">
                    <input
                      type={isBatch ? "checkbox" : "radio"}
                      checked={targetAssetIds.includes(a.id)}
                      onChange={() =>
                        setTargetAssetIds((ids) =>
                          isBatch
                            ? ids.includes(a.id) ? ids.filter((x) => x !== a.id) : [...ids, a.id]
                            : [a.id],
                        )
                      }
                    />
                    {a.name}
                  </label>
                ))}
                {project.assets.length === 0 && <p className="text-xs text-slate-400">Реестр оборудования пуст.</p>}
              </div>
              {isBatch && targetAssetIds.length > 0 && (
                <button onClick={autoGenerateChecklist} className="mt-1 text-xs text-emerald-600 hover:underline">
                  Автогенерировать чек-лист по выбранному оборудованию
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500">Чек-лист</span>
              {checklistDraft.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1">{c.text}</span>
                  <button onClick={() => setChecklistDraft((cs) => cs.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Пункт чек-листа"
                  className="h-8 flex-1 rounded-md border border-slate-200 bg-transparent px-1.5 text-xs dark:border-slate-700"
                />
                <button
                  onClick={() => {
                    if (!newChecklistText.trim()) return;
                    setChecklistDraft((cs) => [...cs, { id: genId("check"), text: newChecklistText.trim() }]);
                    setNewChecklistText("");
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
              Статья сметы (при закрытии наряда — попадёт в «План/факт»)
              <select value={costItemId} onChange={(e) => setCostItemId(e.target.value)} className="h-9 max-w-md rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">— не списывать в бюджет —</option>
                {maintenanceCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} {c.name}</option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex gap-2">
              <button
                onClick={submit}
                disabled={!title.trim() || !deadline}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Создать наряд
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setFormOpen(false);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm dark:border-slate-700"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {view === "table" ? (
          <div className="flex flex-col gap-3">
            {project.workOrders.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">Нарядов пока нет.</p>
            )}
            {[...project.workOrders]
              .sort((a, b) => a.deadline.localeCompare(b.deadline))
              .map(renderOrderCard)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-3 lg:grid-cols-6">
            {columns.map((status) => (
              <div key={status} className="flex min-w-[220px] flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {WORK_ORDER_STATUS_LABELS[status]}
                  <span className="text-slate-300">
                    {project.workOrders.filter((o) => o.status === status).length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {project.workOrders
                    .filter((o) => o.status === status)
                    .map((o) => (
                      <div key={o.id} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-400">{o.ticketNumber}</span>
                          {o.isNightShift && <Moon className="h-3 w-3 text-slate-400" />}
                        </div>
                        <div className="font-medium">{o.title}</div>
                        {nextStatus(o.status) && (
                          <button
                            onClick={() => setWorkOrderStatus(o.id, nextStatus(o.status)!)}
                            className="mt-1 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] hover:border-emerald-400 dark:border-slate-700"
                          >
                            → {WORK_ORDER_STATUS_LABELS[nextStatus(o.status)!]}
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiTile({ label, value, icon, danger }: { label: string; value: number; icon?: React.ReactNode; danger?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        danger
          ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {icon}
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`font-semibold tabular-nums ${danger ? "animate-pulse" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
