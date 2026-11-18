"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_ASSUMPTIONS, mln, runPlan, sensitivity } from "@/domain/business/plan";
import type { MonthRow, PlanAssumptions } from "@/domain/business/plan";

/**
 * Интерактивная финансовая модель: ползунки допущений, показатели, два графика
 * (накопленный денежный поток и месячный результат) с общей подсказкой при
 * наведении, квартальная таблица и чувствительность. Всё считает runPlan().
 */

const W = 720;
const PAD = { l: 48, r: 16, t: 16, b: 28 };

/** Масштаб viewBox к реальной ширине: k = 720 / ширина. На телефоне k ≈ 2, и шрифт в единицах viewBox удваивается, чтобы на экране остаться 12 px */
function useScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(Math.max(1, W / Math.max(1, e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, k };
}

function scaleY(min: number, max: number, h: number) {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  const span = hi - lo || 1;
  return (v: number) => PAD.t + ((hi - v) / span) * (h - PAD.t - PAD.b);
}

function niceTicks(min: number, max: number): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  const raw = (hi - lo) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-6; v += step) ticks.push(Math.round(v));
  return ticks;
}

const xFor = (i: number, n: number) => PAD.l + ((i + 0.5) / n) * (W - PAD.l - PAD.r);

function Axis({ ticks, y, h, k }: { ticks: number[]; y: (v: number) => number; h: number; k: number }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={PAD.l - 6} y={y(t) + 4 * k} textAnchor="end" fontSize={11 * k} fill="var(--fg-muted)">
            {mln(t, Math.abs(t) < 1e6 && t !== 0 ? 1 : 0)}
          </text>
        </g>
      ))}
      {[1, 6, 12, 18, 24].map((m) => (
        <text key={m} x={xFor(m - 1, 24)} y={h - 8} textAnchor="middle" fontSize={11 * k} fill="var(--fg-muted)">
          {m}
        </text>
      ))}
    </g>
  );
}

function HitLayer({ n, h, onHover }: { n: number; h: number; onHover: (i: number | null) => void }) {
  const bw = (W - PAD.l - PAD.r) / n;
  return (
    <g onMouseLeave={() => onHover(null)}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={PAD.l + i * bw} y={0} width={bw} height={h} fill="transparent" onMouseEnter={() => onHover(i)} onClick={() => onHover(i)} />
      ))}
    </g>
  );
}

