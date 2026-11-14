/**
 * «Лего-Сөз» — Word Lego (master plan, sprint 3).
 *
 * Blocks: the root is a row of letter cubes (к-і-т-а-п). Pick the ending block for «менің» / «сенің» / «оның» /
 * «біздің» / «көп» — it flies in and snaps on, and the root shows its sound change on the way: the last cube flips
 * п → б (кітабым), or a vowel cube jumps out (ауыз → аузым). Forms come from the grammar engine (data/legoForms.ts).
 * Pose («Аниматор»): Батыр-X or Тайсон sits / stands / lies with a book, or has finished it — pick the sentence
 * (оқып отыр / оқып тұр / оқып жатыр / кітапты оқып тастады).
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import type { PoseKey } from '../../data/legoTypes';
import { buildLegoRound, initialLego, legoAccuracy, legoReducer, L_LIVES, POSS_LABEL, type LegoMode, type LStage, type LState } from '../../lib/legoLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { DustMotes, ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
import { CanvasLabel } from '../3d/CanvasLabel';
import { BlockHero } from '../3d/heroes/BlockHero';
import type { Move } from '../3d/heroes/BlockHeroBuilder';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 3.2, 11], look: [0, 1.6, 0] }, tall: { position: [0, 3.6, 15.5], look: [0, 2.2, 0] } };
/** The animator is a close-up: the pose is the whole question. */
const POSE_CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 2.4, 7.2], look: [0, 0.35, 0] }, tall: { position: [0, 2.8, 10], look: [0, 0.5, 0] } };
const ROOT = '#00AFCA', CHANGE = '#F5A623', END = '#FF5FA2', GOLD = '#F5A623';

/** One letter cube; glides to `x`, flips when its letter changes (п → б), flies up and fades when `leaving`. */
function Cube({ letter, x, y, color, leaving, flip, enter, size }: { letter: string; x: number; y: number; color: string; leaving?: boolean; flip?: boolean; enter?: boolean; size: number }) {
  const g = useRef<THREE.Group>(null), t0 = useRef(performance.now()), [shown, setShown] = useState(flip ? '' : letter);
  useEffect(() => { t0.current = performance.now(); if (!flip) setShown(letter); else { setShown((p) => p || letter); const id = setTimeout(() => setShown(letter), 260); return () => clearTimeout(id); } return undefined; }, [letter, flip, leaving]);
  useFrame(() => {
    const o = g.current; if (!o) return;
    const k = Math.min(1, (performance.now() - t0.current) / 520);
    const tx = x, ty = leaving ? y + 2.6 * k : y;
    if (enter && k < 1) { o.position.set(tx + (1 - k) * 3, ty + (1 - k) * 3.2, 0); } else { o.position.x += (tx - o.position.x) * 0.18; o.position.y += (ty - o.position.y) * 0.25; }
    o.rotation.x = flip && k < 1 ? k * Math.PI * 2 : 0;
    o.scale.setScalar(leaving ? Math.max(0.01, 1 - k) : 1);
  });
  return (
    <group ref={g} position={[x, y, 0]}>
      <mesh castShadow><boxGeometry args={[size, size, size]} /><meshStandardMaterial color="#141c33" emissive={color} emissiveIntensity={0.35} roughness={0.5} /></mesh>
      <mesh position={[0, 0, size / 2 + 0.002]}><planeGeometry args={[size * 0.9, size * 0.9]} /><meshBasicMaterial color={color} transparent opacity={0.18} toneMapped={false} /></mesh>
      <group position={[0, 0.02, size / 2 + 0.01]}><CanvasLabel text={shown} height={size * 0.62} glow={color} /></group>
    </group>
  );
}

interface Spec { key: string; letter: string; color: string; leaving?: boolean; flip?: boolean; enter?: boolean }
/** Cubes for a task: before the answer — root letters + a «?» slot; after — stem + ending with the sound change. */
function wordCubes(st: LStage, done: boolean): Spec[] {
  const root = [...st.noun!.kk], sp = st.split!;
  if (!done) return [...root.map((l, i) => ({ key: 'r' + i, letter: l, color: ROOT })), { key: 'q', letter: '?', color: END }];
  const out: Spec[] = [];
  if (sp.change === 'dropped') {
    const gone = root.length - 2;   // ауыз → ауз: the vowel before the last consonant leaves
    root.forEach((l, i) => out.push(i === gone ? { key: 'r' + i, letter: l, color: CHANGE, leaving: true } : { key: 'r' + i, letter: l, color: ROOT }));
  } else root.forEach((l, i) => out.push({ key: 'r' + i, letter: sp.change === 'voiced' && i === root.length - 1 ? sp.stem.slice(-1) : l, color: sp.change === 'voiced' && i === root.length - 1 ? CHANGE : ROOT, flip: sp.change === 'voiced' && i === root.length - 1 }));
  [...sp.ending].forEach((l, i) => out.push({ key: 'e' + i, letter: l, color: END, enter: true }));
  return out;
}

