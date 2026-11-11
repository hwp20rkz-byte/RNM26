/* Branching roleplay dialogues («Автобустағы жағдаят», «Жас сәулетшінің сұхбаты»).
 * DialogueEngine is a pure state machine over the node graph in curriculum.json; renderDialogue() draws it
 * with a small 3D scene, voice-over for every line (persona voices) and, when speech recognition is
 * available, a 🎙️ button that lets the child SAY the right answer for bonus XP. */
import type { Choice, Dialogue, DNode, PersonaId } from '../data/types';
import type { GameApi } from '../types/app';
import { PERSONAS } from '../voice/audioMap';
import { makeCharacter, type CharId } from '../games/characters';
import { fullBuilding } from '../games/buildings';
import { finishTopic, heartsHtml, stageIn } from '../games/shell';

export interface ChoiceOutcome { ok: boolean; why?: { ru: string; en: string }; xp: number; next: string; heartsLeft: number; firstTry: boolean }

export class DialogueEngine {
  node: string;
  hearts: number;
  xp = 0;
  history: string[] = [];
  private tried = new Set<string>();
  private firstOk = 0;
  private asked = 0;

  constructor(readonly d: Dialogue, readonly maxHearts = 3) { this.node = d.start; this.hearts = maxHearts; }

  get current(): DNode { return this.d.nodes[this.node]; }
  get finished(): boolean { return !!this.current.end || this.hearts <= 0; }
  get failed(): boolean { return this.hearts <= 0; }
  /** Share of choice points answered right on the first attempt. */
  get score(): { firstTry: number; total: number } { return { firstTry: this.firstOk, total: this.asked }; }

  /** Linear node → next node. */
  advance(): string {
    const n = this.current;
    if (n.choices || n.end) throw new Error('DialogueEngine.advance() on a choice or end node «' + this.node + '»');
    this.history.push(this.node); this.node = n.next!;
    return this.node;
  }

  choose(i: number, spokenBonus = 0): ChoiceOutcome {
    const n = this.current, c: Choice | undefined = n.choices && n.choices[i];
    if (!c) throw new Error('DialogueEngine.choose(): no choice ' + i + ' at «' + this.node + '»');
    const first = !this.tried.has(this.node);
    if (first) { this.tried.add(this.node); this.asked++; }
    let xp = 0;
    if (c.ok) { if (first) this.firstOk++; xp = (c.xp || 10) * (first ? 1 : 0.5) + spokenBonus; this.xp += xp; }
    else this.hearts = Math.max(0, this.hearts - 1);
    this.history.push(this.node); this.node = c.next;
    return { ok: c.ok, why: c.why, xp, next: c.next, heartsLeft: this.hearts, firstTry: first && c.ok };
  }
}

const CAST: Record<string, CharId> = { ALIBEK: 'ALIBEK', ANEL: 'ANEL', ZHALKAU: 'ZHALKAU', ATA: 'ATA', AZHE: 'AZHE', ARCH: 'ARCH' };

