/**
 * «Қала квесті» — City Quest (master plan, sprint 2).
 *
 * Pedagogy: reading city signs (ДӘРІХАНА, АЯЛДАМА, КІТАПХАНА…) and the dative «where to» (дәріханаға, мектепке).
 * 3D: a small neon district of six buildings with rooftop signs; Айсұлу Neon rides a hoverboard.
 *  - «Бар!» (go): a need is spoken («Маған дәрі керек.») → tap the right building → she flies there: «Дәріханаға барамын!»
 *  - «Жалқаубек» (fix): he swapped one sign — a 💊 building says КІТАПХАНА. Find it, then choose the right sign.
 * Buildings are tappable in 3D; the same choices are buttons under the scene (keyboard / small screens).
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { Lang, Vec3 } from '../../types/game.types';
import { fixPhrase, goPhrase, sign } from '../../data/cityCorpus';
import { buildCityRound, building, cityAccuracy, cityReducer, expected, initialCity, C_LIVES, type CityMode, type CState } from '../../lib/cityLogic';
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
interface Slot { pos: Vec3; h: number; w: number }
/** Wide: 3 × 2 (the back row is taller so its rooftop signs show over the front roofs). Phone: 2 × 3, stepped back. */
const SLOTS: Record<Layout, Slot[]> = {
  wide: [[-5.6, 0], [0, 0], [5.6, 0], [-5.6, -6], [0, -6], [5.6, -6]].map(([x, z], k) => ({ pos: [x, 0, z] as Vec3, h: k < 3 ? 2.8 : 4.4, w: 4.2 })),
  tall: [[-2.1, 0], [2.1, 0], [-2.1, -5.6], [2.1, -5.6], [-2.1, -11.2], [2.1, -11.2]].map(([x, z], k) => ({ pos: [x, 0, z] as Vec3, h: 2.0 + Math.floor(k / 2) * 1.2, w: 3.4 }))
};
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 8.5, 15], look: [0, 1.6, -3] }, tall: { position: [0, 14.5, 15], look: [0, 0.6, -6] } };
const START: Record<Layout, Vec3> = { wide: [0, 0, 4.6], tall: [0, 0, 3.4] };
const GOLD = '#F5A623';

function Building({ slot, color, text, emoji, flash, done, chosen, onPick }: { slot: Slot; color: string; text: string; emoji?: string; flash: boolean; done: boolean; chosen?: boolean; onPick(): void }) {
  const [x, , z] = slot.pos, h = slot.h, w = slot.w, d = 2.6;
  const body = useMemo(() => new THREE.Color(color).multiplyScalar(0.45).getStyle(), [color]);
  return (
    <group position={[x, 0, z]} onClick={(e) => { e.stopPropagation(); onPick(); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={body} roughness={0.7} emissive={flash ? '#FF4D5E' : done ? '#00E599' : chosen ? GOLD : '#000000'} emissiveIntensity={flash || done || chosen ? 0.6 : 0} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * w * 0.28, h * 0.62, d / 2 + 0.01]}><planeGeometry args={[w * 0.22, h * 0.22]} /><meshBasicMaterial color="#FFE7A8" toneMapped={false} /></mesh>)}
      <mesh position={[0, 0.55, d / 2 + 0.01]}><planeGeometry args={[0.8, 1.1]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh position={[0, h + 0.02, 0]}><boxGeometry args={[w + 0.1, 0.08, d + 0.1]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <group position={[0, h + 0.5, d / 2 - 0.2]}>
        <mesh><boxGeometry args={[w * 0.96, 0.82, 0.12]} /><meshStandardMaterial color="#0d1324" /></mesh>
        <group position={[0, 0, 0.07]}><CanvasLabel text={sign(text)} height={0.5} glow={done ? '#00E599' : color} /></group>
      </group>
      {/* the picture sits between the upper windows: the lower facade of a back building hides behind the row in front */}
      {emoji && <group position={[0, h * 0.62, d / 2 + 0.05]}><CanvasLabel text={emoji} height={Math.min(0.95, h * 0.3)} glow="#ffffff" /></group>}
    </group>
  );
}

