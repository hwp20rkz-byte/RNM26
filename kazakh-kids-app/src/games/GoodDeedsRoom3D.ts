/* «Жақсы істер бөлмесі» — tidy Жалқаубек's room. Each scattered item is named in Kazakh; the child picks
 * where it goes and hears the model sentence «Бұл менің кітабым, оны сөреге қоямын». The room and
 * Жалқаубек change as it gets tidier (messy → ұқыпты). Tap-based placement instead of physics drag:
 * the learning goal is the sentence, and a physics engine would double the download for no learning gain. */
import type { Container, RoomItem } from '../data/types';
import type { GameApi } from '../types/app';
import type { Group, Object3D } from 'three';
import { LINES } from '../voice/audioMap';
import { makeCharacter } from './characters';
import { finishTopic, heartsHtml, stageIn, tween } from './shell';

interface RoomData { containers: Container[]; items: RoomItem[]; start: string; end: string }

export function runRoom(api: GameApi, gameId: string, room: RoomData): void {
  const en = api.lang() === 'en', esc = api.esc;
  const items = api.shuffle(room.items.slice());
  let i = 0, hearts = 3, firstTry = 0, missed = false, busy = false;
  const body = api.frame('Жақсы істер бөлмесі', '<div class="rm-stage" id="rms"></div><div class="rm-meter"><i id="rmm"></i></div><div class="rm-panel" id="rmp"></div>');
  const panel = api.qs('#rmp', body)!, meter = api.qs('#rmm', body)!;
  const st = stageIn(api.qs('#rms', body)!, { camPos: [0, 6.5, 10], camLook: [0, 1.2, 0], fov: 46 });
  const props: Record<string, Object3D> = {}, spots: Record<string, [number, number, number]> = {};
  let zh: Group | null = null;

  if (st) {
    const { V, S } = st;
    S.add(V.box(12, 0.2, 9, 0xd9c2a0, 0, -0.1, 0)); S.add(V.box(12, 5, 0.2, 0xe8eefc, 0, 2.4, -4.5)); S.add(V.box(0.2, 5, 9, 0xdfe7fa, -6, 2.4, 0));
    S.add(V.box(3, 0.7, 1.8, 0x3a5aa0, 3.8, 0.35, -3.4)); const blanket = S.add(V.box(2.6, 0.15, 1.6, 0xff8a2a, 3.6, 0.8, -3.2)); blanket.rotation.z = 0.25;  // unmade bed
    // containers
    const build: Record<string, () => Object3D> = {
      sore: () => V.group(0, 0, 0, V.box(2.4, 0.12, 0.6, 0x8a5a2a, 0, 0, 0), V.box(2.4, 0.12, 0.6, 0x8a5a2a, 0, 0.8, 0)),
      shkaf: () => V.group(0, 0, 0, V.box(1.6, 3.2, 1.0, 0xb07a4a, 0, 1.6, 0), V.box(0.08, 0.5, 0.08, 0xffc93c, 0.2, 1.8, 0.52)),
      sebet: () => V.cyl(0.55, 0.45, 0.8, 0xd8b26a, 0, 0.4, 0, 12),
      qorap: () => V.box(1.2, 0.8, 0.9, 0xe0544a, 0, 0.4, 0),
      somke: () => V.box(0.8, 0.9, 0.4, 0x2456c9, 0, 0.45, 0),
      qoqys: () => V.cyl(0.4, 0.35, 0.8, 0x5a6378, 0, 0.4, 0, 12)
    };
    const at: Record<string, [number, number, number]> = { sore: [-5.5, 2.4, -2], shkaf: [-4.6, 0, -3.8], sebet: [-1.6, 0, -3.6], qorap: [0.6, 0, -3.7], somke: [-3.2, 0, 2.6], qoqys: [5.2, 0, 2.6] };
    room.containers.forEach((c) => {
      const o = S.add(build[c.id] ? build[c.id]() : V.box(1, 1, 1, 0xcccccc), ...(at[c.id] || [0, 0, 0]));
      if (c.id === 'sore') o.rotation.y = Math.PI / 2;
      spots[c.id] = [o.position.x, (c.id === 'sore' ? 2.6 : c.id === 'shkaf' ? 1.6 : 0.9), o.position.z];
    });
    // items scattered on the floor
    const make: Record<string, () => Object3D> = {
      kitap: () => V.box(0.7, 0.18, 0.5, 0x2fbf5a), koilek: () => V.box(0.9, 0.08, 0.8, 0x18b7a6), shulyq: () => V.box(0.25, 0.1, 0.5, 0xff4fd8),
      dop: () => V.ball(0.32, 0xffffff), oiynshyq: () => V.group(0, 0, 0, V.ball(0.3, 0xa0703a, 0, 0.3, 0), V.ball(0.2, 0xa0703a, 0, 0.7, 0), V.ball(0.08, 0xa0703a, -0.14, 0.88, 0), V.ball(0.08, 0xa0703a, 0.14, 0.88, 0)),
      qalam: () => { const p = V.cyl(0.05, 0.05, 0.7, 0xffc93c); p.rotation.z = Math.PI / 2; return p; }, dapter: () => V.box(0.55, 0.06, 0.4, 0x22b8f0),
      qoqys: () => { const b = V.cyl(0.08, 0.12, 0.7, 0xffd84a); b.rotation.z = 1.2; return b; }
    };
    const floor: [number, number][] = [[-1.5, 0.5], [1.2, 1.3], [2.6, -0.4], [-0.2, 2.4], [3.4, 1.6], [-2.8, -0.6], [0.6, -1.2], [4.4, -0.9]];
    items.forEach((x, k) => { const o = S.add((make[x.id] || (() => V.box(0.4, 0.4, 0.4, 0xcccccc)))(), floor[k % floor.length][0], 0.2, floor[k % floor.length][1]); o.rotation.y = k; props[x.id] = o; });
    zh = S.add(makeCharacter(V, 'ZHALKAU'), 3.6, 0, 0.6); zh.scale.setScalar(0.6); zh.rotation.y = -0.6;
    S.onTick((t) => { const cur = items[i]; if (cur && props[cur.id] && !busy) props[cur.id].position.y = 0.3 + Math.abs(Math.sin(t * 4)) * 0.35; });
  }

  api.TTS.speak(room.start, true);
  panel.innerHTML = '<p class="kk"><b>Жалқаубек:</b> ' + esc(room.start) + '</p><p class="kk"><b>Әлібек:</b> ' + esc(LINES.ALIBEK.room) + '</p><button class="btn ok" id="rgo">' + (en ? 'Let’s tidy up!' : 'Жинайық!') + '</button>';
  api.qs('#rgo', panel)!.onclick = () => { api.sfx.tap(); ask(); };

  function ask(): void {
    if (i >= items.length) return done();
    const x = items[i]; missed = false; busy = false;
    api.stat(heartsHtml(hearts, 3) + ' · 🧹 ' + i + '/' + items.length);
    meter.style.width = Math.round(i / items.length * 100) + '%';
    panel.innerHTML = '<p class="kk center"><span class="rm-e">' + esc(x.e) + '</span> <b>' + esc(x.kk) + '</b> <button class="spk sm" data-say="' + esc(x.kk) + '">🔊</button></p>' +
      '<p class="center"><b>' + esc(LINES.APAI.where) + '</b></p>' +
      '<div class="rm-cont">' + room.containers.map((c) => '<button class="card" data-c="' + c.id + '"><span>' + esc(c.e) + '</span><b>' + esc(c.kk) + '</b><small>' + esc(api.tr(c)) + '</small></button>').join('') + '</div>';
    api.qsa('[data-say]', panel).forEach((b) => { b.onclick = () => api.TTS.speak(b.getAttribute('data-say')!); });
    api.TTS.speak(x.kk, true);
    api.qsa('[data-c]', panel).forEach((el) => {
      el.onclick = () => {
        if (busy) return;
        const to = el.getAttribute('data-c');
        if (to === x.to) {
          busy = true; el.classList.add('right'); api.sfx.ok(); if (!missed) firstTry++;
          api.TTS.speak(x.say, true);
          panel.insertAdjacentHTML('afterbegin', '<p class="rm-say kk">✅ ' + esc(x.say) + '<br><small class="tr">' + esc(en ? x.en : x.ru) + '</small></p>');
          fly(x, () => { i++; if (i === Math.ceil(items.length / 2)) api.TTS.speak(LINES.ZHALKAU.mid, true); setTimeout(ask, 900); });
        } else {
          el.classList.add('wrong', 'shake'); api.sfx.bad(); api.vibrate(40); missed = true; hearts--;
          const good = room.containers.find((c) => c.id === x.to)!;
          api.toast('💡 ' + x.kk + ' → ' + good.kk);
          api.stat(heartsHtml(hearts, 3) + ' · 🧹 ' + i + '/' + items.length);
          if (hearts <= 0) setTimeout(() => done(true), 900);
        }
      };
    });
  }
  function fly(x: RoomItem, cb: () => void): void {
    if (!st || !props[x.id] || !spots[x.to]) return cb();
    const o = props[x.id], [ax, ay, az] = [o.position.x, o.position.y, o.position.z], [bx, by, bz] = spots[x.to];
    tween(st.S, 800, (k) => { o.position.set(ax + (bx - ax) * k, ay + (by - ay) * k + Math.sin(k * Math.PI) * 2, az + (bz - az) * k); }, () => { o.visible = x.to !== 'qoqys' && x.to !== 'somke' && x.to !== 'qorap' && x.to !== 'sebet' && x.to !== 'shkaf'; cb(); });
  }
  function done(failed?: boolean): void {
    meter.style.width = failed ? meter.style.width : '100%';
    if (!failed) {
      api.TTS.speak(room.end, true); api.confetti();
      if (st && zh && window.QV3D) {                       // Жалқаубек becomes ұқыпты
        const { V, S } = st, p = zh.position.clone(); S.remove(zh);
        zh = S.add(makeCharacter(V, 'ZHALKAU_TIDY'), p.x, 0, p.z); zh.scale.setScalar(0.6); V.play(zh, 'cheer'); V.sparks(S, p.x, 2, p.z, 0x7dff5a, 30);
      }
      panel.innerHTML = '<p class="kk center"><b>Жалқаубек:</b> ' + esc(room.end) + '</p>';
    }
    setTimeout(() => finishTopic(api, gameId, firstTry, items.length, {
      title: failed ? 'Тағы жаттық!' : firstTry === items.length ? 'Керемет! Мінсіз!' : 'Жарайсың!',
      sub: (en ? 'First-try answers: ' : 'С первой попытки: ') + firstTry + ' / ' + items.length
    }), failed ? 500 : 2600);
  }
}
