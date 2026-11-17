/**
 * «Септік тотемі» — Totem of Cases.
 *
 * Pedagogy: the 7 Kazakh cases (and, in the second mode, predicate personal endings). Every task is a
 * textbook sentence with one gap; the child picks the ending that keeps vowel harmony and consonant
 * assimilation. The verdict and the explanation come from the morphology engine (lib/morphology.ts),
 * never from hand-written answer keys.
 *
 * 3D loop:
 *   - an obsidian totem with 7 floating runic rings — one per case, lit when the case is mastered;
 *   - answer crystals are Rapier rigid bodies held near their home by a spring; drag one with the
 *     «gravity tether» into the glowing core, or tap it to fire an energy beam;
 *   - right: the crystal is absorbed, shockwave + sparks, the case ring flares, the sentence is spoken;
 *   - wrong: the core repels the crystal (physical recoil impulse), the screen shakes and a rule card opens.
 * Accessibility: every crystal is mirrored by a DOM button, so the game is fully playable with a
 * keyboard / screen reader and on devices without WebGL.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Billboard, ContactShadows, Float, MeshTransmissionMaterial } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { AnswerVerdict, CaseId, Lang, PersonId, TotemMode, TotemTask, Vec3 } from '../../types/game.types';
import { CASES, CASE_BY_ID, PERSON_BY_ID } from '../../data/kazakhGrammarCorpus';
import { buildSession, comboMultiplier, initialTotem, MAX_LIVES, totemReducer, ZERO } from '../../lib/totemLogic';
import { StudioCanvas, useQuality } from '../3d/canvas/StudioCanvas';
import { SkyDiorama } from '../3d/environment/SkyDiorama';
import { DustMotes, ParticleEmitter, useParticles } from '../3d/effects/ParticleEmitter';
import { runeTexture } from '../3d/materials/GlassShader';
import { CanvasLabel } from '../3d/CanvasLabel';
import { GameHUD } from '../ui/GameHUD';
import { FeedbackModal } from '../ui/FeedbackModal';
import { GrammarBadge } from '../ui/GrammarBadge';
import { useAudioStore } from '../../store/useAudioStore';
import { useFxStore } from '../../store/useFxStore';
import { useGameStore } from '../../store/useGameStore';
import { pick } from '../../lib/i18n';
import { speakKazakh } from '../../lib/kazakhVoice';

/* ------------------------------------------------------------------ layout constants */

const CORE: Vec3 = [0, 2.35, 1.05];
const CORE_RADIUS = 0.5;
const ABSORB_DISTANCE = 1.25;
const RING_Y0 = 0.15, RING_STEP = 0.66;
const UI_SHIFT = { portrait: 0.04, landscape: 0.13 };
const CAM_HOME = { position: [0, 3.1, 10.5] as Vec3, look: [0, 2.0, 0] as Vec3 };

const PERSON_COLORS: Record<string, string> = { men: '#00AFCA', sen: '#F5A623', siz: '#00E599', ol: '#7928CA', biz: '#3DD6F5', sender: '#FF7A59', sizder: '#B9F18C' };
const PERSON_ORDER: PersonId[] = ['men', 'sen', 'siz', 'ol', 'biz', 'sender', 'sizder'];

function targetInfo(t: TotemTask, lang: Lang): { kk: string; questions: string; hint: string; color: string; ring: number } {
  if (t.mode === 'cases') {
    const c = CASE_BY_ID[t.target as CaseId];
    return { kk: c.kk + ' септік', questions: c.questions, hint: pick(c, lang), color: c.color, ring: CASES.findIndex((x) => x.id === c.id) };
  }
  const id = t.target as Exclude<PersonId, 'olar'>, p = PERSON_BY_ID[id];
  return { kk: p.kk + ' — жіктік', questions: '', hint: pick(p, lang), color: PERSON_COLORS[id], ring: PERSON_ORDER.indexOf(id) };
}