/** Айсұлу on her hoverboard: rests at the start, flies to the front of the reached building on a hit. */
function Rider({ to, flying, start, talking, seq }: { to: Slot | null; flying: boolean; start: Vec3; talking: boolean; seq: number }) {
  const g = useRef<THREE.Group>(null), t0 = useRef(performance.now()), from = useRef(new THREE.Vector3(...start));
  useEffect(() => { t0.current = performance.now(); if (g.current) from.current.set(g.current.position.x, g.current.position.y - 0.25, g.current.position.z); }, [seq, flying]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(({ clock }) => {
    const o = g.current; if (!o) return;
    // lands on the roof (seen from the elevated camera even for a back-row building), behind the rooftop sign
    const goal = new THREE.Vector3(...(flying && to ? [to.pos[0], to.h, to.pos[2] - 0.3] : [start[0], 0, start[2]]));
    const k = Math.min(1, (performance.now() - t0.current) / 1100), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    o.position.lerpVectors(from.current, goal, e);
    o.position.y += 0.25 + Math.sin(clock.elapsedTime * 3) * 0.06 + Math.sin(k * Math.PI) * 1.8;
    o.rotation.y = Math.atan2(goal.x - from.current.x, goal.z - from.current.z) * (k < 1 ? 1 : 0);
  });
  return (
    <group ref={g} position={start}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[1.0, 0.1, 0.42]} /><meshStandardMaterial color="#1b2440" emissive="#22e6ff" emissiveIntensity={0.6} /></mesh>
      <mesh position={[0, -0.08, 0]}><boxGeometry args={[0.8, 0.04, 0.3]} /><meshBasicMaterial color="#22e6ff" toneMapped={false} /></mesh>
      <BlockHero id="aisulu" move={flying ? 'cheer' : 'idle'} talking={talking} position={[0, 0.06, 0]} scale={0.42} />
    </group>
  );
}

/** e2e only: screen positions of the six buildings (taps on the phone go through the 3D scene). */
function Projector({ slots }: { slots: Slot[] }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __cityScreen?: () => { x: number; y: number }[] }).__cityScreen = () => slots.map((s) => {
      const v = new THREE.Vector3(s.pos[0], s.h * 0.72, s.pos[2] + 1.3).project(camera); // upper facade: the lower part can hide behind the row in front
      return { x: (v.x + 1) / 2 * size.width, y: (1 - v.y) / 2 * size.height };
    });
  }, [camera, size, slots]);
  return null;
}

function Scene({ state, layout, talking, onPick }: { state: CState; layout: Layout; talking: boolean; onPick(o: string): void }) {
  const quality = useQuality(), particles = useParticles(), slots = SLOTS[layout];
  const st = state.round && state.i < state.round.stages.length ? state.round.stages[state.i] : null, fix = state.round?.mode === 'fix';
  useEffect(() => {
    if (state.phase !== 'hit' || !st) return;
    const s = slots[st.target];
    particles.burst({ at: [s.pos[0], s.h + 0.8, s.pos[2] + 1.2], count: quality === 'low' ? 30 : 80, color: GOLD, speed: 2.8, gravity: 0.9, life: 1.1, size: 0.07 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 50 : 140} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -3]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#1A2238" roughness={0.9} /></mesh>
      {(layout === 'wide' ? [-3] : [-2.8, -8.4]).map((z) => <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.02, z]}><planeGeometry args={[layout === 'wide' ? 17 : 9, 0.08]} /><meshBasicMaterial color="#00AFCA" toneMapped={false} /></mesh>)}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}><planeGeometry args={[0.08, layout === 'wide' ? 9 : 15]} /><meshBasicMaterial color="#00AFCA" toneMapped={false} /></mesh>
      {st && st.places.map((p, k) => {
        const fixed = fix && state.phase === 'hit' && k === st.target;
        return <Building key={state.i + ':' + k} slot={slots[k]} color={p.color} text={fixed ? p.kk : st.signs[k]} emoji={fix ? p.e : undefined}
          flash={state.phase === 'miss' && state.tried.includes(building(k))} done={state.phase === 'hit' && k === st.target}
          chosen={fix && state.step === 'fix' && k === st.target} onPick={() => onPick(building(k))} />;
      })}
      <Rider to={st ? slots[st.target] : null} flying={!fix && state.phase === 'hit'} start={START[layout]} talking={talking} seq={state.seq} />
      {fix && <BlockHero id="zhalkau" move={state.phase === 'hit' ? 'wave' : 'yawn'} position={layout === 'wide' ? [8.2, 0, 3.4] : [3.4, 0, 3.0]} rotationY={-0.5} scale={0.42} />}
      <Projector slots={slots} />
    </>
  );
}

