/**
 * «Су айналымы» (phase 2 «Мектеп», science grade 2): a small 3D landscape — sea, mountain, river, sun and a cloud.
 * Each stage has its own motion: vapour rises from the sea, the cloud grows, rain falls on the mountain, drops run down the
 * river to the sea. The child says what comes next; Айсұлу Neon leads. Procedural geometry only.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { STEPS, WATER_Q, W_LIVES, buildWaterRound, initialWater, shownStep, waterAccuracy, waterReducer, type WState } from '../../lib/waterLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 4.5, 10], look: [0, 2, 0] }, tall: { position: [0, 6, 15], look: [0, 2.4, 0] } };
const SEA = '#2A8FD0', LAND = '#7CBF6A', CLOUD = '#F1F5F9', GOLD = '#F5A623';
const SEA_AT: Vec3 = [-2.6, 0.05, 0.6], CLOUD_AT: Vec3 = [1.4, 4.2, -1.2], PEAK: Vec3 = [3.0, 0, -1.6];
const RIVER: Vec3[] = [[2.6, 0.9, -1.0], [2.0, 0.35, 0.0], [0.9, 0.12, 0.6], [-0.4, 0.08, 1.0], [-1.6, 0.06, 0.9]];

/** Vapour (stage 0): white beads rising from the sea in a loop. */
function Vapour({ on }: { on: boolean }) {
  const g = useRef<THREE.Group>(null), seeds = useMemo(() => Array.from({ length: 14 }, (_, k) => [((k * 37) % 13) / 13, ((k * 17) % 11) / 11, k / 14]), []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.visible = on;
    g.current.children.forEach((c, k) => { const [sx, sz, ph] = seeds[k], t = (clock.elapsedTime * 0.35 + ph) % 1;
      c.position.set(SEA_AT[0] - 1.2 + sx * 2.4 + Math.sin(t * 6 + k) * 0.15, 0.2 + t * 3.6, SEA_AT[2] - 0.8 + sz * 1.6); c.scale.setScalar(0.6 + t * 0.9); });
  });
  return <group ref={g}>{seeds.map((_, k) => <mesh key={k}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#FFFFFF" transparent opacity={0.75} /></mesh>)}</group>;
}
/** Rain (stage 2): drops falling from the cloud onto the mountain. */
function Rain({ on }: { on: boolean }) {
  const g = useRef<THREE.Group>(null), seeds = useMemo(() => Array.from({ length: 24 }, (_, k) => [((k * 29) % 17) / 17, ((k * 13) % 7) / 7, k / 24]), []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.visible = on;
    g.current.children.forEach((c, k) => { const [sx, sz, ph] = seeds[k], t = (clock.elapsedTime * 1.2 + ph) % 1;
      c.position.set(CLOUD_AT[0] - 1.3 + sx * 2.8, CLOUD_AT[1] - 0.4 - t * 3.4, CLOUD_AT[2] - 0.6 + sz * 1.2); });
  });
  return <group ref={g}>{seeds.map((_, k) => <mesh key={k}><capsuleGeometry args={[0.025, 0.16, 2, 6]} /><meshStandardMaterial color="#60A5FA" emissive="#3B82F6" emissiveIntensity={0.3} /></mesh>)}</group>;
}
/** River flow (stage 3): drops running down the river to the sea. */
function Flow({ on }: { on: boolean }) {
  const g = useRef<THREE.Group>(null), curve = useMemo(() => new THREE.CatmullRomCurve3(RIVER.map((p) => new THREE.Vector3(...p))), []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.visible = on;
    g.current.children.forEach((c, k) => { const p = curve.getPointAt((clock.elapsedTime * 0.25 + k / 10) % 1); c.position.set(p.x, p.y + 0.06, p.z); });
  });
  return <group ref={g}>{Array.from({ length: 10 }, (_, k) => <mesh key={k}><sphereGeometry args={[0.07, 8, 6]} /><meshStandardMaterial color="#93C5FD" emissive="#60A5FA" emissiveIntensity={0.5} /></mesh>)}</group>;
}
/** The cloud: small and pale before it forms, big and grey while it rains. */
function Cloud({ step }: { step: number }) {
  const g = useRef<THREE.Group>(null), mat = useMemo(() => new THREE.MeshStandardMaterial({ color: CLOUD, transparent: true, opacity: 0.4 }), []);
  useFrame((_, dt) => {
    const big = step === 1 || step === 2, s = big ? 1 : 0.45, op = big ? 0.95 : 0.35;
    if (g.current) g.current.scale.lerp(new THREE.Vector3(s, s, s), Math.min(1, dt * 2));
    mat.opacity += (op - mat.opacity) * Math.min(1, dt * 2); mat.color.lerp(new THREE.Color(step === 2 ? '#94A3B8' : CLOUD), Math.min(1, dt * 2));
  });
  return (
    <group ref={g} position={CLOUD_AT}>
      {[[0, 0, 0, 0.8], [0.8, -0.1, 0.1, 0.6], [-0.8, -0.1, 0, 0.6], [0.3, 0.35, -0.1, 0.55], [-0.35, 0.3, 0.1, 0.5]].map(([x, y, z, r], k) => <mesh key={k} position={[x, y, z]} material={mat}><sphereGeometry args={[r, 16, 12]} /></mesh>)}
    </group>
  );
}

