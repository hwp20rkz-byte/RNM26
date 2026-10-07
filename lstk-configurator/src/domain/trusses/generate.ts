import { PATTERNS_FOR_SHAPE, type BarRole, type TrussBar, type TrussInput, type TrussModel, type TrussNode } from "./types";

const deg = (d: number) => (d * Math.PI) / 180;

export function validateTruss(input: TrussInput): string[] {
  const e: string[] = [];
  const { shape, span, pattern, panels } = input;
  if (!(span >= 1000)) e.push("Пролёт должен быть не меньше 1000 мм");
  if (!PATTERNS_FOR_SHAPE[shape.kind].includes(pattern)) {
    e.push(`Решётка «${pattern}» не поддерживается для формы «${shape.kind}»`);
  }
  if ((shape.kind === "triangular" || shape.kind === "trapezoidal") && !(shape.pitchDeg >= 5 && shape.pitchDeg <= 60)) e.push("Уклон должен быть от 5° до 60°");
  if (shape.kind === "mono" && !(shape.pitchDeg >= 2 && shape.pitchDeg <= 45)) e.push("Уклон односкатной фермы — от 2° до 45°");
  if (shape.kind === "mono" && !(shape.heelHeight >= 100)) e.push("Высота низкой опоры односкатной фермы — не меньше 100 мм");
  if (shape.kind === "trapezoidal" && !(shape.heelHeight > 0)) e.push("Высота на опоре должна быть больше нуля");
  if (shape.kind === "parallel" && !(shape.depth > 0)) e.push("Высота фермы должна быть больше нуля");
  if (pattern !== "fink" && (!Number.isInteger(panels) || panels < 2 || panels % 2 !== 0)) {
    e.push("Число панелей — чётное, не меньше 2");
  }
  if (input.overhang < 0) e.push("Свес не может быть отрицательным");
  if (!(input.maxPieceLength >= 1000)) e.push("Максимальная длина заготовки — не меньше 1000 мм");
  return e;
}

/** Height of the top chord centreline above the bottom chord at station x */
export function topChordY(input: Pick<TrussInput, "span" | "shape">, x: number): number {
  const { shape, span } = input;
  switch (shape.kind) {
    case "triangular":
      return Math.tan(deg(shape.pitchDeg)) * Math.min(x, span - x);
    case "trapezoidal":
      return shape.heelHeight + Math.tan(deg(shape.pitchDeg)) * Math.min(x, span - x);
    case "parallel":
      return shape.depth;
    case "mono":
      return shape.heelHeight + Math.tan(deg(shape.pitchDeg)) * x;
  }
}

/** Pitch of the top chord, degrees (0 for flat chords) */
export function shapePitch(shape: TrussInput["shape"]): number {
  return shape.kind === "parallel" ? 0 : shape.pitchDeg;
}

class Builder {
  nodes: TrussNode[] = [];
  bars: TrussBar[] = [];
  private keys = new Set<string>();

  node(x: number, y: number, support?: TrussNode["support"]): number {
    // Coincident points (e.g. heel of a triangular truss) share one node
    const hit = this.nodes.find((n) => Math.abs(n.x - x) < 1e-6 && Math.abs(n.y - y) < 1e-6);
    if (hit) {
      if (support) hit.support = support;
      return hit.id;
    }
    const id = this.nodes.length;
    this.nodes.push({ id, x, y, ...(support ? { support } : {}) });
    return id;
  }

  /** Adds a bar unless it is degenerate or duplicates an existing one */
  bar(a: number, b: number, role: BarRole): void {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (this.keys.has(key)) return;
    this.keys.add(key);
    this.bars.push({ id: this.bars.length, a, b, role });
  }
}

export function generateTruss(input: TrussInput): TrussModel {
  const errors = validateTruss(input);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const b = new Builder();
  if (input.pattern === "fink") fink(b, input);
  else if (input.pattern === "warren") warren(b, input);
  else prattOrHowe(b, input);
  const height = Math.max(...b.nodes.map((n) => n.y));
  return { input, nodes: b.nodes, bars: b.bars, height };
}

