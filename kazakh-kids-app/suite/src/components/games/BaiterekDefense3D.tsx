/**
 * «Бәйтерек қорғаны» — Baiterek Defense.
 *
 * Pedagogy: quick recall of Kazakh words — from a picture (grades 1–2) or from the Russian / English word (grades 3–4).
 * One meteor at a time falls towards the golden sphere of Baiterek; tap its Kazakh name among three: a beam destroys
 * it (+XP, combo, speed bonus) and the word is spoken. A wrong word greys out and only breaks the combo; a meteor that
 * reaches the tower dims the shield dome (3 shields). The fall time shrinks gently but never below a floor.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { buildDefenseRound, defenseAccuracy, defenseReducer, face, fallTime, initialDefense, SHIELDS, type DefenseMode, type DState } from '../../lib/baiterekLogic';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 4.6, 14], look: [0, 4.6, 0] }, tall: { position: [0, 5.4, 17.5], look: [0, 6.2, 0] } };
const SPHERE: Vec3 = [0, 5.4, 0], GOLD = '#F5A623';
const laneX = (lane: number, l: Layout) => (lane - 1) * (l === 'tall' ? 3 : 5.5);

function Baiterek({ shields, hitSeq }: { shields: number; hitSeq: number }) {
  const sphere = useRef<THREE.MeshStandardMaterial>(null), dome = useRef<THREE.MeshBasicMaterial>(null), t0 = useRef(0);
  useEffect(() => { t0.current = performance.now(); }, [hitSeq]);
  useFrame(({ clock }) => {
    const since = (performance.now() - t0.current) / 1000;
    if (sphere.current) sphere.current.emissiveIntensity = 1.2 + Math.sin(clock.elapsedTime * 2) * 0.2 + (since < 0.4 ? 3 * (1 - since / 0.4) : 0);
    if (dome.current) dome.current.opacity = 0.05 + 0.07 * shields + Math.sin(clock.elapsedTime * 3) * 0.02;
  });
  return (
    <group>
      <mesh position={[0, 2.2, 0]} castShadow><cylinderGeometry args={[0.14, 0.32, 4.4, 10]} /><meshStandardMaterial color="#E9EEF6" metalness={0.5} roughness={0.3} /></mesh>
      {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return (
        <mesh key={i} position={[Math.sin(a) * 0.55, 5.0, Math.cos(a) * 0.55]} rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}>
          <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} /><meshStandardMaterial color="#E9EEF6" metalness={0.6} roughness={0.3} />
        </mesh>); })}
      <mesh position={SPHERE}><sphereGeometry args={[0.62, 32, 24]} /><meshStandardMaterial ref={sphere} color="#7A4B00" emissive={GOLD} emissiveIntensity={1.2} metalness={0.8} roughness={0.2} toneMapped={false} /></mesh>
      <mesh position={SPHERE}><sphereGeometry args={[1.5, 32, 24]} /><meshBasicMaterial ref={dome} color="#3DD6F5" transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <pointLight position={SPHERE} intensity={10} distance={10} color={GOLD} />
      <mesh position={[0, 0.1, 0]} receiveShadow><cylinderGeometry args={[1.4, 1.7, 0.2, 24]} /><meshStandardMaterial color="#1A2238" /></mesh>
    </group>
  );
}

interface MeteorProps { state: DState; layout: Layout; lang: Lang; startRef: React.MutableRefObject<number>; onImpact(): void; posRef: React.MutableRefObject<THREE.Vector3> }
function MeteorObj({ state, layout, lang, startRef, onImpact, posRef }: MeteorProps) {
  const g = useRef<THREE.Group>(null), fired = useRef(false), hitAt = useRef(0);
  const m = state.round!.meteors[state.i], dur = fallTime(state.round!.mode, state.i), from = useMemo(() => new THREE.Vector3(laneX(m.lane, layout), layout === 'tall' ? 12 : 9.3, -1), [m.lane, layout]);   // just inside the top of the frame
  const to = useMemo(() => new THREE.Vector3(SPHERE[0], SPHERE[1] + 0.9, SPHERE[2]), []);
  useEffect(() => { fired.current = false; }, [state.i]);
  useEffect(() => { if (state.phase === 'hit') hitAt.current = performance.now(); }, [state.phase]);
  useFrame(({ clock }) => {
    const o = g.current; if (!o) return;
    if (state.phase === 'falling') {
      const k = Math.min(1, (performance.now() - startRef.current) / 1000 / dur);
      posRef.current.lerpVectors(from, to, k); posRef.current.x += Math.sin(k * Math.PI) * 0.8 * (m.lane - 1);
      o.position.copy(posRef.current); o.scale.setScalar(1); o.rotation.set(clock.elapsedTime * 0.9, clock.elapsedTime * 1.3, 0);
      if (k >= 1 && !fired.current) { fired.current = true; onImpact(); }
    } else if (state.phase === 'hit') {
      const s = Math.max(0.0001, 1 - (performance.now() - hitAt.current) / 350); o.scale.setScalar(s);
    } else o.scale.setScalar(0.0001);
  });
  const label = face(m, state.round!.mode, lang), big = state.round!.mode === 'pictures';
  return (
    <group ref={g} position={from}>
      <mesh><icosahedronGeometry args={[0.6, 1]} /><meshStandardMaterial color="#3B1F5C" emissive="#B98CFF" emissiveIntensity={1.4} flatShading toneMapped={false} /></mesh>
      <mesh scale={1.35}><icosahedronGeometry args={[0.6, 1]} /><meshBasicMaterial color="#FF7A59" transparent opacity={0.18} depthWrite={false} /></mesh>
      {/* a picture rides on top; a word hangs below so the HUD never covers it at the start of the fall */}
      <Billboard position={[0, big ? 1.15 : -1.2, 0]}><CanvasLabel text={label} height={big ? 0.9 : Math.min(0.5, 2.4 / (0.58 * Math.max(4, label.length)))} glow="#B98CFF" background={big ? null : 'rgba(11,15,25,0.7)'} /></Billboard>
    </group>
  );
}

