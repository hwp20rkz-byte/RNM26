/* New exercise archetypes for modules 2 and 4, plugged into the lesson generator of web/app.js
 * through window.Q.ext.extraEx(lesson, add):
 *   affix  — «Жалғау шебері»: root + [ ? ] → pick the ending that keeps vowel harmony / assimilation;
 *   buster — «Қатені тап»: hear [ұқұпту], pick the correctly WRITTEN form;
 *   post   — «Шылауды орнына қой»: drag (or tap) a helper word / postposition into the sentence.
 * Every wrong answer comes back with a one-line explanation (`why`) shown in the feedback bar. */
import type { Affix, Buster, Post } from '../data/types';
import type { AppApi, Exercise, ExerciseCtx } from '../types/app';

export function registerExercises(Q: { api: AppApi; ext: Record<string, unknown> }): void {
  const A = Q.api;
  const en = () => A.lang() === 'en';
  const tag = (kk: string, ru: string, enText: string) => '<span class="tag">' + A.esc(kk) + ' · ' + A.esc(en() ? enText : ru) + '</span>';

  function choiceCards(el: HTMLElement, opts: string[], prefix: string, onPick: (i: number) => void): void {
    el.insertAdjacentHTML('beforeend', '<div class="chips">' + opts.map((o, i) => '<button class="card" data-i="' + i + '">' + A.esc(prefix + o) + '</button>').join('') + '</div>');
    A.selectOne(el, onPick);
  }

  function affix(x: Affix): Exercise {
    let el: HTMLElement, opts: string[] = [], sel = -1;
    const word = () => (x.person ? x.person + ' ' : '') + x.root + x.ans;
    return {
      render(root: HTMLElement, ctx: ExerciseCtx) {
        el = root; sel = -1; opts = A.shuffle(x.opts);
        el.innerHTML = tag('🧩 Жалғау шебері', 'мастер окончаний', 'ending master') +
          '<h2 class="task">' + A.esc(en() ? 'Pick the ending that fits' : 'Выбери окончание по закону сингармонизма') + '</h2>' +
          '<div class="affix-box"><span class="af-person">' + A.esc(x.person || '') + '</span><span class="af-root">' + A.esc(x.root) + '</span><span class="af-plus">+</span><span class="af-slot empty" id="afs">?</span></div>' +
          '<p class="hint center">' + A.esc(A.tr(x)) + '</p>';
        choiceCards(el, opts, '-', (i) => { sel = i; const s = A.qs('#afs', el)!; s.textContent = opts[i]; s.classList.remove('empty'); ctx.ready(true); });
      },
      check() {
        A.markCards(el, opts.indexOf(x.ans), sel);
        const ok = opts[sel] === x.ans;
        return { ok, ans: word(), tr: A.tr(x), say: word(), why: ok ? undefined : (en() ? x.whyEn : x.why) };
      }
    };
  }

  function buster(x: Buster): Exercise {
    let el: HTMLElement, opts: string[] = [], sel = -1;
    return {
      render(root: HTMLElement, ctx: ExerciseCtx) {
        el = root; sel = -1; opts = A.shuffle(x.opts);
        el.innerHTML = tag('🔎 Қатені тап', 'найди ошибку', 'spot the mistake') +
          '<h2 class="task">' + A.esc(x.said ? (en() ? 'You hear this. How is it WRITTEN?' : 'Так слышится. А как ПИШЕТСЯ?') : (en() ? 'Which one is written correctly?' : 'Где написано без ошибки?')) + '</h2>' +
          (x.said ? '<div class="said">' + A.spk(x.ans) + '<b>' + A.esc(x.said) + '</b></div>' : '<div class="said">' + A.spk(x.ans) + '<b>' + A.esc(A.tr(x)) + '</b></div>');
        el.insertAdjacentHTML('beforeend', '<div class="cards list">' + opts.map((o, i) => '<button class="card" data-i="' + i + '"><span class="idx">' + (i + 1) + '</span><span>' + A.esc(o) + '</span></button>').join('') + '</div>');
        A.bindSpeak(el);
        A.selectOne(el, (i) => { sel = i; ctx.ready(true); });
        setTimeout(() => A.TTS.speak(x.ans, true), 250);
      },
      check() {
        A.markCards(el, opts.indexOf(x.ans), sel);
        const ok = opts[sel] === x.ans;
        return { ok, ans: x.ans + (x.said ? '  ' + x.said : ''), tr: A.tr(x), say: x.ans, why: ok ? undefined : (en() ? x.whyEn : x.why) };
      }
    };
  }

  function post(x: Post): Exercise {
    let el: HTMLElement, opts: string[] = [], chosen: string | null = null;
    return {
      render(root: HTMLElement, ctx: ExerciseCtx) {
        el = root; chosen = null; opts = A.shuffle(x.opts);
        el.innerHTML = tag('🔗 Шылау', 'связующее слово', 'linking word') +
          '<h2 class="task">' + A.esc(en() ? 'Drag the right word into the gap' : 'Перетащи нужное слово в пропуск') + '</h2>' +
          '<div class="sentence">' + A.esc(x.pre) + '<span class="gap empty drop" id="pgap">' + A.esc(x.ans) + '</span>' + A.esc(x.post) + '<div class="hint">' + A.esc(A.tr(x)) + '</div></div>' +
          '<div class="chips drag">' + opts.map((o, i) => '<button class="card chip-d" data-i="' + i + '">' + A.esc(o) + '</button>').join('') + '</div>';
        const gap = A.qs('#pgap', el)!;
        const place = (i: number) => {
          chosen = opts[i]; gap.textContent = chosen; gap.classList.remove('empty');
          A.qsa('.chip-d', el).forEach((c) => c.classList.toggle('sel', +c.getAttribute('data-i')! === i));
          A.sfx.tap(); ctx.ready(true);
        };
        A.qsa('.chip-d', el).forEach((chip) => {
          const i = +chip.getAttribute('data-i')!;
          let ghost: HTMLElement | null = null, sx = 0, sy = 0, moved = false, viaPointer = false;
          chip.addEventListener('pointerdown', (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; moved = false; try { chip.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } });
          chip.addEventListener('pointermove', (e: PointerEvent) => {
            if (!(e.buttons & 1) && e.pointerType === 'mouse') return;
            if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
            if (!ghost) { ghost = chip.cloneNode(true) as HTMLElement; ghost.className = 'card chip-ghost'; document.body.appendChild(ghost); }
            moved = true;
            ghost.style.transform = 'translate(' + (e.clientX - 40) + 'px,' + (e.clientY - 24) + 'px)';
            const r = gap.getBoundingClientRect();
            gap.classList.toggle('over', e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12);
          });
          const up = (e: PointerEvent) => {
            if (ghost) { ghost.remove(); ghost = null; }
            const over = gap.classList.contains('over'); gap.classList.remove('over');
            viaPointer = true;
            if (!moved || over) place(i);           // a tap also works: no drag needed on small screens
            try { chip.releasePointerCapture(e.pointerId); } catch { /* already released */ }
          };
          chip.addEventListener('pointerup', up);
          chip.addEventListener('pointercancel', () => { if (ghost) { ghost.remove(); ghost = null; } gap.classList.remove('over'); });
          chip.addEventListener('click', (e) => { e.preventDefault(); if (viaPointer) { viaPointer = false; return; } place(i); });   // keyboard / TalkBack
        });
      },
      check() {
        A.markCards(el, opts.indexOf(x.ans), chosen ? opts.indexOf(chosen) : -1);
        const full = x.pre + x.ans + x.post;
        const ok = chosen === x.ans;
        return {
          ok, ans: full, tr: A.tr(x), say: full,
          why: ok ? undefined : (en() ? 'Here the meaning is «' + x.en + '», so the word is «' + x.ans + '».' : 'Смысл: «' + x.ru + '» — поэтому «' + x.ans + '».')
        };
      }
    };
  }

  // Called by genLesson() in web/app.js for every lesson (and for the content of checkpoints).
  Q.ext.extraEx = (lesson: { affixes?: Affix[]; busters?: Buster[]; posts?: Post[] }, add: (kind: string, make: () => Exercise) => void) => {
    (lesson.affixes || []).forEach((x) => add('affix', () => affix(x)));
    (lesson.busters || []).forEach((x) => add('buster', () => buster(x)));
    (lesson.posts || []).forEach((x) => add('post', () => post(x)));
  };
}
