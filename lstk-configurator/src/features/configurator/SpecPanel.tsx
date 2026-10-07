"use client";

import { useRef } from "react";
import { profileLabel } from "@/domain/bom/bom";
import { bomCsv, cutListCsv } from "@/domain/exports/csv";
import { assembliesDxf } from "@/domain/exports/dxf";
import { useT } from "@/i18n";
import { parseProject, projectOf, useConfigurator } from "@/store/configurator";
import type { Scene } from "./buildScene";
import { Button, Note, NumberInput, Panel, Stat, Stats } from "./controls";
import { download, int, money, one } from "./format";

export function SpecPanel({ scene, onPrint, onShot }: { scene: Scene; onPrint: () => void; onShot: () => void }) {
  const t = useT();
  const { prices, setPrices, loadProject, reset } = useConfigurator();
  const state = useConfigurator();
  const fileRef = useRef<HTMLInputElement>(null);
  const { bom } = scene;
  const name = state.mode === "building" ? `lstk-${state.building.productId}` : `lstk-${state.mode}`;

  return (
    <>
      <Panel title={t("files.files")}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={onPrint}>
            {t("files.print")}
          </Button>
          <Button onClick={onShot}>{t("files.shot")}</Button>
          <Button onClick={() => download(`${name}-spec.csv`, bomCsv(bom), "text/csv;charset=utf-8")}>{t("files.specCsv")}</Button>
          <Button onClick={() => download(`${name}-cutlist.csv`, cutListCsv(bom), "text/csv;charset=utf-8")}>{t("files.cutCsv")}</Button>
          <Button onClick={() => download(`${name}.dxf`, assembliesDxf(scene.assemblies), "application/dxf")}>{t("files.dxf")}</Button>
          <Button onClick={() => download(`${name}.lstk.json`, JSON.stringify(projectOf(state), null, 2), "application/json")}>{t("files.save")}</Button>
          <Button onClick={() => fileRef.current?.click()}>{t("files.open")}</Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm(t("files.resetConfirm"))) reset();
            }}
          >
            {t("files.reset")}
          </Button>
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
              window.alert(t("files.badFile"));
            }
          }}
        />
        <Note>{t("files.note")}</Note>
      </Panel>

      <Panel title={t("spec.frame")}>
        <Stats>
          <Stat label={t("spec.pieces")} value={int(bom.totals.pieces)} />
          <Stat label={t("spec.metres")} value={`${one(bom.totals.metres)} ${t("unit.m")}`} />
          <Stat label={t("spec.net")} value={`${one(bom.totals.massKg)} ${t("unit.kg")}`} />
          <Stat label={t("spec.withScrap", { pct: one(prices.scrapPct) })} value={`${one(bom.totals.massWithScrapKg)} ${t("unit.kg")}`} />
          <Stat label={t("spec.fasteners")} value={`${int(bom.totals.fasteners)}${bom.totals.bolts ? ` + ${bom.totals.bolts}` : ""}`} />
          <Stat strong label={t("spec.steelFasteners")} value={money(bom.totals.total)} />
        </Stats>
        {state.mode !== "building" && (
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label={t("estimate.steel")} unit={t("unit.tgKg")} value={prices.steelPerKg} min={0} onChange={(steelPerKg) => setPrices({ steelPerKg })} />
            <NumberInput label={t("estimate.scrap")} unit="%" value={prices.scrapPct} min={0} max={50} step={0.5} onChange={(scrapPct) => setPrices({ scrapPct })} />
            <NumberInput label={t("spec.screw")} unit="₸" value={prices.fastenerEach} min={0} onChange={(fastenerEach) => setPrices({ fastenerEach })} />
            <NumberInput label={t("spec.anchor")} unit="₸" value={prices.boltEach} min={0} onChange={(boltEach) => setPrices({ boltEach })} />
          </div>
        )}
      </Panel>

      <Panel title={t("spec.profiles")}>
        <table className="w-full text-sm">
          <thead className="text-left text-ink-mute">
            <tr>
              <th className="py-1 font-medium">{t("spec.section")}</th>
              <th className="py-1 text-right font-medium">{t("unit.pcs")}</th>
              <th className="py-1 text-right font-medium">{t("unit.m")}</th>
              <th className="py-1 text-right font-medium">{t("unit.kg")}</th>
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

      <Panel title={t("spec.assemblies")}>
        <table className="w-full text-sm">
          <thead className="text-left text-ink-mute">
            <tr>
              <th className="py-1 font-medium">{t("spec.mark")}</th>
              <th className="py-1 text-right font-medium">{t("unit.pcs")}</th>
              <th className="py-1 text-right font-medium">{t("spec.pieces")}</th>
              <th className="py-1 text-right font-medium">{t("spec.kgEach")}</th>
            </tr>
          </thead>
          <tbody>
            {bom.assemblies.map((a) => (
              <tr key={a.mark} className="border-t border-line">
                <td className="py-1">{a.mark}</td>
                <td className="py-1 text-right tabular-nums">{a.qty}</td>
                <td className="py-1 text-right tabular-nums">{a.pieces}</td>
                <td className="py-1 text-right tabular-nums">{one(a.massKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title={t("spec.cutList", { n: bom.cutList.length })}>
        <div className="max-h-80 overflow-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-ink-mute">
              <tr>
                <th className="p-2 font-medium">{t("spec.mark")}</th>
                <th className="p-2 text-right font-medium">{t("spec.length")}</th>
                <th className="p-2 text-right font-medium">{t("unit.pcs")}</th>
              </tr>
            </thead>
            <tbody>
              {bom.cutList.map((c) => (
                <tr key={c.pieceMark} className="border-t border-line">
                  <td className="p-2">
                    {c.pieceMark} · {t.dyn(`role.${c.role}`)}
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
    </>
  );
}
