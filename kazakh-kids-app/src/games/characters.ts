/* Blocky characters of modules 2 and 4, built on the QV3D humanoid (web/v3d.js). */
import type { QV3DApi } from '../types/app';
import type { Group } from 'three';

export type CharId = 'ALIBEK' | 'ANEL' | 'ZHALKAU' | 'ZHALKAU_TIDY' | 'ATA' | 'AZHE' | 'ARCH';

export function makeCharacter(V: QV3DApi, id: CharId): Group {
  const { eye, smile, blush } = V.face;
  const T = V.THREE;
  switch (id) {
    case 'ALIBEK': {
      const g = V.humanoid({ skin: 0xe8b98a, hair: 0x2b2230, top: 0x2456c9, sleeve: 0xffffff, pants: 0x1b2340, shoes: 0x333a52,
        face: (c) => { eye(c, 42, 58, 13, '#3a2a1a'); eye(c, 86, 58, 13, '#3a2a1a'); smile(c, 86, 16, true); } });
      g.add(V.box(0.5, 0.06, 0.04, 0xd02f3a, 0, 1.92, 0.3));                         // school tie
      return g;
    }
    case 'ANEL': {
      const g = V.humanoid({ skin: 0xf3c9a5, hair: 0x2a1b12, top: 0x1b2340, sleeve: 0xffffff, pants: 0x1b2340, shoes: 0x2b2230,
        face: (c) => { eye(c, 42, 58, 14, '#2a1b12'); eye(c, 86, 58, 14, '#2a1b12'); blush(c); smile(c, 88, 15, false); } });
      const P = g.userData.parts as { head: Group };
      [-1, 1].forEach((s) => P.head.add(V.box(0.18, 0.9, 0.18, 0x2a1b12, s * 0.66, -0.45, -0.2)));   // two braids
      P.head.add(V.ball(0.14, V.glow(0xffffff), -0.66, -0.95, -0.2), V.ball(0.14, V.glow(0xffffff), 0.66, -0.95, -0.2));
      return g;
    }
    case 'ZHALKAU':
    case 'ZHALKAU_TIDY': {
      const tidy = id === 'ZHALKAU_TIDY';
      const g = V.humanoid({ skin: 0xe2b083, hair: 0x5a3a20, top: tidy ? 0x18b7a6 : 0x8a8f99, sleeve: tidy ? 0xffffff : 0x8a8f99, pants: 0x3a3f55, shoes: tidy ? 0x333a52 : 0x8a5a2a,
        face: (c) => {
          if (tidy) { eye(c, 42, 58, 13, '#3a2a1a'); eye(c, 86, 58, 13, '#3a2a1a'); smile(c, 86, 18, true); return; }
          c.strokeStyle = '#3a2a1a'; c.lineWidth = 6; c.lineCap = 'round';          // sleepy half-closed eyes
          c.beginPath(); c.moveTo(28, 60); c.lineTo(56, 60); c.moveTo(72, 60); c.lineTo(100, 60); c.stroke();
          c.fillStyle = '#4a2a2a'; c.beginPath(); c.ellipse(64, 92, 9, 12, 0, 0, 7); c.fill();            // yawn
        } });
      const P = g.userData.parts as { head: Group };
      if (!tidy) { const tuft = V.box(0.3, 0.3, 0.3, 0x5a3a20, 0.3, 0.7, 0); tuft.rotation.z = 0.6; P.head.add(tuft); g.add(V.box(0.3, 0.12, 0.05, 0xc77d2a, 0.25, 1.2, 0.29)); }  // messy hair, a stain
      else g.add(V.box(0.5, 0.06, 0.04, 0xffc93c, 0, 1.92, 0.3));
      return g;
    }
    case 'ATA': {
      const g = V.humanoid({ skin: 0xd9a77a, hair: 0xeeeeee, top: 0x5a2a1a, sleeve: 0x5a2a1a, pants: 0x2b2230, shoes: 0x1b1b1b,
        face: (c) => {
          eye(c, 42, 54, 11, '#2a1b12'); eye(c, 86, 54, 11, '#2a1b12');
          c.fillStyle = '#f2f2f2'; c.beginPath(); c.moveTo(34, 80); c.lineTo(94, 80); c.lineTo(64, 126); c.fill();   // white beard
          smile(c, 78, 12, false);
        } });
      const P = g.userData.parts as { head: Group };
      P.head.add(V.cyl(0.62, 0.72, 0.45, 0x1b1b1b, 0, 0.75, 0, 6), V.cyl(0.73, 0.73, 0.1, V.glow(0xffc93c), 0, 0.55, 0, 6));   // тақия
      g.add(V.box(1.16, 1.25, 0.66, V.lam(0x7a3a1a), 0, 1.38, 0), V.box(0.1, 1.25, 0.68, V.glow(0xffc93c), 0, 1.38, 0.01)); // шапан
      return g;
    }
    case 'AZHE': {
      const g = V.humanoid({ skin: 0xd9a77a, hair: 0xffffff, top: 0x8c2f4a, sleeve: 0x8c2f4a, pants: 0x3a2f66, shoes: 0x2b2230,
        face: (c) => { eye(c, 42, 58, 11, '#2a1b12'); eye(c, 86, 58, 11, '#2a1b12'); blush(c); smile(c, 86, 14, false); } });
      const P = g.userData.parts as { head: Group };
      P.head.add(V.box(1.36, 0.5, 1.2, 0xffffff, 0, 0.45, -0.02), V.box(1.38, 0.08, 1.22, V.glow(0xff8a2a), 0, 0.22, -0.02));   // white кимешек
      const bag = V.box(0.5, 0.45, 0.25, 0x6b4a2a, 0, -1.25, 0.15);
      (P as unknown as { armR: Group }).armR.add(bag);
      g.userData.bag = bag;
      return g;
    }
    case 'ARCH': {
      const g = V.humanoid({ skin: 0xf0c8a8, hair: 0xb8892a, top: 0x3a3f55, sleeve: 0x3a3f55, pants: 0x2b2230, shoes: 0x1b1b1b,
        face: (c) => {
          eye(c, 42, 58, 12, '#2a6ad0'); eye(c, 86, 58, 12, '#2a6ad0');
          c.strokeStyle = '#1b1b1b'; c.lineWidth = 4; c.strokeRect(26, 44, 32, 28); c.strokeRect(70, 44, 32, 28);   // glasses
          smile(c, 88, 14, false);
        } });
      const P = g.userData.parts as { armL: Group };
      const roll = V.cyl(0.08, 0.08, 0.9, 0xf5f0e0, 0, -1.15, 0.2); roll.rotation.x = Math.PI / 2; P.armL.add(roll);    // blueprint roll
      g.add(V.box(0.9, 0.05, 0.05, new T.MeshLambertMaterial({ color: 0xffc93c }), 0, 0.95, 0.29));
      return g;
    }
  }
}