function Scene({ state, layout }: { state: WState; layout: Layout }) {
  const quality = useQuality(), particles = useParticles(), step = shownStep(state), hit = state.phase === 'hit';
  const river = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(RIVER.map((p) => new THREE.Vector3(...p))), 40, 0.12, 6, false), []);
  useEffect(() => {
    if (!hit) return;
    particles.burst({ at: [0, 3.2, 0], count: quality === 'low' ? 30 : 70, color: '#93C5FD', speed: 2.2, gravity: 0.8, life: 1, size: 0.05 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <SkyDiorama quality={quality} />
      <mesh rotation-x={-Math.PI / 2} position={[1.6, 0, 0]}><planeGeometry args={[6.4, 6]} /><meshStandardMaterial color={LAND} roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-2.8, 0.03, 0]}><planeGeometry args={[4, 6]} /><meshStandardMaterial color={SEA} roughness={0.25} metalness={0.1} /></mesh>
      <group position={PEAK}>
        <mesh position-y={1.3}><coneGeometry args={[1.5, 2.6, 7]} /><meshStandardMaterial color="#7C8A9E" flatShading /></mesh>
        <mesh position-y={2.25}><coneGeometry args={[0.55, 0.8, 7]} /><meshStandardMaterial color="#FFFFFF" flatShading /></mesh>
      </group>
      <mesh geometry={river}><meshStandardMaterial color={SEA} emissive={SEA} emissiveIntensity={step === 3 ? 0.4 : 0.1} /></mesh>
      <mesh position={[-3.6, 5.4, -2.6]}><sphereGeometry args={[0.7, 24, 16]} /><meshStandardMaterial color="#FDE047" emissive="#FACC15" emissiveIntensity={step === 0 ? 1.1 : 0.5} /></mesh>
      <Cloud step={step} />
      <Vapour on={step === 0} /><Rain on={step === 2} /><Flow on={step === 3} />
      <Billboard position={[0, 6.0, -1]}><CanvasLabel text={STEPS[step].e + ' ' + STEPS[step].kk} height={0.42} glow={hit ? '#34D399' : GOLD} /></Billboard>
      <BlockHero id="aisulu" move={hit || state.phase === 'victory' ? 'cheer' : 'idle'} position={layout === 'wide' ? [5.2, 0, 1.2] : [2.4, 0, 3.0]} rotationY={-0.5} scale={0.55} />
    </>
  );
}

export function Water3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(waterReducer, undefined, initialWater);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null;
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = () => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildWaterRound() }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st || state.phase !== 'aim' || state.tried.length || !voice) return undefined;
    const id = setTimeout(() => speakKazakh(WATER_Q), 400);
    return () => clearTimeout(id);
  }, [state.i, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('chime');
      const id0 = setTimeout(() => { if (voice) speakKazakh(st.answer); }, 500), id = setTimeout(() => dispatch({ type: 'next' }), 3200);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = waterAccuracy(state);
      if (finishSession({ game: 'water', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __water?: () => unknown }).__water = () => ({ phase: state.phase, i: state.i, lives: state.lives, answer: st?.answer, options: st?.options, step: shownStep(state) });
  }, [state, st]);
  const e = (kk: string) => STEPS.find((s) => s.kk === kk)?.e ?? '';

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.7} uiShift={{ portrait: 0.14, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(188_100%_55%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={300}><Scene state={state} layout={layout} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Water Cycle' : 'Су айналымы'} lives={state.lives} maxLives={W_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {en ? 'Now: ' : 'Сейчас: '}{STEPS[st.from].e} {STEPS[st.from].kk}</p>
            <p className="mt-1 text-lg font-black">{WATER_Q}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {STEPS[st.from].kk} → {st.answer}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{en ? 'Watch the drop: sea → steam → cloud → rain → river → sea.' : 'Следи за каплей: море → пар → облако → дождь → река → море.'}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={en ? 'Stages' : 'Этапы'}>
            {st.options.map((o) => (
              <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'min-h-12 rounded-2xl px-2 text-base font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                {e(o)} {o}
              </button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Су айналымы</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Follow a drop of water round the cycle: what comes next?' : 'Проведи каплю воды по кругу: что будет дальше?'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="water" onClick={start}>💧 {en ? 'Start' : 'Бастау'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="water-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-5 text-center">
            <h2 id="water-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-2 text-lg">XP +{state.xp} · {en ? 'first try' : 'с первого раза'} {state.firstTry}/{round.stages.length}</p>
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
