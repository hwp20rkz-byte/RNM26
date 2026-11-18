/**
 * «Уақыт өзені» — River of Time (phase 2 «Мектеп», history grade 5; the 3D part of day 8).
 * A river winds from «Ерте» (long ago) to «Бүгін» (today) past four stones. Four events wait as buttons; tap them
 * from the oldest to the newest and each lands on the next stone. Ата's ordering game in 3D; Батыр-X cheers.
 * Years are never shown: several are approximate, and the game only needs the order (neighbours ≥ 300 years apart).
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { R_LIVES, buildRiverRound, evOf, initialRiver, riverReducer, type RState } from '../../lib/riverLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { DustMotes, ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
import { CanvasLabel } from '../3d/CanvasLabel';
import { BlockHero } from '../3d/heroes/BlockHero';
import { GameHUD } from '../ui/GameHUD';
import { useAudioStore } from '../../store/useAudioStore';
import { useFxStore } from '../../store/useFxStore';
import { useGameStore } from '../../store/useGameStore';
import { speakKazakh } from '../../lib/kazakhVoice';
import { TestSkip } from '../../lib/testMode';

type Layout = 'wide' | 'tall';
function useLayout(): Layout {
  const get = (): Layout => (window.innerWidth / Math.max(1, window.innerHeight) >= 0.8 ? 'wide' : 'tall');
  const [l, set] = useState<Layout>(get);
  useEffect(() => { const on = () => set(get()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return l;
}
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 6.5, 9.5], look: [0, 0.4, 0] }, tall: { position: [0, 10.5, 12.5], look: [0, 0.2, -0.6] } };
/** Stones from long ago to today: left → right on a wide screen, back → front (zig-zag) on a phone. */
const STONES: Record<Layout, Vec3[]> = {
  wide: [[-4.2, 0, -0.5], [-1.4, 0, 0.5], [1.4, 0, -0.5], [4.2, 0, 0.5]],
  tall: [[-1.1, 0, -4.2], [1.1, 0, -1.6], [-1.1, 0, 1.0], [1.1, 0, 3.4]]
};
const ENDS: Record<Layout, [Vec3, Vec3]> = { wide: [[-6.1, 0, 0.3], [6.1, 0, -0.3]], tall: [[0, 0, -6.2], [0, 0, 5.4]] };

function River({ layout }: { layout: Layout }) {
  const geo = useMemo(() => {
    const pts = [ENDS[layout][0], ...STONES[layout], ENDS[layout][1]].map((p) => new THREE.Vector3(p[0], 0.02, p[2]));
    const curve = new THREE.CatmullRomCurve3(pts), n = 160, half = 0.75, pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPoint(t), d = curve.getTangent(t), side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(half);
      pos.push(p.x + side.x, 0.03, p.z + side.z, p.x - side.x, 0.03, p.z - side.z);
      if (i < n) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }, [layout]);
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (m.current) m.current.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 1.6) * 0.1; });
  return <mesh geometry={geo}><meshStandardMaterial ref={m} color="#38BDF8" emissive="#0EA5E9" emissiveIntensity={0.3} side={THREE.DoubleSide} roughness={0.3} /></mesh>;
}
/** A card that flies from above the middle to its stone. */
function Placed({ text, to, high, small }: { text: string; to: Vec3; high: boolean; small: boolean }) {
  // alternate heights so the cards of neighbouring stones never overlap on a wide screen
  const g = useRef<THREE.Group>(null), target = useMemo(() => new THREE.Vector3(to[0], high ? 2.25 : 1.15, to[2]), [to, high]);
  useFrame(() => { if (g.current) g.current.position.lerp(target, 0.1); });
  return <group ref={g} position={[0, 3.2, 0]}><Billboard><CanvasLabel text={text} height={small ? 0.3 : 0.4} glow="#FBBF24" background="#0B1220CC" /></Billboard></group>;
}

