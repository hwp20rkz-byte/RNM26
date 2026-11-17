/**
 * «Ұшқыр монолиттер» — Floating Monoliths.
 *
 * Pedagogy: vocabulary pairs (KZ ↔ RU/EN, lesson words of modules 2 and 4) and antonyms
 * (әдепті ↔ әдепсіз, жарық ↔ қараңғы …), plus a memory mode with hidden faces.
 *
 * 3D loop: an archipelago of 12 floating islands, each carrying a quartz monolith with its word.
 * Tap one — it levitates and glows; tap its partner — a golden laser bridge links them and both dissolve
 * into stardust (+100 XP, combo bonus). A wrong partner flashes red, shakes and drops back.
 * The centre beacon grows brighter with every pair found.
 * Layout adapts: a ring on landscape screens, a 3 × 4 grid on phones in portrait.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { buildRound, initialMono, monoReducer, MONO_LIVES, accuracy, tileColor, type MonolithMode, type MonoState, type Tile } from '../../lib/monolithLogic';
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

type Layout = 'ring' | 'grid';
function useLayout(): Layout {
  const get = (): Layout => (window.innerWidth / Math.max(1, window.innerHeight) >= 1 ? 'ring' : 'grid');
  const [l, set] = useState<Layout>(get);
  useEffect(() => { const on = () => set(get()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return l;
}
function slots(layout: Layout): Vec3[] {
  if (layout === 'ring') return Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; return [Math.sin(a) * 5.1, 0.25 + (i % 3) * 0.18, Math.cos(a) * 3.9] as Vec3; });
  return Array.from({ length: 12 }, (_, i) => [((i % 3) - 1) * 2.1, 0.2 + (i % 2) * 0.2, (Math.floor(i / 3) - 1.5) * 2.15] as Vec3);
}
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = {
  ring: { position: [0, 7.2, 11.8], look: [0, 0.4, 0] },
  grid: { position: [0, 11.5, 8.6], look: [0, 0, 0.2] }
};
/** Word height that keeps the label within the island spacing. */
const labelHeight = (text: string) => Math.min(0.34, 1.75 / (0.58 * Math.max(4, text.length)));

/* ------------------------------------------------------------------ one monolith */

interface MonolithProps {
  tile: Tile; at: Vec3; color: string; hidden: boolean;
  selected: boolean; gone: boolean; state: 'idle' | 'match' | 'miss';
  onPick(id: number): void; register(id: number, top: () => THREE.Vector3): void;
}

