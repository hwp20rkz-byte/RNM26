/**
 * «Киіз үй» — build a yurt in 3D (phase 2 «Мектеп», logic grade 2; the 3D part of day 4).
 *
 *  - build: «Енді не керек?» — pick the next part and it drops into place: кереге (lattice walls) → есік (door) →
 *           шаңырақ (crown, lifted to the centre) → уық (poles from the walls to the crown) → киіз (felt cover).
 *  - name:  the yurt stands with a see-through cover; one part glows — «Бұл не?».
 * Procedural geometry only (no models), Батыр-X helps; the narrator says the line of each finished step.
 */
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Lang, Vec3 } from '../../types/game.types';
import { PARTS, K_LIVES, buildKiizRound, initialKiiz, kiizAccuracy, kiizReducer, labelOf, type KiizMode, type KState } from '../../lib/kiizLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { DustMotes, ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 3.4, 8.6], look: [0, 1.4, 0] }, tall: { position: [0, 4.6, 11.5], look: [0, 2.3, 0] } };
const R = 2.2, H = 1.3, CROWN_Y = H + 1.15, CROWN_R = 0.55, DOOR_W = 0.84;
const GLOW = '#00E5FF', WOOD = '#C8893B', POLE = '#B5762E', DOOR = '#D9452B', GOLD = '#F5A623', FELT = '#F2E8D5', BAND = '#C0392B';
const DOOR_GAP = DOOR_W / R;   // the angle the door takes in the wall circle (front, +z)

/** Material that glows when its part is the question (name mode) or just placed. */
function useGlow(color: string, glow: boolean, opacity = 1) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.75, transparent: opacity < 1, opacity, side: THREE.DoubleSide }), [color, opacity]);
  // cold neon: the warm lights and the gold crown must not hide which part is asked about
  useFrame(({ clock }) => { m.emissive.set(glow ? GLOW : '#000000'); m.emissiveIntensity = glow ? 0.9 + 0.5 * Math.sin(clock.elapsedTime * 5) : 0; });
  return m;
}
/** A part drops in from above and settles (lerp), so each answer is seen as building. */
function Drop({ children, show }: { children: ReactNode; show: boolean }) {
  const g = useRef<THREE.Group>(null);
  useEffect(() => { if (g.current && show) g.current.position.y = 4.5; }, [show]);
  useFrame(() => { const o = g.current; if (o) o.position.y += (0 - o.position.y) * 0.1; });
  return show ? <group ref={g}>{children}</group> : null;
}

