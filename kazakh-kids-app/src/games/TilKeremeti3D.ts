/* «Тіл Кереметі» — a 3D wheel of riddles. Original design: the host is Ата (the module mentor), riddles
 * come from the textbook («Білгенге маржан», «Ұйқасын тап», «Кел, жаттайық»).
 * Round: spin → sector (100–500 points, ЖҮЛДЕ prize, ҚАРІП free letter, БОНУС ×2) → guess a letter on the
 * Kazakh keyboard (Ә І Ң Ғ Ү Ұ Қ Ө Һ highlighted) or solve the word. Three hearts for the whole game.
 * Solving by voice: with speech recognition the child SAYS the whole word (single letters are too short
 * for reliable recognition, so letters are tapped). */
import type { Riddle } from '../data/types';
import type { GameApi, Stage3D } from '../types/app';
import { LINES } from '../voice/audioMap';
import { makeCharacter } from './characters';
import { finishTopic, heartsHtml, stageIn } from './shell';

const ALPHABET = 'А Ә Б В Г Ғ Д Е Ё Ж З И Й К Қ Л М Н Ң О Ө П Р С Т У Ұ Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы І Ь Э Ю Я'.split(' ');
export const SPECIAL = ['Ә', 'І', 'Ң', 'Ғ', 'Ү', 'Ұ', 'Қ', 'Ө', 'Һ'];
type Sector = { label: string; kind: 'pts' | 'prize' | 'hint' | 'bonus'; value: number; color: number };
export const SECTORS: Sector[] = [
  { label: '100', kind: 'pts', value: 100, color: 0x22b8f0 }, { label: '300', kind: 'pts', value: 300, color: 0xff8a2a },
  { label: 'ЖҮЛДЕ', kind: 'prize', value: 0, color: 0xffc93c }, { label: '200', kind: 'pts', value: 200, color: 0x7dd23a },
  { label: '500', kind: 'pts', value: 500, color: 0xff4d5e }, { label: 'ҚАРІП', kind: 'hint', value: 0, color: 0x9b6bff },
  { label: '400', kind: 'pts', value: 400, color: 0x18b7a6 }, { label: 'БОНУС', kind: 'bonus', value: 0, color: 0xff4fd8 }
];

/** Pure board logic, unit-testable. */
export class RiddleBoard {
  readonly letters: string[];
  readonly open: boolean[];
  readonly guessed = new Set<string>();
  constructor(readonly riddle: Riddle) {
    this.letters = riddle.answer.split('');
    this.open = this.letters.map((ch) => ch === ' ' || ch === '-');
  }
  get solved(): boolean { return this.open.every(Boolean); }
  hidden(): number { return this.open.filter((o) => !o).length; }
  /** Reveal a letter; returns how many cells opened (0 = not in the word). */
  guess(ch: string): number {
    this.guessed.add(ch); let n = 0;
    this.letters.forEach((l, i) => { if (l === ch && !this.open[i]) { this.open[i] = true; n++; } });
    return n;
  }
  /** ҚАРІП: open one hidden letter, preferring the Kazakh-specific ones. */
  hint(): string | null {
    const idx = this.letters.map((l, i) => i).filter((i) => !this.open[i]);
    if (!idx.length) return null;
    const sp = idx.filter((i) => SPECIAL.indexOf(this.letters[i]) >= 0);
    const ch = this.letters[(sp.length ? sp : idx)[0]];
    this.guess(ch); return ch;
  }
  solve(): void { this.open.fill(true); }
}

