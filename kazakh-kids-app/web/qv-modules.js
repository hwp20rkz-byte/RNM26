"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // src/engine/LessonEngine.ts
  var SKILL_OF = {
    listen: "tyn",
    buster: "tyn",
    pick: "oqy",
    pickR: "oqy",
    sent: "oqy",
    match: "oqy",
    clock: "oqy",
    clockR: "oqy",
    build: "zhaz",
    fill: "zhaz",
    order: "zhaz",
    clockLoc: "zhaz",
    num: "zhaz",
    affix: "zhaz",
    post: "zhaz",
    speak: "ait"
  };
  var CATEGORY_OF = {
    pick: "lexicon",
    pickR: "lexicon",
    match: "lexicon",
    sent: "lexicon",
    affix: "harmony",
    fill: "grammar",
    post: "grammar",
    build: "grammar",
    order: "grammar",
    clockLoc: "grammar",
    num: "grammar",
    clock: "lexicon",
    clockR: "lexicon",
    buster: "orthoepy",
    listen: "listening",
    speak: "speaking"
  };
  function markOf(pct) {
    return pct >= 85 ? 5 : pct >= 65 ? 4 : pct >= 40 ? 3 : 2;
  }
  function comboMultiplier(combo) {
    return combo >= 10 ? 3 : combo >= 6 ? 2 : combo >= 3 ? 1.5 : 1;
  }
  function nextStreak(lastDay, today, streak) {
    if (lastDay === today) return streak;
    const d = /* @__PURE__ */ new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return lastDay === d.toISOString().slice(0, 10) ? streak + 1 : 1;
  }
  var LessonEngine = class {
    constructor(o) {
      this.combo = 0;
      this.bestCombo = 0;
      this.xp = 0;
      this.phase = "question";
      this.seen = /* @__PURE__ */ new Map();
      this.mistakeCount = {};
      this.endedAt = null;
      var _a;
      if (!(o.total >= 0) || !(o.hearts > 0)) throw new Error("LessonEngine: total \u2265 0 and hearts > 0 are required");
      this.total = o.total;
      this.hearts = this.maxHearts = o.hearts;
      this.now = o.now || (() => Date.now());
      this.startedAt = this.now();
      this.deadline = o.seconds ? this.startedAt + o.seconds * 1e3 : null;
      this.xpPerTask = (_a = o.xpPerTask) != null ? _a : 2;
    }
    get timed() {
      return this.deadline !== null;
    }
    remainingMs() {
      return this.deadline === null ? Infinity : Math.max(0, this.deadline - this.now());
    }
    /** Call from a timer; moves to «timeup» once the limit is over. */
    tick() {
      if (this.phase === "question" || this.phase === "feedback") {
        if (this.deadline !== null && this.now() >= this.deadline) this.end("timeup");
      }
      return this.phase;
    }
    /** Record an answer to task `taskId` of kind `kind`. A task answered again (retry queue) never counts as first try. */
    answer(taskId, kind, ok) {
      if (this.phase !== "question") throw new Error("LessonEngine: answer() in phase " + this.phase);
      if (this.tick() === "timeup") return this.result(ok, false, 0);
      let rec = this.seen.get(taskId);
      const isFirst = !rec;
      if (!rec) {
        rec = { kind, first: null };
        this.seen.set(taskId, rec);
      }
      let gained = 0;
      if (ok) {
        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        if (isFirst) rec.first = true;
        gained = Math.round(this.xpPerTask * comboMultiplier(this.combo) * (isFirst ? 1 : 0.5));
        this.xp += gained;
      } else {
        this.combo = 0;
        if (isFirst) rec.first = false;
        const cat = CATEGORY_OF[kind] || "lexicon";
        this.mistakeCount[cat] = (this.mistakeCount[cat] || 0) + 1;
        this.hearts = Math.max(0, this.hearts - 1);
      }
      this.phase = this.hearts === 0 ? "failed" : "feedback";
      if (this.phase === "failed") this.endedAt = this.now();
      return this.result(ok, isFirst && ok, gained);
    }
    /** After feedback: go to the next question, or finish when nothing is left. */
    next(hasMore) {
      if (this.phase !== "feedback") return this.phase;
      if (this.tick() === "timeup") return this.phase;
      if (hasMore) this.phase = "question";
      else this.end("finished");
      return this.phase;
    }
    summary() {
      var _a;
      const skills = {};
      let first = 0;
      this.seen.forEach((r) => {
        const s = SKILL_OF[r.kind] || "oqy";
        const cell = skills[s] || (skills[s] = [0, 0]);
        cell[1]++;
        if (r.first) {
          cell[0]++;
          first++;
        }
      });
      const total = Math.max(this.total, this.seen.size);
      const pct = Math.round(first / Math.max(1, total) * 100);
      let weakest = null;
      Object.keys(this.mistakeCount).forEach((k) => {
        if (!weakest || (this.mistakeCount[k] || 0) > (this.mistakeCount[weakest] || 0)) weakest = k;
      });
      return {
        outcome: this.phase === "failed" || this.phase === "timeup" ? this.phase : "finished",
        pct,
        mark: markOf(pct),
        firstTry: first,
        total,
        skills,
        mistakes: __spreadValues({}, this.mistakeCount),
        weakest,
        xp: this.xp,
        bestCombo: this.bestCombo,
        timeUsedMs: ((_a = this.endedAt) != null ? _a : this.now()) - this.startedAt
      };
    }
    end(p) {
      this.phase = p;
      this.endedAt = this.now();
    }
    result(ok, firstTry, gained) {
      return { ok, firstTry, heartsLeft: this.hearts, combo: this.combo, multiplier: comboMultiplier(this.combo), xpGained: gained, phase: this.phase };
    }
  };
  var ADVICE = {
    harmony: { ru: "\u0421\u0438\u043D\u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0437\u043C: \u0442\u0432\u0451\u0440\u0434\u043E\u0435 \u0441\u043B\u043E\u0432\u043E (\u0430, \u043E, \u04B1, \u044B) \u2014 \u0442\u0432\u0451\u0440\u0434\u043E\u0435 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435, \u043C\u044F\u0433\u043A\u043E\u0435 (\u04D9, \u0435, \u0456, \u04E9, \u04AF) \u2014 \u043C\u044F\u0433\u043A\u043E\u0435. \u041F\u043E\u0432\u0442\u043E\u0440\u0438 \xAB\u0416\u0430\u043B\u0493\u0430\u0443 \u0448\u0435\u0431\u0435\u0440\u0456\xBB.", en: "Vowel harmony: back-vowel word (\u0430, \u043E, \u04B1, \u044B) \u2192 back ending, front-vowel word (\u04D9, \u0435, \u0456, \u04E9, \u04AF) \u2192 front ending. Practise \xAB\u0416\u0430\u043B\u0493\u0430\u0443 \u0448\u0435\u0431\u0435\u0440\u0456\xBB." },
    orthoepy: { ru: "\u041F\u0440\u043E\u0438\u0437\u043D\u043E\u0448\u0435\u043D\u0438\u0435 \u0438 \u043F\u0438\u0441\u044C\u043C\u043E \u0440\u0430\u0441\u0445\u043E\u0434\u044F\u0442\u0441\u044F: [\u04B1\u049B\u04B1\u043F\u0442\u0443] \u2014 \u04B1\u049B\u044B\u043F\u0442\u044B. \u041F\u043E\u0432\u0442\u043E\u0440\u0438 \xAB\u049A\u0430\u0442\u0435\u043D\u0456 \u0442\u0430\u043F\xBB \u0438 \u0441\u043B\u0443\u0448\u0430\u0439 \u{1F50A}.", en: "Speech and spelling differ: [\u04B1\u049B\u04B1\u043F\u0442\u0443] \u2014 \u04B1\u049B\u044B\u043F\u0442\u044B. Practise \xAB\u049A\u0430\u0442\u0435\u043D\u0456 \u0442\u0430\u043F\xBB and listen \u{1F50A}." },
    grammar: { ru: "\u041E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0438 \u043F\u043E\u0441\u043B\u0435\u043B\u043E\u0433\u0438: \u043F\u0440\u043E\u0432\u0435\u0440\u044C \u043F\u0430\u0434\u0435\u0436 \u043F\u043E \u0432\u043E\u043F\u0440\u043E\u0441\u0443 (\u043A\u0456\u043C\u0433\u0435? \u043D\u0435\u0434\u0435\u043D? \u043D\u0435\u043C\u0435\u043D?).", en: "Endings and postpositions: check the case by its question (\u043A\u0456\u043C\u0433\u0435? \u043D\u0435\u0434\u0435\u043D? \u043D\u0435\u043C\u0435\u043D?)." },
    lexicon: { ru: "\u0421\u043B\u043E\u0432\u0430 \u0442\u0435\u043C\u044B: \u043F\u043E\u0432\u0442\u043E\u0440\u0438 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u0443\u0440\u043E\u043A\u0430.", en: "Topic words: review the lesson cards." },
    listening: { ru: "\u0410\u0443\u0434\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435: \u0441\u043B\u0443\u0448\u0430\u0439 \u0444\u0440\u0430\u0437\u0443 \u0434\u0432\u0430 \u0440\u0430\u0437\u0430, \u043C\u0435\u0434\u043B\u0435\u043D\u043D\u043E.", en: "Listening: play the phrase twice, slowly." },
    speaking: { ru: "\u0413\u043E\u0432\u043E\u0440\u0435\u043D\u0438\u0435: \u043F\u043E\u0441\u043B\u0443\u0448\u0430\u0439 \u043E\u0431\u0440\u0430\u0437\u0435\u0446, \u043F\u043E\u0442\u043E\u043C \u0441\u043A\u0430\u0436\u0438 \u0433\u0440\u043E\u043C\u043A\u043E \u0438 \u0447\u0451\u0442\u043A\u043E.", en: "Speaking: listen to the model, then say it loud and clear." }
  };

  // src/exercises/index.ts
  function registerExercises(Q) {
    const A = Q.api;
    const en = () => A.lang() === "en";
    const tag = (kk, ru, enText) => '<span class="tag">' + A.esc(kk) + " \xB7 " + A.esc(en() ? enText : ru) + "</span>";
    function choiceCards(el, opts, prefix, onPick) {
      el.insertAdjacentHTML("beforeend", '<div class="chips">' + opts.map((o, i) => '<button class="card" data-i="' + i + '">' + A.esc(prefix + o) + "</button>").join("") + "</div>");
      A.selectOne(el, onPick);
    }
    function affix(x) {
      let el, opts = [], sel = -1;
      const word = () => (x.person ? x.person + " " : "") + x.root + x.ans;
      return {
        render(root, ctx) {
          el = root;
          sel = -1;
          opts = A.shuffle(x.opts);
          el.innerHTML = tag("\u{1F9E9} \u0416\u0430\u043B\u0493\u0430\u0443 \u0448\u0435\u0431\u0435\u0440\u0456", "\u043C\u0430\u0441\u0442\u0435\u0440 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0439", "ending master") + '<h2 class="task">' + A.esc(en() ? "Pick the ending that fits" : "\u0412\u044B\u0431\u0435\u0440\u0438 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u0435 \u043F\u043E \u0437\u0430\u043A\u043E\u043D\u0443 \u0441\u0438\u043D\u0433\u0430\u0440\u043C\u043E\u043D\u0438\u0437\u043C\u0430") + '</h2><div class="affix-box"><span class="af-person">' + A.esc(x.person || "") + '</span><span class="af-root">' + A.esc(x.root) + '</span><span class="af-plus">+</span><span class="af-slot empty" id="afs">?</span></div><p class="hint center">' + A.esc(A.tr(x)) + "</p>";
          choiceCards(el, opts, "-", (i) => {
            sel = i;
            const s = A.qs("#afs", el);
            s.textContent = opts[i];
            s.classList.remove("empty");
            ctx.ready(true);
          });
        },
        check() {
          A.markCards(el, opts.indexOf(x.ans), sel);
          const ok = opts[sel] === x.ans;
          return { ok, ans: word(), tr: A.tr(x), say: word(), why: ok ? void 0 : en() ? x.whyEn : x.why };
        }
      };
    }
    function buster(x) {
      let el, opts = [], sel = -1;
      return {
        render(root, ctx) {
          el = root;
          sel = -1;
          opts = A.shuffle(x.opts);
          el.innerHTML = tag("\u{1F50E} \u049A\u0430\u0442\u0435\u043D\u0456 \u0442\u0430\u043F", "\u043D\u0430\u0439\u0434\u0438 \u043E\u0448\u0438\u0431\u043A\u0443", "spot the mistake") + '<h2 class="task">' + A.esc(x.said ? en() ? "You hear this. How is it WRITTEN?" : "\u0422\u0430\u043A \u0441\u043B\u044B\u0448\u0438\u0442\u0441\u044F. \u0410 \u043A\u0430\u043A \u041F\u0418\u0428\u0415\u0422\u0421\u042F?" : en() ? "Which one is written correctly?" : "\u0413\u0434\u0435 \u043D\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0431\u0435\u0437 \u043E\u0448\u0438\u0431\u043A\u0438?") + "</h2>" + (x.said ? '<div class="said">' + A.spk(x.ans) + "<b>" + A.esc(x.said) + "</b></div>" : '<div class="said">' + A.spk(x.ans) + "<b>" + A.esc(A.tr(x)) + "</b></div>");
          el.insertAdjacentHTML("beforeend", '<div class="cards list">' + opts.map((o, i) => '<button class="card" data-i="' + i + '"><span class="idx">' + (i + 1) + "</span><span>" + A.esc(o) + "</span></button>").join("") + "</div>");
          A.bindSpeak(el);
          A.selectOne(el, (i) => {
            sel = i;
            ctx.ready(true);
          });
          setTimeout(() => A.TTS.speak(x.ans, true), 250);
        },
        check() {
          A.markCards(el, opts.indexOf(x.ans), sel);
          const ok = opts[sel] === x.ans;
          return { ok, ans: x.ans + (x.said ? "  " + x.said : ""), tr: A.tr(x), say: x.ans, why: ok ? void 0 : en() ? x.whyEn : x.why };
        }
      };
    }
    function post(x) {
      let el, opts = [], chosen = null;
      return {
        render(root, ctx) {
          el = root;
          chosen = null;
          opts = A.shuffle(x.opts);
          el.innerHTML = tag("\u{1F517} \u0428\u044B\u043B\u0430\u0443", "\u0441\u0432\u044F\u0437\u0443\u044E\u0449\u0435\u0435 \u0441\u043B\u043E\u0432\u043E", "linking word") + '<h2 class="task">' + A.esc(en() ? "Drag the right word into the gap" : "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438 \u043D\u0443\u0436\u043D\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u043F\u0440\u043E\u043F\u0443\u0441\u043A") + '</h2><div class="sentence">' + A.esc(x.pre) + '<span class="gap empty drop" id="pgap">' + A.esc(x.ans) + "</span>" + A.esc(x.post) + '<div class="hint">' + A.esc(A.tr(x)) + '</div></div><div class="chips drag">' + opts.map((o, i) => '<button class="card chip-d" data-i="' + i + '">' + A.esc(o) + "</button>").join("") + "</div>";
          const gap = A.qs("#pgap", el);
          const place = (i) => {
            chosen = opts[i];
            gap.textContent = chosen;
            gap.classList.remove("empty");
            A.qsa(".chip-d", el).forEach((c) => c.classList.toggle("sel", +c.getAttribute("data-i") === i));
            A.sfx.tap();
            ctx.ready(true);
          };
          A.qsa(".chip-d", el).forEach((chip) => {
            const i = +chip.getAttribute("data-i");
            let ghost = null, sx = 0, sy = 0, moved = false, viaPointer = false;
            chip.addEventListener("pointerdown", (e) => {
              sx = e.clientX;
              sy = e.clientY;
              moved = false;
              try {
                chip.setPointerCapture(e.pointerId);
              } catch (e2) {
              }
            });
            chip.addEventListener("pointermove", (e) => {
              if (!(e.buttons & 1) && e.pointerType === "mouse") return;
              if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
              if (!ghost) {
                ghost = chip.cloneNode(true);
                ghost.className = "card chip-ghost";
                document.body.appendChild(ghost);
              }
              moved = true;
              ghost.style.transform = "translate(" + (e.clientX - 40) + "px," + (e.clientY - 24) + "px)";
              const r = gap.getBoundingClientRect();
              gap.classList.toggle("over", e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12);
            });
            const up = (e) => {
              if (ghost) {
                ghost.remove();
                ghost = null;
              }
              const over = gap.classList.contains("over");
              gap.classList.remove("over");
              viaPointer = true;
              if (!moved || over) place(i);
              try {
                chip.releasePointerCapture(e.pointerId);
              } catch (e2) {
              }
            };
            chip.addEventListener("pointerup", up);
            chip.addEventListener("pointercancel", () => {
              if (ghost) {
                ghost.remove();
                ghost = null;
              }
              gap.classList.remove("over");
            });
            chip.addEventListener("click", (e) => {
              e.preventDefault();
              if (viaPointer) {
                viaPointer = false;
                return;
              }
              place(i);
            });
          });
        },
        check() {
          A.markCards(el, opts.indexOf(x.ans), chosen ? opts.indexOf(chosen) : -1);
          const full = x.pre + x.ans + x.post;
          const ok = chosen === x.ans;
          return {
            ok,
            ans: full,
            tr: A.tr(x),
            say: full,
            why: ok ? void 0 : en() ? "Here the meaning is \xAB" + x.en + "\xBB, so the word is \xAB" + x.ans + "\xBB." : "\u0421\u043C\u044B\u0441\u043B: \xAB" + x.ru + "\xBB \u2014 \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \xAB" + x.ans + "\xBB."
          };
        }
      };
    }
    Q.ext.extraEx = (lesson, add) => {
      (lesson.affixes || []).forEach((x) => add("affix", () => affix(x)));
      (lesson.busters || []).forEach((x) => add("buster", () => buster(x)));
      (lesson.posts || []).forEach((x) => add("post", () => post(x)));
    };
  }

  // src/voice/personas.json
  var personas_default = {
    _comment: "Voice personas of modules 2 and 4. `piper` = the offline stand-in actually bundled in the APK (ISSAI KazakhTTS2 speakers + pitch/tempo in ffmpeg, see tools/make-audio.py). `azure` / `elevenlabs` = production specs for a cloud re-voicing; they are not used by the build. APAI renders with the narrator voice (tag NARR: ISEKE or ISSAI, chosen in the profile).",
    personas: {
      ALIBEK: {
        name: "\u04D8\u043B\u0456\u0431\u0435\u043A",
        role: "Main student hero, boy 9\u201310, polite, loves architecture and models",
        acoustics: {
          pitchSt: 4,
          speed: 0.95,
          energy: "high",
          emotion: "cheerful, curious"
        },
        piper: {
          speaker: 0,
          lengthScale: 1.05,
          pitchSt: 4,
          filter: ""
        },
        azure: {
          voice: "kk-KZ-DauletNeural",
          pitch: "+4st",
          rate: "-5%",
          volume: "+0%"
        },
        elevenlabs: {
          description: "Kazakh boy, 9-10 years old, bright and curious, very clear diction",
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.35,
          speed: 0.95
        }
      },
      ANEL: {
        name: "\u04D8\u043D\u0435\u043B",
        role: "Support student hero, girl 9\u201310, reads books, loves fountains and history",
        acoustics: {
          pitchSt: 3,
          speed: 0.95,
          energy: "medium",
          emotion: "warm, melodic"
        },
        piper: {
          speaker: 4,
          lengthScale: 1.05,
          pitchSt: 3,
          filter: ""
        },
        azure: {
          voice: "kk-KZ-AigulNeural",
          pitch: "+3st",
          rate: "-5%",
          volume: "+0%"
        },
        elevenlabs: {
          description: "Kazakh girl, 9-10 years old, melodic and friendly, crisp pronunciation",
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          speed: 0.95
        }
      },
      ZHALKAU: {
        name: "\u0416\u0430\u043B\u049B\u0430\u0443\u0431\u0435\u043A",
        role: "Comedic growth character, boy 10, sleepy and playful; the player helps him become \u04B1\u049B\u044B\u043F\u0442\u044B",
        acoustics: {
          pitchSt: 2,
          speed: 0.8,
          energy: "low",
          emotion: "sleepy, playful"
        },
        piper: {
          speaker: 0,
          lengthScale: 1.32,
          pitchSt: 2.5,
          filter: ""
        },
        azure: {
          voice: "kk-KZ-DauletNeural",
          pitch: "+2st",
          rate: "-20%",
          volume: "-5%"
        },
        elevenlabs: {
          description: "Kazakh boy, 10, sleepy, yawning, playful and a bit lazy, slow delivery",
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.55,
          speed: 0.8
        }
      },
      ATA: {
        name: "\u0410\u0442\u0430",
        role: "Wise mentor (grandfather), host of \xAB\u0422\u0456\u043B \u041A\u0435\u0440\u0435\u043C\u0435\u0442\u0456\xBB",
        acoustics: {
          pitchSt: -2,
          speed: 0.85,
          energy: "medium",
          emotion: "warm, resonant, fatherly"
        },
        piper: {
          speaker: 1,
          lengthScale: 1.2,
          pitchSt: -2,
          filter: ""
        },
        azure: {
          voice: "kk-KZ-DauletNeural",
          pitch: "-2st",
          rate: "-15%",
          volume: "+0%"
        },
        elevenlabs: {
          description: "Elderly Kazakh man, deep chest resonance, warm blessing tone (\u0411\u04D9\u0440\u0435\u043A\u0435\u043B\u0434\u0456!)",
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.25,
          speed: 0.85
        }
      },
      AZHE: {
        name: "\u04D8\u0436\u0435",
        role: "Grandmother in the bus scene; gives the blessing \xAB\u04E8\u0440\u043A\u0435\u043D\u0456\u04A3 \u04E9\u0441\u0441\u0456\u043D!\xBB",
        acoustics: {
          pitchSt: -1,
          speed: 0.85,
          energy: "low",
          emotion: "gentle, grandmotherly"
        },
        piper: {
          speaker: 3,
          lengthScale: 1.2,
          pitchSt: -1,
          filter: ""
        },
        azure: {
          voice: "kk-KZ-AigulNeural",
          pitch: "-1st",
          rate: "-15%",
          volume: "+0%"
        },
        elevenlabs: {
          description: "Elderly Kazakh woman, soft and kind, slow, grandmotherly warmth",
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          speed: 0.85
        }
      },
      APAI: {
        name: "\u0411\u0430\u044F\u043D \u0430\u043F\u0430\u0439",
        role: "Teacher / narrator / system voice; literary standard Kazakh for pronunciation drills",
        acoustics: {
          pitchSt: 0,
          speed: 0.87,
          energy: "medium",
          emotion: "neutral, reassuring"
        },
        piper: {
          tag: "NARR"
        },
        azure: {
          voice: "kk-KZ-AigulNeural",
          pitch: "+0st",
          rate: "-13%",
          volume: "+0%"
        },
        elevenlabs: {
          description: "Kazakh female teacher, studio-neutral, perfect literary pronunciation, calm",
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.1,
          speed: 0.87
        }
      },
      ARCH: {
        name: "\u0428\u0435\u0442\u0435\u043B\u0434\u0456\u043A \u0441\u04D9\u0443\u043B\u0435\u0442\u0448\u0456",
        role: "Foreign architect interviewing Alibek at Baiterek; speaks simple, slightly careful Kazakh",
        acoustics: {
          pitchSt: -1,
          speed: 0.9,
          energy: "medium",
          emotion: "friendly, curious"
        },
        piper: {
          speaker: 1,
          lengthScale: 1.08,
          pitchSt: 0.5,
          filter: ""
        },
        azure: {
          voice: "kk-KZ-DauletNeural",
          pitch: "-1st",
          rate: "-10%",
          volume: "+0%"
        },
        elevenlabs: {
          description: "Adult man, friendly foreign architect speaking careful, simple Kazakh",
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.2,
          speed: 0.9
        }
      }
    },
    lines: {
      ATA: {
        hello: "\u0421\u04D9\u043B\u0435\u043C, \u0431\u0430\u043B\u0430\u043B\u0430\u0440! \u0422\u0456\u043B \u041A\u0435\u0440\u0435\u043C\u0435\u0442\u0456\u043D\u0435 \u049B\u043E\u0448 \u043A\u0435\u043B\u0434\u0456\u04A3\u0434\u0435\u0440!",
        spin: "\u0414\u04E9\u04A3\u0433\u0435\u043B\u0435\u043A\u0442\u0456 \u0430\u0439\u043D\u0430\u043B\u0434\u044B\u0440!",
        yes: "\u0411\u04D9\u0440\u0435\u043A\u0435\u043B\u0434\u0456!",
        no: "\u041C\u04B1\u043D\u0434\u0430\u0439 \u04D9\u0440\u0456\u043F \u0436\u043E\u049B.",
        solved: "\u041A\u0435\u0440\u0435\u043C\u0435\u0442! \u0421\u04E9\u0437\u0434\u0456 \u0442\u0430\u043F\u0442\u044B\u04A3!",
        prize: "\u0416\u04AF\u043B\u0434\u0435! \u0421\u0430\u0493\u0430\u043D \u0441\u044B\u0439\u043B\u044B\u049B!",
        hint: "\u049A\u0430\u0440\u0456\u043F! \u0411\u0456\u0440 \u04D9\u0440\u0456\u043F\u0442\u0456 \u0430\u0448\u0430\u043C\u044B\u043D.",
        bonus: "\u0411\u043E\u043D\u0443\u0441! \u041A\u0435\u043B\u0435\u0441\u0456 \u04B1\u043F\u0430\u0439 \u0435\u043A\u0456 \u0435\u0441\u0435!",
        bless: "\u04E8\u0440\u043A\u0435\u043D\u0456\u04A3 \u04E9\u0441\u0441\u0456\u043D!",
        bye: "\u0416\u0430\u0440\u0430\u0439\u0441\u044B\u04A3, \u0430\u049B\u044B\u043B\u0434\u044B\u043C!"
      },
      ZHALKAU: {
        start: "\u049A\u043E\u0439\u0448\u044B, \u0435\u0440\u0442\u0435\u04A3 \u0436\u0438\u043D\u0430\u0439\u043C\u044B\u043D\u2026",
        mid: "\u041E\u0439, \u0431\u04E9\u043B\u043C\u0435\u043C \u0442\u0430\u0437\u0430\u0440\u0430 \u0431\u0430\u0441\u0442\u0430\u0434\u044B!",
        end: "\u0420\u0430\u049B\u043C\u0435\u0442! \u0415\u043D\u0434\u0456 \u043C\u0435\u043D \u04B1\u049B\u044B\u043F\u0442\u044B\u043C\u044B\u043D!"
      },
      ALIBEK: {
        room: "\u0416\u04AF\u0440, \u0431\u04E9\u043B\u043C\u0435\u04A3\u0434\u0456 \u0431\u0456\u0440\u0433\u0435 \u0436\u0438\u043D\u0430\u0439\u044B\u049B!",
        workshop: "\u0416\u04AF\u0440, \u043C\u0430\u043A\u0435\u0442 \u0436\u0430\u0441\u0430\u0439\u044B\u049B!",
        done: "\u0411\u0456\u0437 \u043D\u0430\u0493\u044B\u0437 \u0436\u0430\u0441 \u0441\u04D9\u0443\u043B\u0435\u0442\u0448\u0456\u043C\u0456\u0437!"
      },
      APAI: {
        where: "\u041E\u043D\u044B \u049B\u0430\u0439\u0434\u0430 \u049B\u043E\u044F\u043C\u044B\u0437?",
        pick: "\u049A\u0430\u0439 \u0493\u0438\u043C\u0430\u0440\u0430\u0442\u0442\u044B \u0441\u0430\u043B\u0430\u043C\u044B\u0437?"
      }
    }
  };

  // src/voice/audioMap.ts
  var PERSONAS = personas_default.personas;
  var LINES = personas_default.lines;
  function xmlEscape(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function ssml(id, text) {
    const p = PERSONAS[id].azure;
    return '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="kk-KZ"><voice name="' + p.voice + '"><prosody pitch="' + p.pitch + '" rate="' + p.rate + '" volume="' + p.volume + '">' + xmlEscape(text) + "</prosody></voice></speak>";
  }
  function elevenLabsRequest(id, text, modelId = "eleven_multilingual_v2") {
    const e = PERSONAS[id].elevenlabs;
    return { text, model_id: modelId, voice_settings: { stability: e.stability, similarity_boost: e.similarity_boost, style: e.style, speed: e.speed } };
  }
  function voiceDesignPrompt(id) {
    const p = PERSONAS[id];
    return p.elevenlabs.description + ". Native Kazakh pronunciation (vowel harmony, \u049B \u0493 \u04A3 \u04E9 \u04AF \u04B1 \u0456 \u04D9). Emotion: " + p.acoustics.emotion + ". Pitch " + (p.acoustics.pitchSt >= 0 ? "+" : "") + p.acoustics.pitchSt + " semitones, speed " + p.acoustics.speed + "x.";
  }

  // src/games/characters.ts
  function makeCharacter(V, id) {
    const { eye, smile, blush } = V.face;
    const T = V.THREE;
    switch (id) {
      case "ALIBEK": {
        const g = V.humanoid({
          skin: 15251850,
          hair: 2826800,
          top: 2381513,
          sleeve: 16777215,
          pants: 1778496,
          shoes: 3357266,
          face: (c) => {
            eye(c, 42, 58, 13, "#3a2a1a");
            eye(c, 86, 58, 13, "#3a2a1a");
            smile(c, 86, 16, true);
          }
        });
        g.add(V.box(0.5, 0.06, 0.04, 13643578, 0, 1.92, 0.3));
        return g;
      }
      case "ANEL": {
        const g = V.humanoid({
          skin: 15976869,
          hair: 2759442,
          top: 1778496,
          sleeve: 16777215,
          pants: 1778496,
          shoes: 2826800,
          face: (c) => {
            eye(c, 42, 58, 14, "#2a1b12");
            eye(c, 86, 58, 14, "#2a1b12");
            blush(c);
            smile(c, 88, 15, false);
          }
        });
        const P = g.userData.parts;
        [-1, 1].forEach((s) => P.head.add(V.box(0.18, 0.9, 0.18, 2759442, s * 0.66, -0.45, -0.2)));
        P.head.add(V.ball(0.14, V.glow(16777215), -0.66, -0.95, -0.2), V.ball(0.14, V.glow(16777215), 0.66, -0.95, -0.2));
        return g;
      }
      case "ZHALKAU":
      case "ZHALKAU_TIDY": {
        const tidy = id === "ZHALKAU_TIDY";
        const g = V.humanoid({
          skin: 14856323,
          hair: 5913120,
          top: tidy ? 1619878 : 9080729,
          sleeve: tidy ? 16777215 : 9080729,
          pants: 3817301,
          shoes: tidy ? 3357266 : 9067050,
          face: (c) => {
            if (tidy) {
              eye(c, 42, 58, 13, "#3a2a1a");
              eye(c, 86, 58, 13, "#3a2a1a");
              smile(c, 86, 18, true);
              return;
            }
            c.strokeStyle = "#3a2a1a";
            c.lineWidth = 6;
            c.lineCap = "round";
            c.beginPath();
            c.moveTo(28, 60);
            c.lineTo(56, 60);
            c.moveTo(72, 60);
            c.lineTo(100, 60);
            c.stroke();
            c.fillStyle = "#4a2a2a";
            c.beginPath();
            c.ellipse(64, 92, 9, 12, 0, 0, 7);
            c.fill();
          }
        });
        const P = g.userData.parts;
        if (!tidy) {
          const tuft = V.box(0.3, 0.3, 0.3, 5913120, 0.3, 0.7, 0);
          tuft.rotation.z = 0.6;
          P.head.add(tuft);
          g.add(V.box(0.3, 0.12, 0.05, 13073706, 0.25, 1.2, 0.29));
        } else g.add(V.box(0.5, 0.06, 0.04, 16763196, 0, 1.92, 0.3));
        return g;
      }
      case "ATA": {
        const g = V.humanoid({
          skin: 14264186,
          hair: 15658734,
          top: 5909018,
          sleeve: 5909018,
          pants: 2826800,
          shoes: 1776411,
          face: (c) => {
            eye(c, 42, 54, 11, "#2a1b12");
            eye(c, 86, 54, 11, "#2a1b12");
            c.fillStyle = "#f2f2f2";
            c.beginPath();
            c.moveTo(34, 80);
            c.lineTo(94, 80);
            c.lineTo(64, 126);
            c.fill();
            smile(c, 78, 12, false);
          }
        });
        const P = g.userData.parts;
        P.head.add(V.cyl(0.62, 0.72, 0.45, 1776411, 0, 0.75, 0, 6), V.cyl(0.73, 0.73, 0.1, V.glow(16763196), 0, 0.55, 0, 6));
        g.add(V.box(1.16, 1.25, 0.66, V.lam(8010266), 0, 1.38, 0), V.box(0.1, 1.25, 0.68, V.glow(16763196), 0, 1.38, 0.01));
        return g;
      }
      case "AZHE": {
        const g = V.humanoid({
          skin: 14264186,
          hair: 16777215,
          top: 9187146,
          sleeve: 9187146,
          pants: 3813222,
          shoes: 2826800,
          face: (c) => {
            eye(c, 42, 58, 11, "#2a1b12");
            eye(c, 86, 58, 11, "#2a1b12");
            blush(c);
            smile(c, 86, 14, false);
          }
        });
        const P = g.userData.parts;
        P.head.add(V.box(1.36, 0.5, 1.2, 16777215, 0, 0.45, -0.02), V.box(1.38, 0.08, 1.22, V.glow(16747050), 0, 0.22, -0.02));
        const bag = V.box(0.5, 0.45, 0.25, 7031338, 0, -1.25, 0.15);
        P.armR.add(bag);
        g.userData.bag = bag;
        return g;
      }
      case "ARCH": {
        const g = V.humanoid({
          skin: 15780008,
          hair: 12093738,
          top: 3817301,
          sleeve: 3817301,
          pants: 2826800,
          shoes: 1776411,
          face: (c) => {
            eye(c, 42, 58, 12, "#2a6ad0");
            eye(c, 86, 58, 12, "#2a6ad0");
            c.strokeStyle = "#1b1b1b";
            c.lineWidth = 4;
            c.strokeRect(26, 44, 32, 28);
            c.strokeRect(70, 44, 32, 28);
            smile(c, 88, 14, false);
          }
        });
        const P = g.userData.parts;
        const roll = V.cyl(0.08, 0.08, 0.9, 16117984, 0, -1.15, 0.2);
        roll.rotation.x = Math.PI / 2;
        P.armL.add(roll);
        g.add(V.box(0.9, 0.05, 0.05, new T.MeshLambertMaterial({ color: 16763196 }), 0, 0.95, 0.29));
        return g;
      }
    }
  }

  // src/games/buildings.ts
  var WHITE = 16054011;
  var GOLD = 16763196;
  var GLASS = 9427199;
  function buildTier(V, building, tier) {
    const T = V.THREE, g = V.group();
    const glass = () => V.lam(GLASS, { transparent: true, opacity: 0.45 });
    if (building === "baiterek") {
      if (tier === "base") g.add(V.cyl(2.4, 2.6, 0.3, 14212070, 0, 0.15, 0, 32), V.cyl(1.4, 1.6, 0.4, WHITE, 0, 0.5, 0, 24));
      if (tier === "trunk") for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        g.add(V.cyl(0.09, 0.14, 5.6, WHITE, Math.cos(a) * 0.45, 3.5, Math.sin(a) * 0.45, 8));
      }
      if (tier === "crown") for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, b = V.cyl(0.05, 0.08, 2, WHITE, 0, 0, 0, 6);
        b.position.set(Math.cos(a) * 0.75, 7, Math.sin(a) * 0.75);
        b.rotation.z = Math.cos(a) * 0.55;
        b.rotation.x = -Math.sin(a) * 0.55;
        g.add(b);
      }
      if (tier === "glass") g.add(new T.Mesh(new T.SphereGeometry(1.15, 24, 16), glass()).translateY(8.3));
      if (tier === "egg") {
        const e = V.ball(0.82, V.glow(GOLD), 0, 8.3, 0);
        e.scale.y = 1.15;
        g.add(e);
      }
    } else if (building === "khanshatyr") {
      if (tier === "base") {
        const b = V.cyl(3.4, 3.6, 0.5, 14212070, 0, 0.25, 0, 40);
        b.scale.z = 0.75;
        g.add(b);
      }
      if (tier === "garden") for (let i = 0; i < 5; i++) {
        const x = -1.6 + i * 0.8, palm = V.group(x, 0.5, i % 2 * 0.6 - 0.3, V.cyl(0.06, 0.09, 1.1, 8018490, 0, 0.55, 0, 6));
        for (let k = 0; k < 5; k++) {
          const leaf = V.box(0.7, 0.05, 0.18, 3129178, 0, 1.12, 0);
          leaf.rotation.y = k / 5 * Math.PI * 2;
          leaf.rotation.z = -0.35;
          palm.add(leaf);
        }
        g.add(palm);
      }
      if (tier === "tent") {
        const tent = new T.Mesh(new T.ConeGeometry(3.3, 5.6, 32, 1, true), V.lam(16054011, { transparent: true, opacity: 0.6, side: T.DoubleSide }));
        tent.position.y = 3.3;
        tent.scale.z = 0.75;
        g.add(tent);
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2, r = V.cyl(0.03, 0.03, 6.4, 11187144, Math.cos(a) * 1.65, 3.3, Math.sin(a) * 1.25, 4);
          r.rotation.z = Math.cos(a) * 0.53;
          r.rotation.x = -Math.sin(a) * 0.42;
          g.add(r);
        }
      }
      if (tier === "mast") {
        const m = V.cyl(0.05, 0.12, 2.6, 14212070, 0, 7.2, 0, 6);
        m.rotation.z = 0.08;
        g.add(m, V.ball(0.12, V.glow(16731486), 0.1, 8.5, 0));
      }
    } else if (building === "sarai") {
      if (tier === "walls") g.add(V.box(5.2, 0.08, 3.4, 16777215, 0, 0.04, 0), V.box(4, 2.2, 2.2, 15902659, 0, 1.18, 0));
      if (tier === "door") g.add(V.box(0.9, 1.3, 0.1, 9067050, 0, 0.73, 1.14), V.box(1.1, 0.12, 0.12, GOLD, 0, 1.45, 1.15));
      if (tier === "roof") g.add(V.box(4.3, 0.35, 2.5, 16767050, 0, 2.47, 0));
      if (tier === "tower") {
        const t = V.cyl(0.55, 0.6, 1.8, 15902659, 0, 3.5, 0, 16);
        g.add(t, new T.Mesh(new T.ConeGeometry(0.75, 1, 16), V.lam(16767050)).translateY(4.9));
      }
    }
    return g;
  }
  var TIERS = {
    baiterek: ["base", "trunk", "crown", "glass", "egg"],
    khanshatyr: ["base", "garden", "tent", "mast"],
    sarai: ["walls", "door", "roof", "tower"]
  };
  function fullBuilding(V, id) {
    const g = V.group();
    (TIERS[id] || []).forEach((t) => g.add(buildTier(V, id, t)));
    return g;
  }

  // src/games/shell.ts
  function v3d() {
    const V = window.QV3D;
    return V && V.ok() ? V : null;
  }
  function stageIn(el, o) {
    const V = v3d();
    if (!V) return null;
    const S = V.stage(el, o);
    return S ? { V, S } : null;
  }
  function heartsHtml(n, max) {
    let h = "";
    for (let i = 0; i < max; i++) h += i < n ? "\u2764\uFE0F" : "\u{1F90D}";
    return h;
  }
  function finishTopic(api, id, firstTry, total, extra) {
    const T = window.QTOPIC;
    if (T) return T.done(api, id, null, firstTry, total, extra);
    const pct = total ? Math.round(firstTry / total * 100) : 0;
    api.S.topic = api.S.topic || {};
    api.S.topic[id] = Math.max(api.S.topic[id] || 0, pct);
    api.end(__spreadValues({ score: firstTry, scoreText: firstTry + " / " + total, coins: Math.round(firstTry * 1.5), topic: true }, extra));
  }
  function tween(S, ms, step, done) {
    const t0 = performance.now();
    let fin = false;
    S.onTick(() => {
      if (fin) return;
      const k = Math.min(1, (performance.now() - t0) / ms);
      step(k * k * (3 - 2 * k));
      if (k >= 1) {
        fin = true;
        if (done) done();
      }
    });
  }

  // src/dialogue/BranchingDialogue.ts
  var DialogueEngine = class {
    constructor(d, maxHearts = 3) {
      this.d = d;
      this.maxHearts = maxHearts;
      this.xp = 0;
      this.history = [];
      this.tried = /* @__PURE__ */ new Set();
      this.firstOk = 0;
      this.asked = 0;
      this.node = d.start;
      this.hearts = maxHearts;
    }
    get current() {
      return this.d.nodes[this.node];
    }
    get finished() {
      return !!this.current.end || this.hearts <= 0;
    }
    get failed() {
      return this.hearts <= 0;
    }
    /** Share of choice points answered right on the first attempt. */
    get score() {
      return { firstTry: this.firstOk, total: this.asked };
    }
    /** Linear node → next node. */
    advance() {
      const n = this.current;
      if (n.choices || n.end) throw new Error("DialogueEngine.advance() on a choice or end node \xAB" + this.node + "\xBB");
      this.history.push(this.node);
      this.node = n.next;
      return this.node;
    }
    choose(i, spokenBonus = 0) {
      const n = this.current, c = n.choices && n.choices[i];
      if (!c) throw new Error("DialogueEngine.choose(): no choice " + i + " at \xAB" + this.node + "\xBB");
      const first = !this.tried.has(this.node);
      if (first) {
        this.tried.add(this.node);
        this.asked++;
      }
      let xp = 0;
      if (c.ok) {
        if (first) this.firstOk++;
        xp = (c.xp || 10) * (first ? 1 : 0.5) + spokenBonus;
        this.xp += xp;
      } else this.hearts = Math.max(0, this.hearts - 1);
      this.history.push(this.node);
      this.node = c.next;
      return { ok: c.ok, why: c.why, xp, next: c.next, heartsLeft: this.hearts, firstTry: first && c.ok };
    }
  };
  function renderDialogue(api, gameId, d) {
    const E = new DialogueEngine(d);
    const en = api.lang() === "en", esc = api.esc;
    const body = api.frame(d.kk, '<div class="dlg-stage" id="dst"></div><div class="dlg-box" id="dbox"></div>');
    const stageEl = api.qs("#dst", body), box = api.qs("#dbox", body);
    const actors = {};
    const st = stageIn(stageEl, d.scene === "bus" ? { camPos: [0, 3.4, 8.5], camLook: [0, 1.6, 0], fov: 42 } : { camPos: [0, 5.5, 15], camLook: [0, 4, 0], fov: 45 });
    if (st) {
      const { V, S } = st;
      if (d.scene === "bus") {
        S.add(V.box(10, 0.2, 5, 5923704, 0, -0.1, 0));
        S.add(V.box(10, 4.2, 0.2, 15330547, 0, 2, -2.4));
        for (let i = 0; i < 3; i++) S.add(V.box(2.6, 1.3, 0.05, V.lam(10147839, { transparent: true, opacity: 0.7 }), -3 + i * 3, 2.6, -2.28));
        [-2.6, 0.4].forEach((x) => {
          S.add(V.box(1.6, 0.25, 1, 2381513, x, 0.85, -1.6));
          S.add(V.box(1.6, 1, 0.2, 2381513, x, 1.4, -2.05));
        });
        S.add(V.cyl(0.05, 0.05, 4, 16763196, 1.9, 2, -0.6, 8));
        actors.ALIBEK = S.add(makeCharacter(V, "ALIBEK"), -3, 0.45, -1.4);
        actors.ZHALKAU = S.add(makeCharacter(V, "ZHALKAU"), 0, 0.45, -1.4);
        [actors.ALIBEK, actors.ZHALKAU].forEach((a) => {
          a.scale.setScalar(0.62);
          a.userData.baseY = 0.45;
        });
        actors.AZHE = S.add(makeCharacter(V, "AZHE"), 6.5, 0, 0.6);
        actors.AZHE.scale.setScalar(0.7);
        actors.AZHE.rotation.y = -0.5;
      } else {
        S.add(V.box(30, 0.2, 30, 13621478, 0, -0.1, 0));
        const b = S.add(fullBuilding(V, "baiterek"), 0, 0, -3);
        b.scale.setScalar(1.05);
        actors.ALIBEK = S.add(makeCharacter(V, "ALIBEK"), -2.4, 0, 3);
        actors.ALIBEK.rotation.y = 0.4;
        actors.ARCH = S.add(makeCharacter(V, "ARCH"), 2.4, 0, 3);
        actors.ARCH.rotation.y = -0.4;
        S.onTick((t) => {
          b.rotation.y = Math.sin(t * 0.3) * 0.25;
        });
      }
    }
    function who(id) {
      return PERSONAS[id] ? PERSONAS[id].name : id;
    }
    function animate(n) {
      if (!st) return;
      const a = actors[n.who];
      if (n.anim === "enter" && actors.AZHE) {
        const z = actors.AZHE;
        const t0 = performance.now();
        st.V.play(z, "run");
        st.S.onTick(() => {
          const k = Math.min(1, (performance.now() - t0) / 1600);
          z.position.x = 6.5 - k * 4.2;
          if (k >= 1 && z.userData.anim === "run") st.V.play(z, "idle");
        });
      } else if (a && n.anim) st.V.play(a, n.anim === "sad" ? "idle" : n.anim);
      else if (a) st.V.play(a, "cheer");
    }
    function show() {
      const n = E.current;
      api.stat(heartsHtml(E.hearts, E.maxHearts) + " \xB7 \u2B50 " + Math.round(E.xp));
      animate(n);
      api.TTS.speak(n.kk, true);
      let h = '<div class="dlg-line"><b class="dlg-who">' + esc(who(n.who)) + '</b><p class="kk"><button class="spk sm" data-say="' + esc(n.kk) + '">\u{1F50A}</button> ' + esc(n.kk) + '</p><p class="tr">' + esc(en ? n.en : n.ru) + "</p></div>";
      if (n.choices) {
        const voice = window.QVOICE && window.QVOICE.ready();
        h += '<div class="dlg-choices">' + n.choices.map((c, i) => '<div class="dlg-ch"><button class="card" data-c="' + i + '"><span class="kk">' + esc(c.kk) + "</span><small>" + esc(en ? c.en : c.ru) + '</small></button><button class="spk sm" data-say="' + esc(c.kk) + '">\u{1F50A}</button>' + (voice && c.speak ? '<button class="spk sm mic-s" data-mic="' + i + '" title="\u0410\u0439\u0442">\u{1F399}\uFE0F</button>' : "") + "</div>").join("") + "</div>" + (voice ? '<p class="muted center">' + esc(en ? "\u{1F399}\uFE0F Say the answer aloud for +5 XP" : "\u{1F399}\uFE0F \u0421\u043A\u0430\u0436\u0438 \u043E\u0442\u0432\u0435\u0442 \u0432\u0441\u043B\u0443\u0445 \u2014 \u043F\u043E\u043B\u0443\u0447\u0438\u0448\u044C +5 XP") + "</p>" : "");
      } else h += '<button class="btn ok" id="dnext">' + (n.end ? "\u0410\u044F\u049B\u0442\u0430\u0443 \xB7 " + (en ? "finish" : "\u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C") : "\u0416\u0430\u043B\u0493\u0430\u0441\u0442\u044B\u0440\u0443") + "</button>";
      box.innerHTML = h;
      api.qsa("[data-say]", box).forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          api.TTS.speak(b.getAttribute("data-say"));
        };
      });
      const nx = api.qs("#dnext", box);
      if (nx) nx.onclick = () => {
        api.sfx.tap();
        if (n.end) return finish();
        E.advance();
        show();
      };
      api.qsa("[data-c]", box).forEach((b) => {
        b.onclick = () => pick(+b.getAttribute("data-c"), 0);
      });
      api.qsa("[data-mic]", box).forEach((b) => {
        b.onclick = () => {
          const i = +b.getAttribute("data-mic"), c = n.choices[i];
          b.classList.add("on");
          api.toast(en ? "Listening\u2026" : "\u0421\u043B\u0443\u0448\u0430\u044E\u2026");
          window.QVOICE.listen(c.kk).then((r) => {
            b.classList.remove("on");
            if (r.error) {
              api.toast(window.QVOICE.errText(r.error));
              return;
            }
            api.toast((r.passed ? "\u2705 " : "\u{1F501} ") + Math.round(r.score || 0) + "%");
            if (r.passed) pick(i, 5);
          });
        };
      });
    }
    function pick(i, bonus) {
      const n = E.current, c = n.choices[i], r = E.choose(i, bonus);
      if (r.ok) {
        api.sfx.ok();
        api.TTS.speak(c.kk, true);
        show();
        return;
      }
      api.sfx.bad();
      api.vibrate(40);
      if (st && actors.ZHALKAU && d.scene === "bus") st.V.play(actors.ZHALKAU, "idle");
      box.innerHTML = '<div class="dlg-line bad"><b>\u{1F494} ' + esc(c.kk) + '</b><p class="why">\u{1F4A1} ' + esc(r.why ? en ? r.why.en : r.why.ru : "") + '</p></div><button class="btn" id="dnext">' + (E.failed ? en ? "Finish" : "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C" : en ? "Try again" : "\u041F\u043E\u0434\u0443\u043C\u0430\u0442\u044C \u0435\u0449\u0451") + "</button>";
      api.stat(heartsHtml(E.hearts, E.maxHearts) + " \xB7 \u2B50 " + Math.round(E.xp));
      api.qs("#dnext", box).onclick = () => {
        if (E.failed) return finish();
        show();
      };
    }
    function finish() {
      const s = E.score;
      finishTopic(api, gameId, s.firstTry, s.total, {
        coins: Math.round(E.xp / 3) + (E.failed ? 0 : 10),
        xp: Math.min(20, Math.round(E.xp / 5)),
        title: E.failed ? "\u0422\u0430\u0493\u044B \u0436\u0430\u0442\u0442\u044B\u049B!" : s.firstTry === s.total ? "\u041A\u0435\u0440\u0435\u043C\u0435\u0442! \u041C\u0456\u043D\u0441\u0456\u0437!" : "\u0416\u0430\u0440\u0430\u0439\u0441\u044B\u04A3!",
        sub: (en ? "First-try answers: " : "\u0421 \u043F\u0435\u0440\u0432\u043E\u0439 \u043F\u043E\u043F\u044B\u0442\u043A\u0438: ") + s.firstTry + " / " + s.total + " \xB7 \u2B50 " + Math.round(E.xp) + " XP"
      });
    }
    show();
  }

  // src/games/TilKeremeti3D.ts
  var ALPHABET = "\u0410 \u04D8 \u0411 \u0412 \u0413 \u0492 \u0414 \u0415 \u0401 \u0416 \u0417 \u0418 \u0419 \u041A \u049A \u041B \u041C \u041D \u04A2 \u041E \u04E8 \u041F \u0420 \u0421 \u0422 \u0423 \u04B0 \u04AE \u0424 \u0425 \u04BA \u0426 \u0427 \u0428 \u0429 \u042A \u042B \u0406 \u042C \u042D \u042E \u042F".split(" ");
  var SPECIAL = ["\u04D8", "\u0406", "\u04A2", "\u0492", "\u04AE", "\u04B0", "\u049A", "\u04E8", "\u04BA"];
  var SECTORS = [
    { label: "100", kind: "pts", value: 100, color: 2275568 },
    { label: "300", kind: "pts", value: 300, color: 16747050 },
    { label: "\u0416\u04AE\u041B\u0414\u0415", kind: "prize", value: 0, color: 16763196 },
    { label: "200", kind: "pts", value: 200, color: 8245818 },
    { label: "500", kind: "pts", value: 500, color: 16731486 },
    { label: "\u049A\u0410\u0420\u0406\u041F", kind: "hint", value: 0, color: 10185727 },
    { label: "400", kind: "pts", value: 400, color: 1619878 },
    { label: "\u0411\u041E\u041D\u0423\u0421", kind: "bonus", value: 0, color: 16732120 }
  ];
  var RiddleBoard = class {
    constructor(riddle) {
      this.riddle = riddle;
      this.guessed = /* @__PURE__ */ new Set();
      this.letters = riddle.answer.split("");
      this.open = this.letters.map((ch) => ch === " " || ch === "-");
    }
    get solved() {
      return this.open.every(Boolean);
    }
    hidden() {
      return this.open.filter((o) => !o).length;
    }
    /** Reveal a letter; returns how many cells opened (0 = not in the word). */
    guess(ch) {
      this.guessed.add(ch);
      let n = 0;
      this.letters.forEach((l, i) => {
        if (l === ch && !this.open[i]) {
          this.open[i] = true;
          n++;
        }
      });
      return n;
    }
    /** ҚАРІП: open one hidden letter, preferring the Kazakh-specific ones. */
    hint() {
      const idx = this.letters.map((l, i) => i).filter((i) => !this.open[i]);
      if (!idx.length) return null;
      const sp = idx.filter((i) => SPECIAL.indexOf(this.letters[i]) >= 0);
      const ch = this.letters[(sp.length ? sp : idx)[0]];
      this.guess(ch);
      return ch;
    }
    solve() {
      this.open.fill(true);
    }
  };
  var LEVELS = ["easy", "textbook", "mixed"];
  var LEVEL_LABEL = {
    easy: { kk: "\u0416\u0435\u04A3\u0456\u043B", ru: "1\u20132 \u043A\u043B\u0430\u0441\u0441", en: "grades 1\u20132" },
    textbook: { kk: "\u041E\u049B\u0443\u043B\u044B\u049B", ru: "\u0443\u0447\u0435\u0431\u043D\u0438\u043A 3 \u043A\u043B.", en: "textbook G3" },
    mixed: { kk: "\u0410\u0440\u0430\u043B\u0430\u0441", ru: "\u0432\u0441\u0435 \u0437\u0430\u0433\u0430\u0434\u043A\u0438", en: "all riddles" }
  };
  function defaultLevel(grade, textbookGrade) {
    return grade <= 2 ? "easy" : grade === textbookGrade ? "textbook" : "mixed";
  }
  function riddlePool(all, level) {
    return level === "mixed" ? all.slice() : all.filter((r) => r.level === level);
  }
  function runTilKeremeti(api, gameId, all, level = "mixed") {
    const en = api.lang() === "en", esc = api.esc;
    const riddles = riddlePool(all, level);
    const pool = api.shuffle(riddles.slice()), ROUNDS = 3, MAXH = 3;
    let alive = true;
    let round = 0, hearts = MAXH, score = 0, firstTry = 0, solvedCount = 0, value = 0, mult = 1, spinning = false, board;
    let roundMiss = false;
    const body = api.frame("\u0422\u0456\u043B \u041A\u0435\u0440\u0435\u043C\u0435\u0442\u0456", '<div class="wh-stage" id="whs"></div><div class="wh-host" id="whh"></div><div class="wh-clue" id="whc"></div><div class="wh-board" id="whb"></div><button class="wh-level" id="wlvl" title="' + (en ? "Change difficulty" : "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u0443\u0440\u043E\u0432\u0435\u043D\u044C") + '">' + (level === "easy" ? "\u{1F642} " : level === "textbook" ? "\u{1F393} " : "\u{1F500} ") + esc(LEVEL_LABEL[level].kk) + " \xB7 " + esc(en ? LEVEL_LABEL[level].en : LEVEL_LABEL[level].ru) + ' \u21C4</button><div class="wh-ctrl"><button class="btn gold" id="wspin">\u{1F3A1} ' + (en ? "Spin" : "\u0410\u0439\u043D\u0430\u043B\u0434\u044B\u0440") + '</button><button class="btn ghost" id="wsolve">\u{1F4A1} ' + (en ? "I know the word" : "\u0421\u04E9\u0437\u0434\u0456 \u0431\u0456\u043B\u0435\u043C\u0456\u043D") + '</button></div><div class="wh-keys" id="whk"></div>');
    const host = api.qs("#whh", body), clue = api.qs("#whc", body), boardEl = api.qs("#whb", body), keys = api.qs("#whk", body);
    const spinBtn = api.qs("#wspin", body), solveBtn = api.qs("#wsolve", body);
    api.qs("#wlvl", body).onclick = () => {
      const next = LEVELS[(LEVELS.indexOf(level) + 1) % LEVELS.length];
      alive = false;
      api.S.wheelLevel = next;
      api.sfx.tap();
      runTilKeremeti(api, gameId, all, next);
    };
    const st = stageIn(api.qs("#whs", body), { camPos: [0, 3.2, 7.4], camLook: [0, 1.2, 0], fov: 40 });
    let wheel = null, ata = null, S = null;
    let angle = 0, speed = 0, onStop = null;
    if (st) {
      const { V } = st;
      S = st.S;
      const T = V.THREE;
      wheel = V.group(0, 1.4, 0);
      const n = SECTORS.length;
      SECTORS.forEach((s, i) => {
        const geo = new T.CylinderGeometry(2.2, 2.2, 0.3, 16, 1, false, i / n * Math.PI * 2, Math.PI * 2 / n);
        const c = document.createElement("canvas");
        c.width = 256;
        c.height = 64;
        const g = c.getContext("2d");
        g.fillStyle = "#" + ("00000" + s.color.toString(16)).slice(-6);
        g.fillRect(0, 0, 256, 64);
        g.fillStyle = "#fff";
        g.font = "900 40px Nunito, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(s.label, 128, 34);
        const label = new T.Mesh(new T.PlaneGeometry(1.3, 0.33), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true }));
        const mid = (i + 0.5) / n * Math.PI * 2;
        label.position.set(Math.sin(mid) * 1.35, 0.16, Math.cos(mid) * 1.35);
        label.rotation.x = -Math.PI / 2;
        label.rotation.z = mid + Math.PI / 2;
        wheel.add(new T.Mesh(geo, V.lam(s.color)), label);
      });
      wheel.add(V.cyl(0.35, 0.35, 0.4, V.glow(16763196), 0, 0.1, 0, 20));
      wheel.rotation.x = 0.9;
      S.add(wheel);
      const ptr = new T.Mesh(new T.ConeGeometry(0.22, 0.6, 4), V.glow(16731486));
      ptr.rotation.x = Math.PI;
      S.add(ptr, 0, 1.4 + 2.2 * Math.sin(0.9) + 0.45, -2.2 * Math.cos(0.9));
      ata = S.add(makeCharacter(V, "ATA"), 2.75, 0, 1.4);
      ata.scale.setScalar(0.55);
      ata.rotation.y = -0.6;
      S.onTick((t, dt) => {
        if (!wheel) return;
        if (speed > 0) {
          angle += speed * dt;
          speed = Math.max(0, speed - 2.2 * dt);
          if (speed === 0 && onStop) {
            const cb = onStop;
            onStop = null;
            cb(sectorAt(angle));
          }
        }
        wheel.rotation.y = angle;
      });
    }
    function sectorAt(a) {
      const n = SECTORS.length, x = ((Math.PI - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return SECTORS[Math.floor(x / (Math.PI * 2) * n) % n];
    }
    function say(key) {
      const t = LINES.ATA[key];
      host.innerHTML = "<b>\u0410\u0442\u0430:</b> " + esc(t);
      api.TTS.speak(t, true);
      if (S && ata && window.QV3D) window.QV3D.play(ata, key === "no" ? "idle" : "bata");
    }
    function drawBoard() {
      boardEl.innerHTML = board.letters.map((l, i) => l === " " ? '<i class="sp"></i>' : '<span class="cell' + (board.open[i] ? " on" : "") + (SPECIAL.indexOf(l) >= 0 ? " kz" : "") + '">' + (board.open[i] ? esc(l) : "") + "</span>").join("");
      api.stat(heartsHtml(hearts, MAXH) + " \xB7 \u2B50 " + score + (mult > 1 ? " \xB7 \xD7" + mult : ""));
    }
    function drawKeys(enabled) {
      keys.innerHTML = ALPHABET.map((ch) => '<button class="key' + (SPECIAL.indexOf(ch) >= 0 ? " kz" : "") + '" data-k="' + ch + '"' + (!enabled || board.guessed.has(ch) ? " disabled" : "") + ">" + ch + "</button>").join("");
      api.qsa("[data-k]", keys).forEach((b) => {
        b.onclick = () => letter(b.getAttribute("data-k"));
      });
    }
    function startRound() {
      if (round >= ROUNDS || hearts <= 0 || round >= pool.length) return finish();
      board = new RiddleBoard(pool[round]);
      roundMiss = false;
      value = 0;
      clue.innerHTML = '<p class="kk"><button class="spk sm" data-say="' + esc(board.riddle.clue) + '">\u{1F50A}</button> ' + esc(board.riddle.clue) + '</p><p class="tr">' + esc(en ? board.riddle.en : board.riddle.ru) + '</p><small class="muted">\u{1F4D6} ' + esc(board.riddle.src) + "</small>";
      api.qsa("[data-say]", clue).forEach((b) => {
        b.onclick = () => api.TTS.speak(b.getAttribute("data-say"));
      });
      drawBoard();
      drawKeys(false);
      spinBtn.disabled = false;
      say(round === 0 ? "hello" : "spin");
      setTimeout(() => api.TTS.speak(board.riddle.clue, true), 2200);
    }
    spinBtn.onclick = () => {
      if (spinning) return;
      spinning = true;
      spinBtn.disabled = true;
      api.sfx.tap();
      const done = (s) => {
        spinning = false;
        landed(s);
      };
      if (wheel) {
        speed = 9 + Math.random() * 5;
        onStop = done;
      } else setTimeout(() => done(SECTORS[api.rnd(SECTORS.length)]), 600);
    };
    function landed(s) {
      if (s.kind === "pts") {
        value = s.value * mult;
        mult = 1;
        host.innerHTML = "<b>\u0410\u0442\u0430:</b> " + s.value + (en ? " points for each letter!" : " \u04B1\u043F\u0430\u0439 \u2014 \u04D9\u0440 \u04D9\u0440\u0456\u043F \u04AF\u0448\u0456\u043D!");
        drawKeys(true);
      } else if (s.kind === "prize") {
        api.S.coins = (api.S.coins || 0) + 20;
        say("prize");
        value = 200;
        drawKeys(true);
      } else if (s.kind === "hint") {
        say("hint");
        const ch = board.hint();
        api.sfx.ok();
        drawBoard();
        if (board.solved) return solved();
        value = 100;
        drawKeys(true);
        if (ch) api.toast("\u{1F524} " + ch);
      } else {
        say("bonus");
        mult = 2;
        value = 0;
        spinBtn.disabled = false;
      }
      drawBoard();
    }
    function letter(ch) {
      drawKeys(false);
      const n = board.guess(ch);
      if (n > 0) {
        score += value * n;
        api.sfx.ok();
        say("yes");
        drawBoard();
        if (board.solved) return solved();
      } else {
        hearts--;
        roundMiss = true;
        api.sfx.bad();
        api.vibrate(40);
        say("no");
        drawBoard();
        if (hearts <= 0) {
          setTimeout(finish, 1200);
          return;
        }
      }
      spinBtn.disabled = false;
    }
    solveBtn.onclick = () => {
      if (!board || board.solved) return;
      const others = api.shuffle(riddles.filter((r) => r.answer !== board.riddle.answer)).slice(0, 2).map((r) => r.answer);
      const opts = api.shuffle([board.riddle.answer].concat(others));
      const voice = window.QVOICE && window.QVOICE.ready();
      api.sheet("<h3>" + esc(en ? "What is the word?" : "\u049A\u0430\u043D\u0434\u0430\u0439 \u0441\u04E9\u0437?") + '</h3><div class="cards list">' + opts.map((o, i) => '<button class="card" data-o="' + i + '"><span>' + esc(o) + "</span></button>").join("") + "</div>" + (voice ? '<button class="btn gold" id="wsay">\u{1F399}\uFE0F ' + esc(en ? "Say the word" : "\u0421\u04E9\u0437\u0434\u0456 \u0430\u0439\u0442") + "</button>" : "") + '<button class="btn ghost" id="wno">' + (en ? "Back" : "\u0410\u0440\u0442\u049B\u0430") + "</button>");
      api.qsa("[data-o]").forEach((b) => {
        b.onclick = () => {
          api.closeSheet();
          trySolve(opts[+b.getAttribute("data-o")] === board.riddle.answer);
        };
      });
      const ws = api.qs("#wsay");
      if (ws) ws.onclick = () => {
        ws.textContent = "\u{1F399}\uFE0F \u2026";
        window.QVOICE.listen(board.riddle.answer.toLowerCase()).then((r) => {
          api.closeSheet();
          if (r.error) {
            api.toast(window.QVOICE.errText(r.error));
            return;
          }
          api.toast(Math.round(r.score || 0) + "%");
          if (r.passed) {
            score += 100;
            trySolve(true);
          } else api.toast(en ? "Not yet \u2014 try again or tap the word" : "\u041F\u043E\u043A\u0430 \u043D\u0435 \u0442\u0430\u043A \u2014 \u0441\u043A\u0430\u0436\u0438 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438 \u0441\u043B\u043E\u0432\u043E");
        });
      };
      api.qs("#wno").onclick = () => api.closeSheet();
    };
    function trySolve(ok) {
      if (ok) {
        score += 100 * board.hidden();
        board.solve();
        solved();
        return;
      }
      hearts--;
      roundMiss = true;
      api.sfx.bad();
      say("no");
      drawBoard();
      if (hearts <= 0) setTimeout(finish, 1200);
    }
    function solved() {
      drawBoard();
      drawKeys(false);
      spinBtn.disabled = true;
      solvedCount++;
      if (!roundMiss) firstTry++;
      say("solved");
      api.confetti();
      if (S && window.QV3D) window.QV3D.sparks(S, 0, 2.5, 0.5, 16763196, 30);
      setTimeout(() => api.TTS.speak(board.riddle.answer.toLowerCase(), true), 1400);
      round++;
      setTimeout(() => {
        if (alive) startRound();
      }, 3200);
    }
    function finish() {
      if (!alive) return;
      say("bye");
      finishTopic(api, gameId, firstTry, ROUNDS, {
        score: solvedCount,
        scoreText: solvedCount + " / " + ROUNDS + " \xB7 " + score + " \u04B1\u043F\u0430\u0439",
        coins: Math.round(score / 100) + solvedCount * 5,
        xp: Math.min(15, 4 * solvedCount),
        title: solvedCount === ROUNDS ? "\u0411\u04D9\u0440\u0435\u043A\u0435\u043B\u0434\u0456!" : solvedCount ? "\u0416\u0430\u0440\u0430\u0439\u0441\u044B\u04A3!" : "\u0422\u0430\u0493\u044B \u043E\u0439\u043D\u0430\u0439\u044B\u049B!",
        sub: (en ? "Riddles solved: " : "\u041E\u0442\u0433\u0430\u0434\u0430\u043D\u043E \u0437\u0430\u0433\u0430\u0434\u043E\u043A: ") + solvedCount + " / " + ROUNDS
      });
    }
    startRound();
  }

  // src/games/ArchitectWorkshop3D.ts
  function runWorkshop(api, gameId, blueprints) {
    const en = api.lang() === "en", esc = api.esc;
    const body = api.frame("\u0421\u04D9\u0443\u043B\u0435\u0442\u0448\u0456 \u0448\u0435\u0431\u0435\u0440\u0445\u0430\u043D\u0430\u0441\u044B", '<div class="ws-stage" id="wss"></div><div class="ws-panel" id="wsp"></div>');
    const panel = api.qs("#wsp", body);
    const st = stageIn(api.qs("#wss", body), { camPos: [0, 6.5, 19], camLook: [0, 4.4, 0], fov: 42 });
    let ghost = null, built = null;
    if (st) {
      const { V, S } = st;
      S.add(V.box(24, 0.2, 24, 14673650, 0, -0.1, 0));
      const ali = S.add(makeCharacter(V, "ALIBEK"), -4.2, 0, 3);
      ali.rotation.y = 0.5;
      S.onTick((t) => {
        if (built) built.rotation.y = t * 0.25;
        if (ghost) ghost.rotation.y = t * 0.25;
      });
    }
    function choose() {
      api.stat("");
      panel.innerHTML = '<p class="kk center"><b>' + esc(LINES.APAI.pick) + '</b></p><div class="cards list">' + blueprints.map((b, i) => '<button class="card" data-b="' + i + '"><span class="idx">' + (i + 1) + "</span><span><b>" + esc(b.kk) + "</b><small> \xB7 " + esc(b.city) + " \xB7 " + esc(api.tr(b)) + "</small></span></button>").join("") + "</div>";
      api.TTS.speak(LINES.APAI.pick, true);
      api.qsa("[data-b]", panel).forEach((el) => {
        el.onclick = () => {
          api.sfx.tap();
          start(blueprints[+el.getAttribute("data-b")]);
        };
      });
    }
    function start(bp) {
      let i = 0, hearts = 3, firstTry = 0, missed = false;
      if (st) {
        const { V, S } = st;
        if (ghost) S.remove(ghost);
        if (built) S.remove(built);
        ghost = fullBuilding(V, bp.id);
        ghost.traverse((m) => {
          const mesh = m;
          if (mesh.isMesh) mesh.material = V.lam(10135236, { transparent: true, opacity: 0.12, wireframe: true });
        });
        S.add(ghost);
        built = V.group();
        S.add(built);
      }
      api.TTS.speak(LINES.ALIBEK.workshop, true);
      ask();
      function ask() {
        if (i >= bp.tiers.length) return done();
        const t = bp.tiers[i], opts = api.shuffle(t.opts);
        missed = false;
        api.stat(heartsHtml(hearts, 3) + " \xB7 \u{1F3D7}\uFE0F " + i + "/" + bp.tiers.length);
        panel.innerHTML = '<p class="muted center">' + esc(bp.kk) + " \xB7 " + esc(t.kk) + " \u2014 " + esc(api.tr(t)) + '</p><p class="kk center"><button class="spk sm" data-say="' + esc(t.q) + '">\u{1F50A}</button> <b>' + esc(t.q) + '</b></p><div class="cards list">' + opts.map((o, k) => '<button class="card" data-o="' + k + '"><span class="idx">' + (k + 1) + "</span><span>" + esc(o) + "</span></button>").join("") + "</div>";
        api.qsa("[data-say]", panel).forEach((b) => {
          b.onclick = () => api.TTS.speak(b.getAttribute("data-say"));
        });
        api.TTS.speak(t.q, true);
        api.qsa("[data-o]", panel).forEach((el) => {
          el.onclick = () => {
            const o = opts[+el.getAttribute("data-o")];
            if (o === t.ans) {
              el.classList.add("right");
              api.sfx.ok();
              api.TTS.speak(t.ans, true);
              if (!missed) firstTry++;
              place(t.id);
              i++;
              setTimeout(ask, 1300);
            } else {
              el.classList.add("wrong", "shake");
              api.sfx.bad();
              api.vibrate(40);
              missed = true;
              hearts--;
              api.stat(heartsHtml(hearts, 3) + " \xB7 \u{1F3D7}\uFE0F " + i + "/" + bp.tiers.length);
              if (hearts <= 0) {
                api.toast((en ? "Answer: " : "\u041E\u0442\u0432\u0435\u0442: ") + t.ans);
                setTimeout(() => done(true), 1400);
              }
            }
          };
        });
      }
      function place(tier) {
        if (!st || !built) return;
        const { V, S } = st, piece = buildTier(V, bp.id, tier);
        piece.position.y = 6;
        built.add(piece);
        tween(S, 650, (k) => {
          piece.position.y = 6 * (1 - k);
        }, () => {
          V.sparks(S, 0, 1 + TIERS[bp.id].indexOf(tier) * 1.6, 0, 16763196, 18);
        });
      }
      function done(failed) {
        if (!failed) {
          api.TTS.speak(bp.done, true);
          api.confetti();
          panel.innerHTML = '<p class="kk center"><b>' + esc(bp.done) + "</b></p>";
        }
        setTimeout(() => finishTopic(api, gameId, firstTry, bp.tiers.length, {
          title: failed ? "\u0422\u0430\u0493\u044B \u0436\u0430\u0442\u0442\u044B\u049B!" : firstTry === bp.tiers.length ? "\u041A\u0435\u0440\u0435\u043C\u0435\u0442! \u041C\u0456\u043D\u0441\u0456\u0437!" : "\u0416\u0430\u0440\u0430\u0439\u0441\u044B\u04A3!",
          sub: bp.kk + " \xB7 " + (en ? "first-try answers: " : "\u0441 \u043F\u0435\u0440\u0432\u043E\u0439 \u043F\u043E\u043F\u044B\u0442\u043A\u0438: ") + firstTry + " / " + bp.tiers.length,
          coins: firstTry * 2 + (failed ? 0 : 10)
        }), failed ? 600 : 2600);
      }
    }
    choose();
  }

  // src/games/GoodDeedsRoom3D.ts
  function runRoom(api, gameId, room) {
    const en = api.lang() === "en", esc = api.esc;
    const items = api.shuffle(room.items.slice());
    let i = 0, hearts = 3, firstTry = 0, missed = false, busy = false;
    const body = api.frame("\u0416\u0430\u049B\u0441\u044B \u0456\u0441\u0442\u0435\u0440 \u0431\u04E9\u043B\u043C\u0435\u0441\u0456", '<div class="rm-stage" id="rms"></div><div class="rm-meter"><i id="rmm"></i></div><div class="rm-panel" id="rmp"></div>');
    const panel = api.qs("#rmp", body), meter = api.qs("#rmm", body);
    const st = stageIn(api.qs("#rms", body), { camPos: [0, 6.5, 10], camLook: [0, 1.2, 0], fov: 46 });
    const props = {}, spots = {};
    let zh = null;
    if (st) {
      const { V, S } = st;
      S.add(V.box(12, 0.2, 9, 14271136, 0, -0.1, 0));
      S.add(V.box(12, 5, 0.2, 15265532, 0, 2.4, -4.5));
      S.add(V.box(0.2, 5, 9, 14673914, -6, 2.4, 0));
      S.add(V.box(3, 0.7, 1.8, 3824288, 3.8, 0.35, -3.4));
      const blanket = S.add(V.box(2.6, 0.15, 1.6, 16747050, 3.6, 0.8, -3.2));
      blanket.rotation.z = 0.25;
      const build = {
        sore: () => V.group(0, 0, 0, V.box(2.4, 0.12, 0.6, 9067050, 0, 0, 0), V.box(2.4, 0.12, 0.6, 9067050, 0, 0.8, 0)),
        shkaf: () => V.group(0, 0, 0, V.box(1.6, 3.2, 1, 11565642, 0, 1.6, 0), V.box(0.08, 0.5, 0.08, 16763196, 0.2, 1.8, 0.52)),
        sebet: () => V.cyl(0.55, 0.45, 0.8, 14201450, 0, 0.4, 0, 12),
        qorap: () => V.box(1.2, 0.8, 0.9, 14701642, 0, 0.4, 0),
        somke: () => V.box(0.8, 0.9, 0.4, 2381513, 0, 0.45, 0),
        qoqys: () => V.cyl(0.4, 0.35, 0.8, 5923704, 0, 0.4, 0, 12)
      };
      const at = { sore: [-5.5, 2.4, -2], shkaf: [-4.6, 0, -3.8], sebet: [-1.6, 0, -3.6], qorap: [0.6, 0, -3.7], somke: [-3.2, 0, 2.6], qoqys: [5.2, 0, 2.6] };
      room.containers.forEach((c) => {
        const o = S.add(build[c.id] ? build[c.id]() : V.box(1, 1, 1, 13421772), ...at[c.id] || [0, 0, 0]);
        if (c.id === "sore") o.rotation.y = Math.PI / 2;
        spots[c.id] = [o.position.x, c.id === "sore" ? 2.6 : c.id === "shkaf" ? 1.6 : 0.9, o.position.z];
      });
      const make = {
        kitap: () => V.box(0.7, 0.18, 0.5, 3129178),
        koilek: () => V.box(0.9, 0.08, 0.8, 1619878),
        shulyq: () => V.box(0.25, 0.1, 0.5, 16732120),
        dop: () => V.ball(0.32, 16777215),
        oiynshyq: () => V.group(0, 0, 0, V.ball(0.3, 10514490, 0, 0.3, 0), V.ball(0.2, 10514490, 0, 0.7, 0), V.ball(0.08, 10514490, -0.14, 0.88, 0), V.ball(0.08, 10514490, 0.14, 0.88, 0)),
        qalam: () => {
          const p = V.cyl(0.05, 0.05, 0.7, 16763196);
          p.rotation.z = Math.PI / 2;
          return p;
        },
        dapter: () => V.box(0.55, 0.06, 0.4, 2275568),
        qoqys: () => {
          const b = V.cyl(0.08, 0.12, 0.7, 16767050);
          b.rotation.z = 1.2;
          return b;
        }
      };
      const floor = [[-1.5, 0.5], [1.2, 1.3], [2.6, -0.4], [-0.2, 2.4], [3.4, 1.6], [-2.8, -0.6], [0.6, -1.2], [4.4, -0.9]];
      items.forEach((x, k) => {
        const o = S.add((make[x.id] || (() => V.box(0.4, 0.4, 0.4, 13421772)))(), floor[k % floor.length][0], 0.2, floor[k % floor.length][1]);
        o.rotation.y = k;
        props[x.id] = o;
      });
      zh = S.add(makeCharacter(V, "ZHALKAU"), 3.6, 0, 0.6);
      zh.scale.setScalar(0.6);
      zh.rotation.y = -0.6;
      S.onTick((t) => {
        const cur = items[i];
        if (cur && props[cur.id] && !busy) props[cur.id].position.y = 0.3 + Math.abs(Math.sin(t * 4)) * 0.35;
      });
    }
    api.TTS.speak(room.start, true);
    panel.innerHTML = '<p class="kk"><b>\u0416\u0430\u043B\u049B\u0430\u0443\u0431\u0435\u043A:</b> ' + esc(room.start) + '</p><p class="kk"><b>\u04D8\u043B\u0456\u0431\u0435\u043A:</b> ' + esc(LINES.ALIBEK.room) + '</p><button class="btn ok" id="rgo">' + (en ? "Let\u2019s tidy up!" : "\u0416\u0438\u043D\u0430\u0439\u044B\u049B!") + "</button>";
    api.qs("#rgo", panel).onclick = () => {
      api.sfx.tap();
      ask();
    };
    function ask() {
      if (i >= items.length) return done();
      const x = items[i];
      missed = false;
      busy = false;
      api.stat(heartsHtml(hearts, 3) + " \xB7 \u{1F9F9} " + i + "/" + items.length);
      meter.style.width = Math.round(i / items.length * 100) + "%";
      panel.innerHTML = '<p class="kk center"><span class="rm-e">' + esc(x.e) + "</span> <b>" + esc(x.kk) + '</b> <button class="spk sm" data-say="' + esc(x.kk) + '">\u{1F50A}</button></p><p class="center"><b>' + esc(LINES.APAI.where) + '</b></p><div class="rm-cont">' + room.containers.map((c) => '<button class="card" data-c="' + c.id + '"><span>' + esc(c.e) + "</span><b>" + esc(c.kk) + "</b><small>" + esc(api.tr(c)) + "</small></button>").join("") + "</div>";
      api.qsa("[data-say]", panel).forEach((b) => {
        b.onclick = () => api.TTS.speak(b.getAttribute("data-say"));
      });
      api.TTS.speak(x.kk, true);
      api.qsa("[data-c]", panel).forEach((el) => {
        el.onclick = () => {
          if (busy) return;
          const to = el.getAttribute("data-c");
          if (to === x.to) {
            busy = true;
            el.classList.add("right");
            api.sfx.ok();
            if (!missed) firstTry++;
            api.TTS.speak(x.say, true);
            panel.insertAdjacentHTML("afterbegin", '<p class="rm-say kk">\u2705 ' + esc(x.say) + '<br><small class="tr">' + esc(en ? x.en : x.ru) + "</small></p>");
            fly(x, () => {
              i++;
              if (i === Math.ceil(items.length / 2)) api.TTS.speak(LINES.ZHALKAU.mid, true);
              setTimeout(ask, 900);
            });
          } else {
            el.classList.add("wrong", "shake");
            api.sfx.bad();
            api.vibrate(40);
            missed = true;
            hearts--;
            const good = room.containers.find((c) => c.id === x.to);
            api.toast("\u{1F4A1} " + x.kk + " \u2192 " + good.kk);
            api.stat(heartsHtml(hearts, 3) + " \xB7 \u{1F9F9} " + i + "/" + items.length);
            if (hearts <= 0) setTimeout(() => done(true), 900);
          }
        };
      });
    }
    function fly(x, cb) {
      if (!st || !props[x.id] || !spots[x.to]) return cb();
      const o = props[x.id], [ax, ay, az] = [o.position.x, o.position.y, o.position.z], [bx, by, bz] = spots[x.to];
      tween(st.S, 800, (k) => {
        o.position.set(ax + (bx - ax) * k, ay + (by - ay) * k + Math.sin(k * Math.PI) * 2, az + (bz - az) * k);
      }, () => {
        o.visible = x.to !== "qoqys" && x.to !== "somke" && x.to !== "qorap" && x.to !== "sebet" && x.to !== "shkaf";
        cb();
      });
    }
    function done(failed) {
      meter.style.width = failed ? meter.style.width : "100%";
      if (!failed) {
        api.TTS.speak(room.end, true);
        api.confetti();
        if (st && zh && window.QV3D) {
          const { V, S } = st, p = zh.position.clone();
          S.remove(zh);
          zh = S.add(makeCharacter(V, "ZHALKAU_TIDY"), p.x, 0, p.z);
          zh.scale.setScalar(0.6);
          V.play(zh, "cheer");
          V.sparks(S, p.x, 2, p.z, 8257370, 30);
        }
        panel.innerHTML = '<p class="kk center"><b>\u0416\u0430\u043B\u049B\u0430\u0443\u0431\u0435\u043A:</b> ' + esc(room.end) + "</p>";
      }
      setTimeout(() => finishTopic(api, gameId, firstTry, items.length, {
        title: failed ? "\u0422\u0430\u0493\u044B \u0436\u0430\u0442\u0442\u044B\u049B!" : firstTry === items.length ? "\u041A\u0435\u0440\u0435\u043C\u0435\u0442! \u041C\u0456\u043D\u0441\u0456\u0437!" : "\u0416\u0430\u0440\u0430\u0439\u0441\u044B\u04A3!",
        sub: (en ? "First-try answers: " : "\u0421 \u043F\u0435\u0440\u0432\u043E\u0439 \u043F\u043E\u043F\u044B\u0442\u043A\u0438: ") + firstTry + " / " + items.length
      }), failed ? 500 : 2600);
    }
  }

  // src/main.ts
  window.QLE = { LessonEngine, ADVICE, markOf, nextStreak, comboMultiplier };
  registerExercises(window.Q);
  var C = window.QCURRICULUM;
  window.QGAMES = window.QGAMES || {};
  Object.entries(C.topicGames).forEach(([id, g]) => {
    if (g.type === "dialogue") window.QGAMES[id] = (api) => renderDialogue(api, id, C.dialogues[g.dialogue]);
    if (g.type === "3d") {
      if (g.scene === "wheel") window.QGAMES[id] = (api) => {
        const grades = window.Q.api.D.GRADES;
        const textbookGrade = grades.findIndex((x) => x.textbook) + 1, grade = Number(api.S.grade) || 1;
        const saved = api.S.wheelLevel;
        runTilKeremeti(api, id, C.riddles, saved && LEVELS.includes(saved) ? saved : defaultLevel(grade, textbookGrade));
      };
      if (g.scene === "workshop") window.QGAMES[id] = (api) => runWorkshop(api, id, C.workshop);
      if (g.scene === "room") window.QGAMES[id] = (api) => runRoom(api, id, C.room);
    }
  });
  window.QVM = { DialogueEngine, RiddleBoard, voice: { PERSONAS, ssml, elevenLabsRequest, voiceDesignPrompt } };
})();
