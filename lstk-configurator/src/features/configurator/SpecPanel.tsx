"use client";

import { useRef } from "react";
import { profileLabel } from "@/domain/bom/bom";
import { roleLabel, bomCsv, cutListCsv } from "@/domain/exports/csv";
import { assembliesDxf } from "@/domain/exports/dxf";
import { parseProject, projectOf, useConfigurator } from "@/store/configurator";
import type { Scene } from "./buildScene";
import { Button, NumberInput, Panel } from "./controls";
import { download, int, money, one } from "./format";

export function SpecPanel({ scene, onPrint }: { scene: Scene; onPrint: () => void }) {
  const { prices, setPrices, loadProject, reset } = useConfigurator();
  const state = useConfigurator();
  const fileRef = useRef<HTMLInputElement>(null);
  const { bom, envelope } = scene;
  const name = state.mode === "building" ? `lstk-${state.presetId}` : `lstk-${state.mode}`;

  return (
    <>
      <Panel title="Смета по каркасу">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-mute">Деталей</dt>
          <dd className="text-right tabular-nums">{int(bom.totals.pieces)}</dd>
          <dt className="text-ink-mute">Погонаж</dt>
          <dd className="text-right tabular-nums">{one(bom.totals.metres)} м</dd>
          <dt className="text-ink-mute">Сталь нетто</dt>
          <dd className="text-right tabular-nums">{one(bom.totals.massKg)} кг</dd>
          <dt className="text-ink-mute">С отходом {one(prices.scrapPct)}%</dt>
          <dd className="text-right tabular-nums">{one(bom.totals.massWithScrapKg)} кг</dd>
          <dt className="text-ink-mute">Крепёж (оценка)</dt>
          <dd className="text-right tabular-nums">
            {int(bom.totals.fasteners)} шт{bom.totals.bolts ? ` + ${bom.totals.bolts} болт.` : ""}
          </dd>
          <dt className="font-semibold">Сталь + крепёж</dt>
          <dd className="text-right text-base font-semibold tabular-nums">{money(bom.totals.total)}</dd>
        </dl>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Сталь (рулон)" unit="₸/кг" value={prices.steelPerKg} min={0} onChange={(steelPerKg) => setPrices({ steelPerKg })} />
          <NumberInput label="Отход" unit="%" value={prices.scrapPct} min={0} max={50} step={0.5} onChange={(scrapPct) => setPrices({ scrapPct })} />
          <NumberInput label="Саморез" unit="₸" value={prices.fastenerEach} min={0} onChange={(fastenerEach) => setPrices({ fastenerEach })} />
          <NumberInput label="Анкер" unit="₸" value={prices.boltEach} min={0} onChange={(boltEach) => setPrices({ boltEach })} />
        </div>
        <p className="text-xs text-ink-mute">Цены по умолчанию — заглушки. Работа, обшивка, утеплитель и доставка не входят.</p>
      </Panel>

      {envelope && (
        <Panel title="Ограждающие конструкции">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-mute">Кровля (со свесами)</dt>
            <dd className="text-right tabular-nums">{one(envelope.roofM2)} м²</dd>
            {envelope.wallsM2 > 0 && (
              <>
                <dt className="text-ink-mute">Стены за вычетом проёмов</dt>
                <dd className="text-right tabular-nums">{one(envelope.wallsM2)} м²</dd>
                <dt className="text-ink-mute">Фронтоны</dt>
                <dd className="text-right tabular-nums">{one(envelope.gablesM2)} м²</dd>
                <dt className="text-ink-mute">Проёмы</dt>
                <dd className="text-right tabular-nums">{one(envelope.openingsM2)} м²</dd>
              </>
            )}
            <dt className="text-ink-mute">Доборные (конёк, карниз, торцы)</dt>
            <dd className="text-right tabular-nums">{one(envelope.flashingsM)} м</dd>
          </dl>
        </Panel>
      )}

      <Panel title="Профиль">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-mute">
            <tr>
              <th className="py-1 font-medium">Сечение</th>
              <th className="py-1 text-right font-medium">Шт.</th>
              <th className="py-1 text-right font-medium">м</th>
              <th className="py-1 text-right font-medium">кг</th>
            </tr>
          </thead>
          <tbody>
            {bom.profiles.map((p) => (
              <tr key={p.profileId} className="border-t border-line">
                <td className="py-1">{p.designation}</td>
                <td className="py-1 text-right tabular-nums">{int(p.pieces)}</td>
                <td className="py-1 text-right tabular-nums">{one(p.metres)}</td>
                <td className="py-1 text-right tabular-nums">{one(p.massKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Сборки">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-mute">
            <tr>
              <th className="py-1 font-medium">Марка</th>
              <th className="py-1 text-right font-medium">Шт.</th>
              <th className="py-1 text-right font-medium">Деталей</th>
              <th className="py-1 text-right font-medium">кг/шт</th>
            </tr>
          </thead>
          <tbody>
            {bom.assemblies.map((a) => (
              <tr key={a.mark} className="border-t border-line">
                <td className="py-1">
                  {a.mark}
                  <span className="block text-xs text-ink-mute">{a.name}</span>
                </td>
                <td className="py-1 text-right tabular-nums">{a.qty}</td>
                <td className="py-1 text-right tabular-nums">{a.pieces}</td>
                <td className="py-1 text-right tabular-nums">{one(a.massKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title={`Раскрой (${bom.cutList.length} позиций)`}>
        <div className="max-h-80 overflow-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-ink-mute">
              <tr>
                <th className="p-2 font-medium">Марка</th>
                <th className="p-2 text-right font-medium">Длина</th>
                <th className="p-2 text-right font-medium">Шт.</th>
              </tr>
            </thead>
            <tbody>
              {bom.cutList.map((c) => (
                <tr key={c.pieceMark} className="border-t border-line">
                  <td className="p-2">
                    {c.pieceMark} · {roleLabel(c.role)}
                    <span className="block text-xs text-ink-mute">{profileLabel(c.profileId)}</span>
                  </td>
                  <td className="p-2 text-right tabular-nums">{one(c.length)}</td>
                  <td className="p-2 text-right tabular-nums">{c.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Файлы">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={onPrint}>
            КП / печать
          </Button>
          <Button onClick={() => download(`${name}-spec.csv`, bomCsv(bom), "text/csv;charset=utf-8")}>Спецификация CSV</Button>
          <Button onClick={() => download(`${name}-cutlist.csv`, cutListCsv(bom), "text/csv;charset=utf-8")}>Раскрой CSV</Button>
          <Button onClick={() => download(`${name}.dxf`, assembliesDxf(scene.assemblies), "application/dxf")}>Чертежи DXF</Button>
          <Button onClick={() => download(`${name}.lstk.json`, JSON.stringify(projectOf(state), null, 2), "application/json")}>Сохранить проект</Button>
          <Button onClick={() => fileRef.current?.click()}>Открыть проект…</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const p = parseProject(JSON.parse(await f.text()));
              if (!p) throw new Error();
              loadProject(p);
            } catch {
              window.alert("Это не файл проекта конфигуратора ЛСТК.");
            }
          }}
        />
        <p className="text-xs text-ink-mute">
          Раскрой — в нейтральном формате (марка, длина, операции с координатами). Файл для станка появится, когда продавец линии пришлёт образец формата.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm("Сбросить проект к исходному шаблону?")) reset();
          }}
        >
          Сбросить проект
        </Button>
      </Panel>
    </>
  );
}