function Scene({ state, layout }: { state: RState; layout: Layout }) {
  const quality = useQuality(), particles = useParticles(), stones = STONES[layout];
  useEffect(() => {
    if (state.phase !== 'hit' && state.phase !== 'stage') return;
    const at = stones[state.placed.length - 1];
    if (at) particles.burst({ at: [at[0], 1.0, at[2]], count: quality === 'low' ? 24 : 60, color: '#FBBF24', speed: 2.2, gravity: 0.9, life: 0.9, size: 0.05 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 50 : 140} />
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[layout === 'wide' ? 8.5 : 7.2, 64]} /><meshStandardMaterial color="#84CC16" roughness={0.95} /></mesh>
      <River layout={layout} />
      {stones.map((p, k) => (
        <group key={k} position={p}>
          <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.62, 0.72, 0.5, 20]} /><meshStandardMaterial color={k < state.placed.length ? '#FBBF24' : '#CBD5E1'} flatShading /></mesh>
          <Billboard position={[0, 0.75, 0.75]}><CanvasLabel text={String(k + 1)} height={0.3} glow="#00AFCA" /></Billboard>
        </group>
      ))}
      <Billboard position={[ENDS[layout][0][0], 0.9, ENDS[layout][0][2]]}><CanvasLabel text="⏳ Ерте" height={0.42} glow="#A78BFA" /></Billboard>
      <Billboard position={[ENDS[layout][1][0], 0.9, ENDS[layout][1][2]]}><CanvasLabel text="Бүгін ⭐" height={0.42} glow="#FBBF24" /></Billboard>
      {state.placed.map((k, j) => { const e = evOf(k); return <Placed key={state.i + ':' + k} text={e.e + ' ' + e.short} to={stones[j]} high={layout === 'wide' && j % 2 === 1} small={layout === 'wide'} />; })}
      <BlockHero id="batyr" move={state.phase === 'stage' || state.phase === 'victory' ? 'cheer' : 'idle'} position={layout === 'wide' ? [-6.4, 0, -2.6] : [-3.1, 0, -2.4]} rotationY={0.6} scale={0.55} />
    </>
  );
}

export function RiverOfTime3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(riverReducer, undefined, initialRiver);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null;
  const active = state.phase === 'aim' || state.phase === 'miss' || state.phase === 'hit';
  const start = () => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildRiverRound() }); play('whoosh'); };
  const choose = (e: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', event: e }); };
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit' || state.phase === 'stage') { play('chime'); const last = state.placed[state.placed.length - 1]; if (voice && last) speakKazakh(last); }
    if (state.phase === 'stage') { const id = setTimeout(() => dispatch({ type: 'next' }), 2600); return () => clearTimeout(id); }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true;
      if (finishSession({ game: 'river', xp: state.xp, correct: state.clean, total: round ? round.stages.length : 0, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play, round]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __river?: () => unknown }).__river = () => ({ phase: state.phase, i: state.i, lives: state.lives, placed: state.placed.length, next: st ? st.order[state.placed.length] : null, events: st?.events, order: st?.order });
  }, [state, st]);

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.6} uiShift={{ portrait: 0.16, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(199_90%_60%/0.2),transparent_60%)]" />}>
        <ParticleEmitter capacity={300}><Scene state={state} layout={layout} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'River of Time' : 'Уақыт өзені'} lives={state.lives} maxLives={R_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.order[state.placed.length])} />
      {round && st && ['aim', 'hit', 'miss', 'stage'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {en ? 'from the oldest to the newest' : 'от самого давнего к недавнему'}</p>
            <p className="mt-1 text-lg font-black">{state.phase === 'stage' ? '✨ ' + (en ? 'The river is in order!' : 'Өзен ретімен тұр! Жарайсың!') : 'Қайсысы ' + (state.placed.length ? 'одан кейін' : 'ең бұрын') + ' болды?'}</p>
            {state.phase === 'miss' && <p className="font-black text-coral">{en ? 'Not yet — that came later. Which is older?' : 'Ещё рано — это было позже. Что старше?'}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-2 gap-2" role="group" aria-label={en ? 'Events' : 'События'}>
            {st.events.map((k) => {
              const e = evOf(k), done = state.placed.includes(k), wrong = state.wrong.includes(k + '@' + state.i);
              return (
                <button key={state.i + ':' + k} data-ev={k} disabled={done || state.phase === 'stage'} onClick={() => choose(k)}
                  className={'grid min-h-16 place-items-center rounded-2xl px-2 py-1 text-center font-black ' + (done ? 'bg-jade text-obsidian' : wrong ? 'holo text-coral' : 'holo text-mist')}>
                  <span className="text-base leading-tight">{e.e} {e.short}{done ? ' · ' + (state.placed.indexOf(k) + 1) : ''}</span><span className="text-[11px] font-bold leading-tight opacity-80">{e.kk}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Уақыт өзені</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Put four events on the river — from the oldest («Ерте») to the newest («Бүгін»).' : 'Расставь четыре события на реке — от самого давнего («Ерте») к недавнему («Бүгін»).'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="river" onClick={start}>⏳ {en ? 'Start' : 'Бастау'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="river-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-5 text-center">
            <h2 id="river-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.clean === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-2 text-lg">XP +{state.xp} · {en ? 'rivers without a mistake' : 'рек без ошибки'} {state.clean}/{round.stages.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-solar" onClick={start}>{en ? 'Play again' : 'Тағы ойнау'}</button>
              <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