/* ------------------------------------------------------------------ crystal registry (3D ↔ DOM buttons) */

type CrystalHandle = { fire(): void; pos(): Vec3 };
type Registry = Map<string, CrystalHandle>;

/* ------------------------------------------------------------------ the totem */

function Totem({ litRings, activeRing, colors, labels, flash }: { litRings: Set<number>; activeRing: number; colors: string[]; labels: string[]; flash: number }) {
  const quality = useQuality();
  const rings = useRef<(THREE.Group | null)[]>([]);
  const core = useRef<THREE.Mesh>(null), cage = useRef<THREE.Group>(null);
  const runeMats = useRef<({ uTime: number; uActivate: number } | null)[]>([]);
  const flashRef = useRef(0);
  useEffect(() => { flashRef.current = 1; }, [flash]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    flashRef.current = Math.max(0, flashRef.current - dt * 1.4);
    rings.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.y = t * (0.25 + i * 0.04) * (i % 2 ? -1 : 1);
      g.position.y = RING_Y0 + i * RING_STEP + Math.sin(t * 1.2 + i) * 0.05;
    });
    runeMats.current.forEach((m, i) => {
      if (!m) return;
      m.uTime = t;
      const target = litRings.has(i) ? 1 : i === activeRing ? 0.45 + Math.sin(t * 4) * 0.25 : 0;
      m.uActivate += (target - m.uActivate) * Math.min(1, dt * 5);
    });
    if (core.current) {
      const s = 1 + Math.sin(t * 3) * 0.05 + flashRef.current * 0.6;
      core.current.scale.setScalar(s);
      (core.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 + flashRef.current * 8;
    }
    if (cage.current) { cage.current.rotation.y = t * 0.8; cage.current.rotation.x = Math.sin(t * 0.5) * 0.4; }
  });

  return (
    <group>
      {/* stone column: four carved segments with gold seams */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, -0.35 + i * 1.2 + 0.55, -0.35]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.62 - i * 0.05, 0.7 - i * 0.05, 1.1, 8]} />
            <meshStandardMaterial color="#1B2033" roughness={0.55} metalness={0.35} flatShading />
          </mesh>
          <mesh position-y={0.56}>
            <cylinderGeometry args={[0.72 - i * 0.05, 0.72 - i * 0.05, 0.06, 8]} />
            <meshStandardMaterial color="#F5A623" emissive="#F5A623" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* crown: two sweeping gold horns (қошқар мүйіз) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.32, 4.75, -0.35]} rotation={[0, 0, s * -0.4]} castShadow>
          <torusGeometry args={[0.45, 0.07, 10, 28, Math.PI * 1.25]} />
          <meshStandardMaterial color="#F5A623" emissive="#F5A623" emissiveIntensity={0.9} metalness={0.8} roughness={0.25} />
        </mesh>
      ))}

      {/* seven runic rings */}
      {labels.map((label, i) => (
        <group key={i} ref={(g) => { rings.current[i] = g; }} position={[0, RING_Y0 + i * RING_STEP, -0.35]}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.15 + (i % 2) * 0.08, 0.05, 8, quality === 'low' ? 40 : 80]} />
            <meshStandardMaterial color={colors[i]} emissive={colors[i]} emissiveIntensity={litRings.has(i) ? 3.2 : i === activeRing ? 1.6 : 0.35} toneMapped={false} />
          </mesh>
          {/* rune plates riding the ring */}
          {[0, 1, 2].map((k) => {
            const a = (k / 3) * Math.PI * 2;
            return (
              <mesh key={k} position={[Math.cos(a) * 1.18, 0, Math.sin(a) * 1.18]} rotation-y={-a + Math.PI / 2}>
                <planeGeometry args={[0.42, 0.42]} />
                <runeGlassMaterial ref={(m: { uTime: number; uActivate: number } | null) => { if (k === 0) runeMats.current[i] = m; }}
                  uColor={new THREE.Color(colors[i])} uRim={new THREE.Color(colors[i])} uRune={runeTexture(i)} uHasRune={1} uOpacity={0.55} />
              </mesh>
            );
          })}
          <Billboard position={[1.75, 0.02, 0.4]}>
            <CanvasLabel text={label} height={0.2} glow={colors[i]} opacity={litRings.has(i) || i === activeRing ? 1 : 0.55} />
          </Billboard>
        </group>
      ))}

      {/* the core */}
      <group position={CORE}>
        <mesh ref={core}>
          <icosahedronGeometry args={[CORE_RADIUS, quality === 'low' ? 1 : 3]} />
          <meshStandardMaterial color="#003A44" emissive={colors[Math.max(0, activeRing)] ?? '#00AFCA'} emissiveIntensity={2.2} roughness={0.2} toneMapped={false} />
        </mesh>
        <group ref={cage}>
          {[0, 1, 2].map((k) => (
            <mesh key={k} rotation={[k * 1.05, k * 0.6, 0]}>
              <torusGeometry args={[0.78, 0.018, 6, 64]} />
              <meshBasicMaterial color="#F5A623" toneMapped={false} />
            </mesh>
          ))}
        </group>
        <pointLight intensity={14} distance={6} color={colors[Math.max(0, activeRing)] ?? '#00AFCA'} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ crystals */

