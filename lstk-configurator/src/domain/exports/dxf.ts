import type { Assembly } from "../assemblies/types";
import { centrelineLength, memberFrame } from "../members/member";
import type { Member } from "../members/types";
import { roleLabel } from "./csv";

/**
 * Shop drawings as DXF R12 (ASCII): one elevation per assembly mark, laid out
 * left to right, in the assembly's local x/y plane, millimetres. Each member is
 * drawn as the strip it shows in that view: the web for in-plane members
 * (trusses), a flange for members whose web faces the viewer's depth (walls).
 * Layers per member role; holes as circles where the web is visible.
 */

const LAYER_COLOR: Record<string, number> = {
  track: 5,
  stud: 7,
  jamb: 1,
  lintel: 1,
  sill: 1,
  cripple: 3,
  nogging: 8,
  "top-chord": 5,
  "bottom-chord": 5,
  "truss-web": 7,
  post: 1,
  beam: 5,
  TEXT: 2,
};

const fmt = (v: number) => (Math.round(v * 1000) / 1000).toString();

class Writer {
  out: string[] = [];
  code(c: number, v: string | number) {
    this.out.push(String(c), typeof v === "number" ? fmt(v) : v);
  }
  line(layer: string, x1: number, y1: number, x2: number, y2: number) {
    this.code(0, "LINE");
    this.code(8, layer);
    this.code(10, x1);
    this.code(20, y1);
    this.code(30, 0);
    this.code(11, x2);
    this.code(21, y2);
    this.code(31, 0);
  }
  circle(layer: string, x: number, y: number, r: number) {
    this.code(0, "CIRCLE");
    this.code(8, layer);
    this.code(10, x);
    this.code(20, y);
    this.code(30, 0);
    this.code(40, r);
  }
  text(layer: string, x: number, y: number, h: number, s: string) {
    this.code(0, "TEXT");
    this.code(8, layer);
    this.code(10, x);
    this.code(20, y);
    this.code(30, 0);
    this.code(40, h);
    this.code(1, s);
  }
}

function strip(m: Member): { corners: [number, number][]; webVisible: boolean } {
  const f = memberFrame(m);
  const L = centrelineLength(m);
  const ax = [f.axis.x, f.axis.y] as const;
  const webVisible = Math.abs(f.web.z) < 0.5;
  const p = m.profile;
  const depth = p.family === "Hat" ? p.depth : p.web;
  const flange = p.family === "Hat" ? p.crown : p.flange;
  let a: [number, number];
  let b: [number, number];
  if (webVisible) {
    a = [-f.web.x * depth / 2, -f.web.y * depth / 2];
    b = [f.web.x * depth / 2, f.web.y * depth / 2];
  } else {
    a = [0, 0];
    b = [f.flange.x * flange, f.flange.y * flange];
  }
  const s = [m.start.x, m.start.y];
  const e = [s[0]! + ax[0] * L, s[1]! + ax[1] * L];
  return {
    corners: [
      [s[0]! + a[0], s[1]! + a[1]],
      [e[0]! + a[0], e[1]! + a[1]],
      [e[0]! + b[0], e[1]! + b[1]],
      [s[0]! + b[0], s[1]! + b[1]],
    ],
    webVisible,
  };
}

/** One drawing per distinct mark (identical trusses are drawn once) */
export function assembliesDxf(assemblies: readonly Assembly[]): string {
  const w = new Writer();
  const unique = [...new Map(assemblies.map((a) => [a.mark, a])).values()];
  const layers = new Set<string>(["TEXT"]);
  unique.forEach((a) => a.members.forEach((m) => layers.add(m.role)));

  w.code(0, "SECTION");
  w.code(2, "HEADER");
  w.code(9, "$INSUNITS");
  w.code(70, 4); // millimetres
  w.code(0, "ENDSEC");
  w.code(0, "SECTION");
  w.code(2, "TABLES");
  w.code(0, "TABLE");
  w.code(2, "LAYER");
  w.code(70, layers.size);
  for (const l of layers) {
    w.code(0, "LAYER");
    w.code(2, l);
    w.code(70, 0);
    w.code(62, LAYER_COLOR[l] ?? 7);
    w.code(6, "CONTINUOUS");
  }
  w.code(0, "ENDTAB");
  w.code(0, "ENDSEC");
  w.code(0, "SECTION");
  w.code(2, "ENTITIES");

  let offsetX = 0;
  for (const a of unique) {
    const qty = assemblies.filter((x) => x.mark === a.mark).length;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    for (const m of a.members) {
      const { corners } = strip(m);
      for (const c of corners) {
        minX = Math.min(minX, c[0]);
        maxX = Math.max(maxX, c[0]);
        minY = Math.min(minY, c[1]);
      }
    }
    const dx = offsetX - minX;
    for (const m of a.members) {
      const { corners, webVisible } = strip(m);
      for (let i = 0; i < 4; i++) {
        const p = corners[i]!;
        const q = corners[(i + 1) % 4]!;
        w.line(m.role, p[0] + dx, p[1], q[0] + dx, q[1]);
      }
      if (webVisible) {
        const f = memberFrame(m);
        for (const ft of m.features) {
          if (ft.kind !== "dimple" && ft.kind !== "bolt-hole") continue;
          const x = m.start.x + f.axis.x * ft.position + f.web.x * ft.offset;
          const y = m.start.y + f.axis.y * ft.position + f.web.y * ft.offset;
          w.circle(m.role, x + dx, y, ft.diameter / 2);
        }
      }
    }
    w.text("TEXT", offsetX, minY - 250, 120, `${a.mark} ${qty > 1 ? `x${qty} ` : ""}${a.name.replace(/ \(\d+ из \d+\)$/, "")}`);
    w.text("TEXT", offsetX, minY - 420, 70, `${a.members.length} деталей: ${[...new Set(a.members.map((m) => roleLabel(m.role)))].join(", ")}`);
    offsetX += maxX - minX + 1500;
  }
  w.code(0, "ENDSEC");
  w.code(0, "EOF");
  return w.out.join("\r\n") + "\r\n";
}
