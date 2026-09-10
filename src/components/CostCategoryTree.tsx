"use client";

import { useMemo } from "react";
import { Info, Plus, Trash2, UserPlus, Users, Wrench } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InlineNumber, InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { getChildren, itemAnnualCost, payrollAnnualCost } from "@/lib/calculator/engine";
import { formatKzt } from "@/lib/utils";
import type { CostCategory, CostItem, PayrollPosition, StaffMode } from "@/lib/calculator/types";
import { SERVICE_CLASS_LABELS } from "@/lib/calculator/presets";

export function CostCategoryTree() {
  const project = useActiveProject();
  const categories = project.db.categories;

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CostItem[]>();
    for (const it of project.db.items) {
      const list = map.get(it.categoryId) ?? [];
      list.push(it);
      map.set(it.categoryId, list);
    }
    return map;
  }, [project.db.items]);

  const payrollByCategory = useMemo(() => {
    const map = new Map<string, PayrollPosition[]>();
    for (const p of project.db.payroll) {
      const list = map.get(p.categoryId) ?? [];
      list.push(p);
      map.set(p.categoryId, list);
    }
    return map;
  }, [project.db.payroll]);

  const roots = getChildren(categories, null);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-4">
        {roots.map((root) => (
          <div key={root.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                {root.code}. {root.name}
              </h3>
              {root.order166Ref && (
                <span className="text-[11px] text-slate-400">{root.order166Ref}</span>
              )}
            </div>
            <CategoryChildren
              categories={categories}
              parentId={root.id}
              itemsByCategory={itemsByCategory}
              payrollByCategory={payrollByCategory}
            />
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

function CategoryChildren({
  categories,
  parentId,
  itemsByCategory,
  payrollByCategory,
}: {
  categories: CostCategory[];
  parentId: string;
  itemsByCategory: Map<string, CostItem[]>;
  payrollByCategory: Map<string, PayrollPosition[]>;
}) {
  const children = getChildren(categories, parentId);

  return (
    <Accordion type="multiple" className="ml-1">
      {children.map((cat) => (
        <AccordionItem key={cat.id} value={cat.id}>
          <AccordionTrigger>
            <span>
              <span className="text-slate-400">{cat.code}</span> {cat.name}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ItemGroupList
              categoryId={cat.id}
              items={itemsByCategory.get(cat.id) ?? []}
              payroll={payrollByCategory.get(cat.id) ?? []}
            />
            <CategoryChildren
              categories={categories}
              parentId={cat.id}
              itemsByCategory={itemsByCategory}
              payrollByCategory={payrollByCategory}
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function ItemGroupList({
  categoryId,
  items,
  payroll,
}: {
  categoryId: string;
  items: CostItem[];
  payroll: PayrollPosition[];
}) {
  const toggleItem = useProjectsStore((s) => s.toggleItem);
  const updateItem = useProjectsStore((s) => s.updateItem);
  const removeItem = useProjectsStore((s) => s.removeItem);
  const addItem = useProjectsStore((s) => s.addItem);
  const togglePayroll = useProjectsStore((s) => s.togglePayroll);
  const updatePayroll = useProjectsStore((s) => s.updatePayroll);
  const removePayroll = useProjectsStore((s) => s.removePayroll);
  const addPayroll = useProjectsStore((s) => s.addPayroll);
  const toggleStaffOutsourceGroup = useProjectsStore((s) => s.toggleStaffOutsourceGroup);
  const taxRates = useActiveProject().db.taxRates;

  const groups = new Set<string>();
  for (const p of payroll) if (p.staffOutsourceGroup) groups.add(p.staffOutsourceGroup);
  for (const it of items) if (it.staffOutsourceGroup) groups.add(it.staffOutsourceGroup);

  return (
    <div className="flex flex-col gap-1">
      {[...groups].map((g) => {
        const activeIsStaff = payroll.find((p) => p.staffOutsourceGroup === g && p.mode === "staff")?.enabled;
        return (
          <div key={g} className="mb-1 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-800/60">
            <Wrench className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Режим:</span>
            <div className="inline-flex overflow-hidden rounded-full border border-slate-300 text-[11px] dark:border-slate-700">
              <button
                className={`px-2 py-0.5 ${!activeIsStaff ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-500"}`}
                onClick={() => toggleStaffOutsourceGroup(g, "outsource")}
              >
                Аутсорс
              </button>
              <button
                className={`px-2 py-0.5 ${activeIsStaff ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-500"}`}
                onClick={() => toggleStaffOutsourceGroup(g, "staff")}
              >
                Штат
              </button>
            </div>
          </div>
        );
      })}

      {payroll.map((p) => {
        const annual = payrollAnnualCost(p, taxRates);
        return (
          <PayrollRow
            key={p.id}
            position={p}
            annual={annual}
            onToggle={() => togglePayroll(p.id)}
            onUpdate={(patch) => updatePayroll(p.id, patch)}
            onRemove={() => removePayroll(p.id)}
          />
        );
      })}

      {items.map((it) => {
        const annual = itemAnnualCost(it);
        return (
          <ItemRow
            key={it.id}
            item={it}
            annual={annual}
            onToggle={() => toggleItem(it.id)}
            onUpdate={(patch) => updateItem(it.id, patch)}
            onRemove={() => removeItem(it.id)}
          />
        );
      })}

      <div className="mt-1 flex gap-2 pl-8">
        <button
          onClick={() =>
            addItem(categoryId, { name: "Новая позиция", unit: "шт.", unitPrice: 0, annualQty: 1 })
          }
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          <Plus className="h-3.5 w-3.5" /> Добавить позицию
        </button>
        <button
          onClick={() =>
            addPayroll(categoryId, { role: "Новая должность", mode: "staff", headcount: 1, monthlySalaryOrContract: 0 })
          }
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <UserPlus className="h-3.5 w-3.5" /> Добавить сотрудника
        </button>
      </div>
    </div>
  );
}

function RowShell({
  enabled,
  onToggle,
  onRemove,
  icon,
  tooltip,
  source,
  serviceClass,
  children,
  trailing,
}: {
  enabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
  icon?: React.ReactNode;
  tooltip?: string;
  source?: string;
  serviceClass?: keyof typeof SERVICE_CLASS_LABELS;
  children: React.ReactNode;
  trailing: React.ReactNode;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <Switch checked={enabled} onCheckedChange={onToggle} />
      {icon}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5">{children}</div>
      {serviceClass && (
        <Badge variant="outline" className="shrink-0">
          {SERVICE_CLASS_LABELS[serviceClass]}+
        </Badge>
      )}
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 shrink-0 cursor-help text-slate-400" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
            {source && <p className="mt-1 text-slate-300">Источник: {source}</p>}
          </TooltipContent>
        </Tooltip>
      )}
      {trailing}
      <button
        onClick={onRemove}
        title="Удалить позицию"
        className="shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-950"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ItemRow({
  item,
  annual,
  onToggle,
  onUpdate,
  onRemove,
}: {
  item: CostItem;
  annual: number;
  onToggle: () => void;
  onUpdate: (patch: Partial<CostItem>) => void;
  onRemove: () => void;
}) {
  return (
    <RowShell
      enabled={item.enabled}
      onToggle={onToggle}
      onRemove={onRemove}
      tooltip={item.tooltip}
      source={item.source}
      serviceClass={item.minServiceClass}
      trailing={
        <span className={`shrink-0 text-sm font-medium tabular-nums ${item.enabled ? "text-slate-700 dark:text-slate-200" : "text-slate-300"}`}>
          {formatKzt(annual / 12)}/мес
        </span>
      }
    >
      <InlineText
        value={item.name}
        onChange={(v) => onUpdate({ name: v })}
        className="min-w-[10rem] flex-1 font-medium"
      />
      <InlineNumber value={item.annualQty} onChange={(v) => onUpdate({ annualQty: v })} className="w-16" title="Кол-во в год" />
      <InlineText value={item.unit} onChange={(v) => onUpdate({ unit: v })} className="w-16 text-slate-400" placeholder="ед." />
      <span className="text-slate-300">×</span>
      <InlineNumber value={item.unitPrice} onChange={(v) => onUpdate({ unitPrice: v })} className="w-24" step={0.01} title="Цена, ₸" />
      <span className="text-xs text-slate-300">₸</span>
    </RowShell>
  );
}

const MODE_LABEL: Record<StaffMode, string> = { staff: "штат", outsource: "аутсорс" };

function PayrollRow({
  position,
  annual,
  onToggle,
  onUpdate,
  onRemove,
}: {
  position: PayrollPosition;
  annual: number;
  onToggle: () => void;
  onUpdate: (patch: Partial<PayrollPosition>) => void;
  onRemove: () => void;
}) {
  return (
    <RowShell
      enabled={position.enabled}
      onToggle={onToggle}
      onRemove={onRemove}
      tooltip={position.tooltip}
      source={position.source}
      serviceClass={position.minServiceClass}
      icon={<Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
      trailing={
        <span className={`shrink-0 text-sm font-medium tabular-nums ${position.enabled ? "text-slate-700 dark:text-slate-200" : "text-slate-300"}`}>
          {formatKzt(annual / 12)}/мес
        </span>
      }
    >
      <InlineText
        value={position.role}
        onChange={(v) => onUpdate({ role: v })}
        className="min-w-[10rem] flex-1 font-medium"
      />
      <span className="text-slate-300">×</span>
      <InlineNumber value={position.headcount} onChange={(v) => onUpdate({ headcount: Math.max(1, Math.round(v)) })} className="w-12" title="Численность, чел." />
      <span className="text-slate-300">чел.,</span>
      <InlineNumber
        value={position.monthlySalaryOrContract}
        onChange={(v) => onUpdate({ monthlySalaryOrContract: v })}
        className="w-24"
        step={1000}
        title="Оклад/договор в мес., ₸"
      />
      <span className="text-xs text-slate-300">₸/мес</span>
      {!position.staffOutsourceGroup && (
        <select
          value={position.mode}
          onChange={(e) => onUpdate({ mode: e.target.value as StaffMode })}
          className="h-7 rounded-md border border-slate-200 bg-transparent px-1 text-xs text-slate-500 dark:border-slate-700"
        >
          <option value="staff">{MODE_LABEL.staff}</option>
          <option value="outsource">{MODE_LABEL.outsource}</option>
        </select>
      )}
    </RowShell>
  );
}
