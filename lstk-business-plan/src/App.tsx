import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { calculate, sensitivity } from "./model/calc";
import { DEFAULT_INPUTS } from "./model/defaults";
import type { PlanInputs } from "./model/types";
import { download, loadSaved, parseInputs, save } from "./storage";
import { CapexEditor, CostItemsEditor, FinanceEditor, FrameEditor, HousesEditor, OpexEditor, PaymentsEditor, SalesEditor } from "./ui/editors";
import { CashChart, EbitdaChart, Tornado } from "./ui/charts";
import { Kpis, MonthTable, UnitEconomics, Warnings, YearTable, monthCsv } from "./ui/results";

export default function App() {
  const [inputs, setInputs] = useState<PlanInputs>(() => loadSaved() ?? structuredClone(DEFAULT_INPUTS));
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => save(inputs), [inputs]);

  // Расчёт идёт по «отложенной» копии ввода: поле реагирует сразу, графики — когда браузер свободен
  const deferred = useDeferredValue(inputs);
  const result = useMemo(() => calculate(deferred), [deferred]);
  const sens = useMemo(() => sensitivity(deferred), [deferred]);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 4000);
  };

  const onImport = async (file: File) => {
    try {
      const parsed = parseInputs(JSON.parse(await file.text()));
      if (!parsed) throw new Error("bad shape");
      setInputs(parsed);
      flash(`Загружено: ${file.name}`);
    } catch {
      flash("Не получилось прочитать файл — нужен JSON, сохранённый этим конструктором.");
    }
  };

  return (
    <>
      <a className="skip" href="#results">
        К результатам
      </a>
      <header className="page-head">
        <div className="container page-head__inner">
          <div>
            <p className="eyebrow">Конструктор бизнес-плана</p>
            <h1>Строительство домов из ЛСТК</h1>
            <p className="lede">Меняйте допущения — выручка, денежный поток, окупаемость и риски пересчитываются сразу.</p>
          </div>
          <div className="actions" role="toolbar" aria-label="Файл">
            <button type="button" className="btn btn--primary" onClick={() => download("lstk-business-plan.json", JSON.stringify(inputs, null, 2), "application/json")}>
              Сохранить план
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Открыть…
            </button>
            <button type="button" className="btn" onClick={() => download("lstk-business-plan.csv", monthCsv(result), "text/csv;charset=utf-8")}>
              Таблица CSV
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              Печать / PDF
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                if (window.confirm("Вернуть все значения по умолчанию? Текущие изменения пропадут.")) setInputs(structuredClone(DEFAULT_INPUTS));
              }}
            >
              Сбросить
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
        <p className="container status-line" role="status" aria-live="polite">
          {message}
        </p>
      </header>

      <main className="container layout">
        <aside className="inputs" aria-label="Исходные данные">
          <p className="note note--warn">
            Значения по умолчанию — ориентиры, а не рыночные данные. Замените их ценами из своих смет и коммерческих предложений.
          </p>
          <HousesEditor inputs={inputs} set={setInputs} />
          <SalesEditor inputs={inputs} set={setInputs} />
          <FrameEditor inputs={inputs} set={setInputs} />
          <CostItemsEditor inputs={inputs} set={setInputs} />
          <PaymentsEditor inputs={inputs} set={setInputs} />
          <CapexEditor inputs={inputs} set={setInputs} />
          <OpexEditor inputs={inputs} set={setInputs} />
          <FinanceEditor inputs={inputs} set={setInputs} />
          <p className="note">План автоматически сохраняется в этом браузере. Чтобы перенести на другой компьютер — «Сохранить план».</p>
        </aside>

        <div className="results" id="results" aria-busy={deferred !== inputs}>
          <Kpis result={result} inputs={deferred} />
          <Warnings result={result} />
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
          <section className="panel method">
            <h2 className="panel__title">Как считается</h2>
            <ul>
              <li>Договоры подписываются по плану продаж с учётом сезонности; число в месяц — среднее ожидаемое, может быть дробным.</li>
              <li>Выручка и себестоимость признаются равномерно по ходу стройки; деньги приходят по графику: аванс, платёж в середине, остаток при сдаче.</li>
              <li>Материалы закупаются частично сразу после договора, остальное и работы оплачиваются по ходу стройки.</li>
              <li>NPV и IRR — по свободному потоку проекта без учёта кредита. Остаточная стоимость бизнеса после горизонта не учитывается — оценка консервативная.</li>
              <li>Упрощённая декларация — налог от поступлений; общий режим — КПН от накопленной прибыли с переносом убытков. Суммы без НДС.</li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
