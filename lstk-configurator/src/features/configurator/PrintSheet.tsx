"use client";

import { roleLabel } from "@/domain/exports/csv";
import { profileLabel } from "@/domain/bom/bom";
import { WALL_SIDE_LABEL, type WallSide } from "@/domain/buildings/types";
import { OPENING_LABEL } from "@/domain/walls/types";
import { useConfigurator } from "@/store/configurator";
import { ACTIVE_MACHINE, type Scene } from "./buildScene";
import { int, kn, money, one } from "./format";

/**
 * Commercial offer sheet, visible only when printing (browser "Save as PDF").
 * Carries the 3D snapshot taken right before printing.
 */
export function PrintSheet({ scene, snapshot }: { scene: Scene; snapshot: string | null }) {
  const s = useConfigurator();
  const { bom, envelope, building, truss } = scene;
  const date = new Date().toLocaleDateString("ru-RU");
  const title =
    s.mode === "building" ? `${building?.input.kind === "carport" ? "Навес" : "Здание"} ${one(s.building.length / 1000)} × ${one(s.building.width / 1000)} м` : s.mode === "wall" ? "Стеновая панель" : s.mode === "truss" ? "Стропильная ферма" : "Профиль";
  return (
    <div className="hidden text-[12px] leading-snug text-black print:block">
      <header className="mb-4 flex items-end justify-between border-b border-black pb-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider">Коммерческое предложение · каркас ЛСТК</p>
          <h1 className="text-[20px] font-bold">{title}</h1>
        </div>
        <p>{date}</p>
      </header>
      {snapshot && <img src={snapshot} alt="3D-модель каркаса" className="mb-4 max-h-[90mm] w-full object-contain" />}

      {building && (
        <table className="mb-4 w-full">
          <tbody>
            <tr><td>Размеры (длина × ширина)</td><td className="text-right">{int(s.building.length)} × {int(s.building.width)} мм</td></tr>
            <tr><td>Высота стен / уклон кровли</td><td className="text-right">{int(s.building.wallHeight)} мм / {one(s.building.pitchDeg)}°</td></tr>
            <tr><td>Фермы</td><td className="text-right">{building.trussPositions.length} шт, шаг до {int(s.building.trussSpacing)} мм</td></tr>
            {building.input.kind === "enclosed" &&
              (Object.keys(s.building.openings) as WallSide[]).map((side) =>
                s.building.openings[side].length ? (
                  <tr key={side}>
                    <td>{WALL_SIDE_LABEL[side]}</td>
                    <td className="text-right">{s.building.openings[side].map((o) => `${OPENING_LABEL[o.kind]} ${int(o.width)}×${int(o.height)}`).join(", ")}</td>
                  </tr>
                ) : null,
              )}
          </tbody>
        </table>
      )}

      <h2 className="mb-1 text-[14px] font-semibold">Каркас</h2>
      <table className="mb-4 w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th>Профиль</th>
            <th className="text-right">Деталей</th>
            <th className="text-right">Погонаж, м</th>
            <th className="text-right">Масса, кг</th>
          </tr>
        </thead>
        <tbody>
          {bom.profiles.map((p) => (
            <tr key={p.profileId}>
              <td>{p.designation}</td>
              <td className="text-right">{int(p.pieces)}</td>
              <td className="text-right">{one(p.metres)}</td>
              <td className="text-right">{one(p.massKg)}</td>
            </tr>
          ))}
          <tr className="border-t border-black">
            <td>Сталь с отходом {one(s.prices.scrapPct)}%</td>
            <td />
            <td />
            <td className="text-right">{one(bom.totals.massWithScrapKg)}</td>
          </tr>
          <tr>
            <td>Крепёж (саморезы / болты)</td>
            <td className="text-right">
              {int(bom.totals.fasteners)} / {int(bom.totals.bolts)}
            </td>
            <td />
            <td />
          </tr>
        </tbody>
      </table>

      {envelope && (
        <>
          <h2 className="mb-1 text-[14px] font-semibold">Объёмы ограждающих конструкций</h2>
          <p className="mb-4">
            Кровля {one(envelope.roofM2)} м²
            {envelope.wallsM2 > 0 && `, стены ${one(envelope.wallsM2)} м², фронтоны ${one(envelope.gablesM2)} м²`}, доборные элементы {one(envelope.flashingsM)} м.
          </p>
        </>
      )}

      <p className="mb-4 text-[14px] font-semibold">Стоимость стали и крепежа каркаса: {money(bom.totals.total)}</p>

      {truss?.forces && (
        <p className="mb-4">
          Ферма при нагрузке {one(s.roofLoadKpa)} кПа и шаге {int(truss.forces.spacing)} мм: сжатие верхнего пояса до{" "}
          {kn(truss.forces.byRole.find((r) => r.role === "top-chord")?.maxCompression ?? 0)}, опорная реакция {kn(truss.forces.reactionN)}.
        </p>
      )}

      <h2 className="mb-1 text-[14px] font-semibold">Сборки</h2>
      <p className="mb-4">{bom.assemblies.map((a) => `${a.mark} × ${a.qty}`).join(", ")}; всего деталей: {int(bom.totals.pieces)}. Типы: {[...new Set(bom.cutList.map((c) => roleLabel(c.role)))].join(", ")}.</p>

      <footer className="border-t border-black pt-2 text-[10px]">
        Каркас из профиля {profileLabel(bom.profiles[0]?.profileId ?? "C89x41x11x0.95")} линии {ACTIVE_MACHINE.shortName}. Расчёт — предварительный: количества по осевым
        линиям, цены — по введённым ставкам; работа, обшивка, утеплитель, фундамент и доставка не включены. Несущая способность каркаса подлежит проверке проектировщиком
        по нормам РК.
      </footer>
    </div>
  );
}
