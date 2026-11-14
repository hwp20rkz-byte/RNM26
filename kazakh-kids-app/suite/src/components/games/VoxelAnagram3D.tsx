/**
 * «Әріп кубтары» — Voxel Anagram.
 *
 * Pedagogy: the nine Kazakh letters Ә І Ң Ғ Ү Ұ Қ Ө Һ. A picture and a translation give the word; letter cubes
 * float in low gravity. «Құрастыр»: dock the cubes in order — one cube is the Russian look-alike («к» for «қ»).
 * «Жетпейтін әріп»: the word stands on the pedestal with a gap; pick the right special letter out of four.
 * Special letters light up gold on the pedestal; the finished word is spoken.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { SPECIAL } from '../../data/letterCorpus';
import { anagramAccuracy, anagramReducer, buildAnagramRound, gapped, initialAnagram, missHint, ANAGRAM_LIVES, type AnagramMode, type AState, type Cube as CubeT } from '../../lib/anagramLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { DustMotes, ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
import { CanvasLabel } from '../3d/CanvasLabel';
import { GameHUD } from '../ui/GameHUD';
import { useAudioStore } from '../../store/useAudioStore';
import { useFxStore } from '../../store/useFxStore';
import { useGameStore } from '../../store/useGameStore';
import { pick } from '../../lib/i18n';
import { speakKazakh } from '../../lib/kazakhVoice';

type Layout = 'wide' | 'tall';
function useLayout(): Layout {
  const get = (): Layout => (window.innerWidth / Math.max(1, window.innerHeight) >= 0.8 ? 'wide' : 'tall');
  const [l, set] = useState<Layout>(get);
  useEffect(() => { const on = () => set(get()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return l;
}
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = {
  wide: { position: [0, 3.4, 10.5], look: [0, 1.9, 0] },
  tall: { position: [0, 3.7, 12.4], look: [0, 2.9, 0] }
};
const PAD_Y = 0.55, PAD_Z = 0.9, GOLD = '#F5A623', TURQ = '#00AFCA';
const isSpecial = (c: string) => (SPECIAL as readonly string[]).includes(c);
const padAt = (i: number, n: number, l: Layout): Vec3 => [(i - (n - 1) / 2) * (l === 'tall' ? 1.0 : 1.2), PAD_Y, PAD_Z];
function homeAt(i: number, m: number, l: Layout): Vec3 {
  const per = l === 'tall' ? 3 : Math.min(5, Math.ceil(m / (m > 5 ? 2 : 1))), row = Math.floor(i / per), inRow = Math.min(per, m - row * per), k = i % per;
  return l === 'tall' ? [(k - (inRow - 1) / 2) * 1.5, 2.5 + row * 1.45, -0.3] : [(k - (inRow - 1) / 2) * 1.55 + (row % 2) * 0.4, 3.6 - row * 1.25, -0.5];
}

/* ------------------------------------------------------------------ one cube */