export function renderDialogue(api: GameApi, gameId: string, d: Dialogue): void {
  const E = new DialogueEngine(d);
  const en = api.lang() === 'en', esc = api.esc;
  const body = api.frame(d.kk, '<div class="dlg-stage" id="dst"></div><div class="dlg-box" id="dbox"></div>');
  const stageEl = api.qs('#dst', body)!, box = api.qs('#dbox', body)!;
  const actors: Partial<Record<string, import('three').Group>> = {};
  const st = stageIn(stageEl, d.scene === 'bus' ? { camPos: [0, 3.4, 8.5], camLook: [0, 1.6, 0], fov: 42 } : { camPos: [0, 5.5, 15], camLook: [0, 4, 0], fov: 45 });
  if (st) {
    const { V, S } = st;
    if (d.scene === 'bus') {
      S.add(V.box(10, 0.2, 5, 0x5a6378, 0, -0.1, 0));                                            // floor
      S.add(V.box(10, 4.2, 0.2, 0xe9ecf3, 0, 2.0, -2.4));                                          // back wall
      for (let i = 0; i < 3; i++) S.add(V.box(2.6, 1.3, 0.05, V.lam(0x9ad7ff, { transparent: true, opacity: 0.7 }), -3 + i * 3, 2.6, -2.28));   // windows
      [-2.6, 0.4].forEach((x) => { S.add(V.box(1.6, 0.25, 1.0, 0x2456c9, x, 0.85, -1.6)); S.add(V.box(1.6, 1.0, 0.2, 0x2456c9, x, 1.4, -2.05)); });   // seats
      S.add(V.cyl(0.05, 0.05, 4, 0xffc93c, 1.9, 2, -0.6, 8));
      actors.ALIBEK = S.add(makeCharacter(V, 'ALIBEK'), -3.0, 0.45, -1.4);
      actors.ZHALKAU = S.add(makeCharacter(V, 'ZHALKAU'), 0.0, 0.45, -1.4);
      [actors.ALIBEK, actors.ZHALKAU].forEach((a) => { a!.scale.setScalar(0.62); a!.userData.baseY = 0.45; });
      actors.AZHE = S.add(makeCharacter(V, 'AZHE'), 6.5, 0, 0.6); actors.AZHE.scale.setScalar(0.7); actors.AZHE.rotation.y = -0.5;
    } else {
      S.add(V.box(30, 0.2, 30, 0xcfd8e6, 0, -0.1, 0));
      const b = S.add(fullBuilding(V, 'baiterek'), 0, 0, -3); b.scale.setScalar(1.05);
      actors.ALIBEK = S.add(makeCharacter(V, 'ALIBEK'), -2.4, 0, 3); actors.ALIBEK.rotation.y = 0.4;
      actors.ARCH = S.add(makeCharacter(V, 'ARCH'), 2.4, 0, 3); actors.ARCH.rotation.y = -0.4;
      S.onTick((t) => { b.rotation.y = Math.sin(t * 0.3) * 0.25; });
    }
  }

  function who(id: PersonaId): string { return PERSONAS[id] ? PERSONAS[id].name : id; }
  function animate(n: DNode): void {
    if (!st) return;
    const a = actors[n.who];
    if (n.anim === 'enter' && actors.AZHE) {
      const z = actors.AZHE; const t0 = performance.now(); st.V.play(z, 'run');
      st.S.onTick(() => { const k = Math.min(1, (performance.now() - t0) / 1600); z.position.x = 6.5 - k * 4.2; if (k >= 1 && z.userData.anim === 'run') st.V.play(z, 'idle'); });
    } else if (a && n.anim) st.V.play(a, n.anim === 'sad' ? 'idle' : n.anim);
    else if (a) st.V.play(a, 'cheer');
  }

  function show(): void {
    const n = E.current;
    api.stat(heartsHtml(E.hearts, E.maxHearts) + ' · ⭐ ' + Math.round(E.xp));
    animate(n);
    api.TTS.speak(n.kk, true);
    let h = '<div class="dlg-line"><b class="dlg-who">' + esc(who(n.who)) + '</b><p class="kk"><button class="spk sm" data-say="' + esc(n.kk) + '">🔊</button> ' + esc(n.kk) + '</p><p class="tr">' + esc(en ? n.en : n.ru) + '</p></div>';
    if (n.choices) {
      const voice = window.QVOICE && window.QVOICE.ready();
      h += '<div class="dlg-choices">' + n.choices.map((c, i) =>
        '<div class="dlg-ch"><button class="card" data-c="' + i + '"><span class="kk">' + esc(c.kk) + '</span><small>' + esc(en ? c.en : c.ru) + '</small></button>' +
        '<button class="spk sm" data-say="' + esc(c.kk) + '">🔊</button>' + (voice && c.speak ? '<button class="spk sm mic-s" data-mic="' + i + '" title="Айт">🎙️</button>' : '') + '</div>').join('') + '</div>' +
        (voice ? '<p class="muted center">' + esc(en ? '🎙️ Say the answer aloud for +5 XP' : '🎙️ Скажи ответ вслух — получишь +5 XP') + '</p>' : '');
    } else h += '<button class="btn ok" id="dnext">' + (n.end ? 'Аяқтау · ' + (en ? 'finish' : 'завершить') : 'Жалғастыру') + '</button>';
    box.innerHTML = h;
    api.qsa('[data-say]', box).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); api.TTS.speak(b.getAttribute('data-say')!); }; });
    const nx = api.qs('#dnext', box);
    if (nx) nx.onclick = () => { api.sfx.tap(); if (n.end) return finish(); E.advance(); show(); };
    api.qsa('[data-c]', box).forEach((b) => { b.onclick = () => pick(+b.getAttribute('data-c')!, 0); });
    api.qsa('[data-mic]', box).forEach((b) => {
      b.onclick = () => {
        const i = +b.getAttribute('data-mic')!, c = n.choices![i];
        b.classList.add('on'); api.toast(en ? 'Listening…' : 'Слушаю…');
        window.QVOICE!.listen(c.kk).then((r) => {
          b.classList.remove('on');
          if (r.error) { api.toast(window.QVOICE!.errText(r.error)); return; }
          api.toast((r.passed ? '✅ ' : '🔁 ') + Math.round(r.score || 0) + '%');
          if (r.passed) pick(i, 5);
        });
      };
    });
  }

  function pick(i: number, bonus: number): void {
    const n = E.current, c = n.choices![i], r = E.choose(i, bonus);
    if (r.ok) { api.sfx.ok(); api.TTS.speak(c.kk, true); show(); return; }
    api.sfx.bad(); api.vibrate(40);
    if (st && actors.ZHALKAU && d.scene === 'bus') st.V.play(actors.ZHALKAU, 'idle');
    box.innerHTML = '<div class="dlg-line bad"><b>💔 ' + esc(c.kk) + '</b><p class="why">💡 ' + esc(r.why ? (en ? r.why.en : r.why.ru) : '') + '</p></div>' +
      '<button class="btn" id="dnext">' + (E.failed ? (en ? 'Finish' : 'Завершить') : (en ? 'Try again' : 'Подумать ещё')) + '</button>';
    api.stat(heartsHtml(E.hearts, E.maxHearts) + ' · ⭐ ' + Math.round(E.xp));
    api.qs('#dnext', box)!.onclick = () => { if (E.failed) return finish(); show(); };
  }

  function finish(): void {
    const s = E.score;
    finishTopic(api, gameId, s.firstTry, s.total, {
      coins: Math.round(E.xp / 3) + (E.failed ? 0 : 10), xp: Math.min(20, Math.round(E.xp / 5)),
      title: E.failed ? 'Тағы жаттық!' : s.firstTry === s.total ? 'Керемет! Мінсіз!' : 'Жарайсың!',
      sub: (en ? 'First-try answers: ' : 'С первой попытки: ') + s.firstTry + ' / ' + s.total + ' · ⭐ ' + Math.round(E.xp) + ' XP'
    });
  }

  show();
}