function Blocks({ st, done, layout }: { st: LStage; done: boolean; layout: Layout }) {
  const cubes = wordCubes(st, done), staying = cubes.filter((c) => !c.leaving);
  // long words (ойыншығымыз — 11 letters) shrink the cubes to stay on a phone screen
  const n = staying.length, size = Math.min(layout === 'wide' ? 0.95 : 0.78, (layout === 'wide' ? 12.5 : 7.0) / (n * 1.08)), step = size * 1.08, y = layout === 'wide' ? 1.6 : 2.0;
  const xOf = (c: Spec) => { const i = staying.indexOf(c); return i < 0 ? (cubes.indexOf(c) - (staying.length - 1) / 2) * step : (i - (staying.length - 1) / 2) * step; };
  return (
    <group>
      {cubes.map((c) => <Cube key={st.noun!.kk + c.key} letter={c.letter} x={xOf(c)} y={y} color={c.color} leaving={c.leaving} flip={c.flip} enter={c.enter} size={size} />)}
      <Billboard position={[0, y + (layout === 'wide' ? 1.5 : 1.4), 0]}><CanvasLabel text={st.noun!.e + '  ' + POSS_LABEL[st.key!] + ' + ?'} height={0.62} glow={END} /></Billboard>
    </group>
  );
}

const POSE_MOVE: Record<PoseKey, Move> = { отыр: 'sit', тұр: 'hold', жатыр: 'lie', тастады: 'cheer' };
function Animator({ st, talking, layout }: { st: LStage; talking: boolean; layout: Layout }) {
  const p = st.pose!, scale = layout === 'wide' ? 0.62 : 0.7;
  const heroAt: Vec3 = p === 'жатыр' ? [0.9, 0, 0] : [0, 0, 0];
  // the object sits by the hands, never over the face
  const prop: Vec3 = p === 'отыр' ? [0.75, 0.55, 0.9] : p === 'тұр' ? [0.8, 1.1, 0.9] : p === 'жатыр' ? [-0.2, 0.95, 0.9] : [1.2, 1.9, 0.5];
  return (
    <group>
      {(p === 'отыр' || p === 'жатыр') && <mesh position={[p === 'жатыр' ? -0.2 : 0, 0.04, 0]}><boxGeometry args={[p === 'жатыр' ? 3.4 : 2.2, 0.08, 1.8]} /><meshStandardMaterial color="#b3263a" emissive="#5a0f1c" emissiveIntensity={0.4} /></mesh>}
      <BlockHero key={st.hero!.id + p} id={st.hero!.id} move={POSE_MOVE[p]} talking={talking} position={heroAt} rotationY={0} scale={scale} />
      <Billboard position={prop}><CanvasLabel text={st.verb!.e + (p === 'тастады' ? ' ✅' : '')} height={0.55} glow={p === 'тастады' ? '#00E599' : GOLD} /></Billboard>
    </group>
  );
}

