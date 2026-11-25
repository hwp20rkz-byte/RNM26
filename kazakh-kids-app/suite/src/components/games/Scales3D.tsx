/**
 * «Таразы» (phase 2 «Мектеп», maths 1–3): a balance scale. A sack of L kg hangs on the left pan; the child adds the
 * missing weight (add) or the number of w-kg weights (div). The beam tilts by the difference and levels after the right
 * answer; Баян апай cheers and the narrator says the short answer («Бес килограмм!»). Procedural geometry only.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { S_LIVES, SCALES_Q, buildScalesRound, initialScales, rightTotal, scalesAccuracy, scalesReducer, type SState, type ScalesMode, type SStage } from '../../lib/scalesLogic';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 3.6, 9.5], look: [0, 2.4, 0] }, tall: { position: [0, 4.2, 13.5], look: [0, 2.6, 0] } };
const ARM = 2.6, H = 3.6, GOLD = '#F5A623', STEEL = '#CBD5E1', WEIGHT = '#475569', SACK = '#C8A27A';

/** One weight block with its label. */
function Weight({ kg, position }: { kg: number; position: Vec3 }) {
  const s = 0.32 + kg * 0.02;
  return (
    <group position={position}>
      <mesh position-y={s / 2}><cylinderGeometry args={[s * 0.9, s, s, 20]} /><meshStandardMaterial color={WEIGHT} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position-y={s + 0.05}><torusGeometry args={[0.08, 0.025, 8, 16]} /><meshStandardMaterial color={WEIGHT} metalness={0.6} /></mesh>
    </group>
  );
}

/** The scale: the beam turns by the left − right difference (eased), the pans hang straight down from its ends. */
function Balance({ st, pick }: { st: SStage; pick: number | null }) {
  const beam = useRef<THREE.Group>(null), left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null), ang = useRef(0.3);
  const diff = st.left - rightTotal(st, pick), target = THREE.MathUtils.clamp(diff * 0.045, -0.32, 0.32);
  useFrame((_, dt) => {
    ang.current += (target - ang.current) * Math.min(1, dt * 3);
    const a = ang.current;
    if (beam.current) beam.current.rotation.z = a;
    if (left.current) left.current.position.set(-ARM * Math.cos(a), H - ARM * Math.sin(a) - 1.1, 0);
    if (right.current) right.current.position.set(ARM * Math.cos(a), H + ARM * Math.sin(a) - 1.1, 0);
  });
  // one caption per pan (25.11: a label on every weight ran together as «3 кг3 кг3 кг»)
  const panLabel = st.mode === 'add' ? (pick ? st.right[0] + ' + ' + pick + ' кг' : st.right[0] + ' кг + ?') : (pick ? pick + ' × ' + st.w + ' кг' : '? × ' + st.w + ' кг');
  const rights = useMemo(() => (st.mode === 'add' ? [...st.right, ...(pick ? [pick] : [])] : Array.from({ length: pick ?? 0 }, () => st.w)), [st, pick]);
  const pan = (
    <>
      <mesh><cylinderGeometry args={[0.95, 0.8, 0.12, 32]} /><meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.3} /></mesh>
      {[0, 1, 2].map((k) => <mesh key={k} position={[Math.cos((k * Math.PI * 2) / 3) * 0.45, 0.55, Math.sin((k * Math.PI * 2) / 3) * 0.45]} rotation-z={Math.cos((k * Math.PI * 2) / 3) * -0.4} rotation-x={Math.sin((k * Math.PI * 2) / 3) * 0.4}><cylinderGeometry args={[0.01, 0.01, 1.15, 4]} /><meshStandardMaterial color="#64748B" /></mesh>)}
    </>
  );
  return (
    <group>
      <mesh position-y={0.1}><cylinderGeometry args={[1.0, 1.2, 0.2, 32]} /><meshStandardMaterial color="#334155" /></mesh>
      <mesh position-y={H / 2}><cylinderGeometry args={[0.1, 0.14, H, 16]} /><meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.35} /></mesh>
      <group ref={beam} position-y={H}>
        <mesh><boxGeometry args={[ARM * 2 + 0.2, 0.12, 0.14]} /><meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.35} /></mesh>
        <mesh position-y={0.35} rotation-z={0}><coneGeometry args={[0.1, 0.5, 4]} /><meshStandardMaterial color={GOLD} /></mesh>
      </group>
      <group ref={left}>
        {pan}
        <mesh position-y={0.5} scale={[1, 0.9, 0.85]}><sphereGeometry args={[0.55, 20, 14]} /><meshStandardMaterial color={SACK} roughness={0.9} /></mesh>
        <Billboard position={[0, 1.45, 0]}><CanvasLabel text={st.left + ' кг'} height={0.34} glow={GOLD} /></Billboard>
      </group>
      <group ref={right}>
        {pan}
        {rights.map((kg, k) => <Weight key={k} kg={kg} position={[((k % 3) - (Math.min(rights.length, 3) - 1) / 2) * 0.55, 0.06 + Math.floor(k / 3) * 0.55, 0]} />)}
        <Billboard position={[0, 1.6 + Math.max(0, Math.ceil(rights.length / 3) - 1) * 0.55, 0]}><CanvasLabel text={panLabel} height={0.34} glow="#94A3B8" /></Billboard>
      </group>
    </group>
  );
}

