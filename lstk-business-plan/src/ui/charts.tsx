import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { MonthRow } from "../model/types";
import type { SensitivityRow } from "../model/calc";
import { axisShort, money, moneyShort } from "../format";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** «Круглые» деления оси: 0 / 20 млн / 40 млн … */
function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return ticks;
}

const PAD = { top: 16, right: 16, bottom: 32, left: 64 };
const HEIGHT = 240;

interface MonthChartProps {
  title: string;
  description: string;
  months: MonthRow[];
  legend?: ReactNode;
  children: (ctx: {
    x: (i: number) => number;
    y: (v: number) => number;
    band: number;
    innerW: number;
    innerH: number;
  }) => ReactNode;
  value: (m: MonthRow) => number;
  tooltip: (m: MonthRow) => ReactNode;
  /** Столбцы — x в центре полосы; линия — x в точке */
  mode: "line" | "column";
}

function MonthChart({ title, description, months, legend, children, value, tooltip, mode }: MonthChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = months.length;
  const innerW = Math.max(100, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const values = months.map(value);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const band = innerW / n;
  const x = mode === "column" ? (i: number) => PAD.left + band * (i + 0.5) : (i: number) => PAD.left + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 72))));

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const i = mode === "column" ? Math.floor(px / band) : Math.round((px / innerW) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  const tipLeft = hover === null ? 0 : Math.min(Math.max(x(hover) - 96, 0), width - 192);

  return (
    <figure className="chart">
      <figcaption>
        <h3 className="chart__title">{title}</h3>
        <p className="chart__desc">{description}</p>
        {legend}
      </figcaption>
      <div className="chart__plot" ref={ref}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${title}. ${description}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} className={t === 0 ? "chart__zero" : "chart__grid"} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart__tick">
                {axisShort(t)}
              </text>
            </g>
          ))}
          {months.map((m, i) =>
            i % labelEvery === 0 ? (
              <text key={m.month} x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="chart__tick">
                {m.label}
              </text>
            ) : null
          )}
          {children({ x, y, band, innerW, innerH })}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="chart__cross" />
          )}
          {hover !== null && mode === "line" && <circle cx={x(hover)} cy={y(values[hover])} r={5} className="chart__dot" />}
        </svg>
        {hover !== null && (
          <div className="chart__tip" style={{ left: tipLeft }} role="status">
            <strong>{months[hover].label}</strong>
            {tooltip(months[hover])}
          </div>
        )}
      </div>
    </figure>
  );
}

export function CashChart({ months }: { months: MonthRow[] }) {
  const min = months.reduce((a, m, i) => (m.cashEnd < months[a].cashEnd ? i : a), 0);
  return (
    <MonthChart
      title="Остаток денег на счёте"
      description="С учётом капитала, кредита и всех платежей. Ниже нуля — кассовый разрыв."
      months={months}
      mode="line"
      value={(m) => m.cashEnd}
      tooltip={(m) => (
        <dl>
          <dt>Остаток</dt>
          <dd>{money(m.cashEnd)}</dd>
          <dt>Поступления</dt>
          <dd>{money(m.cashIn)}</dd>
          <dt>Долг по кредиту</dt>
          <dd>{money(m.loanBalance)}</dd>
        </dl>
      )}
    >
      {({ x, y }) => {
        const pts = months.map((m, i) => `${x(i)},${y(m.cashEnd)}`).join(" ");
        const area = `${x(0)},${y(0)} ${pts} ${x(months.length - 1)},${y(0)}`;
        const last = months.length - 1;
        return (
          <g>
            <polygon points={area} className="chart__area" />
            <polyline points={pts} className="chart__line" />
            <circle cx={x(min)} cy={y(months[min].cashEnd)} r={4} className="chart__dot" />
            <text x={x(min)} y={y(months[min].cashEnd)} dy={months[min].cashEnd < 0 ? 20 : -12} textAnchor={min > last * 0.8 ? "end" : "middle"} className="chart__label">
              мин. {moneyShort(months[min].cashEnd)}
            </text>
            <circle cx={x(last)} cy={y(months[last].cashEnd)} r={4} className="chart__dot" />
          </g>
        );
      }}
    </MonthChart>
  );
}

