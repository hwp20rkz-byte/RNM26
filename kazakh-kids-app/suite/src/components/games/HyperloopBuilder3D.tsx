/**
 * «Сөйлем экспресі» — Hyperloop Builder.
 *
 * Pedagogy: Kazakh word order (SOV). Three sets: «кто — что — действие», «кто — когда — где — действие»
 * and commands (the imperative: teacher's «Кітабыңды аш!», doctor's polite «Аузыңызды ашыңыз!»).
 *
 * 3D loop: the words of a sentence float as glowing pods above a monorail with one dock per word.
 * Tap the pods in Kazakh order: each docks with a magnetic snap and the next dock lights up.
 * A wrong pod (or the non-imperative decoy) flashes red, shakes and costs a life, with the rule as a hint.
 * The last pod completes the train: the sentence is spoken and the train shoots off to the right.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import type { SentenceMode } from '../../data/sentenceCorpus';
import { MODE_RULE } from '../../data/sentenceCorpus';
import { buildHyperRound, hyperAccuracy, hyperReducer, initialHyper, missHint, HYPER_LIVES, type HyperState, type Pod as PodT } from '../../lib/hyperloopLogic';
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

/* ------------------------------------------------------------------ layout */

const RAIL_Y = 0.25, POD_Y = 0.62, RAIL_Z = 0.8;
const POD_COLORS = ['#00AFCA', '#B98CFF', '#3DD6F5', '#FF7A59', '#00E599', '#F5A623'];
type Layout = 'wide' | 'tall';
/** Dock spacing: tight on a portrait phone so five docks and the locomotive fit the 78° FOV. */
const gapOf = (l: Layout) => (l === 'tall' ? 1.62 : 2.0);
const dockAt = (i: number, n: number, l: Layout): Vec3 => [(i - (n - 1) / 2) * gapOf(l), POD_Y, RAIL_Z];
/** Floating spots of the pods: wide — one row up to 3 pods, two rows above that; tall — two per row, stacked up. */
function homeAt(i: number, m: number, l: Layout): Vec3 {
  if (l === 'tall') { const row = Math.floor(i / 2), inRow = Math.min(2, m - row * 2); return [((i % 2) - (inRow - 1) / 2) * 2.6, 2.6 + row * 1.9, -0.4]; }
  const top = m <= 3 ? m : Math.ceil(m / 2), row = i < top ? 0 : 1, inRow = row === 0 ? top : m - top, k = row === 0 ? i : i - top;
  return [(k - (inRow - 1) / 2) * 2.25 + (row === 1 ? 0.55 : 0), m <= 3 ? 3.0 : row === 0 ? 4.0 : 2.35, -0.6];
}
const labelHeight = (text: string, l: Layout) => Math.min(l === 'tall' ? 0.44 : 0.36, (l === 'tall' ? 2.0 : 1.7) / (0.58 * Math.max(4, text.length)));
/** Portrait phones hit the 78° FOV cap: the camera steps back and the pods stack in a column. */
function useLayout(): Layout {
  const get = (): Layout => (window.innerWidth / Math.max(1, window.innerHeight) >= 0.8 ? 'wide' : 'tall');
  const [l, set] = useState<Layout>(get);
  useEffect(() => { const on = () => set(get()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return l;
}
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = {
  wide: { position: [0, 3.5, 11.2], look: [0, 1.9, 0] },
  tall: { position: [0, 4.2, 14.8], look: [0, 3.3, 0] }
};

/* ------------------------------------------------------------------ one pod */

interface PodProps {
  pod: PodT; home: Vec3; dock: Vec3 | null; color: string; layout: Layout; labelLift: number; flash: 'miss' | 'dock' | null; flashSeq: number;
  departing: boolean; onPick(id: number): void; register(id: number, at: () => THREE.Vector3): void;
}

function Pod({ pod, home, dock, color, layout, labelLift, flash, flashSeq, departing, onPick, register }: PodProps) {
  const group = useRef<THREE.Group>(null), mat = useRef<THREE.MeshStandardMaterial>(null);
  const t0 = useRef(0), dep0 = useRef(0);
  const pos = useMemo(() => new THREE.Vector3(...home), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => register(pod.id, () => pos), [register, pod.id, pos]);
  useEffect(() => { t0.current = performance.now(); }, [flashSeq]);
  useEffect(() => { dep0.current = performance.now(); }, [departing]);

  useFrame(({ clock }, dt) => {
    const g = group.current; if (!g) return;
    const t = clock.elapsedTime, k = Math.min(1, dt * (dock ? 9 : 5));
    const target = dock ?? [home[0], home[1] + Math.sin(t * 1.4 + pod.id) * 0.12, home[2]];
    pos.x = THREE.MathUtils.lerp(pos.x, target[0], k); pos.y = THREE.MathUtils.lerp(pos.y, target[1], k); pos.z = THREE.MathUtils.lerp(pos.z, target[2], k);
    const since = (performance.now() - t0.current) / 1000;
    const shake = flash === 'miss' && since < 0.5 ? Math.sin(since * 70) * 0.12 * (1 - since / 0.5) : 0;
    const ride = departing && dock ? Math.max(0, (performance.now() - dep0.current) / 1000 - 0.55) : 0;
    g.position.set(pos.x + shake + ride * ride * 11, pos.y, pos.z);
    g.rotation.x = dock ? 0 : Math.sin(t * 0.9 + pod.id) * 0.12;
    if (mat.current) {
      const target = flash === 'miss' && since < 0.6 ? 2.6 : flash === 'dock' && since < 0.5 ? 3 : dock ? 1.2 : 0.45;
      mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, target, Math.min(1, dt * 10));
      mat.current.emissive.set(flash === 'miss' && since < 0.6 ? '#FF4D5E' : color);
    }
  });

  return (
    <group ref={group} position={home}>
      {/* generous invisible hit box: a ≥ 44 px touch target even when the pod is small on a phone */}
      <mesh position-y={0.3}
        onPointerDown={(e) => { e.stopPropagation(); onPick(pod.id); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <boxGeometry args={[1.9, 1.35, 0.9]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh rotation-z={Math.PI / 2} castShadow>
        <capsuleGeometry args={[0.34, 1.0, 6, 16]} />
        <meshStandardMaterial ref={mat} color={color} metalness={0.35} roughness={0.25} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      {/* window strip */}
      <mesh position={[0, 0.06, 0.3]}>
        <boxGeometry args={[1.1, 0.16, 0.06]} />
        <meshBasicMaterial color="#E9F7FF" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <Billboard position={[0, 0.78 + labelLift, 0]}>
        <CanvasLabel text={pod.text} height={labelHeight(pod.text, layout)} glow={color} background="rgba(11,15,25,0.66)" />
      </Billboard>
    </group>
  );
}

/* ------------------------------------------------------------------ rail, docks, locomotive */

function Rail({ n, filled, departing, layout }: { n: number; filled: number; departing: boolean; layout: Layout }) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    rings.current.forEach((r, i) => {
      if (!r) return;
      const m = r.material as THREE.MeshBasicMaterial;
      const next = i === filled && !departing;
      m.color.set(i < filled ? '#00E599' : next ? '#F5A623' : '#3A4A6B');
      r.scale.setScalar(next ? 1 + Math.sin(clock.elapsedTime * 5) * 0.08 : 1);
    });
  });
  return (
    <group>
      {[-0.32, 0.32].map((dz) => (
        <mesh key={dz} position={[0, RAIL_Y, RAIL_Z + dz]}>
          <boxGeometry args={[30, 0.08, 0.08]} />
          <meshStandardMaterial color="#00AFCA" emissive="#00AFCA" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, RAIL_Y - 0.12, RAIL_Z]} receiveShadow>
        <boxGeometry args={[30, 0.12, 0.9]} />
        <meshStandardMaterial color="#1A2238" roughness={0.7} />
      </mesh>
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={x} position={[x, RAIL_Y - 1.1, RAIL_Z]}>
          <cylinderGeometry args={[0.12, 0.2, 2, 6]} />
          <meshStandardMaterial color="#232B45" flatShading />
        </mesh>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} ref={(m) => { rings.current[i] = m; }} position={[dockAt(i, n, layout)[0], RAIL_Y + 0.02, RAIL_Z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.55, 0.68, 32]} />
          <meshBasicMaterial color="#3A4A6B" toneMapped={false} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Locomotive({ n, departing, layout }: { n: number; departing: boolean; layout: Layout }) {
  const g = useRef<THREE.Group>(null), dep0 = useRef(0);
  useEffect(() => { dep0.current = performance.now(); }, [departing]);
  const x0 = dockAt(n - 1, n, layout)[0] + (layout === 'tall' ? 1.25 : 1.4);
  useFrame(() => {
    if (!g.current) return;
    const ride = departing ? Math.max(0, (performance.now() - dep0.current) / 1000 - 0.55) : 0;
    g.current.position.x = x0 + ride * ride * 11;
  });
  return (
    <group ref={g} position={[x0, POD_Y, RAIL_Z]}>
      <mesh rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.42, 1.1, 16]} />
        <meshStandardMaterial color="#F5A623" emissive="#F5A623" emissiveIntensity={0.8} metalness={0.4} roughness={0.3} />
      </mesh>
      <pointLight intensity={departing ? 14 : 4} distance={6} color="#F5A623" />
    </group>
  );
}

/* ------------------------------------------------------------------ scene */

function HyperScene({ state, layout, onPick }: { state: HyperState; layout: Layout; onPick(id: number): void }) {
  const quality = useQuality();
  const particles = useParticles();
  const spots = useRef(new Map<number, () => THREE.Vector3>());
  const register = useMemo(() => (id: number, f: () => THREE.Vector3) => { spots.current.set(id, f); }, []);
  const { camera, size } = useThree();
  const round = state.round, ev = state.event;
  const st = round ? round.stages[state.stage] : null;

  // sparks on every dock, a shockwave when the train is complete
  useEffect(() => {
    if (!ev || ev.kind !== 'dock') return;
    const id = setTimeout(() => {
      const p = spots.current.get(ev.pod)?.();
      if (p) particles.burst({ at: [p.x, p.y, p.z], count: quality === 'low' ? 20 : 50, color: '#00E599', speed: 2.2, gravity: 0.8, life: 0.9, size: 0.05 });
      if (state.phase === 'departing') particles.shockwave({ at: [0, RAIL_Y, RAIL_Z], color: '#F5A623', radius: 5 });
    }, 160);
    return () => clearTimeout(id);
  }, [ev, particles, quality, state.phase]);

  // e2e probe (?e2e): screen position of every pod
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __hyperScreen?: () => unknown }).__hyperScreen = () => [...spots.current.entries()].map(([id, f]) => {
      const p = f().clone(); p.project(camera); return { id, x: (p.x + 1) / 2 * size.width, y: (1 - p.y) / 2 * size.height };
    });
  }, [camera, size]);

  if (!round || !st) return <><SkyDiorama quality={quality} /><DustMotes count={quality === 'low' ? 60 : 160} /></>;
  const n = st.sentence.words.length, m = st.pods.length, departing = state.phase === 'departing';
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 60 : quality === 'medium' ? 140 : 220} />
      <Rail n={n} filled={state.docked.length} departing={departing} layout={layout} />
      <Locomotive key={'loco' + state.stage} n={n} departing={departing} layout={layout} />
      {st.pods.map((p) => {
        const slot = state.docked.indexOf(p.id);
        const flash = ev && ev.pod === p.id ? ev.kind : null;
        return (
          <Pod key={state.stage + ':' + p.id} pod={p} home={homeAt(p.id, m, layout)} dock={slot >= 0 ? dockAt(slot, n, layout) : null} layout={layout}
            labelLift={layout === 'tall' && slot >= 0 && slot % 2 === 1 ? 0.55 : 0}
            color={POD_COLORS[p.id % POD_COLORS.length]} flash={flash} flashSeq={ev?.seq ?? 0} departing={departing}
            onPick={onPick} register={register} />
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ the game */

export interface HyperloopBuilder3DProps { lang: Lang; onExit(): void }

export function HyperloopBuilder3D({ lang, onExit }: HyperloopBuilder3DProps) {
  const [state, dispatch] = useReducer(hyperReducer, undefined, initialHyper);
  const [hint, setHint] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false);
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice);
  const finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en';
  const st = round ? round.stages[state.stage] : null;
  const layout = useLayout();

  const start = (mode: SentenceMode) => { finished.current = false; setLevelUp(false); setHint(null); dispatch({ type: 'start', round: buildHyperRound(mode) }); play('whoosh'); };

  const pickPod = (id: number) => {
    if (state.phase !== 'playing' || !st || state.docked.includes(id)) return;
    play('tap');
    dispatch({ type: 'pick', pod: id });
  };

  // sounds, voice and hints for each event; the departing train and the next sentence
  useEffect(() => {
    const ev = state.event; if (!ev || !round || !st) return;
    const pod = st.pods[ev.pod];
    if (ev.kind === 'dock') {
      play('snap', { pitch: 0.9 + state.docked.length * 0.08 });
      if (state.phase === 'departing') {
        play('chime'); setTimeout(() => play('whoosh'), 550);
        if (voice) setTimeout(() => speakKazakh(st.sentence.kk), 250);
        setHint({ text: '🚄 ' + st.sentence.kk + ' — ' + pick(st.sentence, lang), tone: 'ok' });
        const id = setTimeout(() => dispatch({ type: 'arrive' }), 2300);
        return () => clearTimeout(id);
      }
      if (voice) speakKazakh(pod.text);
      setHint(null);
      return;
    }
    play('buzz'); useFxStore.getState().shake(0.3);
    try { navigator.vibrate?.(50); } catch { /* no haptics */ }
    setHint({ text: missHint(round, st, pod, lang), tone: 'bad' });
    const id = setTimeout(() => dispatch({ type: 'settle' }), 750);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.event]);

  useEffect(() => { if (state.phase === 'playing' && state.docked.length === 0) setHint(null); }, [state.stage, state.phase, state.docked.length]);

  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true;
      const acc = hyperAccuracy(state);
      const up = finishSession({ game: 'hyperloop', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' });
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
      if (up) setLevelUp(true);
    }
  }, [state, finishSession, play]);

  // e2e hook (?e2e)
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __hyper?: () => unknown }).__hyper = () => ({ phase: state.phase, stage: state.stage, docked: state.docked, pods: st?.pods, words: st?.sentence.words, lives: state.lives });
  }, [state.phase, state.stage, state.docked, state.lives, st]);

  const title = en ? 'Sentence Express' : 'Сөйлем экспресі';
  const built = st ? state.docked.map((id) => st.pods[id].text).join(' ') : '';
  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={1.75} uiShift={{ portrait: 0.04, landscape: 0.05 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(189_100%_40%/0.2),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}>
          <HyperScene state={state} layout={layout} onPick={pickPod} />
        </ParticleEmitter>
      </StudioCanvas>

      {state.phase !== 'intro' && (
        <GameHUD title={title} lives={state.lives} maxLives={HYPER_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />
      )}

      {round && st && state.phase !== 'intro' && state.phase !== 'victory' && state.phase !== 'defeat' && (
        <section className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{en ? 'Build in Kazakh' : 'Собери по-казахски'} · {state.stage + 1} / {round.stages.length}</p>
            <p className="mt-1 text-lg font-black">{pick(st.sentence, lang)}</p>
            <p className="mt-1 min-h-6 text-base font-black text-turq-300">{built ? built + ' …' : ' '}</p>
            {hint && <p className={'mt-1 text-sm font-black ' + (hint.tone === 'ok' ? 'text-jade' : 'text-coral')}>{hint.text}</p>}
          </div>
          {/* screen-reader / keyboard mirror of the pods (visible on focus) */}
          <div className="pointer-events-auto mt-2 flex flex-wrap justify-center gap-1" role="group" aria-label={en ? 'Word pods' : 'Капсулы-слова'}>
            {st.pods.map((p) => (
              <button key={state.stage + ':' + p.id} data-pod={p.id} className="sr-only rounded-xl bg-obsidian-800 px-3 font-black focus:not-sr-only focus:min-h-12"
                disabled={state.docked.includes(p.id) || state.phase !== 'playing'} onClick={() => pickPod(p.id)}>{p.text}</button>
            ))}
          </div>
        </section>
      )}

      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="mt-1 text-3xl font-black">Сөйлем экспресі</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Words float as capsules over the monorail. Dock them in Kazakh order — the verb always goes last — and the express departs.' : 'Слова-капсулы парят над монорельсом. Поставь их в казахском порядке — глагол всегда в конце, — и экспресс отправится.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" onClick={() => start('basic')}>🚄 {en ? 'Who — what — action' : 'Кім? Не? Не істейді?'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" onClick={() => start('place')}>🗺️ {en ? 'When and where' : 'Қашан? Қайда? — когда и где'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" onClick={() => start('commands')}>📣 {en ? 'Commands: teacher and doctor' : 'Бұйрық — команды учителя и врача'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}

      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="hyper-sum">
          <div className="holo max-h-full w-full max-w-md overflow-y-auto animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <div aria-hidden className="text-3xl">{state.phase === 'victory' ? '🚄' : '🛤️'}</div>
            <h2 id="hyper-sum" className="mt-1 text-3xl font-black">{state.phase === 'victory' ? (state.mistakes === 0 ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'The express stopped' : 'Экспресс остановился')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <dl className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">XP</dt><dd className="text-xl font-black text-jade">+{state.xp}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{en ? 'clean' : 'без ошибок'}</dt><dd className="text-xl font-black">{state.cleanSentences}/{round.stages.length}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{en ? 'mistakes' : 'ошибки'}</dt><dd className="text-xl font-black text-gold">{state.mistakes}</dd></div>
            </dl>
            <p className="mt-4 text-sm text-mist-dim">{pick(MODE_RULE[round.mode], lang)}</p>
            <ul className="mt-3 grid gap-1 text-left text-sm">
              {round.stages.slice(0, state.phase === 'victory' ? round.stages.length : state.stage + 1).map((s, i) => (
                <li key={i} className="rounded-lg bg-obsidian-800/70 px-3 py-1"><b>{s.sentence.kk}</b> <span className="text-mist-dim">· {pick(s.sentence, lang)}</span></li>
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
