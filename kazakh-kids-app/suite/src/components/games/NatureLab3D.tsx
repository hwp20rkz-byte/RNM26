/**
 * «Табиғат зертханасы» — Nature Lab (phase 2 «Мектеп», science grades 1–2; the 3D part of day 5).
 *
 *  - homes:  a diorama with four habitats — су (a pond), тау (snowy peaks), шөл (dunes), орман (trees). An animal card
 *            floats in the middle: «Бұл жануар қайда тұрады?»; the right habitat sends it flying there, where it stays.
 *  - chains: three pedestals — plant → plant-eater → predator — with one link missing: «Тізбекте не жетіспейді?».
 * Procedural geometry; Айсұлу Neon (science) cheers; the narrator says «Түйе шөлде тұрады.».
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import type { Lang, Vec3 } from '../../types/game.types';
import { CHAINS, HABITATS, L_LIVES, LAB_ANIMALS, animalOf, buildLabRound, doneLine, initialLab, labAccuracy, labReducer, type LabMode, type LState } from '../../lib/labLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { DustMotes, ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
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
const CAMERA: Record<Layout, { position: Vec3; look: Vec3 }> = { wide: { position: [0, 6.2, 9.5], look: [0, 0.6, 0] }, tall: { position: [0, 12, 17.5], look: [0, 1.0, -0.4] } };
/** Habitat centres on the round table: water front-left, mountains back-left, desert back-right, forest front-right. */
const ZONE: Record<string, Vec3> = { су: [-2.3, 0, 1.6], тау: [-2.3, 0, -1.9], шөл: [2.3, 0, -1.9], орман: [2.3, 0, 1.6] };

function Pond() {
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (m.current) (m.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 2) * 0.08; });
  return (
    <group position={ZONE['су']}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} ref={m}><circleGeometry args={[1.45, 40]} /><meshStandardMaterial color="#38BDF8" emissive="#0EA5E9" emissiveIntensity={0.25} roughness={0.25} /></mesh>
      {[[-0.7, 0.4], [0.6, -0.5]].map(([x, z], i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.05, z]}><circleGeometry args={[0.22, 16]} /><meshStandardMaterial color="#10B981" /></mesh>)}
    </group>
  );
}
function Peaks() {
  return (
    <group position={ZONE['тау']}>
      {[[-0.5, 0, 1.3], [0.5, 0.2, 1.0], [0.1, -0.6, 0.8]].map(([x, z, h], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h, 0]}><coneGeometry args={[0.75, h * 2, 6]} /><meshStandardMaterial color="#94A3B8" flatShading /></mesh>
          <mesh position={[0, h * 1.65, 0]}><coneGeometry args={[0.27, h * 0.72, 6]} /><meshStandardMaterial color="#F8FBFF" flatShading /></mesh>
        </group>
      ))}
    </group>
  );
}
function Dunes() {
  return (
    <group position={ZONE['шөл']}>
      {[[-0.5, 0.3, 0.6], [0.5, -0.3, 0.45], [0.2, 0.7, 0.35]].map(([x, z, r], i) => <mesh key={i} position={[x, 0, z]} scale={[1.6, 0.6, 1]}><sphereGeometry args={[r * 1.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#FBBF24" roughness={0.9} /></mesh>)}
      <group position={[0.75, 0, 0.5]}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.07, 0.08, 0.6, 8]} /><meshStandardMaterial color="#16A34A" /></mesh><mesh position={[0.12, 0.38, 0]} rotation-z={-0.9}><cylinderGeometry args={[0.05, 0.05, 0.25, 8]} /><meshStandardMaterial color="#16A34A" /></mesh></group>
    </group>
  );
}
function Forest() {
  return (
    <group position={ZONE['орман']}>
      {[[-0.6, -0.3, 1], [0.5, -0.5, 1.2], [0.1, 0.5, 0.9], [0.8, 0.5, 0.8]].map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.08, 0.1, 0.6, 8]} /><meshStandardMaterial color="#8A5528" /></mesh>
          <mesh position={[0, 0.95, 0]}><coneGeometry args={[0.45, 1.1, 10]} /><meshStandardMaterial color={i % 2 ? '#16A34A' : '#22C55E'} /></mesh>
        </group>
      ))}
    </group>
  );
}
/** An animal / food card that floats and flies to `to` (lerp) once placed. */
function Token({ text, to, scale = 1, bob = true }: { text: string; to: Vec3; scale?: number; bob?: boolean }) {
  const g = useRef<THREE.Group>(null), target = useMemo(() => new THREE.Vector3(...to), [to]);
  useFrame(({ clock }) => { const o = g.current; if (!o) return; o.position.lerp(target, 0.08); if (bob) o.position.y = target.y + Math.sin(clock.elapsedTime * 2.4) * 0.12; });
  return <group ref={g} position={[0, 2.4, 0.6]} scale={scale}><Billboard><CanvasLabel text={text} height={0.5} glow="#FBBF24" background="#0B1220CC" /></Billboard></group>;
}

