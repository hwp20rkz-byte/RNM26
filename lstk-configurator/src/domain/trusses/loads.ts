import { solveTruss, type NodeLoad } from "./analysis";
import type { BarRole, TrussModel } from "./types";

/**
 * Gravity load on a roof truss from an area load q (kPa = kN/m², on plan) over
 * the truss spacing. Each top-chord node takes half of the plan length of the
 * top-chord bars on either side; the eaves overhang loads the heel nodes.
 *
 * The load value is the user's input — this module does not choose snow/wind
 * values or combination factors; it turns a given q into bar forces.
 */
export function roofNodeLoads(model: TrussModel, qKpa: number, spacingMm: number): NodeLoad[] {
  const lineLoad = qKpa * (spacingMm / 1000); // kN/m along the span
  const share = new Map<number, number>();
  for (const b of model.bars) {
    if (b.role !== "top-chord") continue;
    const plan = Math.abs(model.nodes[b.b]!.x - model.nodes[b.a]!.x) / 1000;
    share.set(b.a, (share.get(b.a) ?? 0) + plan / 2);
    share.set(b.b, (share.get(b.b) ?? 0) + plan / 2);
  }
  const overhangPlan = (model.input.overhang / 1000) * Math.cos(Math.atan2(model.height, model.input.span / 2));
  for (const n of model.nodes) if (n.support && share.has(n.id)) share.set(n.id, share.get(n.id)! + overhangPlan);
  return [...share].map(([node, m]) => ({ node, fx: 0, fy: -lineLoad * m * 1000 }));
}

export interface ForceSummary {
  role: BarRole;
  /** Largest tension, N (≥ 0) */
  maxTension: number;
  /** Largest compression as a positive number, N */
  maxCompression: number;
}

export function forceSummary(model: TrussModel, loads: NodeLoad[]): { byRole: ForceSummary[]; reactionN: number } {
  const sol = solveTruss(model, loads);
  const roles = new Map<BarRole, ForceSummary>();
  model.bars.forEach((b, i) => {
    const f = sol.barForces[i]!;
    const s = roles.get(b.role) ?? { role: b.role, maxTension: 0, maxCompression: 0 };
    if (f > s.maxTension) s.maxTension = f;
    if (-f > s.maxCompression) s.maxCompression = -f;
    roles.set(b.role, s);
  });
  const reactionN = Math.max(...[...sol.reactions.values()].map((r) => r.ry));
  return { byRole: [...roles.values()], reactionN };
}