interface CrystalProps {
  option: string;
  home: Vec3;
  color: string;
  registry: Registry;
  locked: boolean;
  outcome: 'none' | 'absorb' | 'recoil';
  onSubmit(option: string): void;
}

function Crystal({ option, home, color, registry, locked, outcome, onSubmit }: CrystalProps) {
  const quality = useQuality();
  const body = useRef<RapierRigidBody>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const drag = useRef<{ active: boolean; moved: boolean; start: THREE.Vector2; target: THREE.Vector3; plane: THREE.Plane }>({
    active: false, moved: false, start: new THREE.Vector2(), target: new THREE.Vector3(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -home[2])
  });
  const beamT = useRef(-1);
  const play = useAudioStore((s) => s.play);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), core: new THREE.Vector3(...CORE), mid: new THREE.Vector3(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0) }), []);

  // tap → energy beam → submit
  const fire = useCallback(() => {
    if (locked || beamT.current >= 0) return;
    beamT.current = 0;
    play('beam', { at: home });
  }, [locked, play, home]);
  useEffect(() => {
    registry.set(option, { fire, pos: () => { const t = body.current?.translation(); return t ? [t.x, t.y, t.z] : home; } });
    return () => { registry.delete(option); };
  }, [registry, option, fire, home]);

  // recoil on a wrong answer: a physical shove away from the core plus spin
  useEffect(() => {
    const b = body.current; if (!b || outcome !== 'recoil') return;
    const p = b.translation(), away = new THREE.Vector3(p.x - CORE[0], p.y - CORE[1] + 0.6, p.z - CORE[2] + 1.5).normalize().multiplyScalar(5.5);
    b.applyImpulse({ x: away.x, y: away.y, z: away.z }, true);
    b.applyTorqueImpulse({ x: 0.4, y: 1.2, z: 0.3 }, true);
  }, [outcome]);

  useFrame(({ clock }, dtRaw) => {
    const b = body.current; if (!b) return;
    const dt = Math.min(dtRaw, 0.05), t = clock.elapsedTime, p = b.translation();
    // target: core when absorbed / tethered to the finger while dragging / home with a gentle bob
    let tx: number, ty: number, tz: number, stiffness: number;
    if (outcome === 'absorb') { [tx, ty, tz] = CORE; stiffness = 22; }
    else if (drag.current.active) { tx = drag.current.target.x; ty = drag.current.target.y; tz = drag.current.target.z; stiffness = 26; }
    else { tx = home[0]; ty = home[1] + Math.sin(t * 1.6 + home[0]) * 0.12; tz = home[2]; stiffness = 9; }
    const v = b.linvel();
    b.setLinvel({ x: v.x + ((tx - p.x) * stiffness - v.x * 4) * dt, y: v.y + ((ty - p.y) * stiffness - v.y * 4) * dt, z: v.z + ((tz - p.z) * stiffness - v.z * 4) * dt }, true);
    if (!drag.current.active && outcome === 'none') b.setAngvel({ x: 0, y: 0.8, z: 0 }, true);
    // absorbed crystals shrink into the core
    if (mesh.current) {
      const target = outcome === 'absorb' ? 0.0001 : hover || drag.current.active ? 1.15 : 1;
      const s = THREE.MathUtils.lerp(mesh.current.scale.x, target, Math.min(1, dt * (outcome === 'absorb' ? 3 : 10)));
      mesh.current.scale.set(s, s * 1.45, s);
    }
    // beam animation: grows from the crystal to the core in 0.25 s, then submits
    if (beam.current) {
      if (beamT.current >= 0) {
        beamT.current += dt / 0.25;
        const k = Math.min(1, beamT.current);
        tmp.v.set(p.x, p.y, p.z);
        const len = tmp.v.distanceTo(tmp.core) * k;
        tmp.mid.subVectors(tmp.core, tmp.v).normalize();
        beam.current.visible = true;
        beam.current.position.copy(tmp.v).addScaledVector(tmp.mid, len / 2);
        beam.current.quaternion.copy(tmp.q.setFromUnitVectors(tmp.up, tmp.mid));
        beam.current.scale.set(1, Math.max(0.001, len), 1);
        if (beamT.current >= 1.35) { beamT.current = -1; beam.current.visible = false; onSubmit(option); }
      } else beam.current.visible = false;
    }
    // released inside the core → submit
    if (!drag.current.active && drag.current.moved && outcome === 'none' && !locked) {
      drag.current.moved = false;
      if (Math.hypot(p.x - CORE[0], p.y - CORE[1], p.z - CORE[2]) < ABSORB_DISTANCE) onSubmit(option);
    }
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (locked) return;
    e.stopPropagation();
    (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
    drag.current.active = true; drag.current.moved = false; drag.current.start.set(e.clientX, e.clientY);
    e.ray.intersectPlane(drag.current.plane, drag.current.target);
    play('tap', { at: home });
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active) return;
    if (!drag.current.moved && Math.hypot(e.clientX - drag.current.start.x, e.clientY - drag.current.start.y) > 8) drag.current.moved = true;
    // tether plane slants towards the core so a natural upward drag reaches it
    const p = new THREE.Vector3();
    if (e.ray.intersectPlane(drag.current.plane, p)) drag.current.target.set(p.x, Math.max(-0.3, p.y), THREE.MathUtils.lerp(home[2], CORE[2], THREE.MathUtils.clamp((p.y - home[1]) / (CORE[1] - home[1]), 0, 1)));
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    (e.target as Element | null)?.releasePointerCapture?.(e.pointerId);
    if (!drag.current.moved) fire();          // a tap fires the beam
    else play('whoosh', { at: home, gain: 0.6 });
  };

  const label = option === ZERO ? '∅' : '-' + option;
  return (
    <>
      <RigidBody ref={body} position={home} colliders={false} gravityScale={0} linearDamping={1.5} angularDamping={2} canSleep={false} ccd>
        <BallCollider args={[0.38]} restitution={0.9} />
        <group>
          <mesh ref={mesh} castShadow onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
            <octahedronGeometry args={[0.36, 0]} />
            {quality === 'high'
              ? <MeshTransmissionMaterial samples={4} resolution={256} transmission={0.9} roughness={0.15} chromaticAberration={0.06} thickness={0.6} ior={1.45} anisotropicBlur={0.1} color={color} emissive={color} emissiveIntensity={hover ? 0.9 : 0.35} />
              : <runeGlassMaterial uColor={new THREE.Color(color)} uRim={new THREE.Color(color)} uActivate={hover ? 0.6 : 0.2} uOpacity={0.9} />}
          </mesh>
          <Billboard position={[0, 0.78, 0]}>
            <CanvasLabel text={label} height={0.3} glow={color} background="rgba(11,15,25,0.55)" />
          </Billboard>
        </group>
      </RigidBody>
      <mesh ref={beam} visible={false}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8, 1, true]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ e2e probe (?e2e only) */

/** Exposes screen positions of the crystals and the core so a browser test can drag them for real. */
function E2EProbe({ registry }: { registry: Registry }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    const toScreen = (v: Vec3) => { const p = new THREE.Vector3(...v).project(camera); return { x: (p.x + 1) / 2 * size.width, y: (1 - p.y) / 2 * size.height }; };
    (window as unknown as { __totemScreen?: () => unknown }).__totemScreen = () => ({
      core: toScreen(CORE), crystals: [...registry.entries()].map(([option, h]) => ({ option, ...toScreen(h.pos()) }))
    });
  }, [camera, size, registry]);
  return null;
}