function Beam({ posRef, seq }: { posRef: React.MutableRefObject<THREE.Vector3>; seq: number }) {
  const mesh = useRef<THREE.Mesh>(null), t0 = useMemo(() => performance.now(), [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  const tmp = useMemo(() => ({ a: new THREE.Vector3(...SPHERE), d: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), q: new THREE.Quaternion() }), []);
  useFrame(() => {
    const m = mesh.current; if (!m) return;
    const b = posRef.current, fade = 1 - (performance.now() - t0) / 450;
    tmp.d.subVectors(b, tmp.a); const len = tmp.d.length(); tmp.d.normalize();
    m.position.copy(tmp.a).addScaledVector(tmp.d, len / 2); m.quaternion.copy(tmp.q.setFromUnitVectors(tmp.up, tmp.d)); m.scale.set(1, Math.max(0.001, len), 1);
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fade);
  });
  return <mesh ref={mesh}><cylinderGeometry args={[0.08, 0.08, 1, 10, 1, true]} /><meshBasicMaterial color={GOLD} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>;
}

function Scene({ state, layout, lang, startRef, onImpact }: Omit<MeteorProps, 'posRef'>) {
  const quality = useQuality(), particles = useParticles(), posRef = useRef(new THREE.Vector3(0, 12, 0));
  const { camera, size } = useThree();
  useEffect(() => {
    const p = posRef.current;
    if (state.phase === 'hit') particles.burst({ at: [p.x, p.y, p.z], count: quality === 'low' ? 40 : 110, color: '#B98CFF', speed: 3.2, gravity: 1, life: 1.2, size: 0.07 });
    if (state.phase === 'impact') particles.shockwave({ at: SPHERE, color: '#FF4D5E', radius: 3.5 });
  }, [state.phase, particles, quality]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __btScreen?: () => unknown }).__btScreen = () => { const p = posRef.current.clone().project(camera); return { x: (p.x + 1) / 2 * size.width, y: (1 - p.y) / 2 * size.height }; };
  }, [camera, size]);
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 60 : quality === 'medium' ? 140 : 220} />
      <Baiterek shields={state.shields} hitSeq={state.seq} />
      {state.round && ['falling', 'hit', 'impact'].includes(state.phase) && <MeteorObj state={state} layout={layout} lang={lang} startRef={startRef} onImpact={onImpact} posRef={posRef} />}
      {state.phase === 'hit' && <Beam key={state.seq} seq={state.seq} posRef={posRef} />}
    </>
  );
}