export function EbitdaChart({ months }: { months: MonthRow[] }) {
  return (
    <MonthChart
      title="Операционная прибыль (EBITDA) по месяцам"
      description="Выручка по ходу стройки минус себестоимость, комиссия и постоянные расходы."
      months={months}
      mode="column"
      value={(m) => m.ebitda}
      legend={
        <ul className="legend">
          <li>
            <span className="swatch swatch--pos" aria-hidden="true" />
            Прибыль
          </li>
          <li>
            <span className="swatch swatch--neg" aria-hidden="true" />
            Убыток
          </li>
        </ul>
      }
      tooltip={(m) => (
        <dl>
          <dt>EBITDA</dt>
          <dd>{money(m.ebitda)}</dd>
          <dt>Выручка</dt>
          <dd>{money(m.revenue)}</dd>
          <dt>Договоров</dt>
          <dd>{m.contracts.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}</dd>
        </dl>
      )}
    >
      {({ x, y, band }) => {
        const w = Math.max(2, Math.min(24, band - 2));
        return (
          <g>
            {months.map((m, i) => {
              const v = m.ebitda;
              if (v === 0) return null;
              const top = y(Math.max(v, 0));
              const h = Math.abs(y(v) - y(0));
              const r = Math.min(4, w / 2, h);
              const x0 = x(i) - w / 2;
              // скругление только на «конце данных», у базовой линии — прямой угол
              const d =
                v > 0
                  ? `M${x0},${top + h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + w - r} Q${x0 + w},${top} ${x0 + w},${top + r} V${top + h} Z`
                  : `M${x0},${top} V${top + h - r} Q${x0},${top + h} ${x0 + r},${top + h} H${x0 + w - r} Q${x0 + w},${top + h} ${x0 + w},${top + h - r} V${top} Z`;
              return <path key={m.month} d={d} className={v > 0 ? "chart__bar--pos" : "chart__bar--neg"} />;
            })}
          </g>
        );
      }}
    </MonthChart>
  );
}

export function Tornado({ base, rows }: { base: number; rows: SensitivityRow[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const labelW = width < 480 ? 112 : 160;
  const rowH = 40;
  const pad = { top: 24, right: 16, bottom: 8, left: labelW };
  const innerW = Math.max(80, width - pad.left - pad.right);
  const height = pad.top + rows.length * rowH + pad.bottom;
  const all = rows.flatMap((r) => [r.low, r.high]).concat(base);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const x = (v: number) => pad.left + ((v - lo) / span) * innerW;
  const barH = 20;

  const segment = (from: number, to: number, cls: string, key: string, label: string) => {
    const x1 = Math.min(x(from), x(to));
    const w = Math.max(2, Math.abs(x(to) - x(from)));
    return (
      <rect key={key} x={x1} width={w} height={barH} rx={4} className={cls}>
        <title>{label}</title>
      </rect>
    );
  };

  return (
    <figure className="chart">
      <figcaption>
        <h3 className="chart__title">Что сильнее всего двигает NPV</h3>
        <p className="chart__desc">
          Базовый NPV {moneyShort(base)}. Каждая строка — изменение одного допущения при прочих равных.
        </p>
        <ul className="legend">
          <li>
            <span className="swatch swatch--pos" aria-hidden="true" />
            NPV растёт
          </li>
          <li>
            <span className="swatch swatch--neg" aria-hidden="true" />
            NPV падает
          </li>
        </ul>
      </figcaption>
      <div className="chart__plot" ref={ref}>
        <svg width={width} height={height} role="img" aria-label="Чувствительность NPV к допущениям">
          <line x1={x(base)} x2={x(base)} y1={pad.top - 8} y2={height - pad.bottom} className="chart__zero" />
          <text x={x(base)} y={pad.top - 12} textAnchor="middle" className="chart__tick">
            база
          </text>
          {rows.map((r, i) => {
            const cy = pad.top + i * rowH + (rowH - barH) / 2;
            return (
              <g key={r.name} transform={`translate(0 ${cy})`}>
                <text x={pad.left - 12} y={barH / 2} dy="0.32em" textAnchor="end" className="chart__label">
                  {r.name}
                </text>
                {segment(base, r.low, r.low >= base ? "chart__bar--pos" : "chart__bar--neg", "low", `${r.name} ${r.lowLabel}: NPV ${money(r.low)}`)}
                {segment(base, r.high, r.high >= base ? "chart__bar--pos" : "chart__bar--neg", "high", `${r.name} ${r.highLabel}: NPV ${money(r.high)}`)}
                <text x={Math.min(x(r.low), x(r.high)) - 4} y={barH / 2} dy="0.32em" textAnchor="end" className="chart__tick">
                  {Math.min(x(r.low), x(r.high)) - pad.left > 40 ? (r.low < r.high ? r.lowLabel : r.highLabel) : ""}
                </text>
                <text x={Math.max(x(r.low), x(r.high)) + 4} y={barH / 2} dy="0.32em" className="chart__tick">
                  {pad.left + innerW - Math.max(x(r.low), x(r.high)) > 40 ? (r.low < r.high ? r.highLabel : r.lowLabel) : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
