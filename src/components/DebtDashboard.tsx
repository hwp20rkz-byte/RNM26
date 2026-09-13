"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Info, Send, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveProject } from "@/store/hooks";
import { buildDebtNoticeMessage, buildWaLinkToPhone, computeRegistryDebtSummary } from "@/lib/calculator/ownerRegistryEngine";
import { formatKzt } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

const COLOR_ELEVATOR = "#7c3aed";
const COLOR_OPERATIONAL = "#dc2626";

export function DebtDashboard() {
  const t = useT();
  const project = useActiveProject();
  const summary = useMemo(() => computeRegistryDebtSummary(project.units, 10), [project.units]);

  const byServiceData = useMemo(
    () =>
      [
        { name: t("orDebtOperationalLabel"), value: summary.operationalDebtKzt, color: COLOR_OPERATIONAL },
        { name: t("orDebtElevatorLabel"), value: summary.elevatorDebtKzt, color: COLOR_ELEVATOR },
      ].filter((d) => d.value > 0),
    [summary, t],
  );

  const topDebtorsChartData = useMemo(
    () =>
      summary.topDebtors.map((d) => ({
        name: `№${d.unit.number}`,
        value: d.status.totalDebtKzt,
      })),
    [summary.topDebtors],
  );

  function sendReminder(unitId: string) {
    const entry = summary.topDebtors.find((d) => d.unit.id === unitId);
    if (!entry || !entry.unit.ownerPhone) return;
    const message = buildDebtNoticeMessage(entry.unit, entry.status, project.name);
    window.open(buildWaLinkToPhone(entry.unit.ownerPhone, message), "_blank");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <CardTitle>{t("ddTitle")}</CardTitle>
        </div>
        <CardDescription>{t("ddDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary.unitsWithDebtData === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            {t("ddNoDataHint")}
          </div>
        ) : (
          <>
            {summary.debtPeriod && (
              <p className="text-xs text-slate-400">
                {t("ddPeriodPrefix")} {summary.debtPeriod}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiTile icon={<Users className="h-3.5 w-3.5" />} label={t("ddKpiDebtors")} value={String(summary.debtorCount)} />
              <KpiTile label={t("ddKpiTotalDebt")} value={formatKzt(summary.totalDebtKzt)} emphasize />
              <KpiTile label={t("ddKpiElevatorDebt")} value={formatKzt(summary.elevatorDebtKzt)} />
              <KpiTile label={t("ddKpiOperationalDebt")} value={formatKzt(summary.operationalDebtKzt)} />
              <KpiTile
                label={t("ddKpiAvgMonthsElevator")}
                value={`${summary.averageDebtMonthsElevator} ${t("orDebtMonthsSuffix")}`}
              />
              <KpiTile
                label={t("ddKpiAvgMonthsOperational")}
                value={`${summary.averageDebtMonthsOperational} ${t("orDebtMonthsSuffix")}`}
              />
            </div>

            {summary.debtorCount > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <h4 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{t("ddByServiceTitle")}</h4>
                  <div style={{ height: "var(--ui-chart-h-sm)" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byServiceData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                          {byServiceData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <RTooltip formatter={(v) => formatKzt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-xs">
                    {byServiceData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="flex-1 text-slate-500 dark:text-slate-400">{d.name}</span>
                        <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatKzt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <h4 className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{t("ddTopDebtorsTitle")}</h4>
                  <div style={{ height: "var(--ui-chart-h-sm)" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topDebtorsChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200 dark:stroke-slate-800" />
                        <XAxis type="number" tickFormatter={(v: number) => formatKzt(v)} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={48} tick={{ fontSize: 11 }} />
                        <RTooltip formatter={(v) => formatKzt(Number(v))} />
                        <Bar dataKey="value" fill={COLOR_OPERATIONAL} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {summary.topDebtors.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="p-2 text-left">{t("ddTableUnit")}</th>
                      <th className="p-2 text-left">{t("ddTableOwner")}</th>
                      <th className="p-2 text-right">{t("ddTableDebt")}</th>
                      <th className="p-2 text-right">{t("ddTableMonths")}</th>
                      <th className="p-2 text-left">{t("ddTablePhone")}</th>
                      <th className="p-2 text-left">{t("ddTableAction")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topDebtors.map(({ unit, status }) => (
                      <tr key={unit.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="p-2 font-medium">{unit.number}</td>
                        <td className="p-2">{unit.ownerName || "—"}</td>
                        <td className="p-2 text-right font-medium text-rose-600 dark:text-rose-400">{formatKzt(status.totalDebtKzt)}</td>
                        <td className="p-2 text-right tabular-nums text-slate-500">
                          {Math.max(status.elevatorDebtMonths, status.operationalDebtMonths)}
                        </td>
                        <td className="p-2">{unit.ownerPhone || <span className="text-slate-400">{t("orDebtNoPhoneHint")}</span>}</td>
                        <td className="p-2">
                          {unit.ownerPhone && (
                            <button
                              onClick={() => sendReminder(unit.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-1 font-medium text-rose-700 hover:border-rose-400 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
                            >
                              <Send className="h-3 w-3" /> {t("orDebtWaButton")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{t("ddEstimateNote")}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KpiTile({ icon, label, value, emphasize }: { icon?: React.ReactNode; label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        {icon} {label}
      </div>
      <div className={emphasize ? "mt-0.5 text-lg font-semibold text-rose-600" : "mt-0.5 text-lg font-semibold text-slate-800 dark:text-slate-100"}>
        {value}
      </div>
    </div>
  );
}