export function CityQuest3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(cityReducer, undefined, initialCity);
  const [levelUp, setLevelUp] = useState(false), [talking, setTalking] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, fix = round?.mode === 'fix';
  const target = st ? st.places[st.target] : null;
  const active = ['aim', 'fix', 'miss'].includes(state.phase);

  const say = (text: string, ms = 1800) => { if (!voice) return; speakKazakh(text); setTalking(true); setTimeout(() => setTalking(false), ms); };
  const start = (m: CityMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildCityRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  // a new task: the need is spoken (go); Жалқаубек's trick is announced by the panel (fix)
  useEffect(() => { if (state.phase === 'aim' && st && !fix) say(st.places[st.target].hint.kk, 1500); }, [state.i, state.phase === 'aim' && state.round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st || !target) return undefined;
    if (state.phase === 'hit') {
      play(fix ? 'chime' : 'whoosh'); setTimeout(() => play('chime'), 300);
      const id0 = setTimeout(() => say(fix ? fixPhrase(target) : goPhrase(target)), fix ? 100 : 900);
      const id = setTimeout(() => dispatch({ type: 'next' }), fix ? 2000 : 2600);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'fix') play('beam');
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = cityAccuracy(state);
      if (finishSession({ game: 'city', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __city?: () => unknown }).__city = () => ({ phase: state.phase, step: state.step, i: state.i, lives: state.lives, expected: expected(state), signs: st?.signs, target: st?.target });
  }, [state, st]);

  const fixStep = fix && state.step === 'fix';
  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.62} uiShift={{ portrait: 0.16, landscape: 0.08 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(188_100%_55%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} layout={layout} talking={talking} onPick={choose} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'City Quest' : 'Қала квесті'} lives={state.lives} maxLives={C_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => { const e = expected(state); if (e) choose(e); }} />
      {round && st && target && ['aim', 'fix', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {fix ? (fixStep ? (en ? 'Choose the right sign' : 'Выбери правильную вывеску') : (en ? 'Жалқаубек swapped a sign — which one is wrong?' : 'Жалқаубек поменял вывеску — какая неверная?')) : (en ? 'Where do we go? Tap the building' : 'Куда идём? Нажми на здание')}</p>
            {!fix && <p className="mt-1 text-lg font-black">🗣 {target.hint.kk} <span className="block text-sm font-normal text-mist-dim">{pick(target.hint, lang)}</span></p>}
            {fix && <p className="mt-1 text-lg font-black">{fixStep ? target.e + ' ' + (en ? 'This building is…' : 'Это здание —') + ' ?' : 'Жалқаубек: «Хи-хи! Бір жазуды ауыстырдым!»'}</p>}
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {fix ? fixPhrase(target) : goPhrase(target)} <span className="font-normal text-mist-dim">({pick(target, lang)})</span></p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{fixStep ? (en ? 'Not this sign — look at the picture.' : 'Не эта вывеска — смотри на картинку.') : fix ? (en ? 'This sign matches its picture.' : 'Эта вывеска совпадает с картинкой.') : (en ? 'Not here — read the signs again.' : 'Не сюда — прочитай вывески ещё раз.')}</p>}
          </div>
          <div className={'mx-auto mt-2 grid max-w-xl gap-2 ' + (fixStep ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3')} role="group" aria-label={en ? 'Choices' : 'Варианты'}>
            {(fixStep ? st.fixOptions!.map((o) => ({ id: o, label: sign(o) })) : st.signs.map((s, k) => ({ id: building(k), label: (fix ? st.places[k].e + ' ' : '') + sign(s) }))).map((o) => (
              <button key={state.i + state.step + o.id} data-opt={o.id} disabled={state.tried.includes(o.id) || state.phase === 'hit'} onClick={() => choose(o.id)}
                className={'min-h-11 rounded-2xl px-2 text-base font-black tracking-wide ' + (state.phase === 'hit' && o.id === expected(state) ? 'bg-jade text-obsidian' : state.tried.includes(o.id) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>{o.label}</button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="mt-1 text-3xl font-black">Қала квесті</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Read the city signs. Айсұлу flies on her hoverboard wherever you send her — «Дәріханаға барамын!» And Жалқаубек has been swapping signs again…' : 'Читай городские вывески. Айсұлу летит на ховерборде туда, куда ты её отправишь: «Дәріханаға барамын!» А Жалқаубек опять перепутал вывески…'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="go" onClick={() => start('go')}>🛹 {en ? 'Бар! — where to?' : 'Бар! — куда идём?'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="fix" onClick={() => start('fix')}>😴 {en ? 'Fix Жалқаубек’s signs' : 'Исправь вывески Жалқаубека'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="city-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <h2 id="city-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
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
