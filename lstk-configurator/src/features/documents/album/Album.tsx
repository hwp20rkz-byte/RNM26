"use client";

import type { ReactElement } from "react";
import type { Assembly } from "@/domain/assemblies/types";
import { floorTrussDepth, sideOpenings, wallPlans, type Building } from "@/domain/buildings/generate";
import { centrelineLength } from "@/domain/members/member";
import type { Analysis } from "@/domain/planner/analyze";
import { NodeDetail } from "@/features/planner/NodeDetails";
import { Axis, Dim, FIELD, fitScale, LINE, Mark, Sheet, Table, Txt, type SheetMeta } from "./sheet";

/**
 * Drawing set (альбом) for a LSTK building after СПДС: ГОСТ Р 21.101-2020
 * (general rules, title block), ГОСТ 21.501-2018 (architectural drawings),
 * ГОСТ 21.502-2016 (steel structures, КМ). Generated from the same model as
 * the 3D view and the estimate. It is a design aid: a working design needs an
 * engineer's review and signature.
 */

type Dyn = (k: string) => string;
const AXIS_LETTERS = "АБВГДЕЖИКЛМНПРСТУФШЭЮЯ".split("");
const fmt = (v: number) => String(Math.round(v));

interface Ctx {
  a: Analysis;
  b: Building;
  d: Dyn;
}

/** Axes along x (numbers) and z (letters) for a level */
function axes(b: Building, li: number) {
  const { length: L, width: W } = b.input;
  const dd = b.depth;
  const lv = b.input.levels[li]!;
  const xs = [dd / 2, ...lv.partitions.filter((p) => p.axis === "x").map((p) => p.at).sort((p, q) => p - q), L - dd / 2];
  const zs = [dd / 2, ...lv.partitions.filter((p) => p.axis === "z").map((p) => p.at).sort((p, q) => p - q), W - dd / 2];
  return { xs, zs };
}

function chain(points: number[]): [number, number][] {
  const s = [...new Set(points.map((p) => Math.round(p)))].sort((a, b) => a - b);
  return s.slice(1).map((p, i) => [s[i]!, p]);
}

