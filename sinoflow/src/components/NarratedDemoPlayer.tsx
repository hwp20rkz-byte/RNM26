"use client";

import { AnimatePresence, motion } from "motion/react";
import { Captions, ChevronDown, ChevronUp, Pause, Play, SkipBack, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { AbortedError } from "@/lib/mockAgentWorkflow";
import { estimateSpeechMs, TOUR, type TourController } from "@/lib/tourScript";
import { useApp } from "@/state/AppProvider";

type Status = "idle" | "playing" | "paused" | "done";
type NarrLang = "ru" | "en";

export const TOUR_EVENT = "sinoflow:tour";

/** Озвучка через Web Speech API: режем на предложения (у Chrome длинные фразы обрываются). */
class Narrator {
  private synth: SpeechSynthesis | null = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  private token = 0;

  available() {
    return this.synth !== null;
  }
  voiceFor(lang: NarrLang): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    const pref = lang === "ru" ? /google|milena|yuri|irina|svetlana|dariya|pavel/i : /google|samantha|daniel|aria|jenny|guy/i;
    return voices.find((v) => v.lang.toLowerCase().startsWith(lang) && pref.test(v.name)) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
  }
  speak(text: string, lang: NarrLang): Promise<"done" | "cancelled" | "failed"> {
    const synth = this.synth;
    if (!synth) return Promise.resolve("failed");
    const my = ++this.token;
    synth.cancel();
    const voice = this.voiceFor(lang);
    const parts = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (my !== this.token) return resolve("cancelled");
        if (i >= parts.length) return resolve("done");
        const u = new SpeechSynthesisUtterance(parts[i++]);
        u.lang = lang === "ru" ? "ru-RU" : "en-US";
        if (voice) u.voice = voice;
        u.rate = lang === "ru" ? 1.04 : 1;
        u.onend = next;
        u.onerror = (e) => resolve(e.error === "interrupted" || e.error === "canceled" ? "cancelled" : "failed");
        synth.speak(u);
      };
      next();
    });
  }
  pause() {
    this.synth?.pause();
  }
  resume() {
    this.synth?.resume();
  }
  cancel() {
    this.token++;
    this.synth?.cancel();
  }
}