/**
 * Every panel point has a node on both chords and (where the truss has depth)
 * a vertical; one diagonal per panel. Pratt diagonals run from the outer top
 * node down to the inner bottom node (tension under gravity), Howe the mirror
 * (compression). Panels at a triangular heel are already triangles — their
 * diagonal would coincide with a chord and is dropped by the builder.
 */
function prattOrHowe(b: Builder, input: TrussInput): void {
  const n = input.panels;
  const s = input.span / n;
  const bottom: number[] = [];
  const top: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = i * s;
    bottom.push(b.node(x, 0, i === 0 ? "pin" : i === n ? "roller" : undefined));
    top.push(b.node(x, topChordY(input, x)));
  }
  for (let i = 0; i < n; i++) {
    b.bar(bottom[i]!, bottom[i + 1]!, "bottom-chord");
    b.bar(top[i]!, top[i + 1]!, "top-chord");
  }
  for (let i = 0; i <= n; i++) b.bar(bottom[i]!, top[i]!, "vertical");
  // Mono-pitch: one slope, all diagonals lean the same way (the whole span is the "left half")
  const half = input.shape.kind === "mono" ? n : n / 2;
  for (let i = 0; i < n; i++) {
    const leftHalf = i < half;
    const outer = leftHalf ? i : i + 1;
    const inner = leftHalf ? i + 1 : i;
    if (input.pattern === "pratt") b.bar(top[outer]!, bottom[inner]!, "diagonal");
    else b.bar(bottom[outer]!, top[inner]!, "diagonal");
  }
}

/** Parallel-chord Warren: bottom nodes on even stations, top nodes on odd ones */
function warren(b: Builder, input: TrussInput): void {
  const n = input.panels;
  const s = input.span / n;
  const bottom = new Map<number, number>();
  const top = new Map<number, number>();
  for (let i = 0; i <= n; i += 2) bottom.set(i, b.node(i * s, 0, i === 0 ? "pin" : i === n ? "roller" : undefined));
  for (let i = 1; i < n; i += 2) top.set(i, b.node(i * s, topChordY(input, i * s)));
  for (let i = 0; i + 2 <= n; i += 2) b.bar(bottom.get(i)!, bottom.get(i + 2)!, "bottom-chord");
  for (let i = 1; i + 2 < n; i += 2) b.bar(top.get(i)!, top.get(i + 2)!, "top-chord");
  for (let i = 1; i < n; i += 2) {
    b.bar(bottom.get(i - 1)!, top.get(i)!, "diagonal");
    b.bar(top.get(i)!, bottom.get(i + 1)!, "diagonal");
  }
}

/**
 * Fink ("W"): bottom chord in thirds, top chords split at their midpoints,
 * webs from the third points to the top-chord midpoints and to the ridge.
 */
function fink(b: Builder, input: TrussInput): void {
  const L = input.span;
  const y = (x: number) => topChordY(input, x);
  const heelL = b.node(0, 0, "pin");
  const heelR = b.node(L, 0, "roller");
  const b1 = b.node(L / 3, 0);
  const b2 = b.node((2 * L) / 3, 0);
  const q1 = b.node(L / 4, y(L / 4));
  const ridge = b.node(L / 2, y(L / 2));
  const q3 = b.node((3 * L) / 4, y((3 * L) / 4));
  b.bar(heelL, b1, "bottom-chord");
  b.bar(b1, b2, "bottom-chord");
  b.bar(b2, heelR, "bottom-chord");
  b.bar(heelL, q1, "top-chord");
  b.bar(q1, ridge, "top-chord");
  b.bar(ridge, q3, "top-chord");
  b.bar(q3, heelR, "top-chord");
  b.bar(q1, b1, "diagonal");
  b.bar(b1, ridge, "diagonal");
  b.bar(ridge, b2, "diagonal");
  b.bar(b2, q3, "diagonal");
}