/** Floor plan of a level */
function Plan({ c, li, box }: { c: Ctx; li: number; box: { x: number; y: number; w: number; h: number } }) {
  const { b, a } = c;
  const { length: L, width: W } = b.input;
  const dd = b.depth;
  const lv = b.input.levels[li]!;
  const k = fitScale(L + 5000, W + 5000, box.w, box.h);
  const ox = box.x + 2600 / k;
  const oy = box.y + 2000 / k;
  const X = (x: number) => ox + x / k;
  const Y = (z: number) => oy + (W - z) / k;
  const items: ReactElement[] = [];
  // Walls: outer ring + partitions
  items.push(<path key="ring" d={`M ${X(0)} ${Y(0)} H ${X(L)} V ${Y(W)} H ${X(0)} Z M ${X(dd)} ${Y(dd)} V ${Y(W - dd)} H ${X(L - dd)} V ${Y(dd)} Z`} fill="#d9d9d9" fillRule="evenodd" stroke="black" strokeWidth={LINE.thick} />);
  for (const p of lv.partitions) {
    const inner = b.levels[li]!.inner;
    if (p.axis === "x") items.push(<rect key={p.id} x={X(p.at - dd / 2)} y={Y(inner.z1)} width={dd / k} height={(inner.z1 - inner.z0) / k} fill="#d9d9d9" stroke="black" strokeWidth={LINE.main} />);
    else items.push(<rect key={p.id} x={X(inner.x0)} y={Y(p.at + dd / 2)} width={(inner.x1 - inner.x0) / k} height={dd / k} fill="#d9d9d9" stroke="black" strokeWidth={LINE.main} />);
    for (const o of p.doors) {
      if (p.axis === "x") items.push(<rect key={o.id} x={X(p.at - dd / 2) - 0.2} y={Y(inner.z0 + o.x + o.width)} width={dd / k + 0.4} height={o.width / k} fill="white" />);
      else items.push(<rect key={o.id} x={X(inner.x0 + o.x)} y={Y(p.at + dd / 2) - 0.2} width={o.width / k} height={dd / k + 0.4} fill="white" />);
    }
  }
  // Outer openings: window = three thin lines, door = gap with a leaf arc
  for (const plan of wallPlans(b.input, li, b.levels[li]!.base)) {
    const cfg = lv.sides[plan.side];
    for (const o of sideOpenings(cfg, plan.length, lv.height, b.input, b.profile)) {
      const a0 = o.x;
      const a1 = o.x + o.width;
      let r: [number, number, number, number];
      if (plan.side === "front") r = [X(a0), Y(dd), (a1 - a0) / k, dd / k];
      else if (plan.side === "back") r = [X(L - a1), Y(W), (a1 - a0) / k, dd / k];
      else if (plan.side === "left") r = [X(0), Y(W - dd - a0), dd / k, (a1 - a0) / k];
      else r = [X(L - dd), Y(dd + a1), dd / k, (a1 - a0) / k];
      const [x, y, w, h] = r;
      items.push(<rect key={`${plan.side}${o.id}`} x={x} y={y} width={w} height={h} fill="white" stroke="black" strokeWidth={LINE.thin} />);
      if (o.kind === "window" && cfg.type === "wall") {
        const horiz = w > h;
        for (const f of [0.35, 0.65]) items.push(horiz ? <line key={`${plan.side}${o.id}${f}`} x1={x} x2={x + w} y1={y + h * f} y2={y + h * f} stroke="black" strokeWidth={LINE.thin} /> : <line key={`${plan.side}${o.id}${f}`} y1={y} y2={y + h} x1={x + w * f} x2={x + w * f} stroke="black" strokeWidth={LINE.thin} />);
      } else if (o.kind === "door") {
        const horiz = w > h;
        const R = (o.width / k) * 0.95;
        items.push(horiz ? <path key={`${plan.side}${o.id}a`} d={`M ${x} ${y + h} l 0 ${-R} A ${R} ${R} 0 0 1 ${x + R} ${y + h}`} fill="none" stroke="black" strokeWidth={LINE.thin} /> : <path key={`${plan.side}${o.id}a`} d={`M ${x + w} ${y} l ${R} 0 A ${R} ${R} 0 0 1 ${x + w} ${y + R}`} fill="none" stroke="black" strokeWidth={LINE.thin} />);
      }
    }
  }
  // Axes
  const { xs, zs } = axes(b, li);
  xs.forEach((x, i) => items.push(<Axis key={`ax${i}`} x1={X(x)} y1={Y(-200)} x2={X(x)} y2={Y(-2300)} label={String(i + 1)} />));
  zs.forEach((z, i) => items.push(<Axis key={`az${i}`} x1={X(-200)} y1={Y(z)} x2={X(-2300)} y2={Y(z)} label={AXIS_LETTERS[i] ?? String(i)} />));
  // Dimension chains along the front: openings, axes, overall
  const fr = sideOpenings(lv.sides.front, L, lv.height, b.input, b.profile);
  const openPts = [0, L, ...fr.flatMap((o) => [o.x, o.x + o.width])];
  chain(openPts).forEach(([p, q], i) => items.push(<Dim key={`do${i}`} x1={X(p)} y1={Y(0)} x2={X(q)} y2={Y(0)} off={4} text={fmt(q - p)} />));
  chain(xs).forEach(([p, q], i) => items.push(<Dim key={`dx${i}`} x1={X(p)} y1={Y(0)} x2={X(q)} y2={Y(0)} off={9} text={fmt(q - p)} />));
  items.push(<Dim key="dL" x1={X(0)} y1={Y(0)} x2={X(L)} y2={Y(0)} off={14} text={fmt(L)} />);
  chain(zs).forEach(([p, q], i) => items.push(<Dim key={`dz${i}`} x1={X(L)} y1={Y(p)} x2={X(L)} y2={Y(q)} off={6} text={fmt(q - p)} />));
  items.push(<Dim key="dW" x1={X(L)} y1={Y(0)} x2={X(L)} y2={Y(W)} off={11} text={fmt(W)} />);
  // Room numbers and areas
  const rooms = a.thermal.envelope.rooms[li] ?? [];
  rooms.forEach((r, i) => {
    const cx = X((r.x0 + r.x1) / 2);
    const cy = Y((r.z0 + r.z1) / 2);
    items.push(
      <g key={`r${i}`}>
        <Txt x={cx} y={cy - 0.5} s={3} a="middle" b>
          {`${li + 1}0${i + 1}`}
        </Txt>
        <line x1={cx - 4} x2={cx + 4} y1={cy + 0.4} y2={cy + 0.4} stroke="black" strokeWidth={LINE.thin} />
        <Txt x={cx} y={cy + 3.4} s={2.5} a="middle">
          {r.area.toFixed(2).replace(".", ",")}
        </Txt>
      </g>,
    );
  });
  items.push(
    <Txt key="title" x={X(L / 2)} y={box.y + 4} s={3.5} a="middle" b>
      {`${c.d("doc.planLevel").replace("{n}", String(li + 1))}  1:${k}`}
    </Txt>,
  );
  return <g>{items}</g>;
}

