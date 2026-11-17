import { describe, expect, it } from "vitest";
import { bomCsv } from "../exports/csv";
import { sheetDxf } from "../exports/dxf";
import { nestParts } from "../exports/nest";
import { sheetSvg } from "../exports/svg";
import { balanceGeometry } from "./balance";
import { pressConfig, validateConfig } from "./config";
import { bomTotals, pressBom } from "./bom";
import { plywoodArea, pressLayout, pressParts } from "./geometry";
import { collisions, designedOverlap, pressAssembly, rotateWithHead } from "./assembly";
import { balanceReport, pickSpring, springRate, STOCK_SPRINGS } from "./springs";
import type { PressSizeId } from "./types";

const SIZES: PressSizeId[] = ["S", "M", "L", "XL"];

describe("конфигурация", () => {
  it("все типоразмеры проходят проверку", () => {
    for (const s of SIZES) expect(validateConfig(pressConfig(s))).toEqual([]);
  });
  it("слабый профиль под широкий стол отклоняется", () => {
    const issues = validateConfig(pressConfig("XL", { spineProfile: "4040" }));
    expect(issues.some((i) => i.includes("4080"))).toBe(true);
  });
  it("короткий хребет отклоняется", () => {
    expect(validateConfig(pressConfig("M", { spineLength: 400 })).length).toBeGreaterThan(0);
  });
});

describe("геометрия станка M", () => {
  const cfg = pressConfig("M");
  const parts = pressParts(cfg);
  const layout = pressLayout(cfg);

  it("плита основания 420×790, низ рамы на 3 мм выше платена", () => {
    expect(layout.base).toEqual({ width: 420, depth: 790 });
    expect(layout.bedTopZ).toBe(126);
    expect(layout.pivot.z).toBe(115);
    expect(layout.pivot.y).toBe(610);
  });
  it("сборка без пересечений деталей, кроме заложенных конструкцией", () => {
    const boxes = pressAssembly(cfg);
    expect(collisions(boxes, 0.5, designedOverlap)).toEqual([]);
  });
  it("при подъёме до 70° рычаг пружин не входит в каретку, губка проходит над щёками, рама на 3 мм выше платена", () => {
    const boxes = pressAssembly(cfg);
    const carriage = boxes.find((b) => b.id === "CARRIAGE")!;
    const cheek = boxes.find((b) => b.id === "CHEEK_1")!;
    const head = boxes.find((b) => b.id === "HEAD_TOP")!;
    const jaw = boxes.find((b) => b.id === "JAW_LOWER")!;
    const carriageTop = carriage.center[2] + carriage.size[2] / 2;
    const carriageRear = carriage.center[1] + carriage.size[1] / 2;
    const cheekTop = cheek.center[2] + cheek.size[2] / 2;
    const cheekFront = cheek.center[1] - cheek.size[1] / 2;
    for (let th = 0; th <= 70; th += 5) {
      // задний нижний угол рычага пружин
      const tip = rotateWithHead([head.center[0], head.center[1] + head.size[1] / 2, head.center[2] - head.size[2] / 2], cfg, th);
      expect(tip[2] > carriageTop + 0.5 || tip[1] > carriageRear + 0.5, `рычаг при ${th}°`).toBe(true);
      // задний верхний и нижний углы губки
      for (const dz of [-jaw.size[2] / 2, jaw.size[2] / 2]) {
        const c = rotateWithHead([jaw.center[0], jaw.center[1] + jaw.size[1] / 2, jaw.center[2] + dz], cfg, th);
        expect(c[1] < cheekFront - 0.5 || c[2] > cheekTop + 0.5, `губка при ${th}°`).toBe(true);
      }
    }
    const frame = boxes.find((b) => b.id === "FRAME")!;
    const frameBottom = frame.center[2] - frame.size[2] / 2;
    expect(frameBottom - (layout.bedTopZ + 12)).toBe(3);
  });
  it("13 типов деталей и 22 заготовки при одном платене", () => {
    expect(parts.length).toBe(13);
    expect(parts.reduce((n, p) => n + p.qty, 0)).toBe(22);
  });
  it("несущие детали из 18 мм, прижимная плита и платен из 12 мм", () => {
    const t12 = parts.filter((p) => p.thickness === 12).map((p) => p.id);
    expect(t12).toEqual(["JAW_UPPER", "PLATEN_TEE"]);
    expect(parts.map((p) => p.id)).toContain("ANCHOR");
  });
  it("все отверстия внутри контура детали", () => {
    for (const p of parts) {
      for (const h of p.holes) {
        expect(h.x, `${p.id} ${h.note ?? ""}`).toBeGreaterThan(h.d / 2);
        expect(h.y, `${p.id} ${h.note ?? ""}`).toBeGreaterThan(h.d / 2);
        expect(h.x).toBeLessThan(p.width - h.d / 2);
        expect(h.y).toBeLessThan(p.height - h.d / 2);
      }
    }
  });
  it("фанеры 18 мм уходит меньше половины листа", () => {
    const area = plywoodArea(parts);
    expect(area["18"]).toBeLessThan(1.525 * 1.525 * 0.55);
    expect(area["12"]).toBeLessThan(1.525 * 1.525 * 0.15);
  });
  it("без микроприводки нет упорных блоков", () => {
    const ids = pressParts(pressConfig("M", { microRegistration: false })).map((p) => p.id);
    expect(ids).not.toContain("PUSH");
  });
});