function Scene({ state, talking, layout }: { state: LState; talking: boolean; layout: Layout }) {
  const quality = useQuality(), particles = useParticles();
  const st = state.round && state.i < state.round.stages.length ? state.round.stages[state.i] : null, blocks = state.round?.mode === 'blocks';
  useEffect(() => {
    if (state.phase !== 'hit' || !st) return;
    particles.burst({ at: [blocks ? 1.5 : 0, blocks ? 1.8 : 2.2, 0.6], count: quality === 'low' ? 30 : 80, color: blocks && st.split!.change !== 'none' ? CHANGE : END, speed: 2.6, gravity: 0.9, life: 1, size: 0.06 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 50 : 140} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow><circleGeometry args={[7, 48]} /><meshStandardMaterial color="#1A2238" roughness={0.85} /></mesh>
      {st && blocks && <Blocks st={st} done={state.phase === 'hit'} layout={layout} />}
      {st && !blocks && <Animator st={st} talking={talking} layout={layout} />}
    </>
  );
}

const CHANGE_NOTE = { voiced: { ru: 'п → б, к → г, қ → ғ перед гласной', en: 'п → б, к → г, қ → ғ before a vowel' }, dropped: { ru: 'гласная выпала: ауыз → аузым', en: 'the vowel drops out: ауыз → аузым' } };
const POSE_RU: Record<PoseKey, { ru: string; en: string }> = { отыр: { ru: 'сидя', en: 'sitting' }, тұр: { ru: 'стоя', en: 'standing' }, жатыр: { ru: 'лёжа', en: 'lying' }, тастады: { ru: 'уже сделал', en: 'finished it' } };

export function LegoSoz3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(legoReducer, undefined, initialLego);
  const [levelUp, setLevelUp] = useState(false), [talking, setTalking] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, blocks = round?.mode === 'blocks';
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = (m: LegoMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildLegoRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('chime');
      const id0 = setTimeout(() => { if (voice) { speakKazakh(st.say); setTalking(true); } }, blocks ? 650 : 100);
      const off = setTimeout(() => setTalking(false), 2400), id = setTimeout(() => dispatch({ type: 'next' }), blocks ? 2600 : 2500);
      return () => { clearTimeout(id); clearTimeout(id0); clearTimeout(off); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = legoAccuracy(state);
      if (finishSession({ game: 'lego', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __lego?: () => unknown }).__lego = () => ({ phase: state.phase, i: state.i, lives: state.lives, answer: st?.answer, options: st?.options, change: st?.split?.change, pose: st?.pose });
  }, [state, st]);
  const nounRu = useMemo(() => (st?.noun ? pick(st.noun, lang) : ''), [st, lang]);

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout + (blocks ? 'b' : 'p')} camera={(round && !blocks ? POSE_CAMERA : CAMERA)[layout]} designAspect={layout === 'wide' ? 1.6 : 0.62} uiShift={{ portrait: 0.14, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(330_100%_68%/0.18),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} talking={talking} layout={layout} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Word Lego' : 'Лего-Сөз'} lives={state.lives} maxLives={L_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {blocks ? (en ? 'Snap on the right ending block' : 'Пристыкуй нужное окончание') : (en ? 'What is the hero doing — and how?' : 'Что делает герой — и как?')}</p>
            {blocks
              ? <p className="mt-1 text-lg font-black">{st.noun!.e} {POSS_LABEL[st.key!]} + {st.noun!.kk} <span className="font-normal text-mist-dim">· {nounRu}</span></p>
              : <p className="mt-1 text-lg font-black">{st.verb!.e} {pick(st.verb!, lang)}{state.phase === 'hit' ? ' · ' + pick(POSE_RU[st.pose!], lang) : ' · ' + (en ? 'look at the pose' : 'смотри на позу')}</p>}
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {st.say}{blocks && st.split!.change !== 'none' && <span className="block text-sm font-normal text-gold">⚡ {pick(CHANGE_NOTE[st.split!.change as 'voiced' | 'dropped'], lang)}</span>}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{blocks ? (en ? 'Listen to the vowels of the word — soft or hard?' : 'Послушай гласные слова: мягкие или твёрдые?') : (en ? 'Look at the pose: sitting, standing, lying — or finished?' : 'Смотри на позу: сидит, стоит, лежит — или уже закончил?')}</p>}
          </div>
          <div className={'mx-auto mt-2 grid max-w-xl gap-2 ' + (blocks ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')} role="group" aria-label={en ? 'Choices' : 'Варианты'}>
            {st.options.map((o) => (
              <button key={state.i + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'min-h-12 rounded-2xl px-3 font-black ' + (blocks ? 'text-xl ' : 'text-base ') + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>{blocks ? '+' + o : o}</button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="mt-1 text-3xl font-black">Лего-Сөз</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Snap ending blocks onto a word and watch it change: кітап → кітабым, ауыз → аузым. Then animate the heroes: оқып отыр, оқып тұр, оқып жатыр.' : 'Пристыкуй к слову блок-окончание и смотри, как оно меняется: кітап → кітабым, ауыз → аузым. А потом оживи героев: оқып отыр, оқып тұр, оқып жатыр.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="blocks" onClick={() => start('blocks')}>🧱 {en ? 'Ending blocks' : 'Блоки-окончания'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="pose" onClick={() => start('pose')}>🎬 {en ? 'Animator: sits, stands, lies' : 'Аниматор: сидит, стоит, лежит'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="lego-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <h2 id="lego-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
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
