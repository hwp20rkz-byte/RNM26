"use client";

import { useMemo } from "react";
import { Info, Users, Wrench } from "lucide-react";
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
import { useCalculatorStore } from "@/store/useCalculatorStore";
import { getChildren, itemAnnualCost, payrollAnnualCost } from "@/lib/calculator/engine";
import { formatKzt } from "@/lib/utils";
import type { CostCategory, CostItem, PayrollPosition } from "@/lib/calculator/types";
import { SERVICE_CLASS_LABELS } from "@/lib/calculator/presets";

export function CostCategoryTree() {
  const db = useCalculatorStore((s) => s.db);
  const categories = db.categories;

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CostItem[]>();
    for (const it of db.items) {
      const list = map.get(it.categoryId) ?? [];
      list.push(it);
      map.set(it.categoryId, list);
    }
    return map;
  }, [db.items]);

  const payrollByCategory = useMemo(() => {
    const map = new Map<string, PayrollPosition[]>();
    for (const p of db.payroll) {
      const list = map.get(p.categoryId) ?? [];
      list.push(p);
      map.set(p.categoryId, list);
    }
    return map;
  }, [db.payroll]);

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
            <ItemGroupList items={itemsByCategory.get(cat.id) ?? []} payroll={payrollByCategory.get(cat.id) ?? []} />
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
  items,
  payroll,
}: {
  items: CostItem[];
  payroll: PayrollPosition[];
}) {
  const toggleItem = useCalculatorStore((s) => s.toggleItem);
  const togglePayroll = useCalculatorStore((s) => s.togglePayroll);
  const toggleStaffOutsourceGroup = useCalculatorStore((s) => s.toggleStaffOutsourceGroup);
  const taxRates = useCalculatorStore((s) => s.db.taxRates);

  if (items.length === 0 && payroll.length === 0) return null;

  const groups = new Set<string>();
  for (const p of payroll) if (p.staffOutsourceGroup) groups.add(p.staffOutsourceGroup);
  for (const it of items) if (it.staffOutsourceGroup) groups.add(it.staffOutsourceGroup);

  return (
    <div className="flex flex-col gap-2">
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
          <Row
            key={p.id}
            name={`${p.role}${p.headcount > 1 ? ` × ${p.headcount}` : ""}`}
            unitInfo={`${formatKzt(p.monthlySalaryOrContract)}/мес · ${p.mode === "staff" ? "в штате" : "по договору"}`}
            annual={annual}
            enabled={p.enabled}
            onToggle={() => togglePayroll(p.id)}
            tooltip={p.tooltip}
            source={p.source}
            serviceClass={p.minServiceClass}
            icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
          />
        );
      })}

      {items.map((it) => {
        const annual = itemAnnualCost(it);
        return (
          <Row
            key={it.id}
            name={it.name}
            unitInfo={`${it.annualQty.toLocaleString("ru-RU")} ${it.unit} × ${it.unitPrice.toLocaleString("ru-RU")} ₸`}
            annual={annual}
            enabled={it.enabled}
            onToggle={() => toggleItem(it.id)}
            tooltip={it.tooltip}
            source={it.source}
            serviceClass={it.minServiceClass}
          />
        );
      })}
    </div>
  );
}

function Row({
  name,
  unitInfo,
  annual,
  enabled,
  onToggle,
  tooltip,
  source,
  serviceClass,
  icon,
}: {
  name: string;
  unitInfo: string;
  annual: number;
  enabled: boolean;
  onToggle: () => void;
  tooltip?: string;
  source?: string;
  serviceClass?: keyof typeof SERVICE_CLASS_LABELS;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <Switch checked={enabled} onCheckedChange={onToggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className={`truncate text-sm ${enabled ? "text-slate-800 dark:text-slate-100" : "text-slate-400 line-through"}`}>
            {name}
          </span>
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
        </div>
        <span className="text-xs text-slate-400">{unitInfo}</span>
      </div>
      <span className={`shrink-0 text-sm font-medium tabular-nums ${enabled ? "text-slate-700 dark:text-slate-200" : "text-slate-300"}`}>
        {formatKzt(annual / 12)}/мес
      </span>
    </div>
  );
}
