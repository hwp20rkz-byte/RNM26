/**
 * «Қазақстан саяхаты» (phase 2 «Мектеп», geography 3–4): Kazakhstan as a 3D slab (Natural Earth outline, the big lakes
 * and the Caspian), the 19 cities as dots and a toy plane.
 *  - tour: a simplified landmark model turns above the map; the architect asks «Мен Бәйтеректі көргім келеді. Қай қалаға
 *          барамыз?» in his own voice; three cities are lit — the plane flies to the chosen one, «Бәйтерек — Астанада.»
 *  - map:  «Шымкент қай жерде?» — three unnamed pins; the names appear after the answer, «Шымкент — … оңтүстігінде.»
 * The pins are DOM buttons pinned to the 3D points (drei Html): ≥ 48 px touch targets on a phone, real labels for a11y.
 */
import { useEffect, useMemo, useReducer, useRef, useState, type ReactElement } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { MAP_H, MAP_W, OUTLINE, SIDES, WATER } from '../../data/travelData';
import { V_LIVES, buildTravelRound, cityOf, initialTravel, travelAccuracy, travelReducer, type TravelMode, type VState } from '../../lib/travelLogic';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 10.4, 8.6], look: [0, 0, 0.4] }, tall: { position: [0, 17.5, 7.0], look: [0, 0, -0.6] } };   // the FOV is capped at 78°: on a phone the camera backs off (~19 units) to show the whole 12-unit map
const K = 12 / MAP_W, TOP = 0.3;                                       // the 600-unit map becomes 12 world units wide
const toWorld = (x: number, y: number): Vec3 => [(x - MAP_W / 2) * K, TOP, (y - MAP_H / 2) * K];
const LAND = '#C9E7B5', EDGE = '#5B8C51', WATERC = '#3BA7E0', PIN = '#00AFCA', GOLD = '#F5A623', JADE = '#34D399', CORAL = '#FB6F6F';

