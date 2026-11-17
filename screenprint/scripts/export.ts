import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bomCsv, partsCsv } from "../src/domain/exports/csv";
import { sheetDxf } from "../src/domain/exports/dxf";
import { nestParts } from "../src/domain/exports/nest";
import { sheetSvg } from "../src/domain/exports/svg";
import { balanceGeometry, bomTotals, describeSpring, pickSpring, pressBom, pressConfig, pressLayout, pressParts, validateConfig } from "../src/domain/press";
import type { PressSizeId } from "../src/domain/press";

/**
 * Экспорт раскроя и спецификации: npm run export -- M [outDir]
 * Пишет press-<size>-<толщина>-sheet<n>.svg/.dxf, bom-press-<size>.csv, parts-press-<size>.csv
 * и balance-press-<size>.md с расчётом пружин.
 */
const size = (process.argv[2] ?? "M") as PressSizeId;
const outDir = process.argv[3] ?? join(process.cwd(), "out");
const cfg = pressConfig(size);
const issues = validateConfig(cfg);
if (issues.length) {
  console.error("Конфигурация вне допусков:\n - " + issues.join("\n - "));
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const parts = pressParts(cfg);
const sheets = nestParts(parts);
sheets.forEach((s, i) => {
  const name = `press-${size}-${s.thickness}mm-sheet${i + 1}`;
  writeFileSync(join(outDir, `${name}.svg`), sheetSvg(s, name));
  writeFileSync(join(outDir, `${name}.dxf`), sheetDxf(s));
});
const bom = pressBom(cfg);
writeFileSync(join(outDir, `bom-press-${size}.csv`), bomCsv(bom));
writeFileSync(join(outDir, `parts-press-${size}.csv`), partsCsv(parts));

const totals = bomTotals(bom);
const layout = pressLayout(cfg);
const geometry = balanceGeometry(cfg);
const balance = pickSpring(geometry, cfg.frameMassKg, cfg.frameCgOffset);
const md = `# Расчёт уравновешивания, станок ${size}

Рама ${cfg.frameMassKg} кг, центр масс в ${cfg.frameCgOffset} мм от оси. Пружина ${describeSpring(balance.spring)}, жёсткость ${balance.rate.toFixed(2)} Н/мм, две штуки, преднатяг талрепом ${geometry.preload} мм.

| Положение | Растяжение, мм | Сила на пружину, Н | Момент пружин, Н·м | Момент рамы, Н·м | Отношение |
| --- | --- | --- | --- | --- | --- |
| Рама опущена (0°) | ${balance.down.extension.toFixed(0)} | ${balance.down.forcePerSpring.toFixed(0)} | ${balance.down.springTorque.toFixed(2)} | ${balance.down.gravityTorque.toFixed(2)} | ${balance.down.ratio.toFixed(2)} |
| Рама поднята (70°) | ${balance.up.extension.toFixed(0)} | ${balance.up.forcePerSpring.toFixed(0)} | ${balance.up.springTorque.toFixed(2)} | ${balance.up.gravityTorque.toFixed(2)} | ${balance.up.ratio.toFixed(2)} |

Держится наверху: ${balance.holdsUp ? "да" : "нет"}. Усилие на ручке при опускании не больше 25 Н: ${balance.easyToLower ? "да" : "нет"}. Вердикт: ${balance.verdict}.

Габариты: ${layout.overall.width}×${layout.overall.depth}×${layout.overall.height} мм, верх стола на ${layout.bedTopZ} мм над плитой, ось шарнира на ${layout.pivot.z} мм.

Спецификация: ${totals.low.toLocaleString("ru-RU")}–${totals.high.toLocaleString("ru-RU")} ₸ за комплект деталей.
`;
writeFileSync(join(outDir, `balance-press-${size}.md`), md);

console.log(`Станок ${size}: ${parts.reduce((n, p) => n + p.qty, 0)} заготовок, ${sheets.length} лист(а), BOM ${totals.low}–${totals.high} ₸, пружина ${describeSpring(balance.spring)} (${balance.verdict}) → ${outDir}`);