export function BaiterekDefense3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(defenseReducer, undefined, initialDefense);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), startRef = useRef(performance.now()), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', m = round && state.i < round.meteors.length ? round.meteors[state.i] : null;

  const start = (mode: DefenseMode) => { finished.current = false; setLevelUp(false); startRef.current = performance.now(); dispatch({ type: 'start', round: buildDefenseRound(mode) }); play('whoosh'); };
  useEffect(() => { if (state.phase === 'falling') startRef.current = performance.now(); }, [state.i, state.phase === 'falling']); // eslint-disable-line react-hooks/exhaustive-deps
  const answer = (w: string) => {
    if (state.phase !== 'falling' || !round || state.wrong.includes(w)) return;
    const left = 1 - Math.min(1, (performance.now() - startRef.current) / 1000 / fallTime(round.mode, state.i));
    play('tap'); dispatch({ type: 'answer', word: w, left });
  };
  useEffect(() => {
    if (!round || !m) return undefined;
    if (state.phase === 'hit') {
      play('beam'); setTimeout(() => play('chime'), 200); if (voice) speakKazakh(m.kk);
      const id = setTimeout(() => dispatch({ type: 'next' }), 1500); return () => clearTimeout(id);
    }
    if (state.phase === 'impact') {
      play('shockwave'); play('buzz'); useFxStore.getState().shake(0.5); try { navigator.vibrate?.(80); } catch { /* no haptics */ }
      if (voice) setTimeout(() => speakKazakh(m.kk), 400);
      const id = setTimeout(() => dispatch({ type: 'next' }), 2000); return () => clearTimeout(id);
    }
    if (state.phase === 'falling' && state.wrong.length) play('buzz');
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = defenseAccuracy(state);
      if (finishSession({ game: 'baiterek', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __bt?: () => unknown }).__bt = () => ({ phase: state.phase, i: state.i, shields: state.shields, kk: m?.kk, options: m?.options, wrong: state.wrong, xp: state.xp });
  }, [state, m]);

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={1.4} uiShift={{ portrait: 0.06, landscape: 0.05 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(37_91%_55%/0.2),transparent_60%)]" />}>
        <ParticleEmitter capacity={500}><Scene state={state} layout={layout} lang={lang} startRef={startRef} onImpact={() => dispatch({ type: 'impact' })} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Baiterek Defense' : 'Бәйтерек қорғаны'} lives={state.shields} maxLives={SHIELDS} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      {round && m && ['falling', 'hit', 'impact'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{en ? 'Meteor' : 'Метеорит'} {state.i + 1} / {round.meteors.length} · {en ? 'tap its Kazakh name' : 'нажми казахское слово'}</p>
            <p className="mt-1 text-2xl font-black">{face(m, round.mode, lang)}</p>
            {state.phase === 'hit' && <p className="text-base font-black text-jade">✨ {m.kk} — {pick(m, lang)}</p>}
            {state.phase === 'impact' && <p className="text-base font-black text-coral">💥 {m.kk} — {pick(m, lang)}</p>}
          </div>
          <div className="mx-auto mt-2 grid max-w-xl grid-cols-3 gap-2" role="group" aria-label={en ? 'Kazakh words' : 'Казахские слова'}>
            {m.options.map((o) => {
              const off = state.wrong.includes(o), right = state.phase !== 'falling' && o === m.kk;
              return <button key={state.i + o} data-opt={o} disabled={off || state.phase !== 'falling'} onClick={() => answer(o)}
                className={'min-h-14 rounded-2xl px-2 text-lg font-black transition-transform active:scale-95 ' + (right ? 'bg-jade text-obsidian' : off ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>{o}</button>;
            })}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
            <h1 className="mt-1 text-3xl font-black">Бәйтерек қорғаны</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Meteors fall on Baiterek. Name each one in Kazakh and the golden sphere shoots it down. Three shields — and no rush: the first meteors are slow.' : 'На Бәйтерек падают метеориты. Назови каждый по-казахски — золотой шар собьёт его. Три щита, и без спешки: первые метеориты медленные.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" onClick={() => start('pictures')}>🖼️ {en ? 'Pictures (grades 1–2)' : 'Суреттер — картинки (1–2 класс)'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" onClick={() => start('words')}>🔤 {en ? 'Words (grades 3–4)' : 'Сөздер — слова (3–4 класс)'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="bt-sum">
          <div className="holo max-h-full w-full max-w-md overflow-y-auto animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
            <div aria-hidden className="text-3xl">{state.phase === 'victory' ? '🌳' : '☄️'}</div>
            <h2 id="bt-sum" className="mt-1 text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.meteors.length ? 'Керемет! Мінсіз!' : 'Бәйтерек аман!') : (en ? 'The shields fell' : 'Щиты пали')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <dl className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">XP</dt><dd className="text-xl font-black text-jade">+{state.xp}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{en ? 'first try' : 'с первого раза'}</dt><dd className="text-xl font-black">{state.firstTry}/{round.meteors.length}</dd></div>
              <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{en ? 'best combo' : 'серия'}</dt><dd className="text-xl font-black text-gold">{state.bestCombo}</dd></div>
            </dl>
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
