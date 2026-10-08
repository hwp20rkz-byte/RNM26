import type { MonthRow, PlanInputs, PlanResult } from "../model/types";
import { CaretDown, CheckCircle, HouseLine, Warning, WarningOctagon } from "@phosphor-icons/react";
import { moneyShort, months as monthsWord, num, num1, percent } from "../format";

/** Строки модели (предупреждения) приходят с тире; в интерфейсе тире не используем */
export const dashless = (text: string) => text.replace(/\s+[\u2014\u2013]\s+/g, ", ");

export function Kpis({ result, inputs }: { result: PlanResult; inputs: PlanInputs }) {
  const funded = inputs.finance.equity + inputs.finance.loanAmount;
  const items: { label: string; value: string; unit?: string; note: string; neg?: boolean }[] = [
    {
      label: "Внутренняя доходность (IRR)",
      value: result.irr === null ? "не определена" : percent(result.irr),
      note: result.irr === null ? "поток не меняет знак" : "годовых"
    },
    {
      label: "Окупаемость",
      value: result.paybackMonth === null ? "за горизонтом" : monthsWord(result.paybackMonth + 1),
      note: `горизонт ${monthsWord(inputs.finance.horizonMonths)}`
    },
    {
      label: "Нужно денег на пике",
      value: moneyShort(result.peakFunding),
      note: `привлечено ${moneyShort(funded)}`,
      neg: result.peakFunding > funded
    },
    {
      label: "Точка безубыточности",
      value: result.breakEvenPerMonth === null ? "недостижима" : num1(result.breakEvenPerMonth),
      unit: result.breakEvenPerMonth === null ? undefined : "дог./мес.",
      note: `средний дом приносит ${moneyShort(result.avgContribution)}`,
      neg: result.breakEvenPerMonth === null
    },
    {
      label: "Чистая прибыль за горизонт",
      value: moneyShort(result.totals.netProfit),
      note: `выручка ${moneyShort(result.totals.revenue)}, ${num1(result.totals.contracts)} договоров`,
      neg: result.totals.netProfit < 0
    }
  ];
  return (
    <>
      <h2 id="kpi-title" className="visually-hidden">
        Главные показатели
      </h2>
      <dl className="kpis">
        <div className={result.npv < 0 ? "kpi kpi--lead is-neg" : "kpi kpi--lead"}>
          <dt>Чистая приведённая стоимость (NPV)</dt>
          <dd className="kpi__value tabular">{moneyShort(result.npv)}</dd>
          <dd className="kpi__note">при ставке {num1(inputs.finance.discountRatePct)}% годовых, без остаточной стоимости</dd>
        </div>
        {items.map((k) => (
          <div className={k.neg ? "kpi is-neg" : "kpi"} key={k.label}>
            <dt>{k.label}</dt>
            <dd className="kpi__value tabular">
              {k.value}
              {k.unit && <span className="kpi__unit"> {k.unit}</span>}
            </dd>
            <dd className="kpi__note">{k.note}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function Warnings({ result }: { result: PlanResult }) {
  if (result.warnings.length === 0) {
    return (
      <p className="alert alert--ok" role="status">
        <CheckCircle aria-hidden="true" />
        <span>Кассовых разрывов и убыточных домов нет.</span>
      </p>
    );
  }
  return (
    <ul className="alerts" aria-label="Предупреждения">
      {result.warnings.map((w, i) => (
        <li key={i} className={w.level === "error" ? "alert alert--error" : "alert alert--warn"}>
          {w.level === "error" ? <WarningOctagon aria-hidden="true" /> : <Warning aria-hidden="true" />}
          <span>
            <strong>{w.level === "error" ? "Проблема. " : "Внимание. "}</strong>
            {dashless(w.text)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function UnitEconomics({ result }: { result: PlanResult }) {
  return (
    <section className="panel" aria-labelledby="unit-title">
      <h2 id="unit-title" className="panel__title">
        Экономика одного дома
      </h2>
      {result.houses.length === 0 ? (
        <div className="empty">
          <HouseLine size={32} aria-hidden="true" />
          <p className="empty__title">Типов домов пока нет</p>
          <p className="empty__text">Добавьте хотя бы один тип в разделе «Типы домов», и здесь появится цена, себестоимость и маржа каждого дома.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Тип</th>
                <th scope="col">Цена</th>
                <th scope="col">Каркас</th>
                <th scope="col">Материалы</th>
                <th scope="col">Работы</th>
                <th scope="col">Резерв</th>
                <th scope="col">Комиссия</th>
                <th scope="col">Маржа</th>
                <th scope="col">Маржа, %</th>
              </tr>
            </thead>
            <tbody>
              {result.houses.map((h) => (
                <tr key={h.id}>
                  <th scope="row">{h.name}</th>
                  <td>{moneyShort(h.price)}</td>
                  <td>{moneyShort(h.frameCost)}</td>
                  <td>{moneyShort(h.materialCost)}</td>
                  <td>{moneyShort(h.laborCost)}</td>
                  <td>{moneyShort(h.contingency)}</td>
                  <td>{moneyShort(h.commission)}</td>
                  <td className={h.margin < 0 ? "is-strong is-neg" : "is-strong"}>{moneyShort(h.margin)}</td>
                  <td className={h.margin < 0 ? "is-strong is-neg" : "is-strong"}>{percent(h.marginPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type Col = { key: keyof MonthRow; label: string };

const YEAR_COLS: Col[] = [
  { key: "contracts", label: "Договоров" },
  { key: "revenue", label: "Выручка" },
  { key: "grossProfit", label: "Валовая прибыль" },
  { key: "opex", label: "Постоянные расходы" },
  { key: "ebitda", label: "EBITDA" },
  { key: "interest", label: "Проценты" },
  { key: "tax", label: "Налог" },
  { key: "netProfit", label: "Чистая прибыль" },
  { key: "projectCf", label: "Поток проекта" }
];

export function YearTable({ result }: { result: PlanResult }) {
  const years: MonthRow[][] = [];
  result.months.forEach((m, i) => {
    (years[Math.floor(i / 12)] ??= []).push(m);
  });
  return (
    <section className="panel" aria-labelledby="year-title">
      <h2 id="year-title" className="panel__title">
        По годам проекта
      </h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Показатель</th>
              {years.map((y, i) => (
                <th scope="col" key={i}>
                  Год {i + 1}
                  <span className="th-sub">
                    {y[0].label} - {y[y.length - 1].label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {YEAR_COLS.map((c) => (
              <tr key={c.key} className={c.key === "netProfit" || c.key === "ebitda" ? "row--key" : undefined}>
                <th scope="row">{c.label}</th>
                {years.map((y, i) => {
                  const v = y.reduce((a, m) => a + (m[c.key] as number), 0);
                  return (
                    <td key={i} className={v < 0 ? "is-neg" : undefined}>
                      {c.key === "contracts" ? num1(v) : moneyShort(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="row--total">
              <th scope="row">Деньги на конец года</th>
              {years.map((y, i) => {
                const v = y[y.length - 1].cashEnd;
                return (
                  <td key={i} className={v < 0 ? "is-neg" : undefined}>
                    {moneyShort(v)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const MONTH_COLS: Col[] = [
  { key: "contracts", label: "Договоров" },
  { key: "frameKg", label: "Каркас, кг" },
  { key: "revenue", label: "Выручка" },
  { key: "directCost", label: "Себестоимость" },
  { key: "commission", label: "Комиссия" },
  { key: "opex", label: "Постоянные" },
  { key: "ebitda", label: "EBITDA" },
  { key: "depreciation", label: "Амортизация" },
  { key: "interest", label: "Проценты" },
  { key: "tax", label: "Налог" },
  { key: "netProfit", label: "Чистая прибыль" },
  { key: "cashIn", label: "Поступления" },
  { key: "cashOutDirect", label: "Оплата материалов и работ" },
  { key: "capex", label: "Капзатраты" },
  { key: "financingCf", label: "Финансирование" },
  { key: "cashEnd", label: "Деньги на конец" },
  { key: "loanBalance", label: "Долг" }
];

export function MonthTable({ result }: { result: PlanResult }) {
  return (
    <details className="panel panel--details">
      <summary className="panel__title">
        <span>Помесячный расчёт ({result.months.length} мес.)</span>
        <CaretDown className="chev" size={18} aria-hidden="true" />
      </summary>
      <div className="table-wrap table-wrap--tall">
        <table className="table table--dense">
          <thead>
            <tr>
              <th scope="col">Месяц</th>
              {MONTH_COLS.map((c) => (
                <th scope="col" key={c.key}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{m.label}</th>
                {MONTH_COLS.map((c) => {
                  const v = m[c.key] as number;
                  return (
                    <td key={c.key} className={v < 0 ? "is-neg" : undefined}>
                      {c.key === "contracts" ? num1(v) : c.key === "frameKg" ? num(v) : num(Math.round(v))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Суммы в тенге без НДС. Полный расчёт с точностью до тенге есть в экспорте CSV.</p>
    </details>
  );
}

export function monthCsv(result: PlanResult): string {
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = ["Месяц", ...MONTH_COLS.map((c) => c.label)].map(esc).join(";");
  const rows = result.months.map((m) =>
    [m.label, ...MONTH_COLS.map((c) => (Math.round((m[c.key] as number) * 100) / 100).toString().replace(".", ","))].map(esc).join(";")
  );
  // BOM — чтобы Excel открыл кириллицу без «кракозябр»
  return "\ufeff" + [head, ...rows].join("\r\n");
}