export function runTilKeremeti(api: GameApi, gameId: string, riddles: Riddle[]): void {
  const en = api.lang() === 'en', esc = api.esc;
  const pool = api.shuffle(riddles.slice()), ROUNDS = 3, MAXH = 3;
  let round = 0, hearts = MAXH, score = 0, firstTry = 0, solvedCount = 0, value = 0, mult = 1, spinning = false, board: RiddleBoard;
  let roundMiss = false;
  const body = api.frame('Тіл Кереметі', '<div class="wh-stage" id="whs"></div><div class="wh-host" id="whh"></div><div class="wh-clue" id="whc"></div><div class="wh-board" id="whb"></div>' +
    '<div class="wh-ctrl"><button class="btn gold" id="wspin">🎡 ' + (en ? 'Spin' : 'Айналдыр') + '</button><button class="btn ghost" id="wsolve">💡 ' + (en ? 'I know the word' : 'Сөзді білемін') + '</button></div><div class="wh-keys" id="whk"></div>');
  const host = api.qs('#whh', body)!, clue = api.qs('#whc', body)!, boardEl = api.qs('#whb', body)!, keys = api.qs('#whk', body)!;
  const spinBtn = api.qs('#wspin', body) as HTMLButtonElement, solveBtn = api.qs('#wsolve', body) as HTMLButtonElement;

  // 3D wheel (2D fallback: a spinning CSS disc with the same sectors)
  const st = stageIn(api.qs('#whs', body)!, { camPos: [0, 3.2, 7.4], camLook: [0, 1.2, 0], fov: 40 });
  let wheel: import('three').Group | null = null, ata: import('three').Group | null = null, S: Stage3D | null = null;
  let angle = 0, speed = 0, onStop: ((s: Sector) => void) | null = null;
  if (st) {
    const { V } = st; S = st.S; const T = V.THREE;
    wheel = V.group(0, 1.4, 0);
    const n = SECTORS.length;
    SECTORS.forEach((s, i) => {
      const geo = new T.CylinderGeometry(2.2, 2.2, 0.3, 16, 1, false, i / n * Math.PI * 2, Math.PI * 2 / n);
      const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d')!;
      g.fillStyle = '#' + ('00000' + s.color.toString(16)).slice(-6); g.fillRect(0, 0, 256, 64);
      g.fillStyle = '#fff'; g.font = '900 40px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.label, 128, 34);
      const label = new T.Mesh(new T.PlaneGeometry(1.3, 0.33), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true }));
      const mid = (i + 0.5) / n * Math.PI * 2;
      label.position.set(Math.sin(mid) * 1.35, 0.16, Math.cos(mid) * 1.35); label.rotation.x = -Math.PI / 2; label.rotation.z = mid + Math.PI / 2;
      wheel!.add(new T.Mesh(geo, V.lam(s.color)), label);
    });
    wheel.add(V.cyl(0.35, 0.35, 0.4, V.glow(0xffc93c), 0, 0.1, 0, 20));
    wheel.rotation.x = 0.9;                                   // tilted towards the camera
    S.add(wheel);
    const ptr = new T.Mesh(new T.ConeGeometry(0.22, 0.6, 4), V.glow(0xff4d5e)); ptr.rotation.x = Math.PI; S.add(ptr, 0, 1.4 + 2.2 * Math.sin(0.9) + 0.45, -2.2 * Math.cos(0.9));
    ata = S.add(makeCharacter(V, 'ATA'), 2.75, 0, 1.4); ata.scale.setScalar(0.55); ata.rotation.y = -0.6;
    S.onTick((t, dt) => {
      if (!wheel) return;
      if (speed > 0) {
        angle += speed * dt; speed = Math.max(0, speed - 2.2 * dt);
        if (speed === 0 && onStop) { const cb = onStop; onStop = null; cb(sectorAt(angle)); }
      }
      wheel.rotation.y = angle;
    });
  }
  // Sector under the pointer. A cylinder vertex at angle θ sits at (sin θ, 0, cos θ); after the y-spin by `a` and the
  // x-tilt the top edge of the wheel is the local −z direction, i.e. θ + a = π.
  function sectorAt(a: number): Sector {
    const n = SECTORS.length, x = (((Math.PI - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return SECTORS[Math.floor(x / (Math.PI * 2) * n) % n];
  }

  function say(key: keyof typeof LINES.ATA): void {
    const t = LINES.ATA[key];
    host.innerHTML = '<b>Ата:</b> ' + esc(t); api.TTS.speak(t, true);
    if (S && ata && window.QV3D) window.QV3D.play(ata, key === 'no' ? 'idle' : 'bata');
  }
  function drawBoard(): void {
    boardEl.innerHTML = board.letters.map((l, i) => l === ' ' ? '<i class="sp"></i>' :
      '<span class="cell' + (board.open[i] ? ' on' : '') + (SPECIAL.indexOf(l) >= 0 ? ' kz' : '') + '">' + (board.open[i] ? esc(l) : '') + '</span>').join('');
    api.stat(heartsHtml(hearts, MAXH) + ' · ⭐ ' + score + (mult > 1 ? ' · ×' + mult : ''));
  }
  function drawKeys(enabled: boolean): void {
    keys.innerHTML = ALPHABET.map((ch) => '<button class="key' + (SPECIAL.indexOf(ch) >= 0 ? ' kz' : '') + '" data-k="' + ch + '"' + (!enabled || board.guessed.has(ch) ? ' disabled' : '') + '>' + ch + '</button>').join('');
    api.qsa('[data-k]', keys).forEach((b) => { b.onclick = () => letter(b.getAttribute('data-k')!); });
  }

  function startRound(): void {
    if (round >= ROUNDS || hearts <= 0 || round >= pool.length) return finish();
    board = new RiddleBoard(pool[round]); roundMiss = false; value = 0;
    clue.innerHTML = '<p class="kk"><button class="spk sm" data-say="' + esc(board.riddle.clue) + '">🔊</button> ' + esc(board.riddle.clue) + '</p><p class="tr">' + esc(en ? board.riddle.en : board.riddle.ru) + '</p><small class="muted">📖 ' + esc(board.riddle.src) + '</small>';
    api.qsa('[data-say]', clue).forEach((b) => { b.onclick = () => api.TTS.speak(b.getAttribute('data-say')!); });
    drawBoard(); drawKeys(false); spinBtn.disabled = false;
    say(round === 0 ? 'hello' : 'spin');
    setTimeout(() => api.TTS.speak(board.riddle.clue, true), 2200);
  }

  spinBtn.onclick = () => {
    if (spinning) return;
    spinning = true; spinBtn.disabled = true; api.sfx.tap();
    const done = (s: Sector) => { spinning = false; landed(s); };
    if (wheel) { speed = 9 + Math.random() * 5; onStop = done; }
    else setTimeout(() => done(SECTORS[api.rnd(SECTORS.length)]), 600);
  };

  function landed(s: Sector): void {
    if (s.kind === 'pts') { value = s.value * mult; mult = 1; host.innerHTML = '<b>Ата:</b> ' + s.value + (en ? ' points for each letter!' : ' ұпай — әр әріп үшін!'); drawKeys(true); }
    else if (s.kind === 'prize') { api.S.coins = (api.S.coins || 0) + 20; say('prize'); value = 200; drawKeys(true); }
    else if (s.kind === 'hint') { say('hint'); const ch = board.hint(); api.sfx.ok(); drawBoard(); if (board.solved) return solved(); value = 100; drawKeys(true); if (ch) api.toast('🔤 ' + ch); }
    else { say('bonus'); mult = 2; value = 0; spinBtn.disabled = false; }
    drawBoard();
  }

  function letter(ch: string): void {
    drawKeys(false);
    const n = board.guess(ch);
    if (n > 0) { score += value * n; api.sfx.ok(); say('yes'); drawBoard(); if (board.solved) return solved(); }
    else { hearts--; roundMiss = true; api.sfx.bad(); api.vibrate(40); say('no'); drawBoard(); if (hearts <= 0) { setTimeout(finish, 1200); return; } }
    spinBtn.disabled = false;
  }

  solveBtn.onclick = () => {
    if (!board || board.solved) return;
    const others = api.shuffle(riddles.filter((r) => r.answer !== board.riddle.answer)).slice(0, 2).map((r) => r.answer);
    const opts = api.shuffle([board.riddle.answer].concat(others));
    const voice = window.QVOICE && window.QVOICE.ready();
    api.sheet('<h3>' + esc(en ? 'What is the word?' : 'Қандай сөз?') + '</h3><div class="cards list">' + opts.map((o, i) => '<button class="card" data-o="' + i + '"><span>' + esc(o) + '</span></button>').join('') + '</div>' +
      (voice ? '<button class="btn gold" id="wsay">🎙️ ' + esc(en ? 'Say the word' : 'Сөзді айт') + '</button>' : '') + '<button class="btn ghost" id="wno">' + (en ? 'Back' : 'Артқа') + '</button>');
    api.qsa('[data-o]').forEach((b) => { b.onclick = () => { api.closeSheet(); trySolve(opts[+b.getAttribute('data-o')!] === board.riddle.answer); }; });
    const ws = api.qs('#wsay'); if (ws) ws.onclick = () => {
      ws.textContent = '🎙️ …';
      window.QVOICE!.listen(board.riddle.answer.toLowerCase()).then((r) => { api.closeSheet(); if (r.error) { api.toast(window.QVOICE!.errText(r.error)); return; } api.toast(Math.round(r.score || 0) + '%'); if (r.passed) { score += 100; trySolve(true); } else api.toast(en ? 'Not yet — try again or tap the word' : 'Пока не так — скажи ещё раз или выбери слово'); });
    };
    api.qs('#wno')!.onclick = () => api.closeSheet();
  };

  function trySolve(ok: boolean): void {
    if (ok) { score += 100 * board.hidden(); board.solve(); solved(); return; }
    hearts--; roundMiss = true; api.sfx.bad(); say('no'); drawBoard(); if (hearts <= 0) setTimeout(finish, 1200);
  }
  function solved(): void {
    drawBoard(); drawKeys(false); spinBtn.disabled = true; solvedCount++; if (!roundMiss) firstTry++;
    say('solved'); api.confetti();
    if (S && window.QV3D) window.QV3D.sparks(S, 0, 2.5, 0.5, 0xffc93c, 30);
    setTimeout(() => api.TTS.speak(board.riddle.answer.toLowerCase(), true), 1400);
    round++; setTimeout(startRound, 3200);
  }
  function finish(): void {
    say('bye');
    finishTopic(api, gameId, firstTry, ROUNDS, {
      score: solvedCount, scoreText: solvedCount + ' / ' + ROUNDS + ' · ' + score + ' ұпай', coins: Math.round(score / 100) + solvedCount * 5, xp: Math.min(15, 4 * solvedCount),
      title: solvedCount === ROUNDS ? 'Бәрекелді!' : solvedCount ? 'Жарайсың!' : 'Тағы ойнайық!',
      sub: (en ? 'Riddles solved: ' : 'Отгадано загадок: ') + solvedCount + ' / ' + ROUNDS
    });
  }
  startRound();
}