function roomTable(c: Ctx, li: number, x: number, y: number) {
  const rooms = c.a.thermal.envelope.rooms[li] ?? [];
  return (
    <Table
      x={x}
      y={y}
      widths={[14, 50, 18]}
      head={[c.d("doc.roomNo"), c.d("doc.roomName"), c.d("doc.areaM2")]}
      rows={[...rooms.map((r, i) => [`${li + 1}0${i + 1}`, c.d(`room.${r.purpose}`), r.area.toFixed(2).replace(".", ",")]), ["", c.d("layout.total"), rooms.reduce((s, r) => s + r.area, 0).toFixed(2).replace(".", ",")]]}
    />
  );
}

/** Facade: front (along x) or end (along z) */
function Facade({ c, side, box }: { c: Ctx; side: "front" | "left"; box: { x: number; y: number; w: number; h: number } }) {
  const { b } = c;
  const inp = b.input;
  const span = side === "front" ? inp.length : inp.width;
  const roof = inp.roof;
  const al = (roof.pitchDeg * Math.PI) / 180;
  const H = b.ridgeHeight + 200;
  const k = fitScale(span + 4000, H + 2500, box.w, box.h);
  const ox = box.x + 1500 / k;
  const gy = box.y + box.h - 1200 / k; // ground line
  const X = (x: number) => ox + x / k;
  const Y = (y: number) => gy - y / k;
  const items: ReactElement[] = [];
  const wallTop = b.levels.at(-1)!.base + b.levels.at(-1)!.height;
  const zero = b.levels[0]!.base;
  items.push(<line key="g" x1={X(-1200)} x2={X(span + 1200)} y1={Y(0)} y2={Y(0)} stroke="black" strokeWidth={LINE.thick} />);
  items.push(<rect key="w" x={X(0)} y={Y(wallTop)} width={span / k} height={(wallTop - inp.foundation.plinth) / k} fill="white" stroke="black" strokeWidth={LINE.main} />);
  if (inp.foundation.plinth > 0) items.push(<rect key="p" x={X(-20)} y={Y(inp.foundation.plinth)} width={(span + 40) / k} height={inp.foundation.plinth / k} fill="#bdbdbd" stroke="black" strokeWidth={LINE.main} />);
  const ov = roof.overhang * Math.cos(al);
  if (side === "front") {
    const eave = b.roofBase - roof.overhang * Math.sin(al);
    const top = b.ridgeHeight;
    items.push(<rect key="r" x={X(-Math.min(roof.overhang, 400))} y={Y(top)} width={(span + 2 * Math.min(roof.overhang, 400)) / k} height={(top - eave) / k} fill="#e6e6e6" stroke="black" strokeWidth={LINE.main} />);
  } else {
    const W = span;
    const pts =
      roof.type === "gable"
        ? [
            [-ov, b.roofBase - roof.overhang * Math.sin(al)],
            [W / 2, b.ridgeHeight],
            [W + ov, b.roofBase - roof.overhang * Math.sin(al)],
          ]
        : [
            [-ov, b.roofBase + roof.heelHeight - roof.overhang * Math.sin(al)],
            [W + ov, b.ridgeHeight + roof.overhang * Math.sin(al)],
          ];
    items.push(<polyline key="r" points={pts.map(([x, y]) => `${X(x!)},${Y(y!)}`).join(" ")} fill="none" stroke="black" strokeWidth={LINE.thick} />);
    if (roof.type === "gable") items.push(<polygon key="gab" points={`${X(0)},${Y(wallTop)} ${X(W / 2)},${Y(b.ridgeHeight - 150)} ${X(W)},${Y(wallTop)}`} fill="white" stroke="black" strokeWidth={LINE.main} />);
  }
  // Openings
  inp.levels.forEach((lv, li) => {
    const sideKey = side;
    const plan = wallPlans(inp, li, b.levels[li]!.base).find((p) => p.side === sideKey)!;
    const off = side === "left" ? b.depth : 0;
    for (const o of sideOpenings(lv.sides[sideKey], plan.length, lv.height, inp, b.profile)) {
      // left wall local x runs from the back to the front: mirror for a view from outside
      const x0 = side === "left" ? off + o.x : o.x;
      const y0 = b.levels[li]!.base + o.sill;
      items.push(<rect key={`${li}${o.id}`} x={X(x0)} y={Y(y0 + o.height)} width={o.width / k} height={o.height / k} fill={o.kind === "window" ? "#dfe9f3" : "white"} stroke="black" strokeWidth={LINE.main} />);
    }
  });
  // Level marks (0.000 = finished floor of storey 1)
  const marks = [-zero, 0, ...b.levels.slice(1).map((l) => l.base - zero), wallTop - zero, b.ridgeHeight - zero];
  marks.forEach((m, i) => items.push(<Mark key={`m${i}`} x={X(span + 1500)} y={Y(m + zero)} value={m} />));
  items.push(
    <Txt key="t" x={X(span / 2)} y={box.y + 4} s={3.5} a="middle" b>
      {(() => {
        // Facades are named by their end axes (ГОСТ 21.501): 1-N along the building, А-… across
        const ax = axes(b, 0);
        const name = side === "front" ? `1-${ax.xs.length}` : `${AXIS_LETTERS[0]}-${AXIS_LETTERS[ax.zs.length - 1]}`;
        return `${c.d("doc.facade")} ${name}  1:${k}`;
      })()}
    </Txt>,
  );
  return <g>{items}</g>;
}