function CashChart({ months, capex, hover, setHover, paybackMonth, k }: { months: MonthRow[]; capex: number; hover: number | null; setHover: (i: number | null) => void; paybackMonth: number | null; k: number }) {
  const H = Math.round(240 * Math.max(1, k * 0.7));
  const fs = 12 * k;
  const narrow = k > 1.4;
  const vals = months.map((m) => m.cumulative);
  const min = Math.min(-capex, ...vals);
  const max = Math.max(...vals);
  const range = Math.max(max, 0) - Math.min(min, 0) || 1;
  // запас снизу под подпись минимума и сверху под подпись итога, чтобы они не наезжали на оси
  const y = scaleY(min - range * 0.2, max + range * 0.12, H);
  const ticks = niceTicks(min, max);
  const pts = vals.map((v, i) => `${xFor(i, 24)},${y(v)}`).join(" ");
  const troughI = vals.indexOf(Math.min(...vals));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Накопленный денежный поток по месяцам: минимум ${mln(vals[troughI]!)} млн ₸ на ${troughI + 1}-м месяце, ${mln(vals[23]!)} млн ₸ к 24-му месяцу`}>
      <Axis ticks={ticks} y={y} h={H} k={k} />
      {hover !== null && <line x1={xFor(hover, 24)} x2={xFor(hover, 24)} y1={PAD.t} y2={H - PAD.b} stroke="var(--fg-muted)" strokeWidth={k} />}
      <polyline points={pts} fill="none" stroke="var(--chart-pos)" strokeWidth={2 * k} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xFor(troughI, 24)} cy={y(vals[troughI]!)} r={5 * k} fill="var(--chart-neg)" stroke="var(--bg-elevated)" strokeWidth={2 * k} />
      <text x={xFor(troughI, 24) + 8 * k} y={y(vals[troughI]!) + 18 * k} fontSize={fs} fill="var(--fg)">
        {narrow ? `нужно ${mln(vals[troughI]!)} млн ₸` : `минимум ${mln(vals[troughI]!)} млн ₸ — столько денег нужно`}
      </text>
      {paybackMonth !== null && (
        <g>
          <circle cx={xFor(paybackMonth - 1, 24)} cy={y(vals[paybackMonth - 1]!)} r={5 * k} fill="var(--chart-pos)" stroke="var(--bg-elevated)" strokeWidth={2 * k} />
          <text x={xFor(paybackMonth - 1, 24) - 8 * k} y={y(vals[paybackMonth - 1]!) - 10 * k} textAnchor="end" fontSize={fs} fill="var(--fg)">
            {narrow ? `окупаемость ${paybackMonth} мес.` : `окупаемость: ${paybackMonth}-й месяц`}
          </text>
        </g>
      )}
      <text x={xFor(23, 24)} y={y(vals[23]!) - 10 * k} textAnchor="end" fontSize={fs} fontWeight="600" fill="var(--fg)">
        {mln(vals[23]!)} млн ₸
      </text>
      {hover !== null && <circle cx={xFor(hover, 24)} cy={y(vals[hover]!)} r={4 * k} fill="var(--chart-pos)" stroke="var(--bg-elevated)" strokeWidth={2 * k} />}
      <HitLayer n={24} h={H} onHover={setHover} />
    </svg>
  );
}

function ResultChart({ months, hover, setHover, k }: { months: MonthRow[]; hover: number | null; setHover: (i: number | null) => void; k: number }) {
  const H = Math.round(200 * Math.max(1, k * 0.7));
  const vals = months.map((m) => m.result);
  const y = scaleY(Math.min(...vals), Math.max(...vals), H);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const bw = Math.min(16, ((W - PAD.l - PAD.r) / 24) * 0.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Месячный операционный результат: столбцы вверх — прибыль, вниз — убыток">
      <Axis ticks={ticks} y={y} h={H} k={k} />
      {vals.map((v, i) => {
        const top = Math.min(y(v), y(0));
        const hgt = Math.max(1, Math.abs(y(v) - y(0)));
        const r = Math.min(4, hgt / 2);
        const x = xFor(i, 24) - bw / 2;
        // скругление только у конца столбца, у нулевой линии — прямой угол
        const d =
          v >= 0
            ? `M${x},${top + hgt} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${top + hgt} Z`
            : `M${x},${top} V${top + hgt - r} Q${x},${top + hgt} ${x + r},${top + hgt} H${x + bw - r} Q${x + bw},${top + hgt} ${x + bw},${top + hgt - r} V${top} Z`;
        return <path key={i} d={d} fill={v >= 0 ? "var(--chart-pos)" : "var(--chart-neg)"} opacity={hover === null || hover === i ? 1 : 0.45} />;
      })}
      <HitLayer n={24} h={H} onHover={setHover} />
    </svg>
  );
}

function Slider({ id, label, value, min, max, step, format, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between gap-4">
        <span className="text-fg-muted">{label}</span>
        <span className="font-mono tabular-nums">{format(value)}</span>
      </span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-h-11 w-full accent-[var(--primary-500)]" />
    </label>
  );
}

const tys = (v: number) => `${Math.round(v / 1000).toLocaleString("ru-RU")} тыс. ₸`;
const pct = (v: number) => `${Math.round(v * 100)} %`;

export function PlanModel() {
  const [a, setA] = useState<PlanAssumptions>(DEFAULT_ASSUMPTIONS);
  const [hover, setHover] = useState<number | null>(null);
  const r = useMemo(() => runPlan(a), [a]);
  const sens = useMemo(() => sensitivity(a), [a]);
  const set = (patch: Partial<PlanAssumptions>) => setA((prev) => ({ ...prev, ...patch }));
  const hm = hover !== null ? r.months[hover]! : null;
  const isDefault = JSON.stringify(a) === JSON.stringify(DEFAULT_ASSUMPTIONS);
  const { ref: chartsRef, k } = useScale();

  const tiles = [
    { label: "Нужно денег на старт", value: `${mln(r.peakNeedKzt)} млн ₸`, note: "капзатраты плюс убытки первых месяцев" },
    { label: "Безубыточность", value: Number.isFinite(r.breakEvenOrders) ? `${r.breakEvenOrders} заказов в месяц` : "недостижима", note: "при постоянных расходах первого полугодия" },
    { label: "Окупаемость", value: r.paybackMonth ? `${r.paybackMonth}-й месяц` : "за 24 месяца нет", note: "накопленный поток выходит в плюс" },
    { label: "Результат год 1 / год 2", value: `${mln(r.years[0]!.result)} / ${mln(r.years[1]!.result)} млн ₸`, note: `выручка ${mln(r.years[0]!.revenue, 0)} / ${mln(r.years[1]!.revenue, 0)} млн ₸` },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-1 rounded-xl border border-border bg-bg-elevated p-4">
            <span className="text-sm text-fg-muted">{t.label}</span>
            <span className={`font-display text-lg font-bold tabular-nums ${t.label === "Окупаемость" && !r.paybackMonth ? "text-error" : ""}`}>{t.value}</span>
            <span className="text-xs text-fg-muted">{t.note}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-elevated p-4">
          <h3 className="text-md font-semibold">Допущения</h3>
          <Slider id="plan-check" label="Средний чек заказа" value={a.avgOrderKzt} min={60_000} max={300_000} step={10_000} format={tys} onChange={(v) => set({ avgOrderKzt: v })} />
          <Slider id="plan-margin" label="Валовая маржа печати" value={a.grossMargin} min={0.2} max={0.65} step={0.01} format={pct} onChange={(v) => set({ grossMargin: v })} />
          <Slider id="plan-sales" label="Темп продаж к плану" value={a.salesFactor} min={0.4} max={1.6} step={0.05} format={pct} onChange={(v) => set({ salesFactor: v })} />
          <Slider id="plan-fixed" label="Постоянные расходы в месяц, год 1" value={a.fixedStartKzt} min={500_000} max={2_000_000} step={50_000} format={tys} onChange={(v) => set({ fixedStartKzt: v })} />
          <Slider id="plan-fixed2" label="Постоянные расходы в месяц, год 2" value={a.fixedYear2Kzt} min={500_000} max={2_500_000} step={50_000} format={tys} onChange={(v) => set({ fixedYear2Kzt: v })} />
          <Slider id="plan-capex" label="Капзатраты до первого заказа" value={a.capexKzt} min={400_000} max={2_500_000} step={50_000} format={tys} onChange={(v) => set({ capexKzt: v })} />
          <Slider id="plan-kits" label="Наборов станков в месяц с 16-го месяца" value={a.kitsPerMonth} min={0} max={8} step={1} format={(v) => `${v} шт`} onChange={(v) => set({ kitsPerMonth: v })} />
          <label htmlFor="plan-tax" className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input id="plan-tax" type="checkbox" checked={a.taxRate > 0} onChange={(e) => set({ taxRate: e.target.checked ? 0.03 : 0 })} />
            Учесть налог 3 % с оборота (упрощённая декларация)
          </label>
          <button type="button" disabled={isDefault} onClick={() => setA(DEFAULT_ASSUMPTIONS)} className="min-h-11 rounded-xl border border-border px-4 text-sm disabled:opacity-50">
            Вернуть базовый сценарий
          </button>
        </div>

        <div ref={chartsRef} className="flex min-w-0 flex-col gap-6">
          <div className="flex min-h-12 flex-wrap items-baseline gap-x-6 gap-y-1 rounded-xl bg-primary-100 px-4 py-2 text-sm" aria-live="polite">
            {hm ? (
              <>
                <span className="font-semibold">Месяц {hm.month}</span>
                <span>заказов {hm.orders}{hm.kits ? ` + наборов ${hm.kits}` : ""}</span>
                <span>выручка {mln(hm.revenue, 2)} млн ₸</span>
                <span>постоянные {mln(hm.fixed, 2)}</span>
                <span>результат {mln(hm.result, 2)}</span>
                <span>накоплено {mln(hm.cumulative, 2)} млн ₸</span>
              </>
            ) : (
              <span className="text-fg-muted">Наведите на график или нажмите на месяц, чтобы увидеть его цифры</span>
            )}
          </div>
          <figure className="flex flex-col gap-2">
            <figcaption className="text-sm font-semibold">Накопленный денежный поток, млн ₸, по месяцам</figcaption>
            <CashChart months={r.months} capex={a.capexKzt} hover={hover} setHover={setHover} paybackMonth={r.paybackMonth} k={k} />
          </figure>
          <figure className="flex flex-col gap-2">
            <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="font-semibold">Результат месяца, млн ₸</span>
              <span className="inline-flex items-center gap-2 text-fg-muted">
                <span className="inline-block h-3 w-3 rounded-sm bg-chart-pos" />
                прибыль
              </span>
              <span className="inline-flex items-center gap-2 text-fg-muted">
                <span className="inline-block h-3 w-3 rounded-sm bg-chart-neg" />
                убыток
              </span>
            </figcaption>
            <ResultChart months={r.months} hover={hover} setHover={setHover} k={k} />
          </figure>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="font-semibold">По кварталам, млн ₸</h3>
          <div className="overflow-x-auto">
            <table className="data tabular-nums">
              <thead>
                <tr>
                  <th>Квартал</th>
                  <th>Заказов в месяц</th>
                  <th>Выручка</th>
                  <th>Валовая прибыль</th>
                  <th>Постоянные</th>
                  <th>Результат</th>
                  <th>Накоплено</th>
                </tr>
              </thead>
              <tbody>
                {r.quarters.map((q) => (
                  <tr key={q.quarter}>
                    <td>К{q.quarter}</td>
                    <td>
                      {q.ordersPerMonth.join(", ")}
                      {q.kits ? ` + ${q.kits} наб.` : ""}
                    </td>
                    <td>{mln(q.revenue)}</td>
                    <td>{mln(q.grossProfit)}</td>
                    <td>{mln(q.fixed)}</td>
                    <td className={q.result < 0 ? "text-error" : ""}>{mln(q.result)}</td>
                    <td className={q.cumulative < 0 ? "text-error" : ""}>{mln(q.cumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="font-semibold">Чувствительность</h3>
          <div className="overflow-x-auto">
            <table className="data tabular-nums">
              <thead>
                <tr>
                  <th>Если</th>
                  <th>Окупаемость</th>
                  <th>Год 2, млн ₸</th>
                </tr>
              </thead>
              <tbody>
                {sens.map((s) => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td className={s.paybackMonth ? "" : "text-error"}>{s.paybackMonth ? `${s.paybackMonth}-й мес.` : "нет за 24 мес."}</td>
                    <td>{mln(s.year2Result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-fg-muted">Каждая строка меняет одно допущение относительно текущих значений ползунков.</p>
        </div>
      </div>
    </div>
  );
}