/* ------------------------------------------------------------------ scene */

interface SceneProps {
  task: TotemTask | null;
  phase: string;
  verdict: AnswerVerdict | null;
  litRings: Set<number>;
  registry: Registry;
  onSubmit(option: string): void;
  fxKey: number;
  mode: TotemMode;
  lang: Lang;
}

function TotemScene({ task, phase, verdict, litRings, registry, onSubmit, fxKey, mode, lang }: SceneProps) {
  const quality = useQuality();
  const particles = useParticles();
  const info = task ? targetInfo(task, lang) : null;
  const colors = mode === 'cases' ? CASES.map((c) => c.color) : PERSON_ORDER.map((p) => PERSON_COLORS[p]);
  const labels = mode === 'cases' ? CASES.map((c) => c.kk) : PERSON_ORDER.map((p) => PERSON_BY_ID[p as Exclude<PersonId, 'olar'>].kk);

  // celebration / recoil effects, keyed by every verdict
  useEffect(() => {
    if (!verdict || !info) return;
    if (verdict.correct) {
      particles.shockwave({ at: [CORE[0], CORE[1] - 0.2, CORE[2]], color: info.color, radius: 5 });
      particles.burst({ at: CORE, count: quality === 'low' ? 40 : 110, color: '#F5A623', speed: 5 });
      particles.burst({ at: CORE, count: quality === 'low' ? 20 : 60, color: info.color, speed: 3.5, gravity: -1 });
    } else {
      particles.burst({ at: CORE, count: 30, color: '#FF5A6E', speed: 3, gravity: -6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fxKey]);

  const n = task?.options.length ?? 0;
  const homes: Vec3[] = Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * 1.5, 1.05 + (i % 2) * 0.3, 3.0] as Vec3);   // kept above the bottom panel
  return (
    <>
      <E2EProbe registry={registry} />
      <SkyDiorama quality={quality} />
      <DustMotes count={quality === 'low' ? 60 : quality === 'medium' ? 140 : 260} />
      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.25}>
        <Totem litRings={litRings} activeRing={info?.ring ?? -1} colors={colors} labels={labels} flash={fxKey} />
      </Float>
      <Physics gravity={[0, 0, 0]} timeStep="vary">
        {/* the core repels crystals physically; the floor keeps recoiled crystals in view */}
        <RigidBody type="fixed" position={CORE} colliders={false}><BallCollider args={[CORE_RADIUS]} restitution={1.2} /></RigidBody>
        <RigidBody type="fixed" position={[0, -1.2, 0]} colliders={false}><CuboidCollider args={[8, 0.2, 8]} restitution={0.6} /></RigidBody>
        {task && task.options.map((o, i) => (
          <Crystal key={task.id + o} option={o} home={homes[i]} color={['#00AFCA', '#F5A623', '#00E599', '#B98CFF'][i % 4]} registry={registry}
            locked={phase !== 'playing'}
            outcome={verdict && verdict.chosen === o ? (verdict.correct ? 'absorb' : 'recoil') : 'none'}
            onSubmit={onSubmit} />
        ))}
      </Physics>
      {quality !== 'low' && <ContactShadows position={[0, -0.93, 0]} opacity={0.55} scale={9} blur={2.4} far={4} color="#000814" />}
    </>
  );
}

