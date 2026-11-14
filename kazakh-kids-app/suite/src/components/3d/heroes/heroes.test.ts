import { describe, expect, it } from 'vitest';
import { BODY, HERO_IDS, HEROES, mouthScale, pose, type Move } from './BlockHeroBuilder';

const HEX = /^#[0-9a-f]{6}$/i;
describe('BlockHeroBuilder', () => {
  it('has the eight characters of the spec with their voice tags', () => {
    expect(HERO_IDS.sort()).toEqual(['aisulu', 'alibek', 'anel', 'apai', 'azhebot', 'batyr', 'tayson', 'zhalkau']);
    expect(HEROES.apai.voice).toBe('APAI'); expect(HEROES.anel.voice).toBe('ANEL'); expect(HEROES.azhebot.voice).toBe('E4');
  });
  it('every colour is a hex colour; every piece is attached to a real part and has a sane size', () => {
    for (const h of Object.values(HEROES)) {
      for (const c of [...Object.values(h.palette), h.face.eye]) expect(c).toMatch(HEX);
      for (const p of h.pieces) {
        expect(['root', 'torso', 'head', 'armL', 'armR', 'legL', 'legR']).toContain(p.part);
        expect(p.color).toMatch(HEX);
        expect(p.size.every((x) => x > 0 && x < 2)).toBe(true);
        if (h.hover) expect(['legL', 'legR']).not.toContain(p.part);       // a hovering hero has no legs
      }
    }
  });
  it('stays inside a 4 m tall (hats and crests included), 3.2 m wide box (pieces in hero space)', () => {
    const at = (part: string): [number, number, number] => part === 'head' ? BODY.head.pos : part === 'torso' ? BODY.torso.pos
      : part.startsWith('arm') ? BODY.arm.pivot : part.startsWith('leg') ? BODY.leg.pivot : [0, 0, 0];
    for (const h of Object.values(HEROES)) for (const p of h.pieces) {
      const o = at(p.part), y = o[1] + p.pos[1], x = Math.abs((p.part.endsWith('L') ? -o[0] : o[0]) + p.pos[0]);
      expect(y).toBeGreaterThan(-0.2); expect(y).toBeLessThan(4.0); expect(x).toBeLessThan(1.6);
    }
  });
  it('poses: every move gives finite angles; signature moves differ from idle; the mouth opens with the voice', () => {
    const moves: Move[] = ['idle', 'wave', 'cheer', 'jump360', 'dombra', 'punch', 'levitate', 'bata', 'yawn', 'power'];
    for (const m of moves) for (const t of [0, 0.37, 1.1, 2.9]) {
      const P = pose(m, t, 0.5);
      for (const v of [...P.armL, ...P.armR, ...P.legL, ...P.legR, ...P.head, P.root.y, P.root.rotY]) expect(Number.isFinite(v)).toBe(true);
    }
    for (const h of Object.values(HEROES)) expect(JSON.stringify(pose(h.signature, 0.37))).not.toBe(JSON.stringify(pose('idle', 0.37)));
    expect(mouthScale(0)).toBe(1); expect(mouthScale(1)).toBe(4); expect(mouthScale(5)).toBe(4);
  });
});