/** Cross section 1–1 at mid-length */
function Section({ c, box }: { c: Ctx; box: { x: number; y: number; w: number; h: number } }) {
  const { b } = c;
  const inp = b.input;
  const W = inp.width;
  const dd = b.depth;
  const H = b.ridgeHeight + 300;
  const k = fitScale(W + 4000, H + 2500, box.w, box.h);
  const ox = box.x + 1500 / k;
  const gy = box.y + box.h - 1500 / k;
  const X = (x: number) => ox + x / k;
  const Y = (y: number) => gy - y / k;
  const it: ReactElement[] = [];
  it.push(<line key="g" x1={X(-1500)} x2={X(W + 1500)} y1={Y(0)} y2={Y(0)} stroke="black" strokeWidth={LINE.thick} />);
  const f = inp.foundation;
  if (f.type === "strip") for (const x of [0, W - 300]) it.push(<rect key={`s${x}`} x={X(x)} y={Y(f.plinth)} width={300 / k} height={(f.plinth + c.a.foundation.stripDepth) / k} fill="#c8c8c8" stroke="black" strokeWidth={LINE.main} />);
  if (f.type === "screw-piles") for (const x of [dd / 2, W - dd / 2]) it.push(<rect key={`p${x}`} x={X(x - 54)} y={Y(f.plinth)} width={108 / k} height={(f.plinth + c.a.foundation.pileLength - f.plinth) / k} fill="#c8c8c8" stroke="black" strokeWidth={LINE.main} />);
  if (f.type === "slab") it.push(<rect key="slab" x={X(-200)} y={Y(f.plinth)} width={(W + 400) / k} height={Math.max(150, f.plinth) / k} fill="#c8c8c8" stroke="black" strokeWidth={LINE.main} />);
  const fd = floorTrussDepth(W);
  if (b.groundFloor) it.push(<rect key="ft0" x={X(0)} y={Y(f.plinth + fd)} width={W / k} height={fd / k} fill="none" stroke="black" strokeWidth={LINE.main} strokeDasharray="2 1" />);
  b.levels.forEach((l, li) => {
    for (const x of [0, W - dd]) it.push(<rect key={`w${li}${x}`} x={X(x)} y={Y(l.base + l.height)} width={dd / k} height={l.height / k} fill="#d9d9d9" stroke="black" strokeWidth={LINE.main} />);
    if (li + 1 < b.levels.length) it.push(<rect key={`ft${li}`} x={X(0)} y={Y(l.base + l.height + fd)} width={W / k} height={fd / k} fill="none" stroke="black" strokeWidth={LINE.main} strokeDasharray="2 1" />);
  });
  // Roof truss drawn from the analytical model
  const m = b.roofTruss;
  for (const bar of m.bars) {
    const p = m.nodes[bar.a]!;
    const q = m.nodes[bar.b]!;
    it.push(<line key={`t${bar.id}`} x1={X(p.x)} y1={Y(b.roofBase + p.y)} x2={X(q.x)} y2={Y(b.roofBase + q.y)} stroke="black" strokeWidth={bar.role === "top-chord" || bar.role === "bottom-chord" ? LINE.thick : LINE.main} />);
  }
  const zero = b.levels[0]!.base;
  const marks = [-zero, 0, ...b.levels.slice(1).map((l) => l.base - zero), b.levels.at(-1)!.base + b.levels.at(-1)!.height - zero, b.ridgeHeight - zero];
  marks.forEach((v, i) => it.push(<Mark key={`m${i}`} x={X(W + 1200)} y={Y(v + zero)} value={v} />));
  it.push(<Dim key="dw" x1={X(0)} y1={Y(0)} x2={X(W)} y2={Y(0)} off={8} text={fmt(W)} />);
  it.push(
    <Txt key="t" x={X(W / 2)} y={box.y + 4} s={3.5} a="middle" b>
      {`${c.d("doc.section")} 1-1  1:${k}`}
    </Txt>,
  );
  return <g>{it}</g>;
}