function Scene({ state, en }: { state: LState; en: boolean }) {
  const quality = useQuality(), particles = useParticles();
  const round = state.round, st = round && state.i < round.stages.length ? round.stages[state.i] : null, chains = round?.mode === 'chains';
  useEffect(() => {
    if (state.phase !== 'hit' || !st) return;
    const at: Vec3 = st.animal ? ZONE[animalOf(st.animal)!.home] : [0, 1.6, 0.6];
    particles.burst({ at: [at[0], 1.4, at[2]], count: quality === 'low' ? 30 : 80, color: '#FBBF24', speed: 2.4, gravity: 0.9, life: 1, size: 0.06 });
  }, [state.phase, state.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  void en;
  return (
    <>
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 50 : 140} />
      <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[5.4, 64]} /><meshStandardMaterial color="#4ADE80" roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}><ringGeometry args={[5.4, 5.7, 64]} /><meshStandardMaterial color="#8C6A43" /></mesh>
      {!chains && (
        <>
          <Pond /><Peaks /><Dunes /><Forest />
          {/* front habitats are named at the table's front edge, back ones above their peaks/dunes: no label crosses another zone */}
          {HABITATS.map((h) => <Billboard key={h.id} position={ZONE[h.id][2] > 0 ? [ZONE[h.id][0], 0.35, ZONE[h.id][2] + 1.75] : [ZONE[h.id][0], 3.1, ZONE[h.id][2] - 0.3]}><CanvasLabel text={h.at} height={0.36} glow={h.color} background="#0B1220AA" /></Billboard>)}
          {/* animals already placed sit in their habitat */}
          {state.placed.map((k) => { const a = animalOf(k)!, z = ZONE[a.home], n = LAB_ANIMALS.filter((x) => x.home === a.home).findIndex((x) => x.kk === k);
            return <Token key={k} text={a.e} to={[z[0] + (n ? 0.5 : -0.5), 1.45, z[2] + 0.3]} scale={1.1} bob={false} />; })}   {/* placed: the picture only, so labels of near and far habitats never collide */}
          {st && st.animal && state.phase !== 'hit' && (() => { const a = animalOf(st.animal)!; return <Token key={'cur' + state.i} text={a.e + ' ' + a.kk} to={[0, 2.2, 0.6]} scale={1.25} />; })()}
        </>
      )}
      {chains && st && (
        <group position={[0, 0, 0.4]}>
          {CHAINS[st.chain!].map((x, k) => {
            const shown = k !== st.gap || state.phase === 'hit';
            return (
              <group key={state.i + ':' + k} position={[(k - 1) * 2.6, 0, 0]}>
                <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.75, 0.9, 0.8, 24]} /><meshStandardMaterial color={k === st.gap ? '#FBBF24' : '#E2E8F0'} emissive={k === st.gap ? '#F59E0B' : '#000000'} emissiveIntensity={0.3} /></mesh>
                <Billboard position={[0, 1.7, 0]}><CanvasLabel text={shown ? x.e + ' ' + x.kk : '?'} height={shown ? 0.46 : 0.9} glow={k === st.gap ? '#FBBF24' : '#00AFCA'} background="#0B1220CC" /></Billboard>
                {k < 2 && <mesh position={[1.3, 0.9, 0]} rotation-z={-Math.PI / 2}><coneGeometry args={[0.22, 0.5, 12]} /><meshStandardMaterial color="#FB6F6F" /></mesh>}
              </group>
            );
          })}
        </group>
      )}
      <BlockHero id="aisulu" move={state.phase === 'hit' || state.phase === 'victory' ? 'cheer' : 'idle'} position={[0, 0, -4.4]} scale={0.55} />
    </>
  );
}