interface CubeProps {
  cube: CubeT; home: Vec3; pad: Vec3 | null; flash: 'dock' | 'miss' | null; flashSeq: number; fixed?: boolean; scale?: number;
  onPick(id: number): void; register(id: number, at: () => THREE.Vector3): void;
}
function LetterCube({ cube, home, pad, flash, flashSeq, fixed, scale = 1, onPick, register }: CubeProps) {
  const g = useRef<THREE.Group>(null), body = useRef<THREE.Mesh>(null), mat = useRef<THREE.MeshStandardMaterial>(null), t0 = useRef(0);
  const pos = useMemo(() => new THREE.Vector3(...(fixed && pad ? pad : home)), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => register(cube.id, () => pos), [register, cube.id, pos]);
  useEffect(() => { t0.current = performance.now(); }, [flashSeq]);
  const glow = pad && isSpecial(cube.text) ? GOLD : TURQ;
  useFrame(({ clock }, dt) => {
    const o = g.current; if (!o) return;
    const t = clock.elapsedTime, k = Math.min(1, dt * (pad ? 9 : 4));
    const target = pad ?? [home[0] + Math.sin(t * 0.7 + cube.id) * 0.08, home[1] + Math.sin(t * 1.1 + cube.id * 1.7) * 0.14, home[2]];
    pos.x = THREE.MathUtils.lerp(pos.x, target[0], k); pos.y = THREE.MathUtils.lerp(pos.y, target[1], k); pos.z = THREE.MathUtils.lerp(pos.z, target[2], k);
    const since = (performance.now() - t0.current) / 1000, shake = flash === 'miss' && since < 0.5 ? Math.sin(since * 70) * 0.12 * (1 - since / 0.5) : 0;
    o.position.set(pos.x + shake, pos.y, pos.z);
    if (body.current) { body.current.rotation.y = pad ? THREE.MathUtils.lerp(body.current.rotation.y, 0, k) : Math.sin(t * 0.5 + cube.id) * 0.5; body.current.rotation.x = pad ? 0 : Math.sin(t * 0.4 + cube.id) * 0.25; }
    if (mat.current) {
      const hot = flash === 'miss' && since < 0.6 ? 2.6 : flash === 'dock' && since < 0.5 ? 3 : pad ? 1.3 : 0.35;
      mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, hot, Math.min(1, dt * 10));
      mat.current.emissive.set(flash === 'miss' && since < 0.6 ? '#FF4D5E' : glow);
    }
  });
  return (
    <group ref={g} position={home} scale={scale}>
      <mesh visible={!fixed} onPointerDown={(e) => { if (fixed) return; e.stopPropagation(); onPick(cube.id); }}
        onPointerOver={() => { if (!fixed) document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <boxGeometry args={[1.25, 1.25, 1.25]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={body} castShadow>
        <boxGeometry args={[0.82, 0.82, 0.82]} />
        <meshStandardMaterial ref={mat} color="#1B2440" metalness={0.3} roughness={0.35} emissive={glow} emissiveIntensity={0.35} />
      </mesh>
      <Billboard position={[0, 0, 0.5]}>
        {/* lower case on purpose: ү / у and ұ / у differ clearly only in lower case */}
        <CanvasLabel text={cube.text} height={0.56} glow={glow} />
      </Billboard>
    </group>
  );
}

function Pedestal({ n, filled, gap, layout }: { n: number; filled: number; gap: number | null; layout: Layout }) {
  const pads = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => pads.current.forEach((p, i) => {
    if (!p) return; const next = gap === null ? i === filled : i === gap && filled === 0;
    (p.material as THREE.MeshBasicMaterial).color.set(next ? GOLD : i < filled || (gap !== null && i !== gap) ? '#00E599' : '#3A4A6B');
    p.scale.setScalar(next ? 1 + Math.sin(clock.elapsedTime * 5) * 0.08 : 1);
  }));
  const w = n * (layout === 'tall' ? 1.0 : 1.2) + 0.6;
  return (
    <group>
      <mesh position={[0, PAD_Y - 0.62, PAD_Z]} receiveShadow>
        <boxGeometry args={[w, 0.22, 1.3]} />
        <meshStandardMaterial color="#1A2238" roughness={0.6} />
      </mesh>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} ref={(m) => { pads.current[i] = m; }} position={[padAt(i, n, layout)[0], PAD_Y - 0.5, PAD_Z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.36, 0.46, 32]} />
          <meshBasicMaterial color="#3A4A6B" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ state, layout, onPick }: { state: AState; layout: Layout; onPick(id: number): void }) {
  const quality = useQuality(), particles = useParticles();
  const spots = useRef(new Map<number, () => THREE.Vector3>());
  const register = useMemo(() => (id: number, f: () => THREE.Vector3) => { spots.current.set(id, f); }, []);
  const { camera, size } = useThree();
  const st = state.round ? state.round.stages[state.stage] : null, ev = state.event;
  useEffect(() => {
    if (!ev || ev.kind !== 'dock') return;
    const id = setTimeout(() => {
      const p = spots.current.get(ev.cube)?.();
      if (p) particles.burst({ at: [p.x, p.y, p.z], count: quality === 'low' ? 18 : 45, color: GOLD, speed: 2, gravity: 0.6, life: 0.9, size: 0.05 });
      if (state.phase === 'done') particles.shockwave({ at: [0, PAD_Y - 0.5, PAD_Z], color: GOLD, radius: 4.5 });
    }, 150);
    return () => clearTimeout(id);
  }, [ev, particles, quality, state.phase]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __cubeScreen?: () => unknown }).__cubeScreen = () => [...spots.current.entries()].filter(([id]) => id >= 0).map(([id, f]) => {
      const p = f().clone(); p.project(camera); return { id, x: (p.x + 1) / 2 * size.width, y: (1 - p.y) / 2 * size.height };
    });
  }, [camera, size]);
  if (!st) return <><SkyDiorama quality={quality} /><DustMotes count={quality === 'low' ? 60 : 160} /></>;
  const missing = state.round!.mode === 'missing', letters = [...st.word.kk], n = letters.length;
  const slotOf = (i: number) => (missing ? st.gap : i);
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 60 : quality === 'medium' ? 140 : 220} />
      <Pedestal n={n} filled={state.docked.length} gap={missing ? st.gap : null} layout={layout} />
      {missing && letters.map((c, i) => i === st.gap ? null : (
        <LetterCube key={state.stage + ':f' + i} cube={{ id: -1 - i, text: c, decoy: false }} home={padAt(i, n, layout)} pad={padAt(i, n, layout)} fixed scale={layout === 'tall' ? 1.15 : 1} flash={null} flashSeq={0} onPick={onPick} register={() => undefined} />
      ))}
      {st.cubes.map((c) => {
        const d = state.docked.indexOf(c.id);
        return <LetterCube key={state.stage + ':' + c.id} cube={c} home={homeAt(c.id, st.cubes.length, layout)} pad={d >= 0 ? padAt(slotOf(d), n, layout) : null}
          flash={ev && ev.cube === c.id ? ev.kind : null} flashSeq={ev?.seq ?? 0} scale={layout === 'tall' ? 1.15 : 1} onPick={onPick} register={register} />;
      })}
    </>
  );
}

