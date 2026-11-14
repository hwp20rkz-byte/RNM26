/**
 * «Грави-тир» — Gravity Range (master plan, sprint 1).
 *
 * Pedagogy: «мынау» (this, near) vs «анау» (that, far) and «Мен … аламын / алмаймын» (I can / can't).
 * 3D: a range with a near pedestal and a far tower; Батыр-X stands by the line. «Мынау / анау»: an object appears near
 * (big) or far (small); the right phrase makes the glove grab it (near) or the gold gravity beam pull it in (far).
 * «Аламын»: an action with ✅ or ❌; the right phrase powers Батыр-X up (jump + aura). Lines are spoken after a hit.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { buildGravityRound, gravityAccuracy, gravityReducer, initialGravity, G_LIVES, type GravityMode, type GState } from '../../lib/gravityLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { DustMotes, ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
import { CanvasLabel } from '../3d/CanvasLabel';
import { BlockHero } from '../3d/heroes/BlockHero';
import { GameHUD } from '../ui/GameHUD';
import { useAudioStore } from '../../store/useAudioStore';
import { useFxStore } from '../../store/useFxStore';
import { useGameStore } from '../../store/useGameStore';
import { pick } from '../../lib/i18n';
import { speakKazakh } from '../../lib/kazakhVoice';
import { TestSkip } from '../../lib/testMode';

type Layout = 'wide' | 'tall';
function useLayout(): Layout {
  const get = (): Layout => (window.innerWidth / Math.max(1, window.innerHeight) >= 0.8 ? 'wide' : 'tall');
  const [l, set] = useState<Layout>(get);
  useEffect(() => { const on = () => set(get()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return l;
}
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 3.4, 10], look: [0, 1.6, -3] }, tall: { position: [0, 4.6, 14.5], look: [0, 2.2, -3] } };
const NEAR: Vec3 = [1.4, 1.6, 2.2], FAR: Vec3 = [1.6, 3.2, -16], HAND: Vec3 = [-1.6, 1.4, 1.6], CAN: Vec3 = [1.9, 2.3, -2.5], GOLD = '#F5A623';

function Range() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -7]} receiveShadow><planeGeometry args={[7, 26]} /><meshStandardMaterial color="#1A2238" roughness={0.8} /></mesh>
      {[-3, 3].map((x) => <mesh key={x} position={[x, 0.05, -7]}><boxGeometry args={[0.08, 0.08, 26]} /><meshBasicMaterial color="#00AFCA" toneMapped={false} /></mesh>)}
      <mesh position={[NEAR[0], 0.5, NEAR[2]]}><cylinderGeometry args={[0.7, 0.8, 1, 16]} /><meshStandardMaterial color="#2a3566" /></mesh>
      <mesh position={[FAR[0], 1.4, FAR[2]]}><cylinderGeometry args={[0.9, 1.2, 2.8, 16]} /><meshStandardMaterial color="#2a3566" /></mesh>
      <mesh position={[0, 0.03, 3.4]} rotation-x={-Math.PI / 2}><planeGeometry args={[6, 0.12]} /><meshBasicMaterial color={GOLD} toneMapped={false} /></mesh>
    </group>
  );
}

function Target({ state }: { state: GState }) {
  const g = useRef<THREE.Group>(null), t0 = useRef(performance.now());
  const st = state.round!.stages[state.i], demo = state.round!.mode === 'demo';
  const home = useMemo(() => new THREE.Vector3(...(!demo ? CAN : !st.near ? FAR : NEAR)), [demo, st.near]);
  useEffect(() => { t0.current = performance.now(); }, [state.phase, state.i]);
  useFrame(({ clock }) => {
    const o = g.current; if (!o) return;
    if (state.phase === 'hit' && demo) {
      const k = Math.min(1, (performance.now() - t0.current) / (st.near ? 350 : 800));
      o.position.lerpVectors(home, new THREE.Vector3(...HAND), k * k); o.scale.setScalar(1 - k * 0.5);
    } else { o.position.copy(home); o.position.y += Math.sin(clock.elapsedTime * 2) * 0.12; o.scale.setScalar(1); }
  });
  const label = demo ? st.item!.e : st.ability!.e, far = demo && !st.near;
  return (
    <group ref={g}>
      <mesh><icosahedronGeometry args={[far ? 0.55 : demo ? 0.75 : 0.5, 1]} /><meshStandardMaterial color="#1b2440" emissive={state.phase === 'miss' ? '#FF4D5E' : '#00AFCA'} emissiveIntensity={1.2} flatShading /></mesh>
      <Billboard position={[0, far ? 1.3 : 1.5, 0]}><CanvasLabel text={label} height={far ? 1.1 : 1.3} glow="#00AFCA" /></Billboard>
      {!demo && <Billboard position={[0.95, 2.2, 0]}><CanvasLabel text={st.yes ? '✅' : '❌'} height={0.8} glow={st.yes ? '#00E599' : '#FF4D5E'} /></Billboard>}
    </group>
  );
}

function Beam({ from, to, seq }: { from: Vec3; to: Vec3; seq: number }) {
  const m = useRef<THREE.Mesh>(null), t0 = useMemo(() => performance.now(), [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useMemo(() => new THREE.Vector3(...from), [from]), b = useMemo(() => new THREE.Vector3(...to), [to]);
  useFrame(() => {
    const mesh = m.current; if (!mesh) return;
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(); d.normalize();
    mesh.position.copy(a).addScaledVector(d, len / 2); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); mesh.scale.set(1, len, 1);
    (mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - (performance.now() - t0) / 900);
  });
  return <mesh ref={m}><cylinderGeometry args={[0.07, 0.07, 1, 10, 1, true]} /><meshBasicMaterial color={GOLD} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>;
}

function Scene({ state, talking }: { state: GState; talking: boolean }) {
  const quality = useQuality(), particles = useParticles();
  const st = state.round ? state.round.stages[state.i] : null, demo = state.round?.mode === 'demo';
  useEffect(() => {
    if (state.phase !== 'hit' || !st) return;
    const at: Vec3 = demo ? HAND : [-1.6, 1.5, 1.2];
    particles.burst({ at, count: quality === 'low' ? 30 : 80, color: GOLD, speed: 2.6, gravity: 0.8, life: 1, size: 0.06 });
    if (!demo && st.yes) particles.shockwave({ at: [-1.6, 0.1, 1.2], color: GOLD, radius: 3 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = state.phase === 'hit' ? (demo ? 'power' : st?.yes ? 'jump360' : 'bata') : state.phase === 'miss' ? 'idle' : 'idle';
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 60 : 160} />
      <Range />
      <BlockHero id="batyr" move={move} talking={talking} position={[-2.3, 0, 1.4]} rotationY={0.5} scale={0.62} />
      {state.phase === 'hit' && !demo && st?.yes && <mesh position={[-2.3, 0.05, 1.4]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.9, 1.15, 32]} /><meshBasicMaterial color={GOLD} toneMapped={false} /></mesh>}
      {st && state.phase !== 'victory' && state.phase !== 'defeat' && <Target state={state} />}
      {state.phase === 'hit' && demo && st && !st.near && <Beam key={state.seq} seq={state.seq} from={[-1.6, 1.6, 1.4]} to={FAR} />}
    </>
  );
}

export function GravityRange3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(gravityReducer, undefined, initialGravity);
  const [levelUp, setLevelUp] = useState(false), [talking, setTalking] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, demo = round?.mode === 'demo';

  const start = (m: GravityMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildGravityRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || (state.phase !== 'aim' && state.phase !== 'miss')) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('beam'); setTimeout(() => play('chime'), 250);
      if (voice) { speakKazakh(st.answer); setTalking(true); }
      const off = setTimeout(() => setTalking(false), 1800), id = setTimeout(() => dispatch({ type: 'next' }), 2000);
      return () => { clearTimeout(id); clearTimeout(off); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = gravityAccuracy(state);
      if (finishSession({ game: 'gravity', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __grav?: () => unknown }).__grav = () => ({ phase: state.phase, i: state.i, lives: state.lives, answer: st?.answer, options: st?.options, near: st?.near, yes: st?.yes });
  }, [state, st]);

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={1.3} uiShift={{ portrait: 0.08, landscape: 0.05 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(37_91%_55%/0.2),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} talking={talking} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Gravity Range' : 'Грави-тир'} lives={state.lives} maxLives={G_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || (state.phase !== 'aim' && state.phase !== 'miss')} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {demo ? (en ? 'Near is «мынау», far is «анау»' : 'Рядом — «мынау», далеко — «анау»') : (en ? '✅ can · ❌ can’t' : '✅ умею · ❌ не умею')}</p>
            <p className="mt-1 text-lg font-black">{demo ? (st.item!.e + ' ' + pick(st.item!, lang) + ' · ' + (st.near ? (en ? 'near' : 'рядом') : (en ? 'far away' : 'далеко'))) : (st.ability!.e + ' ' + pick(st.ability!, lang) + ' ' + (st.yes ? '✅' : '❌'))}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {st.answer}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{en ? 'Not that one — look at the distance and the sign.' : 'Не то — смотри на расстояние и знак.'}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl gap-2" role="group" aria-label={en ? 'Phrases' : 'Фразы'}>
            {st.options.map((o) => (
              <button key={state.i + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'min-h-12 rounded-2xl px-3 text-lg font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>{o}</button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="mt-1 text-3xl font-black">Грави-тир</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Батыр-X grabs what is near («мынау») with the glove and pulls what is far («анау») with the gold beam. And «Мен … аламын» switches on his superpower.' : 'Батыр-X берёт близкое («мынау») перчаткой и притягивает далёкое («анау») золотым лучом. А «Мен … аламын» включает его суперсилу.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="demo" onClick={() => start('demo')}>👉 {en ? 'Мынау / анау — near and far' : 'Мынау / анау — близко и далеко'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="can" onClick={() => start('can')}>💪 {en ? 'Аламын — I can' : 'Аламын — я умею'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="grav-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <h2 id="grav-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
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