function Kerege({ glow }: { glow: boolean }) {
  const mat = useGlow(WOOD, glow), n = 40, out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2))) < DOOR_GAP / 2 + 0.05) continue;   // the door opening
    for (const tilt of [0.6, -0.6]) out.push(
      <mesh key={i + ':' + tilt} material={mat} position={[R * Math.cos(th), H / 2, R * Math.sin(th)]} rotation={[0, -th + Math.PI / 2, tilt]}>
        <boxGeometry args={[0.035, H / Math.cos(0.6), 0.035]} />
      </mesh>);
  }
  return <group>{out}</group>;
}
function Esik({ glow }: { glow: boolean }) {
  const mat = useGlow(DOOR, glow), trim = useGlow(GOLD, glow);
  return (
    <group position={[0, 0, R]}>
      <mesh material={mat} position={[0, H * 0.45, 0]}><boxGeometry args={[DOOR_W * 0.92, H * 0.9, 0.07]} /></mesh>
      <mesh material={trim} position={[0, H * 0.45, 0.04]}><boxGeometry args={[DOOR_W * 0.5, H * 0.5, 0.02]} /></mesh>
      <mesh material={trim} position={[0, H * 0.93, 0]}><boxGeometry args={[DOOR_W, 0.08, 0.1]} /></mesh>
    </group>
  );
}
function Shanyraq({ glow }: { glow: boolean }) {
  const mat = useGlow(GOLD, glow);
  return (
    <group position={[0, CROWN_Y, 0]}>
      <mesh material={mat} rotation-x={Math.PI / 2}><torusGeometry args={[CROWN_R, 0.07, 12, 40]} /></mesh>
      {[0, Math.PI / 2].map((a) => <mesh key={a} material={mat} rotation-y={a}><boxGeometry args={[CROWN_R * 2, 0.05, 0.05]} /></mesh>)}
      {[0, Math.PI / 2].map((a) => <mesh key={'b' + a} material={mat} rotation-y={a + Math.PI / 4}><boxGeometry args={[CROWN_R * 2, 0.04, 0.04]} /></mesh>)}
    </group>
  );
}
function Uyq({ glow }: { glow: boolean }) {
  const mat = useGlow(POLE, glow);
  const poles = useMemo(() => Array.from({ length: 28 }, (_, i) => {
    const th = (i / 28) * Math.PI * 2, a = new THREE.Vector3(R * Math.cos(th), H, R * Math.sin(th)), b = new THREE.Vector3(CROWN_R * Math.cos(th), CROWN_Y, CROWN_R * Math.sin(th));
    const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return { mid, len, q };
  }), []);
  return <group>{poles.map((p, i) => <mesh key={i} material={mat} position={p.mid} quaternion={p.q}><cylinderGeometry args={[0.025, 0.025, p.len, 6]} /></mesh>)}</group>;
}
function Kiiz({ glow, ghost }: { glow: boolean; ghost: boolean }) {
  const mat = useGlow(FELT, glow, ghost ? 0.28 : 1), band = useGlow(BAND, glow, ghost ? 0.4 : 1);
  // the wall felt leaves the door open: the cylinder starts after the gap (three.js θ is measured from +z towards +x)
  return (
    <group>
      <mesh material={mat} position={[0, H / 2, 0]}><cylinderGeometry args={[R + 0.06, R + 0.06, H, 56, 1, true, DOOR_GAP / 2, Math.PI * 2 - DOOR_GAP]} /></mesh>
      <mesh material={mat} position={[0, H + (CROWN_Y - H) / 2 + 0.02, 0]}><cylinderGeometry args={[CROWN_R + 0.04, R + 0.1, CROWN_Y - H + 0.04, 56, 1, true]} /></mesh>
      <mesh material={band} position={[0, H + 0.02, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[R + 0.08, 0.05, 8, 64]} /></mesh>
    </group>
  );
}

function Scene({ state }: { state: KState }) {
  const quality = useQuality(), particles = useParticles(), yurt = useRef<THREE.Group>(null);
  const round = state.round, st = round && state.i < round.stages.length ? round.stages[state.i] : null, name = round?.mode === 'name';
  const built = state.built, lit = (k: number) => (name ? !!st && st.target === k && state.phase !== 'victory' : state.phase === 'hit' && built === k + 1);
  useFrame(({ clock }) => { if (yurt.current) yurt.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.45; });
  useEffect(() => {
    if (state.phase === 'hit' && !name) particles.burst({ at: [0, built >= 3 ? CROWN_Y : H, 0.6], count: quality === 'low' ? 30 : 80, color: GOLD, speed: 2.4, gravity: 0.9, life: 1, size: 0.06 });
    if (state.phase === 'victory') particles.burst({ at: [0, CROWN_Y + 0.4, 0], count: quality === 'low' ? 60 : 160, color: GOLD, speed: 3.2, gravity: 0.7, life: 1.4, size: 0.07 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 50 : 140} />
      {/* warm light over the yurt: under the cool sky alone the white felt reads teal and the wood green */}
      <hemisphereLight args={['#FFE9C7', '#3F6B35', 0.9]} />
      <directionalLight position={[3, 6, 5]} intensity={1.1} color="#FFD9A0" />
      <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[8, 48]} /><meshStandardMaterial color="#3F6B35" roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}><circleGeometry args={[R + 0.25, 48]} /><meshStandardMaterial color="#8C6A43" roughness={0.9} /></mesh>
      <group ref={yurt}>
        <Drop show={built >= 1}><Kerege glow={lit(0)} /></Drop>
        <Drop show={built >= 2}><Esik glow={lit(1)} /></Drop>
        <Drop show={built >= 3}><Shanyraq glow={lit(2)} /></Drop>
        <Drop show={built >= 4}><Uyq glow={lit(3)} /></Drop>
        <Drop show={built >= 5}><Kiiz glow={lit(4)} ghost={name && state.phase !== 'victory'} /></Drop>
      </group>
      <BlockHero id="batyr" move={state.phase === 'hit' || state.phase === 'victory' ? 'cheer' : 'hold'} position={[-3.6, 0, 0.6]} rotationY={0.6} scale={0.55} />
    </>
  );
}

export function KiizUi3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(kiizReducer, undefined, initialKiiz);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, name = round?.mode === 'name';
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = (m: KiizMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildKiizRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('chime'); const p = PARTS[st.target];
      const id0 = setTimeout(() => { if (voice) speakKazakh(name ? p.kk : p.done); }, 500), id = setTimeout(() => dispatch({ type: 'next' }), 2400);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = kiizAccuracy(state);
      if (finishSession({ game: 'kiiz', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
      if (state.phase === 'victory' && voice) setTimeout(() => speakKazakh('Киіз үй дайын!'), 700);
    }
  }, [state, finishSession, play, voice]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __kiiz?: () => unknown }).__kiiz = () => ({ phase: state.phase, i: state.i, lives: state.lives, built: state.built, answer: st?.answer, options: st?.options, target: st?.target });
  }, [state, st]);
  const hint = st ? PARTS[st.target] : null;

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.6} uiShift={{ portrait: 0.14, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(43_100%_60%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Yurt' : 'Киіз үй'} lives={state.lives} maxLives={K_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && hint && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {name ? (en ? 'Which part glows?' : 'Какая часть светится?') : (en ? 'Build the yurt step by step' : 'Собери юрту по шагам')}</p>
            <p className="mt-1 text-lg font-black">{name ? 'Бұл не?' : 'Енді не керек?'}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {name ? hint.kk + ' — ' + (en ? hint.en : hint.ru) : hint.done}<span className="block text-sm font-normal text-mist-dim">{en ? hint.whyEn : hint.whyRu}</span></p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{name ? (en ? 'Look where the glow is: walls, door, crown, poles or cover?' : 'Посмотри, где свечение: стены, дверь, круг, жерди или покрытие?') : (en ? 'Not yet! Think: what holds this part up?' : 'Ещё рано! Подумай: что держит эту часть?')}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-3 gap-2" role="group" aria-label={en ? 'Parts' : 'Части'}>
            {st.options.map((o) => (
              <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'grid min-h-14 place-items-center rounded-2xl px-1 font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                <span className="text-lg">{o}</span><span className="text-xs font-bold opacity-80">{labelOf(o, en)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Киіз үй</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Build a yurt with Батыр-X: walls, door, crown, poles, felt — in the right order. Then name every part.' : 'Собери юрту с Батыром-X: стены, дверь, шаңырақ, жерди, войлок — в правильном порядке. А потом назови каждую часть.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="build" onClick={() => start('build')}>🛖 {en ? 'Build the yurt' : 'Құрастыр — собрать юрту'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="name" onClick={() => start('name')}>🔎 {en ? 'Name the parts' : 'Бұл не? — назови части'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="kiiz-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-5 text-center">
            <h2 id="kiiz-sum" className="text-3xl font-black">{state.phase === 'victory' ? 'Киіз үй дайын!' : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-2 text-lg">XP +{state.xp} · {en ? 'first try' : 'с первого раза'} {state.firstTry}/{round.stages.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-solar" onClick={() => start(round.mode === 'build' ? 'name' : 'build')}>{round.mode === 'build' ? (en ? 'Name the parts →' : 'Бұл не? →') : (en ? 'Build again' : 'Құрастыр')}</button>
              <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
