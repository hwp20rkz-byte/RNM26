/**
 * «Сандар қаласы» — Number City (phase 2 «Мектеп», maths grades 1–2).
 *
 * Towers of tens (rods of ten cubes) and ones (single cubes).
 *  - count: «Бұл қай сан?» — read the towers: 4 rods and 7 cubes is 47 (қырық жеті).
 *  - add:   a + b side by side; after the answer the second group slides over, and when the ones make ten or more,
 *           ten cubes stack into a new rod — the carried ten (*ондықтан аттап қосу*) is seen, not just told.
 * Number words from the engine (data/numberWords.ts); Әже-Bot 3000 cheers.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { addSentence, buildSandarRound, initialSandar, sandarAccuracy, sandarReducer, word, S_LIVES, type SandarMode, type SStage, type SState } from '../../lib/sandarLogic';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 3.6, 12], look: [0, 1.6, 0] }, tall: { position: [0, 4.2, 15], look: [0, 2.6, 0] } };
const C = 0.32, GAP = 0.46, ROD = '#00AFCA', ONE = '#FF8A3D', NEW = '#F5A623';

interface Block { key: string; kind: 'rod' | 'one'; color: string; to: Vec3 }
/** Positions of a number's rods and ones, starting at x0 (rods first, ones in a 5-wide grid to the right). */
function place(prefix: string, n: number, x0: number, y0: number, color = ROD): Block[] {
  const t = Math.floor(n / 10), u = n % 10, out: Block[] = [];
  for (let i = 0; i < t; i++) out.push({ key: prefix + 'r' + i, kind: 'rod', color, to: [x0 + i * GAP, y0 + 5 * C, 0] });
  for (let j = 0; j < u; j++) out.push({ key: prefix + 'o' + j, kind: 'one', color: ONE, to: [x0 + t * GAP + 0.25 + (j % 5) * GAP, y0 + C / 2 + Math.floor(j / 5) * GAP, 0] });
  return out;
}
const width = (n: number) => Math.floor(n / 10) * GAP + 0.25 + Math.min(5, n % 10) * GAP;

/** Blocks before and after the answer. After an add: one group; the ten cubes that make the carry stack into a rod. */
function blocks(st: SStage, mode: SandarMode, done: boolean, layout: Layout): Block[] {
  if (mode === 'count') return place('a', st.a, -width(st.a) / 2, 0);
  const tall = layout === 'tall';
  if (!done) {
    const a = place('a', st.a, tall ? -width(st.a) / 2 : -0.6 - width(st.a), tall ? 3.9 : 0);
    const b = place('b', st.b, tall ? -width(st.b) / 2 : 0.6, 0);
    return [...a, ...b];
  }
  // after: rods of a, rods of b, then (carry) a new rod made of 10 ones, then the remaining ones
  const aT = Math.floor(st.a / 10), bT = Math.floor(st.b / 10), aU = st.a % 10, bU = st.b % 10, total = st.a + st.b;
  const x0 = -width(total) / 2, out: Block[] = [];
  let col = 0;
  for (let i = 0; i < aT; i++) out.push({ key: 'ar' + i, kind: 'rod', color: ROD, to: [x0 + col++ * GAP, 5 * C, 0] });
  for (let i = 0; i < bT; i++) out.push({ key: 'br' + i, kind: 'rod', color: ROD, to: [x0 + col++ * GAP, 5 * C, 0] });
  const ones = [...Array.from({ length: aU }, (_, j) => 'ao' + j), ...Array.from({ length: bU }, (_, j) => 'bo' + j)];
  let rest = ones;
  if (aU + bU >= 10) {                       // the carry: ten cubes stack into a column where the new rod stands
    const x = x0 + col++ * GAP;
    ones.slice(0, 10).forEach((k, h) => out.push({ key: k, kind: 'one', color: NEW, to: [x, C / 2 + h * C, 0] }));
    rest = ones.slice(10);
  }
  rest.forEach((k, j) => out.push({ key: k, kind: 'one', color: ONE, to: [x0 + col * GAP + 0.25 + (j % 5) * GAP, C / 2 + Math.floor(j / 5) * GAP, 0] }));
  return out;
}

function Piece({ b, from }: { b: Block; from: Vec3 }) {
  const m = useRef<THREE.Group>(null), start = useMemo(() => new THREE.Vector3(...from), []); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useMemo(() => new THREE.Vector3(...b.to), [b.to]);
  useEffect(() => { if (m.current) m.current.position.copy(start); }, [start]);
  useFrame(() => { const o = m.current; if (o) o.position.lerp(target, 0.12); });
  return (
    <group ref={m}>
      {b.kind === 'rod'
        ? Array.from({ length: 10 }, (_, h) => <mesh key={h} position={[0, (h - 4.5) * C, 0]}><boxGeometry args={[C * 0.92, C * 0.92, C * 0.92]} /><meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.25} /></mesh>)
        : <mesh><boxGeometry args={[C * 0.92, C * 0.92, C * 0.92]} /><meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0.3} /></mesh>}
    </group>
  );
}