export function NatureLab3D({ lang, onExit }: { lang: Lang; onExit(): void }) {
  const [state, dispatch] = useReducer(labReducer, undefined, initialLab);
  const [levelUp, setLevelUp] = useState(false);
  const finished = useRef(false), layout = useLayout();
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice), finishSession = useGameStore((s) => s.finishSession);
  const round = state.round, en = lang === 'en', st = round && state.i < round.stages.length ? round.stages[state.i] : null, chains = round?.mode === 'chains';
  const active = state.phase === 'aim' || state.phase === 'miss';
  const start = (m: LabMode) => { finished.current = false; setLevelUp(false); dispatch({ type: 'start', round: buildLabRound(m) }); play('whoosh'); };
  const choose = (o: string) => { if (!st || !active) return; play('tap'); dispatch({ type: 'pick', option: o }); };
  useEffect(() => {
    if (!st) return undefined;
    if (state.phase === 'hit') {
      play('chime');
      const id0 = setTimeout(() => { if (voice) speakKazakh(doneLine(st)); }, 450), id = setTimeout(() => dispatch({ type: 'next' }), 2300);
      return () => { clearTimeout(id); clearTimeout(id0); };
    }
    if (state.phase === 'miss') { play('buzz'); useFxStore.getState().shake(0.3); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.seq]);
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true; const acc = labAccuracy(state);
      if (finishSession({ game: 'lab', xp: state.xp, correct: acc.correct, total: acc.total, bestCombo: state.bestCombo, won: state.phase === 'victory' })) setLevelUp(true);
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
    }
  }, [state, finishSession, play]);
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __lab?: () => unknown }).__lab = () => ({ phase: state.phase, i: state.i, lives: state.lives, placed: state.placed.length, answer: st?.answer, options: st?.options, mode: round?.mode });
  }, [state, st, round]);
  const label = (o: string) => {
    if (!chains) { const h = HABITATS.find((x) => x.at === o); return h ? (en ? h.en : h.ru) : ''; }
    const l = CHAINS.flat().find((x) => x.kk === o); return l ? l.e + ' ' + (en ? l.en : l.ru) : '';
  };
  const cur = st?.animal ? animalOf(st.animal) : null;

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas key={layout} camera={CAMERA[layout]} designAspect={layout === 'wide' ? 1.5 : 0.6} uiShift={{ portrait: 0.14, landscape: 0.06 }}
        fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(142_70%_45%/0.2),transparent_60%)]" />}>
        <ParticleEmitter capacity={400}><Scene state={state} en={en} /></ParticleEmitter>
      </StudioCanvas>
      {state.phase !== 'intro' && <GameHUD title={en ? 'Nature Lab' : 'Табиғат зертханасы'} lives={state.lives} maxLives={L_LIVES} combo={state.combo} multiplier={1} sessionXp={state.xp} lang={lang} onBack={onExit} />}
      <TestSkip disabled={!st || !active} onSkip={() => st && choose(st.answer)} />
      {round && st && ['aim', 'hit', 'miss'].includes(state.phase) && (
        <section className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] px-4 py-3 text-center">
            <p className="text-sm text-mist-dim">{state.i + 1} / {round.stages.length} · {chains ? (en ? 'Who eats whom?' : 'Кто кого ест?') : (cur ? (en ? cur.en : cur.ru) : '')}</p>
            <p className="mt-1 text-lg font-black">{chains ? 'Тізбекте не жетіспейді?' : 'Бұл жануар қайда тұрады?'}</p>
            {state.phase === 'hit' && <p className="font-black text-jade">✨ {doneLine(st)}</p>}
            {state.phase === 'miss' && <p className="font-black text-coral">{chains ? (en ? 'The chain goes: a plant → who eats plants → who hunts.' : 'Цепочка: растение → кто ест растения → хищник.') : (en ? 'Think: water, mountains, desert or forest?' : 'Подумай: вода, горы, пустыня или лес?')}</p>}
          </div>
          <div className={'mx-auto mt-2 grid max-w-xl gap-2 ' + (chains ? 'grid-cols-3' : 'grid-cols-2')} role="group" aria-label={en ? 'Answers' : 'Ответы'}>
            {st.options.map((o) => (
              <button key={state.i + ':' + o} data-opt={o} disabled={state.tried.includes(o) || state.phase === 'hit'} onClick={() => choose(o)}
                className={'grid min-h-14 place-items-center rounded-2xl px-1 font-black ' + (state.phase === 'hit' && o === st.answer ? 'bg-jade text-obsidian' : state.tried.includes(o) ? 'bg-obsidian-800 text-mist-dim line-through opacity-60' : 'holo text-mist')}>
                <span className="text-lg">{o}</span><span className="text-xs font-bold opacity-80">{label(o)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {state.phase === 'intro' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
            <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D · МЕКТЕП</p>
            <h1 className="mt-1 text-3xl font-black">Табиғат зертханасы</h1>
            <p className="mt-2 text-base text-mist-dim">{en ? 'Send each animal home — water, mountains, desert or forest. Then complete the food chains with Айсұлу.' : 'Отправь каждого зверя домой — в воду, горы, пустыню или лес. А потом собери с Айсұлу пищевые цепочки.'}</p>
            <div className="mt-6 grid gap-2">
              <button className="btn-solar" data-mode="homes" onClick={() => start('homes')}>🏞️ {en ? 'Who lives where?' : 'Кім қайда тұрады? — кто где живёт'}</button>
              <button className="btn-ghost holo !min-h-[52px] text-base" data-mode="chains" onClick={() => start('chains')}>🔗 {en ? 'Food chains' : 'Қоректік тізбек — пищевые цепочки'}</button>
              <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
      {(state.phase === 'victory' || state.phase === 'defeat') && round && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lab-sum">
          <div className="holo w-full max-w-md rounded-[var(--radius-card)] p-5 text-center">
            <h2 id="lab-sum" className="text-3xl font-black">{state.phase === 'victory' ? (state.firstTry === round.stages.length ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (en ? 'Out of energy' : 'Энергия кончилась')}</h2>
            {levelUp && <p className="mt-1 font-black text-gold">⬆ {en ? 'Level up!' : 'Новый уровень!'}</p>}
            <p className="mt-2 text-lg">XP +{state.xp} · {en ? 'first try' : 'с первого раза'} {state.firstTry}/{round.stages.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-solar" onClick={() => start(round.mode === 'homes' ? 'chains' : 'homes')}>{round.mode === 'homes' ? (en ? 'Food chains →' : 'Қоректік тізбек →') : (en ? 'Who lives where?' : 'Кім қайда тұрады?')}</button>
              <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{en ? 'All games' : 'Все игры'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