describe("пружины", () => {
  it("жёсткость 1,6×16×100 около 0,5 Н/мм", () => {
    const k = springRate(STOCK_SPRINGS[1]!);
    expect(k).toBeGreaterThan(0.4);
    expect(k).toBeLessThan(0.6);
  });
  it("для рамы 2 кг подбирается пружина, которая держит раму наверху и опускается рукой", () => {
    const cfg = pressConfig("M");
    const r = pickSpring(balanceGeometry(cfg), cfg.frameMassKg, cfg.frameCgOffset);
    expect(r.verdict).toBe("ok");
    expect(r.holdsUp).toBe(true);
    expect(r.easyToLower).toBe(true);
    expect(r.withinStretch).toBe(true);
    expect(r.down.ratio).toBeGreaterThan(0.7);
    expect(r.down.ratio).toBeLessThan(1.4);
  });
  it("слишком тонкая пружина для тяжёлой рамы — вердикт weak", () => {
    const cfg = pressConfig("XL");
    const r = balanceReport(STOCK_SPRINGS[0]!, balanceGeometry(cfg), cfg.frameMassKg, cfg.frameCgOffset);
    expect(r.verdict).toBe("weak");
  });
  it("каждый типоразмер имеет подходящую складскую пружину", () => {
    for (const s of SIZES) {
      const cfg = pressConfig(s);
      const r = pickSpring(balanceGeometry(cfg), cfg.frameMassKg, cfg.frameCgOffset);
      expect(r.holdsUp, s).toBe(true);
      expect(r.withinStretch, s).toBe(true);
    }
  });
});

describe("спецификация", () => {
  it("станок M укладывается в 45–75 тыс. ₸", () => {
    const t = bomTotals(pressBom(pressConfig("M")));
    expect(t.low).toBeGreaterThan(35_000);
    expect(t.high).toBeLessThan(75_000);
  });
  it("забивных гаек хватает на все отверстия insert-nut", () => {
    const cfg = pressConfig("M");
    const need = pressParts(cfg).reduce((n, p) => n + p.qty * p.holes.filter((h) => h.kind === "insert-nut").length, 0);
    const line = pressBom(cfg).find((l) => l.id === "C2")!;
    expect(line.qty).toBeGreaterThanOrEqual(need);
  });
  it("у каждой позиции есть поисковая строка и место покупки", () => {
    for (const l of pressBom(pressConfig("L"))) {
      expect(l.searchRu.length).toBeGreaterThan(5);
      expect(l.where.length).toBeGreaterThan(3);
      expect(l.priceHighKzt).toBeGreaterThanOrEqual(l.priceLowKzt);
    }
  });
  it("CSV с BOM открывается как таблица с 12 колонками", () => {
    const csv = bomCsv(pressBom(pressConfig("M")));
    const rows = csv.trim().split("\n");
    expect(rows[0]!.split(";").length).toBe(12);
    expect(rows.length).toBeGreaterThan(25);
  });
});

describe("раскрой", () => {
  it("станок M режется из одного листа 18 мм и одного 12 мм", () => {
    const sheets = nestParts(pressParts(pressConfig("M")));
    expect(sheets.filter((s) => s.thickness === 18).length).toBe(1);
    expect(sheets.filter((s) => s.thickness === 12).length).toBe(1);
  });
  it("детали не перекрываются", () => {
    for (const sheet of nestParts(pressParts(pressConfig("XL")))) {
      const ps = sheet.parts;
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i]!;
          const b = ps[j]!;
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlap, `${a.part.id} и ${b.part.id}`).toBe(false);
        }
      }
    }
  });
  it("SVG в миллиметрах, со слоями и маркировкой", () => {
    const [sheet] = nestParts(pressParts(pressConfig("M")));
    const svg = sheetSvg(sheet!, "test");
    expect(svg).toContain('width="1525mm"');
    expect(svg).toContain("#0000ff");
    expect(svg).toContain("BASE");
    expect((svg.match(/<circle/g) ?? []).length).toBeGreaterThan(30);
  });
  it("DXF имеет заголовок в мм, четыре слоя и EOF", () => {
    const [sheet] = nestParts(pressParts(pressConfig("M")));
    const dxf = sheetDxf(sheet!);
    expect(dxf).toContain("$INSUNITS");
    expect(dxf).toContain("\nCUT\n");
    expect(dxf).toContain("\nPOCKET\n");
    expect(dxf.trim().endsWith("EOF")).toBe(true);
  });
});