function Scene({ state, layout }: { state: SState; layout: Layout }) {
  const quality = useQuality(), particles = useParticles();
  const st = state.round && state.i < state.round.stages.length ? state.round.stages[state.i] : null, hit = state.phase === 'hit';
  useEffect(() => {
    if (!hit) return;
    particles.burst({ at: [0, H + 0.5, 0], count: quality === 'low' ? 30 : 80, color: GOLD, speed: 2.4, gravity: 0.9, life: 1, size: 0.05 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <SkyDiorama quality={quality} />
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[8, 48]} /><meshStandardMaterial color="#1A2238" roughness={0.85} /></mesh>
      {st && <Balance key={state.i} st={st} pick={hit ? +st.answer : null} />}
      <BlockHero id="apai" move={hit || state.phase === 'victory' ? 'cheer' : 'idle'} position={layout === 'wide' ? [-5.0, 0, 0.4] : [-2.4, 0, 2.6]} rotationY={0.5} scale={0.55} />
    </>
  );
}

export function Scales3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(scalesReducer, undefined, initialScales);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null;
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = (m: ScalesMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildScalesRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st || state.phase !== 'aim' || state.tried.length || !voice) return undefined;
    const id = setTimeout(() => speakKazakh(SCALES_Q[st.mode]), 400);
    return () => clearTimeout(id);
  }, [state.i, round]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('chime');
      const id0 = setTimeout(() => { if (voice) speakKazakh(st.say); }, 700), id = setTimeout(() => dispatch({ type: 'next' }), 3000);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = scalesAccuracy(state);
      if (finishSession({ game: 'scales', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __scales?: () => unknown }).__scales = () => ({ phase: state.phase, i: state.i, lives: state.lives, answer: st?.answer, options: st?.options, mode: round?.mode });
  }, [state, st, round]);
  const add = st?.mode === 'add';

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.95} uiShift={{ portrait: 0.14, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(188_100%_55%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={300}><Scene state={state} layout={layout} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Balance Scale' : 'Таразы'} lives={state.lives} maxLives={S_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {add ? (en ? 'Left ' + st.left + ' kg, right ' + st.right[0] + ' kg' : 'Слева ' + st.left + ' кг, справа ' + st.right[0] + ' кг') : (en ? st.left + ' kg — weights of ' + st.w + ' kg' : st.left + ' кг — гири по ' + st.w + ' кг')}</p>
            <p className="mt-1 text-lg font-black">{SCALES_Q[st.mode]}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {add ? st.right[0] + ' + ' + st.answer + ' = ' + st.left : st.left + ' ÷ ' + st.w + ' = ' + st.answer} · {st.sentence}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{add ? (en ? 'How much is missing to ' + st.left + '?' : 'Сколько не хватает до ' + st.left + '?') : (en ? 'How many times does ' + st.w + ' fit into ' + st.left + '?' : 'Сколько раз ' + st.w + ' помещается в ' + st.left + '?')}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-3 gap-2" role="group" aria-label={en ? 'Answers' : 'Ответы'}>
            {st.options.map((o) => (
              <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'grid min-h-14 place-items-center rounded-2xl px-1 font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                <span className="text-xl">{add ? o + ' кг' : '× ' + o}</span><span className="text-xs font-bold opacity-80">{add ? '' : (en ? o + ' weights' : o + ' гир')}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Таразы</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Balance the scale: find the missing weight, then count how many weights you need.' : 'Уравновесь весы: найди недостающую гирю, а потом — сколько гирь нужно.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="add" onClick={() => start('add')}>⚖️ {en ? 'Missing weight (+)' : 'Қай гір керек? — сложение'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="div" onClick={() => start('div')}>🧮 {en ? 'How many weights (÷)' : 'Неше гір керек? — деление'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="scales-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-5 text-center">
            <h2 id="scales-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-2 text-lg">XP +{state.xp} · {en ? 'first try' : 'с первого раза'} {state.firstTry}/{round.stages.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-solar" onClick={() => start(round.mode === 'add' ? 'div' : 'add')}>{round.mode === 'add' ? (en ? 'How many weights →' : 'Неше гір? →') : (en ? 'Missing weight' : 'Қай гір?')}</button>
              <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
