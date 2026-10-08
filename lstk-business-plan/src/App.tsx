import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowCounterClockwise, CheckCircle, FileCsv, FloppyDisk, FolderOpen, HouseLine, IconContext, Printer, WarningCircle } from "@phosphor-icons/react";
import { calculate, sensitivity } from "./model/calc";
import { DEFAULT_INPUTS } from "./model/defaults";
import type { PlanInputs } from "./model/types";
import { download, loadSaved, parseInputs, save } from "./storage";
import { CapexEditor, CostItemsEditor, FinanceEditor, FrameEditor, HousesEditor, OpexEditor, PaymentsEditor, SalesEditor } from "./ui/editors";
import { CashChart, EbitdaChart, Tornado } from "./ui/charts";
import { Kpis, MonthTable, UnitEconomics, Warnings, YearTable, monthCsv } from "./ui/results";

type Flash = { tone: "ok" | "error"; text: string };

const ICONS = { size: 20, weight: "regular" as const };

export default function App() {
  const [inputs, setInputs] = useState<PlanInputs>(() => loadSaved() ?? structuredClone(DEFAULT_INPUTS));
  const [message, setMessage] = useState<Flash | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();

  useEffect(() => save(inputs), [inputs]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Расчёт идёт по «отложенной» копии ввода: поле реагирует сразу, графики — когда браузер свободен
  const deferred = useDeferredValue(inputs);
  const result = useMemo(() => calculate(deferred), [deferred]);
  const sens = useMemo(() => sensitivity(deferred), [deferred]);

  const flash = (tone: Flash["tone"], text: string) => {
    window.clearTimeout(timer.current);
    setMessage({ tone, text });
    timer.current = window.setTimeout(() => setMessage(null), tone === "error" ? 6000 : 4000);
  };

  const onImport = async (file: File) => {
    try {
      const parsed = parseInputs(JSON.parse(await file.text()));
      if (!parsed) throw new Error("bad shape");
      setInputs(parsed);
      flash("ok", `Загружено: ${file.name}`);
    } catch {
      flash("error", "Не получилось прочитать файл. Нужен JSON, сохранённый этим конструктором.");
    }
  };

  return (
    <IconContext.Provider value={ICONS}>
      <a className="skip" href="#results">
        К результатам
      </a>
      <header className="app-bar">
        <div className="container app-bar__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <HouseLine size={22} weight="bold" />
            </span>
            <div className="brand__text">
              <p className="brand__kicker">Конструктор бизнес-плана</p>
              <h1>Строительство домов из ЛСТК</h1>
            </div>
          </div>
          <div className="toolbar" role="toolbar" aria-label="Файл">
            <button type="button" className="btn btn--primary" onClick={() => download("lstk-business-plan.json", JSON.stringify(inputs, null, 2), "application/json")}>
              <FloppyDisk aria-hidden="true" />
              <span>Сохранить план</span>
            </button>
            <button type="button" className="btn btn--icon-sm" title="Открыть план из файла" onClick={() => fileRef.current?.click()}>
              <FolderOpen aria-hidden="true" />
              <span className="btn__label">Открыть…</span>
            </button>
            <button
              type="button"
              className="btn btn--icon-sm"
              title="Скачать таблицу CSV"
              onClick={() => download("lstk-business-plan.csv", monthCsv(result), "text/csv;charset=utf-8")}
            >
              <FileCsv aria-hidden="true" />
              <span className="btn__label">Таблица CSV</span>
            </button>
            <button type="button" className="btn btn--icon-sm" title="Печать / PDF" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              <span className="btn__label">Печать / PDF</span>
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--icon-sm"
              title="Сбросить к значениям по умолчанию"
              onClick={() => {
                if (window.confirm("Вернуть все значения по умолчанию? Текущие изменения пропадут.")) setInputs(structuredClone(DEFAULT_INPUTS));
              }}
            >
              <ArrowCounterClockwise aria-hidden="true" />
              <span className="btn__label">Сбросить</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </header>

      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <p className={`toast toast--${message.tone}`}>
            {message.tone === "ok" ? <CheckCircle aria-hidden="true" /> : <WarningCircle aria-hidden="true" />}
            <span>{message.text}</span>
          </p>
        )}
      </div>

      <section className="container summary" aria-labelledby="kpi-title" aria-busy={deferred !== inputs}>
        <p className="summary__lede">Меняйте допущения в исходных данных: выручка, денежный поток, окупаемость и риски пересчитываются сразу.</p>
        <Kpis result={result} inputs={deferred} />
        <Warnings result={result} />
      </section>

      <main className="container layout">
        <aside className="inputs" aria-label="Исходные данные">
          <p className="note note--warn">Значения по умолчанию являются ориентирами, а не рыночными данными. Замените их ценами из своих смет и коммерческих предложений.</p>
          <HousesEditor inputs={inputs} set={setInputs} />
          <SalesEditor inputs={inputs} set={setInputs} />
          <FrameEditor inputs={inputs} set={setInputs} />
          <CostItemsEditor inputs={inputs} set={setInputs} />
          <PaymentsEditor inputs={inputs} set={setInputs} />
          <CapexEditor inputs={inputs} set={setInputs} />
          <OpexEditor inputs={inputs} set={setInputs} />
          <FinanceEditor inputs={inputs} set={setInputs} />
          <p className="note">План автоматически сохраняется в этом браузере. Чтобы перенести его на другой компьютер, нажмите «Сохранить план».</p>
        </aside>

        <div className="results" id="results" aria-busy={deferred !== inputs}>
          <section className="panel">
            <CashChart months={result.months} />
          </section>
          <section className="panel">
            <EbitdaChart months={result.months} />
          </section>
          <UnitEconomics result={result} />
          <section className="panel">
            <Tornado base={sens.base} rows={sens.rows} />
          </section>
          <YearTable result={result} />
          <MonthTable result={result} />
          <section className="panel method" aria-labelledby="method-title">
            <h2 id="method-title" className="panel__title">
              Как считается
            </h2>
            <ul>
              <li>Договоры подписываются по плану продаж с учётом сезонности; число в месяц означает среднее ожидаемое и может быть дробным.</li>
              <li>Выручка и себестоимость признаются равномерно по ходу стройки; деньги приходят по графику: аванс, платёж в середине, остаток при сдаче.</li>
              <li>Материалы закупаются частично сразу после договора, остальное и работы оплачиваются по ходу стройки.</li>
              <li>NPV и IRR считаются по свободному потоку проекта без учёта кредита. Остаточная стоимость бизнеса после горизонта не учитывается, поэтому оценка консервативная.</li>
              <li>Упрощённая декларация: налог от поступлений. Общий режим: КПН от накопленной прибыли с переносом убытков. Суммы без НДС.</li>
            </ul>
          </section>
        </div>
      </main>
    </IconContext.Provider>
  );
}