function Monolith({ tile, at, color, hidden, selected, gone, state, onPick, register }: MonolithProps) {
  const quality = useQuality();
  const group = useRef<THREE.Group>(null), crystal = useRef<THREE.Mesh>(null), mat = useRef<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>(null);
  const t0 = useRef(0), dissolve = useRef(1);
  const top = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => register(tile.id, () => top), [register, tile.id, top]);
  useEffect(() => { t0.current = performance.now(); }, [state]);

  useFrame(({ clock }, dt) => {
    const g = group.current; if (!g) return;
    const t = clock.elapsedTime, k = Math.min(1, dt * 8);
    const lift = selected || state !== 'idle' ? 0.85 : 0;
    // local coordinates: the outer group already sits on the island at `at`
    g.position.y = THREE.MathUtils.lerp(g.position.y, lift + Math.sin(t * 1.3 + tile.id) * 0.08, k);
    // miss → shake; gone → dissolve into stardust
    const since = (performance.now() - t0.current) / 1000;
    g.position.x = (state === 'miss' && since < 0.45 ? Math.sin(since * 70) * 0.09 * (1 - since / 0.45) : 0);
    dissolve.current = THREE.MathUtils.lerp(dissolve.current, gone ? 0 : 1, Math.min(1, dt * (gone ? 4 : 10)));
    g.scale.setScalar(Math.max(0.0001, dissolve.current));
    g.visible = dissolve.current > 0.01;
    if (crystal.current) crystal.current.rotation.y = t * (selected ? 1.6 : 0.25) + tile.id;
    if (mat.current) {
      const target = state === 'miss' ? 2.4 : state === 'match' ? 3.4 : selected ? 1.8 : 0.35;
      mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, target, k);
      mat.current.emissive.set(state === 'miss' ? '#FF4D5E' : color);
    }
    top.set(at[0] + g.position.x, at[1] + g.position.y + 1.05, at[2]);
  });

  const label = hidden ? '?' : tile.text;
  return (
    <group position={[at[0], at[1], at[2]]}>
      {/* the island */}
      <group position-y={-0.15}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[0.85, 0.95, 0.3, 7]} />
          <meshStandardMaterial color="#232B45" roughness={0.8} flatShading />
        </mesh>
        <mesh position-y={-0.55} rotation-x={Math.PI}>
          <coneGeometry args={[0.9, 0.9, 7]} />
          <meshStandardMaterial color="#141A2E" roughness={1} flatShading />
        </mesh>
        <mesh position-y={0.16} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.72, 0.78, 32]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.8} />
        </mesh>
      </group>
      {/* the floating monolith */}
      <group ref={group}>
        <mesh ref={crystal} position-y={0.55} castShadow
          onPointerDown={(e) => { e.stopPropagation(); onPick(tile.id); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
          <cylinderGeometry args={[0.32, 0.42, 1.25, 6]} />
          {quality === 'high'
            ? <meshPhysicalMaterial ref={mat as React.Ref<THREE.MeshPhysicalMaterial>} color={color} transmission={0.9} roughness={0.15} thickness={0.8} ior={1.5} iridescence={0.6} emissive={color} emissiveIntensity={0.35} />
            : <meshStandardMaterial ref={mat as React.Ref<THREE.MeshStandardMaterial>} color={color} metalness={0.2} roughness={0.25} transparent opacity={0.88} emissive={color} emissiveIntensity={0.35} />}
        </mesh>
        <Billboard position={[0, 1.55, 0]}>
          <CanvasLabel text={label} height={hidden ? 0.4 : labelHeight(label)} glow={color} background="rgba(11,15,25,0.62)" />
        </Billboard>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ bridge + beacon */

function Bridge({ from, to, color, seq }: { from: () => THREE.Vector3; to: () => THREE.Vector3; color: string; seq: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const t0 = useMemo(() => performance.now(), [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), q: new THREE.Quaternion() }), []);
  useFrame(() => {
    const m = mesh.current; if (!m) return;
    const k = Math.min(1, (performance.now() - t0) / 350), fade = 1 - Math.max(0, (performance.now() - t0 - 650) / 450);
    const a = from(), b = to();
    tmp.dir.subVectors(b, a); const len = tmp.dir.length() * k; tmp.dir.normalize();
    m.position.copy(a).addScaledVector(tmp.dir, len / 2);
    m.quaternion.copy(tmp.q.setFromUnitVectors(tmp.up, tmp.dir));
    m.scale.set(1 + Math.sin(performance.now() / 40) * 0.25, Math.max(0.001, len), 1 + Math.sin(performance.now() / 40) * 0.25);
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fade);
  });
  return (
    <mesh ref={mesh}>
      <cylinderGeometry args={[0.06, 0.06, 1, 10, 1, true]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function Beacon({ progress }: { progress: number }) {
  const orb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const o = orb.current; if (!o) return;
    const s = 0.35 + progress * 0.45 + Math.sin(clock.elapsedTime * 2) * 0.03;
    o.scale.setScalar(s);
    (o.material as THREE.MeshStandardMaterial).emissiveIntensity = 1 + progress * 5;
  });
  return (
    <group position={[0, 0.6, 0]}>
      <mesh ref={orb}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#3A2A00" emissive="#F5A623" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      <pointLight intensity={6 + progress * 18} distance={12} color="#F5A623" />
    </group>
  );
}

/* ------------------------------------------------------------------ scene */

interface SceneProps { state: MonoState; layout: Layout; onPick(id: number): void }

function MonolithScene({ state, layout, onPick }: SceneProps) {
  const quality = useQuality();
  const particles = useParticles();
  const tops = useRef(new Map<number, () => THREE.Vector3>());
  const register = useMemo(() => (id: number, f: () => THREE.Vector3) => { tops.current.set(id, f); }, []);
  const at = slots(layout);
  const round = state.round, ev = state.event;
  const { camera, size } = useThree();

  // stardust + shockwave when a pair dissolves
  useEffect(() => {
    if (!ev || ev.kind !== 'match') return;
    const id = setTimeout(() => {
      [ev.a, ev.b].forEach((t) => { const p = tops.current.get(t)?.(); if (p) particles.burst({ at: [p.x, p.y - 0.5, p.z], count: quality === 'low' ? 30 : 80, color: '#F5A623', speed: 2.6, gravity: 1.2, life: 1.6, size: 0.06 }); });
      particles.shockwave({ at: [0, 0.25, 0], color: '#F5A623', radius: 4 });
    }, 600);
    return () => clearTimeout(id);
  }, [ev, particles, quality]);

  // e2e probe (?e2e): screen position of every monolith
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __monoScreen?: () => unknown }).__monoScreen = () => [...tops.current.entries()].map(([id, f]) => {
      const p = f().clone(); p.y -= 0.5; p.project(camera); return { id, x: (p.x + 1) / 2 * size.width, y: (1 - p.y) / 2 * size.height };
    });
  }, [camera, size]);

  if (!round) return <><SkyDiorama quality={quality} /><DustMotes count={quality === 'low' ? 60 : 160} /></>;
  const memory = round.mode === 'memory';
  const showing = (id: number) => !memory || state.selected === id || (ev !== null && state.phase === 'resolving' && (ev.a === id || ev.b === id));
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 60 : quality === 'medium' ? 140 : 240} />
      <Beacon progress={state.matched.length / round.tiles.length} />
      {round.tiles.map((t) => {
        const resolving = state.phase === 'resolving' && ev && (ev.a === t.id || ev.b === t.id);
        const matchedNow = state.matched.includes(t.id);
        return (
          <Monolith key={t.id} tile={t} at={at[t.id]} color={tileColor(t)} hidden={!showing(t.id)}
            selected={state.selected === t.id} gone={matchedNow && !(resolving && ev!.kind === 'match')}
            state={resolving ? ev!.kind : 'idle'} onPick={onPick} register={register} />
        );
      })}
      {ev && ev.kind === 'match' && state.phase === 'resolving' && tops.current.get(ev.a) && tops.current.get(ev.b) &&
        <Bridge key={ev.seq} seq={ev.seq} from={tops.current.get(ev.a)!} to={tops.current.get(ev.b)!} color="#F5A623" />}
    </>
  );
}