/** Schemes in plan: foundations, roof trusses, wall panels */
function Scheme({ c, kind, box }: { c: Ctx; kind: "foundation" | "trusses" | "panels"; box: { x: number; y: number; w: number; h: number } }) {
  const { b, a } = c;
  const { length: L, width: W } = b.input;
  const k = fitScale(L + 5000, W + 5000, box.w, box.h);
  const ox = box.x + 2600 / k;
  const oy = box.y + 2000 / k;
  const X = (x: number) => ox + x / k;
  const Y = (z: number) => oy + (W - z) / k;
  const it: ReactElement[] = [<rect key="o" x={X(0)} y={Y(W)} width={L / k} height={W / k} fill="none" stroke="black" strokeWidth={LINE.thin} strokeDasharray="4 1" />];
  if (kind === "foundation") {
    if (a.foundation.type === "screw-piles") {
      // Piles under the outer walls at ≤ 2.5 m (domain/foundation)
      const ring: [number, number][] = [];
      const step = (n: number, s: number) => Array.from({ length: Math.max(1, Math.ceil(n / s)) + 1 }, (_, i) => (n * i) / Math.max(1, Math.ceil(n / s)));
      for (const x of step(L, 2500)) ring.push([x, 0], [x, W]);
      for (const z of step(W, 2500).slice(1, -1)) ring.push([0, z], [L, z]);
      ring.forEach(([x, z], i) => it.push(<circle key={`p${i}`} cx={X(x)} cy={Y(z)} r={Math.max(0.8, 54 / k)} fill="black" />));
    } else if (a.foundation.type !== "none") {
      const t = a.foundation.type === "strip" ? 300 : 0;
      if (t) it.push(<path key="s" d={`M ${X(0)} ${Y(0)} H ${X(L)} V ${Y(W)} H ${X(0)} Z M ${X(t)} ${Y(t)} V ${Y(W - t)} H ${X(L - t)} V ${Y(t)} Z`} fill="#c8c8c8" fillRule="evenodd" stroke="black" strokeWidth={LINE.main} />);
      else it.push(<rect key="s" x={X(-200)} y={Y(W + 200)} width={(L + 400) / k} height={(W + 400) / k} fill="#e0e0e0" stroke="black" strokeWidth={LINE.main} />);
    }
    for (const h of b.hardware.filter((x) => x.kind === "anchor" && x.level === 0)) it.push(<circle key={`a${h.at.x}${h.at.z}`} cx={X(h.at.x)} cy={Y(h.at.z)} r={0.6} fill="none" stroke="black" strokeWidth={LINE.thin} />);
  }
  if (kind === "trusses") {
    for (const x of b.trussPositions) it.push(<line key={`t${x}`} x1={X(x)} x2={X(x)} y1={Y(0)} y2={Y(W)} stroke="black" strokeWidth={LINE.main} />);
    if (b.input.roof.type === "gable") it.push(<line key="ridge" x1={X(0)} x2={X(L)} y1={Y(W / 2)} y2={Y(W / 2)} stroke="black" strokeWidth={LINE.thin} strokeDasharray="8 1.5 1 1.5" />);
    it.push(
      <Txt key="m" x={X(b.trussPositions[0]!) + 1} y={Y(W * 0.7)} s={2.5}>
        T1
      </Txt>,
    );
    chain(b.trussPositions.slice(0, 4)).forEach(([p, q], i) => it.push(<Dim key={`d${i}`} x1={X(p)} y1={Y(0)} x2={X(q)} y2={Y(0)} off={5} text={fmt(q - p)} />));
    it.push(
      <Txt key="n" x={X(L / 2)} y={Y(-1800)} s={2.5} a="middle">
        {`T1 × ${b.trussPositions.length}`}
      </Txt>,
    );
  }
  if (kind === "panels") {
    for (const asm of b.assemblies.filter((x) => x.kind === "wall" && (x.mark.startsWith("W") ? Number(x.mark.slice(1)) <= 4 : x.mark.startsWith("P1.")))) {
      const f = asm.placement;
      const p0 = { x: f.origin.x, z: f.origin.z };
      const p1 = { x: f.origin.x + f.ex.x * asm.size.width, z: f.origin.z + f.ex.z * asm.size.width };
      it.push(<line key={asm.id} x1={X(p0.x)} y1={Y(p0.z)} x2={X(p1.x)} y2={Y(p1.z)} stroke="black" strokeWidth={LINE.thick * 2} />);
      it.push(
        <Txt key={`${asm.id}t`} x={X((p0.x + p1.x) / 2) + 1} y={Y((p0.z + p1.z) / 2) - 1} s={2.5} b>
          {asm.mark}
        </Txt>,
      );
    }
  }
  it.push(<Dim key="dL" x1={X(0)} y1={Y(0)} x2={X(L)} y2={Y(0)} off={12} text={fmt(L)} />);
  it.push(<Dim key="dW" x1={X(L)} y1={Y(0)} x2={X(L)} y2={Y(W)} off={8} text={fmt(W)} />);
  it.push(
    <Txt key="t" x={X(L / 2)} y={box.y + 4} s={3.5} a="middle" b>
      {`${c.d(`doc.scheme.${kind}`)}  1:${k}`}
    </Txt>,
  );
  return <g>{it}</g>;
}

