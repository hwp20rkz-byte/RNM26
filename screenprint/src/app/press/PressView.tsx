import { balanceGeometry, bomTotals, describeSpring, pickSpring, pressAssembly, pressBom, pressConfig, pressLayout, pressParts } from "@/domain/press";
import type { PressSizeId } from "@/domain/press";
import Link from "next/link";
import { PressViewer } from "./PressViewer";

export const PRESS_SIZES: PressSizeId[] = ["S", "M", "L", "XL"];

/** Страница станка одного типоразмера; маршруты /press (M) и /press/[size] генерируются статически */
export function PressView({ size }: { size: PressSizeId }) {
  const cfg = pressConfig(size);
  const layout = pressLayout(cfg);
  const parts = pressParts(cfg);
  const bom = pressBom(cfg);
  const totals = bomTotals(bom);
  const balance = pickSpring(balanceGeometry(cfg), cfg.frameMassKg, cfg.frameCgOffset);
  const boxes = pressAssembly(cfg);

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-accent-700">ПЕЧАТНЫЙ СТАНОК · ЭТАП 1</p>
        <h1>
          Настольный станок {size}: стол {cfg.bed.width}×{cfg.bed.depth} мм
        </h1>
        <nav className="flex gap-2">
          {PRESS_SIZES.map((s) => (
            <Link key={s} href={`/press/${s}/`} className={`inline-flex min-h-11 items-center rounded-xl border px-4 ${s === size ? "border-primary-700 bg-primary-100 text-primary-900" : "border-border text-fg-muted"}`}>
              {s}
            </Link>
          ))}
        </nav>
      </section>

      <PressViewer boxes={boxes} pivot={layout.pivot} overall={layout.overall} />

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2>Компоновка</h2>
          <div className="overflow-x-auto">
        <table className="data">
            <tbody>
              <tr>
                <th>Плита основания</th>
                <td>
                  {layout.base.width}×{layout.base.depth}×18 мм
                </td>
              </tr>
              <tr>
                <th>Хребет</th>
                <td>
                  {cfg.spineProfile} × {cfg.spineLength} мм
                </td>
              </tr>
              <tr>
                <th>Верх стола / ось шарнира</th>
                <td>
                  {layout.bedTopZ} / {layout.pivot.z} мм над плитой
                </td>
              </tr>
              <tr>
                <th>Щёки шарнира</th>
                <td>90×{layout.cheekHeight} мм, 4 × 608ZZ</td>
              </tr>
              <tr>
                <th>Зазор над платеном</th>
                <td>3 мм базовый, до 8 мм упорными винтами</td>
              </tr>
              <tr>
                <th>Деталей / заготовок</th>
                <td>
                  {parts.length} / {parts.reduce((n, p) => n + p.qty, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2>Уравновешивание рамы {cfg.frameMassKg} кг</h2>
          <div className="overflow-x-auto">
        <table className="data">
            <tbody>
              <tr>
                <th>Пружина</th>
                <td>
                  {describeSpring(balance.spring)}, 2 шт, {balance.rate.toFixed(2)} Н/мм
                </td>
              </tr>
              <tr>
                <th>Опущена (0°)</th>
                <td>
                  растяжение {balance.down.extension.toFixed(0)} мм, {balance.down.forcePerSpring.toFixed(0)} Н, момент {balance.down.springTorque.toFixed(1)} / {balance.down.gravityTorque.toFixed(1)} Н·м
                </td>
              </tr>
              <tr>
                <th>Поднята (70°)</th>
                <td>
                  растяжение {balance.up.extension.toFixed(0)} мм, момент {balance.up.springTorque.toFixed(1)} / {balance.up.gravityTorque.toFixed(1)} Н·м
                </td>
              </tr>
              <tr>
                <th>Вердикт</th>
                <td>
                  {balance.verdict}; держится наверху: {balance.holdsUp ? "да" : "нет"}; ресурс пружины: {balance.withinStretch ? "в норме" : "перерастяжение"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>
          Спецификация: {totals.low.toLocaleString("ru-RU")}–{totals.high.toLocaleString("ru-RU")} ₸ [Предположение]
        </h2>
        <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>Поз.</th>
              <th>Обозначение</th>
              <th>Характеристика</th>
              <th>Кол-во</th>
              <th>₸ от–до</th>
              <th>Поиск</th>
              <th>Где</th>
            </tr>
          </thead>
          <tbody>
            {bom.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.designation}</td>
                <td className="text-fg-muted">{l.spec}</td>
                <td>
                  {l.qty} {l.unit}
                </td>
                <td>
                  {l.priceLowKzt.toLocaleString("ru-RU")}–{l.priceHighKzt.toLocaleString("ru-RU")}
                </td>
                <td className="font-mono text-xs">{l.searchRu}</td>
                <td className="text-fg-muted">{l.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