function shapeOf(ring: number[][]) {
  const s = new THREE.Shape();
  ring.forEach(([x, y], i) => { const X = (x - MAP_W / 2) * K, Y = -(y - MAP_H / 2) * K; if (i) s.lineTo(X, Y); else s.moveTo(X, Y); });
  return s;
}
/** The country as a slab and the water on top; the Caspian lies lower, as a sea beside the land. */
function MapSlab() {
  const land = useMemo(() => new THREE.ExtrudeGeometry(OUTLINE.filter((r) => r.length > 20).map(shapeOf), { depth: TOP, bevelEnabled: false }), []);
  const mats = useMemo(() => [new THREE.MeshStandardMaterial({ color: LAND, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: EDGE, roughness: 0.9 })], []);   // top, side
  const water = useMemo(() => WATER.map((w) => ({ id: w.id, g: new THREE.ShapeGeometry(w.rings.map(shapeOf)) })), []);
  return (
    <group>
      <mesh geometry={land} rotation-x={-Math.PI / 2} material={mats} />
      {water.map((w) => (
        <mesh key={w.id} geometry={w.g} rotation-x={-Math.PI / 2} position-y={w.id === 'Каспий теңізі' ? 0.04 : TOP + 0.01}>
          <meshStandardMaterial color={WATERC} roughness={0.3} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** A simplified, recognisable model of each place (primitives only). */
function Landmark({ name }: { name: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.5; });
  const m = (c: string, e = 0.08) => <meshStandardMaterial color={c} emissive={c} emissiveIntensity={e} roughness={0.6} />;
  const mountain = (x: number, h: number) => (
    <group position={[x, 0, -0.3]}><mesh position-y={h / 2}><coneGeometry args={[0.7, h, 6]} />{m('#7C8A9E')}</mesh><mesh position-y={h * 0.82}><coneGeometry args={[0.27, h * 0.36, 6]} />{m('#FFFFFF', 0.2)}</mesh></group>
  );
  let body: ReactElement;
  switch (name) {
    case 'Бәйтерек': body = (<group><mesh position-y={0.9}><cylinderGeometry args={[0.06, 0.16, 1.8, 8]} />{m('#F1F5F9')}</mesh>
      {[0, 1, 2, 3, 4].map((k) => <mesh key={k} position-y={1.6} rotation-y={(k * Math.PI * 2) / 5} rotation-z={0.5}><boxGeometry args={[0.04, 0.6, 0.04]} />{m('#F1F5F9')}</mesh>)}
      <mesh position-y={2.05}><sphereGeometry args={[0.32, 24, 16]} />{m(GOLD, 0.35)}</mesh></group>); break;
    case 'Хан Шатыр': body = <mesh position-y={0.9} rotation-z={0.12}><coneGeometry args={[0.85, 1.8, 3]} /><meshStandardMaterial color="#BFE3F5" transparent opacity={0.85} roughness={0.2} /></mesh>; break;
    case 'Ақорда': body = (<group><mesh position-y={0.35}><boxGeometry args={[1.5, 0.7, 0.8]} />{m('#F8FAFC')}</mesh><mesh position-y={0.7}><sphereGeometry args={[0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{m('#3B82F6', 0.2)}</mesh>
      <mesh position-y={1.25}><cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />{m(GOLD, 0.3)}</mesh></group>); break;
    case 'Медеу': body = (<group>{mountain(-0.6, 1.3)}{mountain(0.6, 1.1)}<mesh position={[0, 0.05, 0.45]} scale={[1.4, 1, 0.7]}><cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />{m('#E0F2FE', 0.25)}</mesh></group>); break;
    case 'Көктөбе': body = (<group><mesh scale={[1, 0.55, 1]}><sphereGeometry args={[0.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{m('#4ADE80')}</mesh>
      <mesh position-y={1.2}><cylinderGeometry args={[0.04, 0.09, 1.5, 6]} />{m('#E2E8F0')}</mesh><mesh position-y={1.55}><torusGeometry args={[0.13, 0.04, 6, 16]} />{m('#E2E8F0')}</mesh></group>); break;
    case 'Шымбұлақ': body = (<group>{mountain(0, 1.7)}<mesh position={[0.55, 1.0, 0.3]}><boxGeometry args={[0.22, 0.18, 0.18]} />{m(CORAL, 0.2)}</mesh></group>); break;
    case 'Қожа Ахмет Ясауи кесенесі': body = (<group><mesh position-y={0.5}><boxGeometry args={[1.5, 1.0, 1.0]} />{m('#C8A27A')}</mesh><mesh position={[0, 0.75, 0.5]}><boxGeometry args={[0.7, 1.5, 0.2]} />{m('#B58960')}</mesh>
      <mesh position-y={1.05}><cylinderGeometry args={[0.38, 0.38, 0.2, 24]} />{m('#C8A27A')}</mesh><mesh position-y={1.15}><sphereGeometry args={[0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{m('#14B8A6', 0.25)}</mesh></group>); break;
    case 'Абай мұражайы': body = (<group><mesh position-y={0.35}><boxGeometry args={[1.3, 0.7, 0.8]} />{m('#FDE68A')}</mesh><mesh position-y={0.9} rotation-y={Math.PI / 4}><coneGeometry args={[0.85, 0.45, 4]} />{m('#B45309')}</mesh></group>); break;
    case 'Айша бибі кесенесі': body = (<group><mesh position-y={0.45}><boxGeometry args={[0.9, 0.9, 0.9]} />{m('#E7C9A0')}</mesh>
      {[-0.3, 0, 0.3].map((x) => <mesh key={x} position={[x, 0.45, 0.46]}><boxGeometry args={[0.16, 0.7, 0.02]} />{m('#A16207')}</mesh>)}<mesh position-y={1.05}><coneGeometry args={[0.4, 0.4, 8]} />{m('#D6B58A')}</mesh></group>); break;
    case 'Үлкен Алматы көлі': body = (<group>{mountain(-0.7, 1.4)}{mountain(0.7, 1.2)}<mesh position={[0, 0.04, 0.4]}><cylinderGeometry args={[0.6, 0.6, 0.08, 32]} />{m('#2DD4BF', 0.25)}</mesh></group>); break;
    default: body = (<group><mesh position-y={0.04}><cylinderGeometry args={[1.0, 1.0, 0.08, 32]} />{m(WATERC, 0.2)}</mesh>
      <mesh position={[0.2, 0.2, 0.1]}><boxGeometry args={[0.5, 0.16, 0.2]} />{m('#F8FAFC')}</mesh><mesh position={[0.2, 0.5, 0.1]}><coneGeometry args={[0.15, 0.4, 3]} />{m('#F8FAFC')}</mesh></group>);
  }
  return <group ref={g}>{body}</group>;
}

/** The toy plane: waits over the last city, flies an arc to the answer after a right pick. */
function Plane({ from, to, flying, t0 }: { from: string; to: string | null; flying: boolean; t0: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const a = cityOf(from), A = toWorld(a.x, a.y);
    let p: Vec3 = [A[0], TOP + 0.9 + Math.sin(clock.elapsedTime * 2) * 0.06, A[2]], dir = 0;
    if (flying && to) {
      const b = cityOf(to), B = toWorld(b.x, b.y), t = Math.min(1, (clock.elapsedTime - t0) / 1.4), e = t * t * (3 - 2 * t);
      p = [A[0] + (B[0] - A[0]) * e, TOP + 0.9 + Math.sin(Math.PI * e) * 1.6, A[2] + (B[2] - A[2]) * e];
      dir = Math.atan2(B[0] - A[0], B[2] - A[2]);
      g.current.rotation.set(0, dir, 0);
    }
    g.current.position.set(p[0], p[1], p[2]);
  });
  const white = <meshStandardMaterial color="#F8FAFC" roughness={0.4} />;
  return (
    <group ref={g} scale={0.8}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.13, 0.08, 1.0, 12]} />{white}</mesh>
      <mesh><boxGeometry args={[1.2, 0.04, 0.26]} /><meshStandardMaterial color={CORAL} /></mesh>
      <mesh position={[0, 0.16, -0.42]}><boxGeometry args={[0.04, 0.3, 0.2]} /><meshStandardMaterial color={CORAL} /></mesh>
      <mesh position={[0, 0, -0.44]}><boxGeometry args={[0.46, 0.03, 0.14]} />{white}</mesh>
    </group>
  );
}

function Scene({ state, layout, t0, onPin, showNames }: { state: VState; layout: Layout; t0: number; onPin(c: string): void; showNames: boolean }) {
  const compass = state.round?.mode === 'compass';
  const quality = useQuality(), particles = useParticles();
  const st = state.round && state.i < state.round.stages.length ? state.round.stages[state.i] : null, hit = state.phase === 'hit';
  useEffect(() => {
    if (!hit || !st) return undefined;
    const c = cityOf(st.target), P = toWorld(c.x, c.y);
    const id = setTimeout(() => particles.burst({ at: [P[0], TOP + 0.6, P[2]], count: quality === 'low' ? 30 : 80, color: GOLD, speed: 2.2, gravity: 0.9, life: 1, size: 0.05 }), 1400);
    return () => clearTimeout(id);
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const tall = layout === 'tall';
  return (
    <>
      <SkyDiorama quality={quality} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#1A2238" roughness={0.9} /></mesh>
      <MapSlab />
      {st && (compass ? [st.start!, st.target] : st.options).map((name) => {
        const c = cityOf(name), [x, , z] = toWorld(c.x, c.y), right = hit && name === st.answer, wrong = state.tried.includes(name);
        const col = compass ? (name === st.target ? GOLD : PIN) : right ? JADE : wrong ? CORAL : PIN;
        return (
          <group key={state.i + ':' + name} position={[x, TOP, z]}>
            <mesh position-y={0.3}><cylinderGeometry args={[0.035, 0.035, 0.6, 8]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.4} /></mesh>
            <mesh position-y={0.66}><sphereGeometry args={[0.13, 16, 12]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} /></mesh>
            {!compass && <Html center position={[0, 0.5, 0]} zIndexRange={[20, 0]}>
              <button data-pin={name} aria-label={name} disabled={wrong || hit} onClick={() => onPin(name)}
                className="block h-12 w-12 rounded-full border-2 border-transparent hover:border-turq-300 focus-visible:border-gold" style={{ background: 'transparent' }} />
            </Html>}
            {(showNames || compass || right || wrong) && <Billboard position={[0, 1.05, 0]}><CanvasLabel text={name} height={tall ? 0.6 : 0.36} glow={col} /></Billboard>}
          </group>
        );
      })}
      {st && <Plane from={state.from} to={st.target} flying={hit} t0={t0} />}
      {st?.landmark && (
        <group position={tall ? [0, 0.6, -5.4] : [7.7, 0, -0.6]} scale={tall ? 1.5 : 1.0}>
          <mesh position-y={-0.08}><cylinderGeometry args={[1.1, 1.2, 0.16, 32]} /><meshStandardMaterial color="#E2E8F0" /></mesh>
          <Landmark key={st.landmark} name={st.landmark} />
          {tall && <Billboard position={[0, 2.7, 0]}><CanvasLabel text={st.landmark} height={0.5} glow={GOLD} /></Billboard>}   {/* wide: the name is in the question; a long one would run off the edge */}
        </group>
      )}
      <BlockHero id="batyr" move={hit || state.phase === 'victory' ? 'cheer' : 'idle'} position={tall ? [4.6, 0, 3.4] : [-7.7, 0, -2.2]} rotationY={tall ? -0.5 : 0.6} scale={tall ? 0.5 : 0.5} />
    </>
  );
}

export function Travel3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(travelReducer, undefined, initialTravel);
  const [levelUp, setLevelUp] = useState(false);
  const [t0, setT0] = useState(0);
  const finished = useRef(false), layout = useLayout(), clock = useRef(performance.now());
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, tour = round?.mode === 'tour', compass = round?.mode === 'compass';
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = (m: TravelMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildTravelRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {   // each task: the architect (tour) or the narrator (map) asks
    if (!st || state.phase !== 'aim' || state.tried.length || !voice) return undefined;
    const id = setTimeout(() => speakKazakh(st.speak, tour), 400);
    return () => clearTimeout(id);
  }, [state.i, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('whoosh'); setT0((performance.now() - clock.current) / 1000);
      const id0 = setTimeout(() => { play('chime'); if (voice) speakKazakh(st.say); }, 1400), id = setTimeout(() => dispatch({ type: 'next' }), 4200);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = travelAccuracy(state);
      if (finishSession({ game: 'travel', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __travel?: () => unknown }).__travel = () => ({ phase: state.phase, i: state.i, lives: state.lives, answer: st?.answer, options: st?.options, mode: round?.mode, from: state.from });
  }, [state, st, round]);

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 1.0} uiShift={{ portrait: 0.1, landscape: 0.08 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(188_100%_55%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={300}><Scene state={state} layout={layout} t0={t0} onPin={choose} showNames={!!tour} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Travel Kazakhstan' : 'Қазақстан саяхаты'} lives={state.lives} maxLives={V_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo pointer-events-auto mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {compass ? (en ? 'From the blue pin to the gold one' : 'От синего флажка к золотому') : tour ? (en ? 'The architect wants to see a place' : 'Архитектор хочет увидеть место') : (en ? 'Tap the city on the map' : 'Нажми на город на карте')}</p>
            <p className="mt-1 text-lg font-black">{st.prompt}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {st.say}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{compass ? (en ? 'Up is north, down is south, right is east, left is west.' : 'Наверху — север, внизу — юг, справа — восток, слева — запад.') : tour ? (en ? 'Not there. Look at the model again.' : 'Не туда. Посмотри на модель ещё раз.') : (en ? 'Not this one. Up is north, down is south, left is west.' : 'Не этот. Наверху — север, внизу — юг, слева — запад.')}</p>}
          </div>
          {compass && (
            <div className="pointer-events-auto mx-auto mt-2 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={en ? 'Sides of the world' : 'Стороны света'}>
              {st.options.map((o) => (
                <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                  className={'flex min-h-12 items-center justify-center gap-2 rounded-2xl px-2 text-base font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                  <span aria-hidden="true" className="inline-block text-xl" style={{ transform: 'rotate(' + (90 - (SIDES.find((x) => x.dir === o)?.deg ?? 0)) + 'deg)' }}>⬆</span>{o}
                </button>
              ))}
            </div>
          )}
          {tour && (
            <div className="pointer-events-auto mx-auto mt-2 grid max-w-xl grid-cols-3 gap-2" role="group" aria-label={en ? 'Cities' : 'Города'}>
              {st.options.map((o) => (
                <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                  className={'grid min-h-14 place-items-center rounded-2xl px-1 text-base font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                  ✈️ {o}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Қазақстан саяхаты</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Fly a toy plane across Kazakhstan: to the landmarks, then find the cities on the map.' : 'Лети на самолётике по Казахстану: к достопримечательностям, а потом найди города на карте.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="tour" onClick={() => start('tour')}>🏛️ {en ? 'Landmarks' : 'Көрікті жерлер — достопримечательности'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="map" onClick={() => start('map')}>📍 {en ? 'Cities on the map' : 'Қала қайда? — города на карте'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="compass" onClick={() => start('compass')}>🧭 {en ? 'Compass: which way?' : 'Қай жаққа? — стороны света'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="travel-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-5 text-center">
            <h2 id="travel-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of fuel' : 'Топливо кончилось')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-2 text-lg">XP +{state.xp} · {en ? 'first try' : 'с первого раза'} {state.firstTry}/{round.stages.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-solar" onClick={() => start(round.mode === 'tour' ? 'map' : round.mode === 'map' ? 'compass' : 'tour')}>{round.mode === 'tour' ? (en ? 'Cities on the map →' : 'Қала қайда? →') : round.mode === 'map' ? (en ? 'Compass →' : 'Қай жаққа? →') : (en ? 'Landmarks' : 'Көрікті жерлер')}</button>
              <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
