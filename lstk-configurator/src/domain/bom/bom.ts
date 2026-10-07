import type { Assembly } from "../assemblies/types";
import { centrelineLength } from "../members/member";
import type { Feature, Member } from "../members/types";
import { findProfile } from "../profiles/catalog";
import { designation, sectionProperties } from "../profiles/section";

/**
 * Bill of materials from assemblies. Roll-forming cuts straight from the coil,
 * so steel is bought by mass (no stock-length nesting): mass = Σ length × kg/m,
 * plus a scrap allowance for coil ends, test pieces and miscuts.
 */

export interface Prices {
  /** Galvanised coil, ₸ per kg */
  steelPerKg: number;
  /** Scrap allowance, % of net steel mass */
  scrapPct: number;
  /** One self-drilling screw / rivet, ₸ */
  fastenerEach: number;
  /** One anchor/bolt set, ₸ */
  boltEach: number;
}

export interface ProfileLine {
  profileId: string;
  designation: string;
  pieces: number;
  metres: number;
  massKg: number;
}

export interface CutLine {
  /** Production mark of the identical-piece group, e.g. "W1-3" */
  pieceMark: string;
  assemblyMark: string;
  profileId: string;
  role: Member["role"];
  length: number;
  qty: number;
  operations: string;
}

export interface AssemblyLine {
  mark: string;
  name: string;
  kind: Assembly["kind"];
  qty: number;
  pieces: number;
  massKg: number;
}

export interface Bom {
  profiles: ProfileLine[];
  cutList: CutLine[];
  assemblies: AssemblyLine[];
  totals: {
    pieces: number;
    metres: number;
    massKg: number;
    massWithScrapKg: number;
    /** Each fastener joins a dimple pair (one dimple on each member) */
    fasteners: number;
    bolts: number;
    steelCost: number;
    fastenerCost: number;
    total: number;
  };
}

const OP_CODE: Record<Feature["kind"], string> = {
  "service-hole": "SERVICE",
  dimple: "DIMPLE",
  "bolt-hole": "BOLT",
  "web-slot": "SLOT",
  "lip-cut": "LIPCUT",
  "flange-cut": "FLANGECUT",
  swage: "SWAGE",
};

const r1 = (v: number) => Math.round(v * 2) / 2;

/** Stable, machine-neutral description of the operations on a piece */
export function operationsString(features: readonly Feature[]): string {
  return [...features]
    .map((f) => {
      const pos = r1(f.position);
      return "offset" in f ? `${OP_CODE[f.kind]}@${pos}/${r1(f.offset)}` : `${OP_CODE[f.kind]}@${pos}+${r1(f.length)}`;
    })
    .sort((a, b) => {
      const pa = Number(a.split("@")[1]!.split(/[/+]/)[0]);
      const pb = Number(b.split("@")[1]!.split(/[/+]/)[0]);
      return pa - pb || a.localeCompare(b);
    })
    .join(" ");
}

export function computeBom(assemblies: readonly Assembly[], prices: Prices): Bom {
  const profiles = new Map<string, ProfileLine>();
  const cuts = new Map<string, CutLine>();
  const asm = new Map<string, AssemblyLine>();
  let dimples = 0;
  let bolts = 0;

  for (const a of assemblies) {
    const al = asm.get(a.mark);
    const massOfAssembly = a.members.reduce((s, m) => s + sectionProperties(m.profile).massPerM * (centrelineLength(m) / 1000), 0);
    if (al) al.qty += 1;
    else asm.set(a.mark, { mark: a.mark, name: a.name.replace(/ \(\d+ из \d+\)$/, ""), kind: a.kind, qty: 1, pieces: a.members.length, massKg: massOfAssembly });

    for (const m of a.members) {
      const length = centrelineLength(m);
      const kgPerM = sectionProperties(m.profile).massPerM;
      const pl = profiles.get(m.profile.id) ?? { profileId: m.profile.id, designation: designation(m.profile), pieces: 0, metres: 0, massKg: 0 };
      pl.pieces += 1;
      pl.metres += length / 1000;
      pl.massKg += (kgPerM * length) / 1000;
      profiles.set(m.profile.id, pl);

      const ops = operationsString(m.features);
      const key = `${a.mark}|${m.profile.id}|${m.role}|${length}|${ops}`;
      const cl = cuts.get(key);
      if (cl) cl.qty += 1;
      else cuts.set(key, { pieceMark: "", assemblyMark: a.mark, profileId: m.profile.id, role: m.role, length, qty: 1, operations: ops });

      for (const f of m.features) {
        if (f.kind === "dimple") dimples += 1;
        if (f.kind === "bolt-hole") bolts += 1;
      }
    }
  }

  // Number piece marks within each assembly mark, longest first
  const cutList = [...cuts.values()].sort((p, q) => p.assemblyMark.localeCompare(q.assemblyMark, "ru", { numeric: true }) || q.length - p.length);
  const counters = new Map<string, number>();
  for (const c of cutList) {
    const n = (counters.get(c.assemblyMark) ?? 0) + 1;
    counters.set(c.assemblyMark, n);
    c.pieceMark = `${c.assemblyMark}-${n}`;
  }

  const profileLines = [...profiles.values()].sort((p, q) => q.massKg - p.massKg);
  const massKg = profileLines.reduce((s, p) => s + p.massKg, 0);
  const massWithScrapKg = massKg * (1 + Math.max(0, prices.scrapPct) / 100);
  const fasteners = Math.ceil(dimples / 2);
  const steelCost = massWithScrapKg * prices.steelPerKg;
  const fastenerCost = fasteners * prices.fastenerEach + bolts * prices.boltEach;
  return {
    profiles: profileLines,
    cutList,
    assemblies: [...asm.values()],
    totals: {
      pieces: profileLines.reduce((s, p) => s + p.pieces, 0),
      metres: profileLines.reduce((s, p) => s + p.metres, 0),
      massKg,
      massWithScrapKg,
      fasteners,
      bolts,
      steelCost,
      fastenerCost,
      total: steelCost + fastenerCost,
    },
  };
}

export function profileLabel(id: string): string {
  return designation(findProfile(id));
}