/** Elevation of one assembly (wall panel or truss) with member piece marks */
function AssemblyDrawing({ c, asm, box }: { c: Ctx; asm: Assembly; box: { x: number; y: number; w: number; h: number } }) {
  const xsAll = asm.members.flatMap((m) => [m.start.x, m.end.x]);
  const ysAll = asm.members.flatMap((m) => [m.start.y, m.end.y]);
  const minX = Math.min(...xsAll);
  const maxX = Math.max(...xsAll);
  const minY = Math.min(...ysAll);
  const maxY = Math.max(...ysAll);
  const k = fitScale(maxX - minX + 1500, maxY - minY + 1500, box.w, box.h - 10);
  // Centre the elevation in the free field
  const ox = box.x + (box.w - 100 - (maxX - minX) / k) / 2 - minX / k;
  const gy = box.y + box.h / 2 + (maxY - minY) / k / 2 + minY / k;
  const X = (x: number) => ox + x / k;
  const Y = (y: number) => gy - y / k;
  const cut = c.a.bom.cutList.filter((x) => x.assemblyMark === asm.mark);
  const markOf = (role: string, len: number) => cut.find((x) => x.role === role && Math.abs(x.length - len) < 0.6)?.pieceMark.split("-").at(-1) ?? "";
  const it: ReactElement[] = [];
  const seen = new Set<string>();
  for (const m of asm.members) {
    const w = Math.max(LINE.main, (m.profile.family === "C" ? m.profile.flange : 41) / k);
    it.push(<line key={m.id} x1={X(m.start.x)} y1={Y(m.start.y)} x2={X(m.end.x)} y2={Y(m.end.y)} stroke="#555" strokeWidth={w} strokeLinecap="butt" />);
    const n = markOf(m.role, centrelineLength(m));
    const key = `${n}`;
    if (n && !seen.has(key)) {
      seen.add(key);
      const cx = X((m.start.x + m.end.x) / 2);
      const cy = Y((m.start.y + m.end.y) / 2);
      it.push(
        <g key={`${m.id}n`}>
          <circle cx={cx} cy={cy} r={2.2} fill="white" stroke="black" strokeWidth={LINE.thin} />
          <Txt x={cx} y={cy + 0.9} s={2.4} a="middle">
            {n}
          </Txt>
        </g>,
      );
    }
  }
  it.push(<Dim key="dl" x1={X(minX)} y1={Y(minY)} x2={X(maxX)} y2={Y(minY)} off={7} text={fmt(maxX - minX)} />);
  it.push(<Dim key="dh" x1={X(maxX)} y1={Y(minY)} x2={X(maxX)} y2={Y(maxY)} off={6} text={fmt(maxY - minY)} />);
  it.push(
    <Txt key="t" x={X((minX + maxX) / 2)} y={box.y + 4} s={3.5} a="middle" b>
      {`${asm.mark}  1:${k}`}
    </Txt>,
  );
  const tableRows = cut.map((x) => [x.pieceMark.split("-").at(-1)!, c.d(`role.${x.role}`), fmt(x.length), x.qty]);
  return (
    <g>
      {it}
      <Table x={box.x + box.w - 92} y={box.y + 8} widths={[10, 44, 20, 14]} head={[c.d("doc.pos"), c.d("doc.role"), c.d("spec.length"), c.d("unit.pcs")]} rows={tableRows.slice(0, 26)} rowH={5} s={2.1} />
    </g>
  );
}

