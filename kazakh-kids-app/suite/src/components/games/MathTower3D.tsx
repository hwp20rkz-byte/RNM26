/**
 * «Көбейту мұнарасы» и «Пішіндер» (phase 2 «Мектеп», maths — the 3D parts of days 3 and 2).
 *  - tower:  a floors of b cubes — «4 × 6 — неше текше?»; after the answer the floors light up one by one and the
 *            narrator says «Төрт көбейту алты тең жиырма төрт.» (number words from the engine).
 *  - shapes: a solid turns on a pedestal — «Бұл қандай пішін?» (шар, куб, цилиндр, конус, пирамида).
 * Тайсон-Тайпақ counts along; procedural geometry only.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { SOLIDS, T_LIVES, buildTowerRound, initialTower, mulSentence, towerAccuracy, towerReducer, word, type TowerMode, type TState, type SolidId } from '../../lib/towerLogic';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 4.2, 11], look: [0, 2.2, 0] }, tall: { position: [0, 5.2, 15.5], look: [0, 3.2, 0] } };
const S = 0.42, GAP = 0.06, CUBE = '#00AFCA', LIT = '#F5A623';

/** a floors × b cubes; after a right answer the floors light up from the bottom. */
function Tower({ a, b, lit, t0 }: { a: number; b: number; lit: boolean; t0: number }) {
  // one material per floor, shared by its cubes, so a whole floor lights up at once
  const g = useRef<THREE.Group>(null), mats = useMemo(() => Array.from({ length: a }, () => new THREE.MeshStandardMaterial({ color: CUBE, emissive: CUBE, emissiveIntensity: 0.2 })), [a]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime - t0;
    mats.forEach((m, f) => { const on = lit && t > f * 0.12; m.color.set(on ? LIT : CUBE); m.emissive.set(on ? LIT : CUBE); m.emissiveIntensity = on ? 0.45 : 0.2; });
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.35;
  });
  const w = b * (S + GAP);
  return (
    <group ref={g}>
      {Array.from({ length: a }, (_, f) => (
        <group key={f} position={[0, S / 2 + f * (S + GAP), 0]}>
          {Array.from({ length: b }, (_, c) => (
            <mesh key={c} position={[-w / 2 + (S + GAP) / 2 + c * (S + GAP), 0, 0]} material={mats[f]}>
              <boxGeometry args={[S, S, S]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
function Solid({ id }: { id: SolidId }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (g.current) { g.current.rotation.y += dt * 0.7; g.current.rotation.x = 0.25; } });
  const mat = <meshStandardMaterial color="#FB6F6F" emissive="#E04848" emissiveIntensity={0.15} flatShading={id === 'pyramid'} />;
  return (
    <group ref={g} position={[0, 2.2, 0]}>
      {id === 'sphere' && <mesh><sphereGeometry args={[1.1, 40, 28]} />{mat}</mesh>}
      {id === 'cube' && <mesh><boxGeometry args={[1.7, 1.7, 1.7]} />{mat}</mesh>}
      {id === 'cylinder' && <mesh><cylinderGeometry args={[0.9, 0.9, 1.9, 40]} />{mat}</mesh>}
      {id === 'cone' && <mesh><coneGeometry args={[1.05, 2.0, 40]} />{mat}</mesh>}
      {id === 'pyramid' && <mesh><coneGeometry args={[1.25, 1.9, 4]} />{mat}</mesh>}
    </group>
  );
}

function Scene({ state, layout, t0 }: { state: TState; layout: Layout; t0: number }) {
  const quality = useQuality(), particles = useParticles();
  const st = state.round && state.i < state.round.stages.length ? state.round.stages[state.i] : null, tower = state.round?.mode === 'tower';
  const done = state.phase === 'hit';
  useEffect(() => {
    if (state.phase !== 'hit' || !st) return;
    particles.burst({ at: [0, tower ? st.a * (S + GAP) + 0.4 : 3.2, 0.4], count: quality === 'low' ? 30 : 80, color: LIT, speed: 2.6, gravity: 0.9, life: 1, size: 0.06 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 50 : 140} />
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[7, 48]} /><meshStandardMaterial color="#1A2238" roughness={0.85} /></mesh>
      {st && tower && <Tower key={state.i} a={st.a} b={st.b} lit={done} t0={t0} />}
      {st && tower && <Billboard position={[0, st.a * (S + GAP) + 0.9, 0]}><CanvasLabel text={done ? st.a + ' × ' + st.b + ' = ' + st.answer : st.a + ' × ' + st.b + ' = ?'} height={0.6} glow={done ? LIT : '#00AFCA'} /></Billboard>}
      {st && !tower && st.solid && (
        <>
          <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[1.6, 1.8, 0.7, 32]} /><meshStandardMaterial color="#E2E8F0" /></mesh>
          <Solid key={state.i} id={st.solid} />
          {done && <Billboard position={[0, 4.3, 0]}><CanvasLabel text={st.answer} height={0.7} glow={LIT} /></Billboard>}
        </>
      )}
      <BlockHero id="tayson" move={done || state.phase === 'victory' ? 'cheer' : 'idle'} position={layout === 'wide' ? [-4.6, 0, -0.6] : [-2.6, 0, -2.2]} rotationY={0.5} scale={0.55} />
    </>
  );
}

export function MathTower3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(towerReducer, undefined, initialTower);
  const [levelUp, setLevelUp] = useState(false);
  const [t0, setT0] = useState(0);
  const finished = useRef(false), layout = useLayout(), clock = useRef(performance.now());
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, tower = round?.mode === 'tower';
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = (m: TowerMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildTowerRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('chime'); setT0((performance.now() - clock.current) / 1000);
      const id0 = setTimeout(() => { if (voice) speakKazakh(tower ? mulSentence(st.a, st.b) : st.answer); }, 500), id = setTimeout(() => dispatch({ type: 'next' }), tower ? 3000 : 2200);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = towerAccuracy(state);
      if (finishSession({ game: 'tower', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __tower?: () => unknown }).__tower = () => ({ phase: state.phase, i: state.i, lives: state.lives, answer: st?.answer, options: st?.options, mode: round?.mode });
  }, [state, st, round]);
  const label = (o: string) => (tower ? word(+o) : (() => { const s = SOLIDS.find((x) => x.kk === o); return s ? (en ? s.en : s.ru) : ''; })());

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.6} uiShift={{ portrait: 0.14, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(188_100%_55%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} layout={layout} t0={t0} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Tower & Shapes' : 'Көбейту мұнарасы'} lives={state.lives} maxLives={T_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {tower ? (en ? st.a + ' floors of ' + st.b + ' cubes' : st.a + ' этажей по ' + st.b + ' кубиков') : (en ? 'Look at the solid' : 'Посмотри на фигуру')}</p>
            <p className="mt-1 text-lg font-black">{tower ? 'Неше текше?' : 'Бұл қандай пішін?'}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {tower ? mulSentence(st.a, st.b) : st.answer}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{tower ? (en ? 'Count one floor, then multiply by the number of floors.' : 'Посчитай один этаж и умножь на число этажей.') : (en ? 'Look at the faces: round, flat or pointed?' : 'Посмотри: круглая, с плоскими гранями или с вершиной?')}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-3 gap-2" role="group" aria-label={en ? 'Answers' : 'Ответы'}>
            {st.options.map((o) => (
              <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'grid min-h-14 place-items-center rounded-2xl px-1 font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                <span className="text-xl">{o}</span><span className="text-xs font-bold opacity-80">{label(o)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Көбейту мұнарасы</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'A tower of floors and cubes: multiply to count it. Then name the 3D shapes.' : 'Башня из этажей и кубиков: умножь, чтобы сосчитать. А потом назови объёмные фигуры.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="tower" onClick={() => start('tower')}>🏗️ {en ? 'Multiplication tower' : 'Көбейту мұнарасы — умножение'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="shapes" onClick={() => start('shapes')}>🔷 {en ? '3D shapes' : 'Пішіндер — объёмные фигуры'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="tower-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-5 text-center">
            <h2 id="tower-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-2 text-lg">XP +{state.xp} · {en ? 'first try' : 'с первого раза'} {state.firstTry}/{round.stages.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-solar" onClick={() => start(round.mode === 'tower' ? 'shapes' : 'tower')}>{round.mode === 'tower' ? (en ? '3D shapes →' : 'Пішіндер →') : (en ? 'Tower' : 'Мұнара')}</button>
              <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
