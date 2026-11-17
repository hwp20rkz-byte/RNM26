import Link from "next/link";
import { bomTotals, pressBom, pressConfig, pressLayout, pressParts } from "@/domain/press";
import { nestParts } from "@/domain/exports/nest";

const STAGES = [
  { n: 0, name: "Презентация, бизнес-план, инженерное описание станка и спецификация", gate: "Закрыт 15.11.2026", done: true },
  { n: 1, name: "Печатный станок: 3D-модель, раскрой, прототип №1", gate: "100 оттисков, приводка ±0,5 мм", done: false },
  { n: 2, name: "Натяжитель, экспокамера, промывка, сушка, профильная пила", gate: "Трафарет 120T повторяемо", done: false },
  { n: 3, name: "3D-конфигуратор: карусель, анимации техпроцессов, экспорт", gate: "3 конфигурации собраны по экспорту", done: false },
  { n: 4, name: "Сайт: конструктор мерча, векторизация, цветоделение, калькулятор", gate: "10 заказов через сайт", done: false },
  { n: 5, name: "CRM/MES: канбан, техкарты, склад", gate: "4 недели все заказы в CRM", done: false },
  { n: 6, name: "Мобильное приложение: PWA → Capacitor", gate: "Смена закрывается с телефона", done: false },
];

export default function Page() {
  const sizes = (["S", "M", "L", "XL"] as const).map((s) => {
    const cfg = pressConfig(s);
    const parts = pressParts(cfg);
    const totals = bomTotals(pressBom(cfg));
    const layout = pressLayout(cfg);
    const sheets = nestParts(parts).length;
    return { s, cfg, totals, layout, sheets, blanks: parts.reduce((n, p) => n + p.qty, 0) };
  });
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-accent-700">ЭКОСИСТЕМА ШЕЛКОГРАФИИ</p>
        <h1 className="max-w-3xl">Станки из фанеры и профиля, конфигуратор, конструктор мерча и CRM цеха</h1>
        <p className="max-w-2xl text-fg-muted">
          Доменная модель считает размеры, раскрой, спецификацию и уравновешивание рамы; приложение показывает результат и, по мере этапов, превращается в конфигуратор, сайт и CRM.
        </p>
        <div>
          <Link href="/press/" className="inline-flex min-h-11 items-center rounded-xl bg-primary-700 px-6 text-white">
            Открыть печатный станок
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2>Типоразмеры печатного станка</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Размер</th>
              <th>Стол, мм</th>
              <th>Хребет</th>
              <th>Габарит плиты, мм</th>
              <th>Заготовок</th>
              <th>Листов</th>
              <th>Детали, ₸ [Предположение]</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map((r) => (
              <tr key={r.s}>
                <td>{r.s}</td>
                <td>
                  {r.cfg.bed.width}×{r.cfg.bed.depth}
                </td>
                <td>
                  {r.cfg.spineProfile} × {r.cfg.spineLength}
                </td>
                <td>
                  {r.layout.base.width}×{r.layout.base.depth}
                </td>
                <td>{r.blanks}</td>
                <td>{r.sheets}</td>
                <td>
                  {r.totals.low.toLocaleString("ru-RU")}–{r.totals.high.toLocaleString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-4">
        <h2>Дорожная карта</h2>
        <ol className="flex flex-col gap-2">
          {STAGES.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-xl border border-border bg-bg-elevated p-4">
              <span className={`font-display text-lg font-bold ${s.done ? "text-success" : "text-primary-500"}`}>{s.n}</span>
              <div className="flex flex-col">
                <span>{s.name}</span>
                <span className="text-sm text-fg-muted">
                  {s.done ? "Выполнено: " : "Гейт: "}
                  {s.gate}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