export interface AlbumSheet {
  title: string;
  body: ReactElement;
}

export function albumSheets(a: Analysis, d: Dyn): AlbumSheet[] {
  const b = a.building;
  const c: Ctx = { a, b, d };
  const full = { x: FIELD.x0, y: FIELD.y0, w: FIELD.x1 - FIELD.x0, h: FIELD.y1 - FIELD.y0 };
  const left = { x: FIELD.x0, y: FIELD.y0, w: 280, h: FIELD.y1 - FIELD.y0 };
  const sheets: AlbumSheet[] = [];
  sheets.push({ title: d("doc.sheet.general"), body: <General c={c} /> });
  b.input.levels.forEach((_, li) =>
    sheets.push({
      title: d("doc.planLevel").replace("{n}", String(li + 1)),
      body: (
        <>
          <Plan c={c} li={li} box={left} />
          {roomTable(c, li, FIELD.x0 + 290, FIELD.y0 + 10)}
        </>
      ),
    }),
  );
  sheets.push({
    title: d("doc.sheet.facades"),
    body: (
      <>
        <Facade c={c} side="front" box={{ x: FIELD.x0, y: FIELD.y0, w: 230, h: full.h }} />
        <Facade c={c} side="left" box={{ x: FIELD.x0 + 235, y: FIELD.y0, w: 150, h: full.h }} />
      </>
    ),
  });
  sheets.push({ title: `${d("doc.section")} 1-1`, body: <Section c={c} box={full} /> });
  sheets.push({ title: d("doc.scheme.foundation"), body: <Scheme c={c} kind="foundation" box={full} /> });
  sheets.push({ title: d("doc.scheme.trusses"), body: <Scheme c={c} kind="trusses" box={full} /> });
  sheets.push({ title: d("doc.scheme.panels"), body: <Scheme c={c} kind="panels" box={full} /> });
  const unique = new Map<string, Assembly>();
  for (const x of b.assemblies) if (!unique.has(x.mark)) unique.set(x.mark, x);
  for (const asm of unique.values()) sheets.push({ title: `${d(asm.kind === "truss" ? "doc.truss" : "doc.panel")} ${asm.mark}`, body: <AssemblyDrawing c={c} asm={asm} box={{ x: FIELD.x0, y: FIELD.y0, w: full.w - 95, h: full.h }} /> });
  sheets.push({ title: d("doc.sheet.spec"), body: <Spec c={c} /> });
  sheets.push({ title: d("doc.sheet.nodes"), body: <Nodes c={c} /> });
  return sheets;
}

function General({ c }: { c: Ctx }) {
  const { a, d } = c;
  const L = a.design.loads;
  const notes = [
    d("doc.gen.1").replace("{profile}", a.building.profile.id),
    d("doc.gen.2").replace("{fy}", a.settings.certifiedG550 ? "550 (G550)" : "350"),
    d("doc.gen.3").replace("{sk}", L.snowGround.toFixed(2)).replace("{s}", L.snowRoof.toFixed(2)).replace("{w}", L.wind.toFixed(2)),
    d("doc.gen.4").replace("{q}", L.floorQ.toFixed(1)),
    d("doc.gen.5"),
    d("doc.gen.6"),
    d("doc.gen.7").replace("{u}", String(Math.round(a.design.worst * 100))),
    d("doc.gen.8"),
  ];
  const refs = ["ГОСТ Р 21.101-2020", "ГОСТ 21.501-2018", "ГОСТ 21.502-2016", "СП РК EN 1990", "СП РК EN 1991-1-3, НТП РК 01-01-3.1(4.1)-2017", "СП РК EN 1993-1-3", "СП РК 2.04-01-2017", "AISI S240 / S100, CSA S136", "JGJ 227-2011"];
  return (
    <g>
      <Txt x={FIELD.x0 + 5} y={FIELD.y0 + 8} s={4} b>
        {d("doc.sheet.general")}
      </Txt>
      <Txt x={FIELD.x0 + 5} y={FIELD.y0 + 18} s={3} b>
        {d("doc.notes")}
      </Txt>
      {notes.map((n, i) => (
        <Txt key={i} x={FIELD.x0 + 5} y={FIELD.y0 + 26 + i * 6} s={2.6}>
          {`${i + 1}. ${n}`}
        </Txt>
      ))}
      <Txt x={FIELD.x0 + 5} y={FIELD.y0 + 84} s={3} b>
        {d("doc.refs")}
      </Txt>
      {refs.map((r, i) => (
        <Txt key={r} x={FIELD.x0 + 5} y={FIELD.y0 + 92 + i * 5} s={2.5}>
          {r}
        </Txt>
      ))}
    </g>
  );
}

