/* Types for the plain-JS host (web/app.js, web/v3d.js, web/voice.js) that the TypeScript modules plug into. */
import type * as THREE_NS from 'three';
import type { Curriculum } from '../data/types';

export interface ExerciseCtx { ready(on: boolean): void; done(res: CheckResult): void }
export interface CheckResult { ok?: boolean; ans?: string; tr?: string; say?: string; why?: string; neutral?: boolean; silent?: boolean; title?: string }
export interface Exercise { render(root: HTMLElement, ctx: ExerciseCtx): void; check(): CheckResult; kind?: string; noCheck?: boolean; free?: boolean }

/** `who` = persona voice tag (ANEL, APAI, …): picks that persona's take when several personas say the same text. */
export interface TTSApi { speak(text: string, quiet?: boolean, who?: string): void; has(text: string): boolean }
export interface AppState {
  coins: number; xp: number; voice?: string; topic: Record<string, number>; done: Record<string, number>; lang?: string;
  [k: string]: unknown;
}
export interface AppApi {
  D: { TOPIC_GAMES: Record<string, unknown>; audioKey(t: string): string; [k: string]: unknown };
  state(): AppState; save(): void;
  esc(s: string): string; rnd(n: number): number; shuffle<T>(a: T[]): T[];
  qs(sel: string, root?: ParentNode): HTMLElement | null; qsa(sel: string, root?: ParentNode): HTMLElement[];
  tr(o: { ru?: string; en?: string }): string; lang(): 'ru' | 'en';
  sfx: { ok(): void; bad(): void; tap(): void; win(): void; pair?(): void; coin?(): void };
  TTS: TTSApi; toast(msg: string): void;
  sheet(html: string): void; closeSheet(): void; confetti(): void; vibrate(ms: number): void;
  selectOne(el: HTMLElement, onPick: (i: number) => void): void; markCards(el: HTMLElement, right: number, chosen: number): void;
  spk(text: string, cls?: string, who?: string): string; bindSpeak(el: HTMLElement): void; mascot(mood: string): string;
}
/** The API handed to every mini-game by startGame() in web/app.js. */
export interface GameApi {
  esc(s: string): string; shuffle<T>(a: T[]): T[]; rnd(n: number): number;
  qs(sel: string, root?: ParentNode): HTMLElement | null; qsa(sel: string, root?: ParentNode): HTMLElement[];
  sfx: AppApi['sfx']; TTS: TTSApi; toast(msg: string): void; tr(o: { ru?: string; en?: string }): string; lang(): 'ru' | 'en';
  S: AppState; vibrate(ms: number): void; confetti(): void; sheet(html: string): void; closeSheet(): void;
  frame(title: string, inner: string): HTMLElement; stat(html: string): void; onLeave(fn: () => void): void;
  end(res: { score: number; scoreText?: string; coins: number; xp?: number; title?: string; sub?: string; topic?: boolean }): void;
}

export interface Stage3D {
  scene: THREE_NS.Scene; camera: THREE_NS.PerspectiveCamera; renderer: THREE_NS.WebGLRenderer; el: HTMLElement;
  add<T extends THREE_NS.Object3D>(obj: T, x?: number, y?: number, z?: number): T;
  remove(obj: THREE_NS.Object3D): void;
  onTick(fn: (t: number, dt: number) => void): void;
  play(obj: THREE_NS.Object3D, anim: string): void;
  dispose(): void;
}
export interface HumanoidOpts { skin: number; hair?: number; top: number; sleeve?: number; pants?: number; shoes?: number; hover?: boolean; face: (g: CanvasRenderingContext2D) => void }
export interface QV3DApi {
  ok(): boolean; THREE: typeof THREE_NS;
  NEON: Record<string, number>;
  box(w: number, h: number, d: number, mat: number | THREE_NS.Material, x?: number, y?: number, z?: number): THREE_NS.Mesh;
  cyl(rt: number, rb: number, h: number, mat: number | THREE_NS.Material, x?: number, y?: number, z?: number, seg?: number): THREE_NS.Mesh;
  ball(r: number, mat: number | THREE_NS.Material, x?: number, y?: number, z?: number): THREE_NS.Mesh;
  group(x?: number, y?: number, z?: number, ...children: THREE_NS.Object3D[]): THREE_NS.Group;
  lam(color: number, o?: Record<string, unknown>): THREE_NS.MeshLambertMaterial;
  glow(color: number, o?: Record<string, unknown>): THREE_NS.MeshBasicMaterial;
  humanoid(o: HumanoidOpts): THREE_NS.Group;
  face: { eye(g: CanvasRenderingContext2D, x: number, y: number, r: number, iris: string): void; smile(g: CanvasRenderingContext2D, y: number, w: number, open: boolean): void; blush(g: CanvasRenderingContext2D): void };
  stage(el: HTMLElement, o?: { camPos?: number[]; camLook?: number[]; fov?: number; fog?: number; fogNear?: number; fogFar?: number }): Stage3D | null;
  play(obj: THREE_NS.Object3D, name: string): void; sparks(S: Stage3D, x: number, y: number, z: number, color?: number, n?: number): void;
  ease(x: number): number; now(): number;
}
export interface VoiceApi { ready(): boolean; listen(target: string): Promise<{ error?: string; score?: number; passed?: boolean }>; errText(e: string): string; resultHtml(r: unknown): string; stop(): void }

declare global {
  interface Window {
    Q: { api: AppApi; ext: Record<string, unknown> };
    QGAMES: Record<string, (api: GameApi) => void>;
    QV3D?: QV3DApi;
    QVOICE?: VoiceApi;
    QCURRICULUM: Curriculum;
    QLE?: unknown;
  }
}