/* ------------------------------------------------------------------ the game */

export interface FloatingMonoliths3DProps { lang: Lang; onExit(): void }

export function FloatingMonoliths3D({ lang, onExit }: FloatingMonoliths3DProps) {
  const [state, dispatch] = useReducer(monoReducer, undefined, initialMono);
  const [hint, setHint] = useState<{ text: string; tone: 'ok' | 'bad' } | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const layout = useLayout();
  const finished = useRef(false);
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice);
  const finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en';

  const start = (mode: MonolithMode) => { finished.current = false; setLevelUp(false); setHint(null); dispatch({ type: 'start', round: buildRound(mode, lang) }); play('whoosh'); };

  const pickTile = (id: number) => {
    if (state.phase !== 'playing' || !round) return;
    const t = round.tiles[id];
    if (state.matched.includes(id)) return;
    play('tap', { pitch: state.selected === null ? 1 : 1.25 });
    if (t.kk && voice) speakKazakh(t.text);
    dispatch({ type: 'select', id });
  };

  // resolve animations, sounds and hints for each event
  useEffect(() => {
    const ev = state.event; if (!ev || !round) return;
    const a = round.tiles[ev.a], p = round.pairs[a.pair];
    if (ev.kind === 'match') {
      play('snap'); play('beam', { gain: 0.6 }); setTimeout(() => play('chime'), 350); setTimeout(() => play('shockwave', { gain: 0.4 }), 650);
      if (voice) setTimeout(() => speakKazakh(round.mode === 'antonyms' ? p.a + ' ' + p.b : p.a), 300);
      setHint({ text: '✨ ' + p.a + ' ↔ ' + p.b + (p.note ? ' · ' + pick(p.note, lang) : ''), tone: 'ok' });
      const id = setTimeout(() => dispatch({ type: 'settle' }), 1150);
      return () => clearTimeout(id);
    }
    play('buzz'); useFxStore.getState().shake(0.35);
    try { navigator.vibrate?.(50); } catch { /* no haptics */ }
    const partner = round.tiles.find((t) => t.pair === a.pair && t.id !== a.id)!;
    setHint({ text: (round.mode === 'memory' ? (en ? 'Not a pair. Remember where they are!' : 'Не пара. Запомни, где они!') : a.text + ' ↔ ' + partner.text), tone: 'bad' });
    const id = setTimeout(() => dispatch({ type: 'settle' }), 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.event]);

  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true;
      const acc = accuracy(state);
      const up = finishSession({ game: 'monoliths', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' });
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
      if (up) setLevelUp(true);
    }
  }, [state, finishSession, play]);

  // e2e hook (?e2e): tiles with their pair ids
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __mono?: () => unknown }).__mono = () => ({ tiles: round?.tiles, phase: state.phase, matched: state.matched });
  }, [round, state.phase, state.matched]);

  const title = en ? 'Floating Monoliths' : 'Ұшқыр монолиттер';
  const memory = round?.mode === 'memory';
  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'ring' ? 1.5 : 0.75} uiShift={{ portrait: 0.03, landscape: 0.05 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(37_91%_55%/0.2),transparent_60%)]" />}>
        <ParticleEmitter capacity={500}>
          <MonolithScene state={state} layout={layout} onPick={pickTile} />
        </ParticleEmitter>
      </StudioCanvas>

      {state.phase !== 'intro' && (
        <GameHUD title={title} lives={memory ? MONO_LIVES : state.lives} maxLives={MONO_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />
      )}

      {round && state.phase !== 'intro' && (
        <section className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">
              {round.mode === 'antonyms' ? (en ? 'Find the opposites' : 'Найди противоположности') : round.mode === 'translate' ? (en ? 'Match the word with its translation' : 'Соедини слово и перевод') : (en ? 'Memory: find the hidden pairs' : 'Память: найди скрытые пары')}
              {' · '}{state.matched.length / 2} / {round.pairs.length}{memory ? ' · ' + (en ? 'moves ' : 'ходы ') + state.moves : ''}
            </p>
            {hint && <p className={'mt-1 text-base font-black ' + (hint.tone === 'ok' ? 'text-jade' : 'text-coral')}>{hint.text}</p>}
          </div>
          {/* screen-reader / keyboard mirror of the monoliths (visible on focus) */}
          <div className="pointer-events-auto mt-2 flex flex-wrap justify-center gap-1" role="group" aria-label={en ? 'Monoliths' : 'Монолиты'}>
            {round.tiles.map((t) => (
              <button key={t.id} data-mono={t.id} className="sr-only rounded-xl bg-obsidian-800 px-3 font-black focus:not-sr-only focus:min-h-12" disabled={state.matched.includes(t.id) || state.phase !== 'playing'}
                aria-pressed={state.selected === t.id} onClick={() => pickTile(t.id)}>
                {memory && state.selected !== t.id ? (en ? 'Monolith ' : 'Монолит ') + (t.id + 1) : t.text}
              </button>
            ))}
          </div>
        </section>
      )}

      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="mt-1 text-3xl font-black">Ұшқыр монолиттер</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Twelve quartz monoliths over the steppe. Raise two that belong together — a golden bridge will join them.' : 'Двенадцать кварцевых монолитов над степью. Подними два, которые составляют пару, — их соединит золотой мост.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" onClick={() => start('antonyms')}>⚖️ {en ? 'Opposites (антоним)' : 'Антонимдер — противоположности'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" onClick={() => start('translate')}>🔤 {en ? 'Word ↔ translation' : 'Аударма — слово и перевод'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" onClick={() => start('memory')}>🧠 {en ? 'Memory: hidden words' : 'Жад — скрытые слова'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}

      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="mono-sum">
          <div className="holo w-full max-w-md animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <div aria-hidden className="text-3xl">{state.phase === 'victory' ? '🌟' : '💫'}</div>
            <h2 id="mono-sum" className="mt-1 text-3xl font-black">{state.phase === 'victory' ? (state.mistakes === 0 ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'The bridges faded' : 'Мосты погасли')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <dl className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">XP</dt><dd className="text-xl font-black text-jade">+{state.xp}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{en ? 'pairs' : 'пары'}</dt><dd className="text-xl font-black">{state.matched.length / 2}/{round.pairs.length}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{memory ? (en ? 'moves' : 'ходы') : (en ? 'mistakes' : 'ошибки')}</dt><dd className="text-xl font-black text-gold">{memory ? state.moves : state.mistakes}</dd></div>
            </dl>
            <ul className="mt-4 grid gap-1 text-left text-sm">
              {round.pairs.map((p, i) => <li key={i} className="rounded-lg bg-obsidian-800/70 px-3 py-1"><b>{p.a}</b> ↔ <b>{p.b}</b> <span className="text-mist-dim">· {pick(p, lang)}</span></li>)}
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