/* ------------------------------------------------------------------ the game (DOM + canvas) */

export interface TotemCases3DProps { lang: Lang; onExit(): void; initialMode?: TotemMode }

export function TotemCases3D({ lang, onExit, initialMode = 'cases' }: TotemCases3DProps) {
  const [state, dispatch] = useReducer(totemReducer, initialMode, initialTotem);
  const [fxKey, setFxKey] = useState(0);
  const [lit, setLit] = useState<Set<number>>(() => new Set());
  const [modal, setModal] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const registry = useMemo<Registry>(() => new Map(), []);
  const finished = useRef(false);
  const play = useAudioStore((s) => s.play), voice = useAudioStore((s) => s.voice);
  const finishSession = useGameStore((s) => s.finishSession);
  const task = state.phase === 'playing' || state.phase === 'feedback' ? state.tasks[state.index] : null;
  const info = task ? targetInfo(task, lang) : null;

  const start = (mode: TotemMode) => {
    finished.current = false; setLit(new Set()); setLevelUp(false);
    dispatch({ type: 'start', mode, tasks: buildSession(mode) });
    play('whoosh');
  };

  const submit = useCallback((option: string) => { dispatch({ type: 'answer', option }); }, []);

  // react to a verdict: sounds, camera, voice, auto-advance on success
  useEffect(() => {
    const v = state.verdict; if (!v || !task) return;
    setFxKey((k) => k + 1);
    const fx = useFxStore.getState();
    if (v.correct) {
      play('chime'); play('shockwave', { at: CORE, gain: 0.7 });
      setLit((s) => new Set(s).add(targetInfo(task, lang).ring));
      fx.focus([0, 2.8, 8.6], [CORE[0], CORE[1], 0]);
      if (voice) setTimeout(() => speakKazakh(v.full), 450);
      const id = setTimeout(() => { fx.focus(CAM_HOME.position, CAM_HOME.look); dispatch({ type: 'next' }); }, 1700);
      return () => clearTimeout(id);
    }
    play('buzz'); fx.shake(0.55);
    try { navigator.vibrate?.(60); } catch { /* no haptics */ }
    if (state.phase === 'feedback') { const id = setTimeout(() => setModal(true), 650); return () => clearTimeout(id); }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.verdict]);

  // end of round → persist progression once
  useEffect(() => {
    if ((state.phase === 'victory' || state.phase === 'defeat') && !finished.current) {
      finished.current = true;
      const up = finishSession({ game: 'totem-cases', xp: state.xp, correct: state.firstTry, total: state.tasks.length, bestCombo: state.bestCombo, won: state.phase === 'victory' });
      play(state.phase === 'victory' ? 'levelUp' : 'buzz');
      if (up) setLevelUp(true);
    }
  }, [state.phase, state.xp, state.firstTry, state.tasks.length, state.bestCombo, finishSession, play]);

  // end-to-end test hook (?e2e): lets the browser test know the engine's answer without reading the canvas
  useEffect(() => {
    if (!/[?&]e2e\b/.test(window.location.search)) return;
    (window as unknown as { __totemAnswer?: () => string | undefined }).__totemAnswer = () => task?.answer;
  }, [task]);

  const choose = (o: string) => {
    if (state.phase !== 'playing') return;
    const h = registry.get(o);
    if (h) h.fire(); else submit(o);           // no WebGL: answer directly
  };

  const title = lang === 'en' ? 'Totem of Cases' : 'Септік тотемі';
  const badge = info && <GrammarBadge kk={info.kk} questions={info.questions} hint={info.hint} color={info.color} lang={lang} />;

  return (
    <div className="relative h-full w-full touch-none select-none overflow-hidden bg-obsidian">
      <StudioCanvas camera={CAM_HOME} designAspect={1.05} uiShift={UI_SHIFT} fallback={<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(188_100%_40%/0.25),transparent_60%)]" />}>
        <ParticleEmitter capacity={500}>
          <TotemScene task={task} phase={state.phase} verdict={state.verdict} litRings={lit} registry={registry} onSubmit={submit} fxKey={fxKey} mode={state.mode} lang={lang} />
        </ParticleEmitter>
      </StudioCanvas>

      {state.phase !== 'intro' && (
        <GameHUD title={title} lives={state.lives} maxLives={MAX_LIVES} combo={state.combo} multiplier={comboMultiplier(state.combo)} sessionXp={state.xp} lang={lang} onBack={onExit} />
      )}

      {/* holographic sentence panel + accessible answer buttons */}
      {task && (
        <section className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
          <div className="holo mx-auto max-w-xl rounded-[var(--radius-card)] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              {badge}
              <span className="text-xs text-mist-dim">{state.index + 1} / {state.tasks.length} · 📖 {task.sentence.source}</span>
            </div>
            <p className="text-center text-xl font-black leading-snug sm:text-3xl">
              {task.sentence.before}{task.sentence.root}
              <span className={'mx-0.5 inline-block min-w-12 rounded-lg border-2 border-dashed px-2 align-baseline ' + (state.verdict ? (state.verdict.correct ? 'border-jade text-jade' : 'border-coral text-coral') : 'animate-[pulse-glow_1.6s_ease-in-out_infinite] border-gold text-gold')}>
                {state.verdict ? (state.verdict.correct ? (state.verdict.answer === ZERO ? '∅' : state.verdict.answer) : state.verdict.chosen === ZERO ? '∅' : state.verdict.chosen) : '?'}
              </span>
              {task.sentence.after}
            </p>
            <p className="mt-1 text-center text-sm text-mist-dim">{pick(task.sentence, lang)}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label={lang === 'en' ? 'Endings' : 'Окончания'}>
              {task.options.map((o) => (
                <button key={o} className="chip" disabled={state.phase !== 'playing'} onClick={() => choose(o)}
                  aria-pressed={state.verdict?.chosen === o}>{o === ZERO ? '∅' : '-' + o}</button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-mist-dim">{lang === 'en' ? 'Drag a crystal into the core — or tap it to fire a beam.' : 'Перетащи кристалл в ядро — или коснись его, чтобы выстрелить лучом.'}</p>
          </div>
        </section>
      )}

      {modal && state.verdict && task && (
        <FeedbackModal verdict={state.verdict} badge={badge} translation={pick(task.sentence, lang)} lang={lang}
          onListen={() => speakKazakh(state.verdict!.full)}
          onContinue={() => { setModal(false); useFxStore.getState().focus(CAM_HOME.position, CAM_HOME.look); dispatch({ type: 'next' }); }} />
      )}

      {state.phase === 'intro' && <Intro lang={lang} onStart={start} onExit={onExit} />}
      {(state.phase === 'victory' || state.phase === 'defeat') && (
        <Summary lang={lang} won={state.phase === 'victory'} xp={state.xp} firstTry={state.firstTry} total={state.tasks.length} bestCombo={state.bestCombo}
          missed={state.missed} mode={state.mode} levelUp={levelUp} onAgain={() => start(state.mode)} onExit={onExit} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ overlays */

function Intro({ lang, onStart, onExit }: { lang: Lang; onStart(m: TotemMode): void; onExit(): void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent p-4 sm:items-center">
      <div className="holo w-full max-w-md animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
        <p className="text-xs font-black tracking-[0.3em] text-turq-300">QAZAQVERSE 3D</p>
        <h1 className="mt-1 text-3xl font-black">{lang === 'en' ? 'Totem of Cases' : 'Септік тотемі'}</h1>
        <p className="mt-2 text-base text-mist-dim">
          {lang === 'en'
            ? 'Seven runic rings — seven Kazakh cases. Feed the core the ending that keeps vowel harmony and the right consonant.'
            : 'Семь рунических колец — семь казахских падежей. Накорми ядро окончанием, которое соблюдает сингармонизм и нужный согласный.'}
        </p>
        <div className="mt-6 grid gap-2">
          <button className="btn-solar" onClick={() => onStart('cases')}>🔮 {lang === 'en' ? '7 cases (септік)' : '7 септік — падежи'}</button>
          <button className="btn-ghost holo !min-h-[52px] text-base" onClick={() => onStart('persons')}>🗿 {lang === 'en' ? 'Personal endings (жіктік)' : 'Жіктік — личные окончания'}</button>
          <button className="btn-ghost !min-h-[44px] text-sm text-mist-dim" onClick={onExit}>← {lang === 'en' ? 'All games' : 'Все игры'}</button>
        </div>
      </div>
    </div>
  );
}

function Summary(props: { lang: Lang; won: boolean; xp: number; firstTry: number; total: number; bestCombo: number; missed: (CaseId | PersonId)[]; mode: TotemMode; levelUp: boolean; onAgain(): void; onExit(): void }) {
  const { lang, won, xp, firstTry, total, bestCombo, missed, mode, levelUp, onAgain, onExit } = props;
  const pct = Math.round(firstTry / Math.max(1, total) * 100);
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-obsidian/70 p-4" role="dialog" aria-modal="true" aria-labelledby="sum-title">
      <div className="holo w-full max-w-md animate-[rise_420ms_var(--ease-spring)] rounded-[var(--radius-card)] p-6 text-center">
        <div aria-hidden className="text-3xl">{won ? '🏆' : '💫'}</div>
        <h2 id="sum-title" className="mt-1 text-3xl font-black">{won ? (pct === 100 ? 'Керемет! Мінсіз!' : 'Жарайсың!') : (lang === 'en' ? 'The core went dark' : 'Ядро погасло')}</h2>
        {levelUp && <p className="mt-1 font-black text-gold">⬆ {lang === 'en' ? 'Level up!' : 'Новый уровень!'}</p>}
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">XP</dt><dd className="text-xl font-black text-jade">+{xp}</dd></div>
          <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{lang === 'en' ? 'first try' : 'с 1-й попытки'}</dt><dd className="text-xl font-black">{firstTry}/{total}</dd></div>
          <div className="rounded-xl bg-obsidian-800 p-3"><dt className="text-xs text-mist-dim">{lang === 'en' ? 'best combo' : 'комбо'}</dt><dd className="text-xl font-black text-gold">🔥{bestCombo}</dd></div>
        </dl>
        {missed.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-mist-dim">{lang === 'en' ? 'Practise these again:' : 'Повтори ещё раз:'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {missed.map((m) => mode === 'cases'
                ? <GrammarBadge key={m} compact kk={CASE_BY_ID[m as CaseId].kk} questions={CASE_BY_ID[m as CaseId].questions} hint={pick(CASE_BY_ID[m as CaseId], lang)} color={CASE_BY_ID[m as CaseId].color} lang={lang} />
                : <GrammarBadge key={m} compact kk={PERSON_BY_ID[m as Exclude<PersonId, 'olar'>].kk} hint={pick(PERSON_BY_ID[m as Exclude<PersonId, 'olar'>], lang)} color={PERSON_COLORS[m]} lang={lang} />)}
            </div>
          </div>
        )}
        <div className="mt-6 grid gap-2">
          <button className="btn-solar" onClick={onAgain}>{lang === 'en' ? 'Play again' : 'Тағы ойнау · ещё раз'}</button>
          <button className="btn-ghost holo !min-h-[48px]" onClick={onExit}>{lang === 'en' ? 'All games' : 'Все игры'}</button>
        </div>
      </div>
    </div>
  );
}
