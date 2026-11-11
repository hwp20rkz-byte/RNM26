/* Low-poly landmarks from module 4, assembled tier by tier (used by the workshop and the Baiterek scene). */
import type { QV3DApi } from '../types/app';
import type { Group } from 'three';

const WHITE = 0xf4f6fb, GOLD = 0xffc93c, GLASS = 0x8fd8ff;

export function buildTier(V: QV3DApi, building: string, tier: string): Group {
  const T = V.THREE, g = V.group();
  const glass = () => V.lam(GLASS, { transparent: true, opacity: 0.45 });
  if (building === 'baiterek') {
    if (tier === 'base') g.add(V.cyl(2.4, 2.6, 0.3, 0xd8dbe6, 0, 0.15, 0, 32), V.cyl(1.4, 1.6, 0.4, WHITE, 0, 0.5, 0, 24));
    if (tier === 'trunk') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(V.cyl(0.09, 0.14, 5.6, WHITE, Math.cos(a) * 0.45, 3.5, Math.sin(a) * 0.45, 8)); }
    if (tier === 'crown') for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, b = V.cyl(0.05, 0.08, 2.0, WHITE, 0, 0, 0, 6);
      b.position.set(Math.cos(a) * 0.75, 7.0, Math.sin(a) * 0.75); b.rotation.z = Math.cos(a) * 0.55; b.rotation.x = -Math.sin(a) * 0.55; g.add(b);
    }
    if (tier === 'glass') g.add(new T.Mesh(new T.SphereGeometry(1.15, 24, 16), glass()).translateY(8.3));
    if (tier === 'egg') { const e = V.ball(0.82, V.glow(GOLD), 0, 8.3, 0); e.scale.y = 1.15; g.add(e); }
  } else if (building === 'khanshatyr') {
    if (tier === 'base') { const b = V.cyl(3.4, 3.6, 0.5, 0xd8dbe6, 0, 0.25, 0, 40); b.scale.z = 0.75; g.add(b); }
    if (tier === 'garden') for (let i = 0; i < 5; i++) {
      const x = -1.6 + i * 0.8, palm = V.group(x, 0.5, (i % 2) * 0.6 - 0.3, V.cyl(0.06, 0.09, 1.1, 0x7a5a3a, 0, 0.55, 0, 6));
      for (let k = 0; k < 5; k++) { const leaf = V.box(0.7, 0.05, 0.18, 0x2fbf5a, 0, 1.12, 0); leaf.rotation.y = k / 5 * Math.PI * 2; leaf.rotation.z = -0.35; palm.add(leaf); }
      g.add(palm);
    }
    if (tier === 'tent') {
      const tent = new T.Mesh(new T.ConeGeometry(3.3, 5.6, 32, 1, true), V.lam(0xf4f6fb, { transparent: true, opacity: 0.6, side: T.DoubleSide }));
      tent.position.y = 3.3; tent.scale.z = 0.75; g.add(tent);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = V.cyl(0.03, 0.03, 6.4, 0xaab3c8, Math.cos(a) * 1.65, 3.3, Math.sin(a) * 1.25, 4); r.rotation.z = Math.cos(a) * 0.53; r.rotation.x = -Math.sin(a) * 0.42; g.add(r); }
    }
    if (tier === 'mast') { const m = V.cyl(0.05, 0.12, 2.6, 0xd8dbe6, 0, 7.2, 0, 6); m.rotation.z = 0.08; g.add(m, V.ball(0.12, V.glow(0xff4d5e), 0.1, 8.5, 0)); }
  } else if (building === 'sarai') {
    if (tier === 'walls') g.add(V.box(5.2, 0.08, 3.4, 0xffffff, 0, 0.04, 0), V.box(4.0, 2.2, 2.2, 0xf2a7c3, 0, 1.18, 0));        // paper board + pink walls
    if (tier === 'door') g.add(V.box(0.9, 1.3, 0.1, 0x8a5a2a, 0, 0.73, 1.14), V.box(1.1, 0.12, 0.12, GOLD, 0, 1.45, 1.15));
    if (tier === 'roof') g.add(V.box(4.3, 0.35, 2.5, 0xffd84a, 0, 2.47, 0));
    if (tier === 'tower') { const t = V.cyl(0.55, 0.6, 1.8, 0xf2a7c3, 0, 3.5, 0, 16); g.add(t, new T.Mesh(new T.ConeGeometry(0.75, 1.0, 16), V.lam(0xffd84a)).translateY(4.9)); }
  }
  return g;
}

export const TIERS: Record<string, string[]> = {
  baiterek: ['base', 'trunk', 'crown', 'glass', 'egg'],
  khanshatyr: ['base', 'garden', 'tent', 'mast'],
  sarai: ['walls', 'door', 'roof', 'tower']
};

export function fullBuilding(V: QV3DApi, id: string): Group {
  const g = V.group();
  (TIERS[id] || []).forEach((t) => g.add(buildTier(V, id, t)));
  return g;
}