function Spec({ c }: { c: Ctx }) {
  const { a, d } = c;
  return (
    <g>
      <Txt x={FIELD.x0 + 5} y={FIELD.y0 + 8} s={3.5} b>
        {d("doc.specSteel")}
      </Txt>
      <Table
        x={FIELD.x0 + 5}
        y={FIELD.y0 + 12}
        widths={[60, 40, 30, 30, 30]}
        head={[d("spec.section"), d("doc.grade"), d("spec.pieces"), d("spec.metres"), d("unit.kg")]}
        rows={[...a.bom.profiles.map((p) => [p.designation, a.building.profile.grade, p.pieces, p.metres.toFixed(1), p.massKg.toFixed(1)]), [d("doc.total"), "", a.bom.totals.pieces, a.bom.totals.metres.toFixed(1), a.bom.totals.massWithScrapKg.toFixed(1)]]}
      />
      <Txt x={FIELD.x0 + 5} y={FIELD.y0 + 50} s={3.5} b>
        {d("spec.assemblies")}
      </Txt>
      <Table x={FIELD.x0 + 5} y={FIELD.y0 + 54} widths={[30, 20, 30, 30]} head={[d("spec.mark"), d("unit.pcs"), d("spec.pieces"), d("spec.kgEach")]} rows={a.bom.assemblies.slice(0, 28).map((x) => [x.mark, x.qty, x.pieces, x.massKg.toFixed(1)])} rowH={5} />
      <Txt x={FIELD.x0 + 200} y={FIELD.y0 + 50} s={3.5} b>
        {d("nodes.hardware")}
      </Txt>
      <Table x={FIELD.x0 + 200} y={FIELD.y0 + 54} widths={[70, 25, 15]} head={[d("doc.item"), d("doc.qty"), d("doc.unit")]} rows={a.hardware.map((h) => [d(`cost.hw.${h.kind}`), h.unit === "m" ? h.qty.toFixed(1) : Math.round(h.qty), d(h.unit === "m" ? "unit.m" : "unit.pcs")])} rowH={5} />
    </g>
  );
}

function Nodes({ c }: { c: Ctx }) {
  const { a, d } = c;
  const nodes = a.building.nodes;
  const cols = 4;
  const cw = (FIELD.x1 - FIELD.x0) / cols;
  const ch = 70;
  return (
    <g>
      {nodes.map((n, i) => {
        const x = FIELD.x0 + (i % cols) * cw;
        const y = FIELD.y0 + 6 + Math.floor(i / cols) * ch;
        return (
          <g key={n.type}>
            <svg x={x + 4} y={y + 6} width={cw - 8} height={ch - 18}>
              <NodeDetail type={n.type} className="" />
            </svg>
            <Txt x={x + cw / 2} y={y + 4} s={2.8} a="middle" b>
              {`${d("doc.node")} ${i + 1}. ${d(`node.${n.type}`)}`}
            </Txt>
            <Txt x={x + cw / 2} y={y + ch - 7} s={2.3} a="middle">
              {`${n.count} ${d("unit.pcs")}`}
            </Txt>
          </g>
        );
      })}
    </g>
  );
}

export function Album({ a, meta, d }: { a: Analysis; meta: SheetMeta; d: Dyn }) {
  const sheets = albumSheets(a, d);
  return (
    <div className="album">
      {sheets.map((s, i) => (
        <Sheet key={i} meta={meta} title={s.title} n={i + 1} total={sheets.length}>
          {s.body}
        </Sheet>
      ))}
    </div>
  );
}