function Scene({ state, layout }: { state: SState; layout: Layout }) {
  const quality = useQuality(), particles = useParticles();
  const st = state.round && state.i < state.round.stages.length ? state.round.stages[state.i] : null, mode = state.round?.mode ?? 'count';
  const done = state.phase === 'hit';
  const list = st ? blocks(st, mode, done, layout) : [];
  const prev = useRef<Record<string, Vec3>>({});
  useEffect(() => { const p: Record<string, Vec3> = {}; list.forEach((b) => { p[b.key] = b.to; }); prev.current = p; });
  useEffect(() => {
    if (state.phase !== 'hit' || !st) return;
    particles.burst({ at: [0, 2.4, 0.4], count: quality === 'low' ? 30 : 80, color: st.carry ? NEW : ROD, speed: 2.6, gravity: 0.9, life: 1, size: 0.06 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const tall = layout === 'tall';
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 50 : 140} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow><circleGeometry args={[8, 48]} /><meshStandardMaterial color="#1A2238" roughness={0.85} /></mesh>
      {st && list.map((b) => <Piece key={state.i + b.key} b={b} from={prev.current[b.key] ?? b.to} />)}
      {st && mode === 'add' && !done && (
        <>
          <Billboard position={tall ? [0, 3.4, 0.5] : [0, 1.6, 0.5]}><CanvasLabel text="+" height={0.8} glow={NEW} /></Billboard>
          <Billboard position={tall ? [0, 7.6, 0] : [-0.6 - width(st.a) / 2, 4.2, 0]}><CanvasLabel text={String(st.a)} height={0.7} glow={ROD} /></Billboard>
          <Billboard position={tall ? [0, 3.9 - 0.2, 0] : [0.6 + width(st.b) / 2, 4.2, 0]}><CanvasLabel text={tall ? '' : String(st.b)} height={0.7} glow={ROD} /></Billboard>
        </>
      )}
      {st && done && <Billboard position={[0, 4.4, 0]}><CanvasLabel text={String(st.answer)} height={0.9} glow={NEW} /></Billboard>}
      <BlockHero id="azhebot" move={done ? 'cheer' : 'levitate'} position={tall ? [-2.6, 0, -1.5] : [-5.4, 0, -1]} rotationY={0.5} scale={0.5} />
    </>
  );
}

export function SandarQalasy3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(sandarReducer, undefined, initialSandar);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, add = round?.mode === 'add';
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = (m: SandarMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildSandarRound(m) }); play('whoosh'); };
  const choose = (o: number) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('chime'); if (st.carry) setTimeout(() => play('levelUp'), 500);
      const id0 = setTimeout(() => { if (voice) speakKazakh(word(st.answer)); }, 600), id = setTimeout(() => dispatch({ type: 'next' }), st.carry ? 2900 : 2300);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = sandarAccuracy(state);
      if (finishSession({ game: 'sandar', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __sandar?: () => unknown }).__sandar = () => ({ phase: state.phase, i: state.i, lives: state.lives, answer: st?.answer, options: st?.options, carry: st?.carry });
  }, [state, st]);

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.6} uiShift={{ portrait: 0.14, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(188_100%_55%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} layout={layout} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Number City' : 'Сандар қаласы'} lives={state.lives} maxLives={S_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {add ? (en ? 'Add the towers' : 'Сложи башни') : (en ? 'Blue rods are tens, orange cubes are ones' : 'Синие столбики — десятки, оранжевые кубики — единицы')}</p>
            <p className="mt-1 text-lg font-black">{add ? st.a + ' + ' + st.b + ' = ?' : 'Бұл қай сан?'}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {add ? addSentence(st.a, st.b) : word(st.answer)}{add && st.carry && <span className="block text-sm font-normal text-gold">⚡ {en ? 'ten ones make a new ten' : 'десять единиц стали новым десятком'}</span>}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{en ? 'Count the rods (tens) first, then the cubes (ones).' : 'Сначала посчитай столбики (десятки), потом кубики (единицы).'}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-3 gap-2" role="group" aria-label={en ? 'Numbers' : 'Числа'}>
            {st.options.map((o) => (
              <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'grid min-h-14 place-items-center rounded-2xl px-2 font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                <span className="text-2xl">{o}</span><span className="text-xs font-bold opacity-80">{word(o)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Сандар қаласы</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Towers of tens and ones. Read the number — then add two numbers and watch ten cubes become a new ten.' : 'Башни из десятков и единиц. Прочитай число — а потом сложи два числа и смотри, как десять кубиков становятся новым десятком.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="count" onClick={() => start('count')}>🏙️ {en ? 'Which number?' : 'Бұл қай сан? — какое число?'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="add" onClick={() => start('add')}>➕ {en ? 'Add — with a carried ten' : 'Қосу — с переходом через десяток'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="sandar-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <h2 id="sandar-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-3 text-lg">XP +{state.xp} · {en ? 'first try' : 'с первого раза'} {state.firstTry}/{round.stages.length}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" onClick={() => start(round.mode)}>{en ? 'Play again' : 'Тағы ойнау · ещё раз'}</button>
              <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