export function NarratedDemoPlayer() {
  const app = useApp();
  const appRef = useRef(app);
  appRef.current = app;

  const [status, setStatus] = useState<Status>("idle");
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<NarrLang>("ru");
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [voiceState, setVoiceState] = useState<"unknown" | "ok" | "no-voice" | "unsupported">("unknown");
  const [progress, setProgress] = useState(0);

  const narrator = useRef<Narrator | null>(null);
  const runId = useRef(0);
  const abort = useRef(new AbortController());
  const ffw = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const statusRef = useRef(status);
  statusRef.current = status;
  const timing = useRef({ elapsed: 0, est: 1, last: 0 });

  useEffect(() => {
    narrator.current = new Narrator();
    const check = () => {
      const n = narrator.current!;
      if (!n.available()) return setVoiceState("unsupported");
      setVoiceState(n.voiceFor(langRef.current) ? "ok" : "no-voice");
    };
    check();
    if ("speechSynthesis" in window) window.speechSynthesis.addEventListener?.("voiceschanged", check);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.removeEventListener?.("voiceschanged", check);
      narrator.current?.cancel();
    };
  }, []);
  useEffect(() => {
    const n = narrator.current;
    if (n?.available()) setVoiceState(n.voiceFor(lang) ? "ok" : "no-voice");
  }, [lang]);

  // Прогресс-бар: считаем только активное время (без пауз).
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const tm = timing.current;
      if (statusRef.current === "playing" && tm.last) tm.elapsed += t - tm.last;
      tm.last = t;
      setProgress((stepRef.current + Math.min(0.98, tm.elapsed / tm.est)) / TOUR.length);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const stepRef = useRef(step);
  stepRef.current = step;

  const ctl: TourController = {
    get instant() {
      return ffw.current;
    },
    sleep: (ms) => (ffw.current ? Promise.resolve() : appRef.current.clock.sleep(ms, abort.current.signal)),
    async waitFor(pred, timeoutMs = 30_000) {
      if (ffw.current) return;
      let waited = 0;
      while (!pred(appRef.current.wf) && waited < timeoutMs) {
        await appRef.current.clock.sleep(120, abort.current.signal);
        waited += 120;
      }
    },
    setMode: (m) => appRef.current.setMode(m),
    setDeckSlide: (n) => appRef.current.setDeckSlide(n),
    focus(id, scroll = true) {
      appRef.current.focus(id);
      if (scroll && id && !ffw.current) {
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    openIntake: (d) => appRef.current.openIntake(d),
    async typeDraft(text, ms) {
      if (ffw.current) return appRef.current.patchDraft({ rawText: text });
      const steps = Math.ceil(text.length / 4);
      for (let i = 1; i <= steps; i++) {
        appRef.current.patchDraft({ rawText: text.slice(0, i * 4) });
        await appRef.current.clock.sleep(ms / steps, abort.current.signal);
      }
    },
    setMargin: (m) => appRef.current.setPricing({ ...appRef.current.pricing, agencyMargin: m }),
    submitIntake: () => void appRef.current.submitIntake(),
    resetCase: () => appRef.current.resetToEmpty(),
    startStage: (s) => appRef.current.runStage(s),
    approve: () => appRef.current.approve(),
    setDisplayCurrency: (c) => appRef.current.setDisplayCurrency(c),
    setLandedDest: (d) => appRef.current.setLandedDest(d),
    setChannel: (c) => appRef.current.setChannel(c),
  };

  const speakStep = useCallback(
    async (text: string, est: number) => {
      const n = narrator.current;
      const canSpeak = !mutedRef.current && n?.available() && n.voiceFor(langRef.current);
      if (!canSpeak) return ctl.sleep(est);
      const r = await n!.speak(text, langRef.current);
      if (r === "failed") return ctl.sleep(est * 0.6);
      if (r === "cancelled") throw new AbortedError();
    },
    // ctl собирается на каждом рендере, но опирается только на ref'ы
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const playFrom = useCallback(
    async (k: number, id: number) => {
      try {
        for (let i = k; i < TOUR.length; i++) {
          if (id !== runId.current) return;
          const s = TOUR[i]!;
          const text = s.narration[langRef.current];
          const est = estimateSpeechMs(text, langRef.current);
          setStep(i);
          timing.current = { elapsed: 0, est, last: 0 };
          await Promise.all([speakStep(text, est), s.run(ctl)]);
          if (id !== runId.current) return;
          await ctl.sleep(700);
        }
        if (id === runId.current) {
          setStatus("done");
          appRef.current.focus(null);
        }
      } catch (e) {
        if (!(e instanceof AbortedError)) console.error(e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speakStep],
  );

  const stopAll = useCallback(() => {
    runId.current++;
    abort.current.abort();
    abort.current = new AbortController();
    narrator.current?.cancel();
    appRef.current.cancelRun();
    appRef.current.clock.resume();
  }, []);

  const jumpTo = useCallback(
    async (k: number) => {
      const target = Math.max(0, Math.min(TOUR.length - 1, k));
      stopAll();
      const id = runId.current;
      setStatus("playing");
      setStep(target);
      const a = appRef.current;
      ffw.current = true;
      a.clock.instant = true;
      a.autoApprove.current = true;
      try {
        for (let i = 0; i < target; i++) {
          await TOUR[i]!.run(ctl);
          await new Promise((r) => setTimeout(r, 30)); // дать React применить состояние
          if (id !== runId.current) return;
        }
      } finally {
        ffw.current = false;
        a.clock.instant = false;
        a.autoApprove.current = false;
      }
      if (id === runId.current) void playFrom(target, id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playFrom, stopAll],
  );

  const start = useCallback(() => {
    setExpanded(true);
    void jumpTo(0);
  }, [jumpTo]);

  const togglePlay = () => {
    if (status === "idle" || status === "done") return start();
    if (status === "playing") {
      setStatus("paused");
      app.clock.pause();
      narrator.current?.pause();
    } else {
      setStatus("playing");
      app.clock.resume();
      narrator.current?.resume();
    }
  };

  const stop = () => {
    stopAll();
    setStatus("idle");
    app.focus(null);
  };

  useEffect(() => {
    const onStart = () => start();
    window.addEventListener(TOUR_EVENT, onStart);
    return () => window.removeEventListener(TOUR_EVENT, onStart);
  }, [start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, button")) return;
      if (e.code === "Space" && statusRef.current !== "idle") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cur = TOUR[step]!;
  const active = status !== "idle";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <motion.div
        layout
        className="glass pointer-events-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border shadow-card"
        role="region"
        aria-label="Озвученный гид"
      >
        {/* Прогресс по шагам */}
        <div className="flex h-1.5 gap-0.5 bg-surface-2">
          {TOUR.map((s, i) => {
            const fill = Math.max(0, Math.min(1, progress * TOUR.length - i));
            return (
              <button key={s.id} type="button" onClick={() => void jumpTo(i)} aria-label={`Шаг ${i + 1}: ${s.title[lang]}`} className="relative flex-1 bg-border/60">
                <span className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${(active ? fill : 0) * 100}%` }} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-2 sm:gap-3 sm:p-3">
          <button type="button" onClick={togglePlay} aria-label={status === "playing" ? "Пауза" : "Запустить гида"}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg transition-transform active:scale-95">
            {status === "playing" ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <div className="hidden gap-1 sm:flex">
            <IconBtn label="Предыдущий шаг" onClick={() => void jumpTo(step - 1)} disabled={!active || step === 0}><SkipBack className="size-4" /></IconBtn>
            <IconBtn label="Следующий шаг" onClick={() => void jumpTo(step + 1)} disabled={!active || step === TOUR.length - 1}><SkipForward className="size-4" /></IconBtn>
          </div>

          <div className="min-w-0 flex-1">
            <p className="num truncate text-xs text-muted">
              {active ? `Шаг ${step + 1} из ${TOUR.length} · ${cur.title[lang]}` : `Озвученный гид · ${TOUR.length} шагов · около 3 минут`}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              {expanded && (
                <motion.p key={`${step}-${lang}-${active}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={cn("text-sm leading-snug", active ? "line-clamp-3" : "line-clamp-2 text-muted")}>
                  {active ? cur.narration[lang] : "Нажмите ▶: гид сам создаст заявку, запустит агентов, проведёт переговоры в WeChat и посчитает КП в ₸ ₽ ¥ $."}
                </motion.p>
              )}
            </AnimatePresence>
            {voiceState !== "ok" && voiceState !== "unknown" && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
                <Captions className="size-3" />
                {voiceState === "unsupported" ? "Браузер не поддерживает синтез речи: показываем субтитры" : `В системе нет голоса ${lang.toUpperCase()}: показываем субтитры`}
              </p>
            )}
          </div>

          <div role="group" aria-label="Язык озвучки" className="hidden rounded-xl border border-border p-0.5 text-xs sm:inline-flex">
            {(["ru", "en"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={cn("min-h-9 min-w-10 rounded-lg font-semibold uppercase", lang === l ? "bg-surface-2" : "text-muted")}>
                {l}
              </button>
            ))}
          </div>
          <IconBtn label={muted ? "Включить звук" : "Выключить звук"} onClick={() => { setMuted((m) => !m); narrator.current?.cancel(); }} pressed={muted}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconBtn>
          <IconBtn label={expanded ? "Свернуть субтитры" : "Показать субтитры"} onClick={() => setExpanded((e) => !e)}>
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </IconBtn>
          {active && (
            <IconBtn label="Остановить гида" onClick={stop}><Square className="size-4" /></IconBtn>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, pressed }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; pressed?: boolean }) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} title={label} onClick={onClick} disabled={disabled}
      className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40">
      {children}
    </button>
  );
}