/* ------------------------------------------------------------------ the game */

export function VoxelAnagram3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(anagramReducer, undefined, initialAnagram);
  const [hint, setHint] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round ? round.stages[state.stage] : null;

  const start = (mode: AnagramMode) => { finished.current = false; setLevelUp(false); setHint(null); dispatch({ type: 'start', round: buildAnagramRound(mode) }); play('whoosh'); };
  const pickCube = (id: number) => { if (state.phase !== 'playing' || !st || state.docked.includes(id)) return; play('tap'); dispatch({ type: 'pick', cube: id }); };

  useEffect(() => {
    const ev = state.event; if (!ev || !round || !st) return;
    const cube = st.cubes.find((c) => c.id === ev.cube)!;
    if (ev.kind === 'dock') {
      play('snap', { pitch: 0.9 + state.docked.length * 0.07 });
      if (state.phase === 'done') {
        play('chime'); if (voice) setTimeout(() => speakKazakh(st.word.kk), 200);
        setHint({ text: st.word.e + ' ' + st.word.kk + ' — ' + pick(st.word, lang), tone: 'ok' });
        const id = setTimeout(() => dispatch({ type: 'next' }), 1900);
        return () => clearTimeout(id);
      }
      setHint(null); return;
    }
    play('buzz'); useFxStore.getState().shake(0.3);
    try { navigator.vibrate?.(50); } catch { /* no haptics */ }
    setHint({ text: missHint(st, cube, lang), tone: 'bad' });
    const id = setTimeout(() => dispatch({ type: 'settle' }), 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.event]);
  useEffect(() => { if (state.phase === 'playing' && state.docked.length === 0) setHint(null); }, [state.stage, state.phase, state.docked.length]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true;
      const acc = anagramAccuracy(state);
      if (finishSession({ game: 'anagram', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __cubes?: () => unknown }).__cubes = () => ({ phase: state.phase, stage: state.stage, docked: state.docked, cubes: st?.cubes, target: st?.target, lives: state.lives, mode: round?.mode });
  }, [state.phase, state.stage, state.docked, state.lives, st, round]);

  const missing = round?.mode === 'missing';
  const built = st ? (missing ? (state.docked.length ? st.word.kk : gapped(st)) : state.docked.map((id) => st.cubes.find((c) => c.id === id)!.text).join('')) : '';
  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={1.6} uiShift={{ portrait: 0.04, landscape: 0.05 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(37_91%_55%/0.2),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} layout={layout} onPick={pickCube} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Letter Cubes' : 'Әріп кубтары'} lives={state.lives} maxLives={ANAGRAM_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      {round && st && ['playing', 'resolving', 'done'].includes(state.phase) && (
        <section className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto flex max-w-xl items-center gap-3 rounded-[var(--radius-card)] px-4 py-3">
            <span aria-hidden className="text-5xl leading-none">{st.word.e}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-mist-dim">{missing ? (en ? 'Which letter is missing?' : 'Какой буквы не хватает?') : (en ? 'Build the word' : 'Собери слово')} · {state.stage + 1} / {round.stages.length}</p>
              <p className="text-lg font-black">{pick(st.word, lang)}</p>
              <p className="min-h-6 text-xl font-black tracking-[0.2em] text-turq-300">{built || ' '}</p>
              {hint && <p className={'text-sm font-black ' + (hint.tone === 'ok' ? 'text-jade' : 'text-coral')}>{hint.text}</p>}
            </div>
          </div>
          <div className="pointer-events-auto mt-2 flex flex-wrap justify-center gap-1" role="group" aria-label={en ? 'Letter cubes' : 'Кубики-буквы'}>
            {st.cubes.map((c) => (
              <button key={state.stage + ':' + c.id} data-cube={c.id} className="sr-only rounded-xl bg-obsidian-800 px-3 font-black focus:not-sr-only focus:min-h-12"
                disabled={state.docked.includes(c.id) || state.phase !== 'playing'} onClick={() => pickCube(c.id)}>{c.text}</button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="mt-1 text-3xl font-black">Әріп кубтары</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Letter cubes float over the steppe. Build the word — and don\'t fall for the Russian look-alike letter!' : 'Кубики-буквы парят над степью. Собери слово — и не попадись на русскую букву-двойника!'}</p>
            <p className="mt-2 text-2xl font-black tracking-widest text-gold">Ә І Ң Ғ Ү Ұ Қ Ө Һ</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" onClick={() => start('build')}>🧊 {en ? 'Build the word' : 'Құрастыр — собери слово'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" onClick={() => start('missing')}>❓ {en ? 'The missing letter' : 'Жетпейтін әріп — пропущенная буква'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="cube-sum">
          <div className="holo max-h-full w-full max-w-md overflow-y-auto animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <div aria-hidden className="text-3xl">{state.phase === 'victory' ? '🧊' : '💫'}</div>
            <h2 id="cube-sum" className="mt-1 text-3xl font-black">{state.phase === 'victory' ? (state.mistakes === 0 ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'The cubes fell' : 'Кубики упали')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <dl className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">XP</dt><dd className="text-xl font-black text-jade">+{state.xp}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{en ? 'clean' : 'без ошибок'}</dt><dd className="text-xl font-black">{state.cleanWords}/{round.stages.length}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{en ? 'mistakes' : 'ошибки'}</dt><dd className="text-xl font-black text-gold">{state.mistakes}</dd></div>
            </dl>
            <ul className="mt-4 grid gap-1 text-left text-sm">
              {round.stages.slice(0, state.phase === 'victory' ? round.stages.length : state.stage + 1).map((s, i) => (
                <li key={i} className="rounded-lg bg-obsidian-800/70 px-3 py-1">{s.word.e} <b>{s.word.kk}</b> <span className="text-mist-dim">· {pick(s.word, lang)} · {s.special}</span></li>
              ))}
            </ul>
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
