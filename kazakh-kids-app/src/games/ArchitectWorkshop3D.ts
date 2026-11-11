/* «Сәулетші шеберханасы» — assemble Бәйтерек, Ханшатыр or the pupils' palace model tier by tier.
 * Each tier unlocks after a question on the module-4 vocabulary; a ghost silhouette shows what is missing.
 * (The first-person walk through the Presidential Park from the brief is intentionally not built:
 *  free camera movement on entry-level Android phones in a WebView is slow and disorienting for 9-year-olds.) */
import type { Blueprint } from '../data/types';
import type { GameApi } from '../types/app';
import { LINES } from '../voice/audioMap';
import { buildTier, fullBuilding, TIERS } from './buildings';
import { makeCharacter } from './characters';
import { finishTopic, heartsHtml, stageIn, tween } from './shell';

export function runWorkshop(api: GameApi, gameId: string, blueprints: Blueprint[]): void {
  const en = api.lang() === 'en', esc = api.esc;
  const body = api.frame('Сәулетші шеберханасы', '<div class="ws-stage" id="wss"></div><div class="ws-panel" id="wsp"></div>');
  const panel = api.qs('#wsp', body)!;
  const st = stageIn(api.qs('#wss', body)!, { camPos: [0, 6.5, 19], camLook: [0, 4.4, 0], fov: 42 });
  let ghost: import('three').Group | null = null, built: import('three').Group | null = null;
  if (st) {
    const { V, S } = st;
    S.add(V.box(24, 0.2, 24, 0xdfe6f2, 0, -0.1, 0));
    const ali = S.add(makeCharacter(V, 'ALIBEK'), -4.2, 0, 3); ali.rotation.y = 0.5;
    S.onTick((t) => { if (built) built.rotation.y = t * 0.25; if (ghost) ghost.rotation.y = t * 0.25; });
  }

  function choose(): void {
    api.stat('');
    panel.innerHTML = '<p class="kk center"><b>' + esc(LINES.APAI.pick) + '</b></p><div class="cards list">' + blueprints.map((b, i) =>
      '<button class="card" data-b="' + i + '"><span class="idx">' + (i + 1) + '</span><span><b>' + esc(b.kk) + '</b><small> · ' + esc(b.city) + ' · ' + esc(api.tr(b)) + '</small></span></button>').join('') + '</div>';
    api.TTS.speak(LINES.APAI.pick, true);
    api.qsa('[data-b]', panel).forEach((el) => { el.onclick = () => { api.sfx.tap(); start(blueprints[+el.getAttribute('data-b')!]); }; });
  }

  function start(bp: Blueprint): void {
    let i = 0, hearts = 3, firstTry = 0, missed = false;
    if (st) {
      const { V, S } = st;
      if (ghost) S.remove(ghost); if (built) S.remove(built);
      ghost = fullBuilding(V, bp.id);
      ghost.traverse((m) => { const mesh = m as import('three').Mesh; if (mesh.isMesh) mesh.material = V.lam(0x9aa6c4, { transparent: true, opacity: 0.12, wireframe: true }); });
      S.add(ghost); built = V.group(); S.add(built);
    }
    api.TTS.speak(LINES.ALIBEK.workshop, true);
    ask();

    function ask(): void {
      if (i >= bp.tiers.length) return done();
      const t = bp.tiers[i], opts = api.shuffle(t.opts); missed = false;
      api.stat(heartsHtml(hearts, 3) + ' · 🏗️ ' + i + '/' + bp.tiers.length);
      panel.innerHTML = '<p class="muted center">' + esc(bp.kk) + ' · ' + esc(t.kk) + ' — ' + esc(api.tr(t)) + '</p>' +
        '<p class="kk center"><button class="spk sm" data-say="' + esc(t.q) + '">🔊</button> <b>' + esc(t.q) + '</b></p>' +
        '<div class="cards list">' + opts.map((o, k) => '<button class="card" data-o="' + k + '"><span class="idx">' + (k + 1) + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>';
      api.qsa('[data-say]', panel).forEach((b) => { b.onclick = () => api.TTS.speak(b.getAttribute('data-say')!); });
      api.TTS.speak(t.q, true);
      api.qsa('[data-o]', panel).forEach((el) => {
        el.onclick = () => {
          const o = opts[+el.getAttribute('data-o')!];
          if (o === t.ans) {
            el.classList.add('right'); api.sfx.ok(); api.TTS.speak(t.ans, true); if (!missed) firstTry++;
            place(t.id); i++; setTimeout(ask, 1300);
          } else {
            el.classList.add('wrong', 'shake'); api.sfx.bad(); api.vibrate(40); missed = true; hearts--;
            api.stat(heartsHtml(hearts, 3) + ' · 🏗️ ' + i + '/' + bp.tiers.length);
            if (hearts <= 0) { api.toast((en ? 'Answer: ' : 'Ответ: ') + t.ans); setTimeout(() => done(true), 1400); }
          }
        };
      });
    }
    function place(tier: string): void {
      if (!st || !built) return;
      const { V, S } = st, piece = buildTier(V, bp.id, tier);
      piece.position.y = 6; built.add(piece);
      tween(S, 650, (k) => { piece.position.y = 6 * (1 - k); }, () => { V.sparks(S, 0, 1 + TIERS[bp.id].indexOf(tier) * 1.6, 0, 0xffc93c, 18); });
    }
    function done(failed?: boolean): void {
      if (!failed) { api.TTS.speak(bp.done, true); api.confetti(); panel.innerHTML = '<p class="kk center"><b>' + esc(bp.done) + '</b></p>'; }
      setTimeout(() => finishTopic(api, gameId, firstTry, bp.tiers.length, {
        title: failed ? 'Тағы жаттық!' : firstTry === bp.tiers.length ? 'Керемет! Мінсіз!' : 'Жарайсың!',
        sub: bp.kk + ' · ' + (en ? 'first-try answers: ' : 'с первой попытки: ') + firstTry + ' / ' + bp.tiers.length,
        coins: firstTry * 2 + (failed ? 0 : 10)
      }), failed ? 600 : 2600);
    }
  }

  choose();
}
