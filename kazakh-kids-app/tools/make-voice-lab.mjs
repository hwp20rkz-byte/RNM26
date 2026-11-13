#!/usr/bin/env node
/**
 * Voice lab for the TEST build: every Freedom Speech catalog voice reading the same Kazakh phrases, plus demos of
 * every feature the API key can use (emotions, prosody tags, non-speech sounds, the two models, speech recognition).
 * The audio is rendered here, on the developer machine, and shipped as mp3 — the APK never holds the API key.
 *
 *   FS_API_KEY=... node tools/make-voice-lab.mjs            # renders only what is missing → web/voice-lab/
 *
 * Output: web/voice-lab/<id>.mp3 and web/voice-lab/lab-data.js (window.QVLAB): voices with measured median pitch,
 * feature demos with the API answer (ok / HTTP status), and what speech recognition heard back.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FreedomSpeech } from 'freedomspeech';
import { similarity } from './make-audio-fs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'web', 'voice-lab');

export const VOICES = [
  // id, label, gender, character of the voice (from listening notes and measured pitch)
  ['tomiris', 'Томирис', 'f', 'основной женский голос сервиса; эмоции и смех'],
  ['taymas', 'Таймас', 'm', 'основной мужской голос'],
  ['assel_call_center_kz', 'Әсел', 'f', 'самый высокий женский, бодрый'],
  ['anara_call_center_kz', 'Анара', 'f', 'высокий женский, деловой'],
  ['call_center_alua_kz', 'Алуа', 'f', 'женский, ровный'],
  ['saltanat', 'Салтанат', 'f', 'женский, мягкий'],
  ['meiramgul_tales_kz', 'Мейрамгүл', 'f', 'сказочница, спокойная'],
  ['guldana_audiobook_kz', 'Гүлдана', 'f', 'аудиокниги, тёплый'],
  ['gaukhar_kz', 'Гауһар', 'f', 'женский, ниже среднего'],
  ['daniyar_kz', 'Данияр', 'm', 'высокий мужской, молодой'],
  ['didar_tales_kz', 'Дидар', 'm', 'сказочник'],
  ['arman_call_center_kz', 'Арман', 'm', 'мужской, бодрый'],
  ['bakhytzhan_lecture_kz', 'Бақытжан', 'm', 'лектор'],
  ['kanat_lecture_kz', 'Қанат', 'm', 'лектор, размеренный'],
  ['azamat_kz', 'Азамат', 'm', 'мужской, средний'],
  ['zhanbatyr_kz', 'Жанбатыр', 'm', 'низкий мужской'],
  ['bauyrzhan_audiobook_kz', 'Бауыржан', 'm', 'аудиокниги, низкий, тёплый'],
  ['nurdaulet', 'Нұрдәулет', 'm', 'низкий мужской'],
  ['alikhan_kz', 'Әлихан', 'm', 'самый низкий'],
  ['aya_kz', 'Ая', 'f', 'в каталоге был, сейчас сервис отвечает 404']
];

export const PHRASES = [
  { id: 'hi', kk: 'Сәлем, балалар! Бүгін бірге ойнаймыз.', ru: 'Привет, дети! Сегодня играем вместе.' },
  { id: 'hero', kk: 'Алға, батырым! Біз міндетті түрде жеңеміз!', ru: 'Вперёд, мой батыр! Мы обязательно победим!' },
  { id: 'ask', kk: 'Бұл не? Қызық екен, білгім келеді.', ru: 'Что это? Интересно, хочу узнать.' }
];

/** Feature demos: the request as sent, so the lab shows exactly what each option does. */
export const FEATURES = [
  ...['neutral', 'happy', 'sad', 'angry', 'surprised', 'fear', 'calm', 'excited', 'whisper'].map((e) => ({
    id: 'emo-' + e, group: 'Эмоция (emotion)', label: e, voice: 'tomiris', emotion: e, kk: 'Сен бүгін мектепке барасың ба?', ru: 'Ты сегодня идёшь в школу?' })),
  { id: 'emo-happy-meiramgul', group: 'Эмоция (emotion)', label: 'happy у другого голоса (Мейрамгүл)', voice: 'meiramgul_tales_kz', emotion: 'happy', kk: 'Сен бүгін мектепке барасың ба?', ru: 'Ты сегодня идёшь в школу?' },
  { id: 'tag-plain', group: 'Теги просодии', label: 'без тегов', voice: 'tomiris', kk: 'Бір, екі, үш. Назар аударыңдар!', ru: 'Раз, два, три. Внимание!' },
  { id: 'tag-pause', group: 'Теги просодии', label: '<pause>', voice: 'tomiris', kk: 'Бір <pause> екі <pause> үш. Назар аударыңдар!', ru: 'паузы между числами' },
  { id: 'tag-louder', group: 'Теги просодии', label: '<louder>…</louder>', voice: 'tomiris', kk: 'Бір, екі, үш. <louder>Назар аударыңдар!</louder>', ru: 'громче на команде' },
  { id: 'tag-slower', group: 'Теги просодии', label: '<slower>…</slower>', voice: 'tomiris', kk: '<slower>Бір, екі, үш. Назар аударыңдар!</slower>', ru: 'медленнее — для старших героев и диктанта' },
  { id: 'ns-laugh', group: 'Неречевые звуки (только tomiris)', label: '<laugh>', voice: 'tomiris', kk: 'Сен өте күлкілісің <laugh>', ru: 'Ты очень смешной (смех)' },
  { id: 'ns-sigh', group: 'Неречевые звуки (только tomiris)', label: '<sigh>', voice: 'tomiris', kk: 'Мен <sigh> қатты шаршадым.', ru: 'Я (вздох) очень устала.' },
  { id: 'ns-cough', group: 'Неречевые звуки (только tomiris)', label: '<cough>', voice: 'tomiris', kk: 'Кешіріңіз <cough> мен ауырып тұрмын.', ru: 'Простите (кашель), я болею.' },
  { id: 'ns-laugh-taymas', group: 'Неречевые звуки (только tomiris)', label: '<laugh> у Таймаса', voice: 'taymas', kk: 'Сен өте күлкілісің <laugh>', ru: 'проверка: работает ли смех у другого голоса' },
  { id: 'model-main', group: 'Модель', label: 'freedomspeech', voice: 'tomiris', model: 'freedomspeech', kk: 'Қазақ тілі — менің ана тілім.', ru: 'Казахский — мой родной язык.' },
  { id: 'model-flash', group: 'Модель', label: 'freedomspeech-flash (быстрее)', voice: 'tomiris', model: 'freedomspeech-flash', kk: 'Қазақ тілі — менің ана тілім.', ru: 'Казахский — мой родной язык.' }
];

const NOT_AVAILABLE = [
  { what: 'Клонирование голоса (cloneVoice)', why: 'на api.freedomspeech.kz не опубликовано для ключей кабинета (SDK 0.1.1); проверено: 401/404' },
  { what: 'Дизайн голоса по описанию (designVoice)', why: 'то же — бэкенд в работе' },
  { what: 'Перевод и определение языка (translate, detectLanguage)', why: 'то же' },
  { what: 'Каталог голосов (voices(), voicePreview)', why: 'то же; список выше собран вручную' },
  { what: 'Потоковый синтез по WebSocket (streamSpeech)', why: 'в облачной среде разработки сокет не проходит через прокси; в приложении не нужен — звук готовится заранее' }
];

function toMp3(wav, dst) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', 'pipe:0', '-ac', '1', '-ar', '24000', '-b:a', '40k', dst], { input: wav });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
}
/** Median pitch (Hz) by autocorrelation over voiced 40 ms frames — same idea as tools/voice_studio/qa.py. */
function medianF0(wav) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], { input: wav, maxBuffer: 1 << 26 });
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1), sr = 16000, n = 640, f0 = [];
  for (let s = 0; s + n < pcm.length; s += 320) {
    let e = 0; for (let i = 0; i < n; i++) e += pcm[s + i] * pcm[s + i];
    if (e / n < 4e5) continue;
    let best = 0, lag = 0;
    for (let l = Math.floor(sr / 450); l <= Math.floor(sr / 70); l++) { let c = 0; for (let i = 0; i + l < n; i++) c += pcm[s + i] * pcm[s + i + l]; if (c > best) { best = c; lag = l; } }
    if (lag && best / e > 0.45) f0.push(sr / lag);
  }
  f0.sort((a, b) => a - b);
  return f0.length ? Math.round(f0[f0.length >> 1]) : null;
}

export async function main(env = process.env, log = console.log) {
  if (!env.FS_API_KEY) throw new Error('FS_API_KEY is not set');
  mkdirSync(OUT, { recursive: true });
  const dataPath = join(OUT, 'lab-data.json');
  const prev = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, 'utf8')) : { takes: {} };
  const takes = prev.takes;
  const c = new FreedomSpeech({ apiKey: env.FS_API_KEY, timeoutMs: 90_000 });
  async function take(id, text, opts, plain) {
    if (takes[id] && (takes[id].ok === false || existsSync(join(OUT, id + '.mp3')))) return takes[id];
    let rec;
    for (let a = 0; a < 3; a++) {
      try {
        const wav = await c.speak(text, { language: 'kk', ...opts });
        if (!wav || wav.length < 1000) throw Object.assign(new Error('empty audio'), { status: 502 });
        toMp3(wav, join(OUT, id + '.mp3'));
        const heard = (await c.transcribe(wav, { language: 'kk', prettify: false, filename: id + '.wav' })).text;
        rec = { ok: true, f0: medianF0(wav), heard, sim: +similarity(plain, heard).toFixed(2), md5: createHash('md5').update(wav).digest('hex').slice(0, 10), bytes: wav.length };
        break;
      } catch (e) {
        rec = { ok: false, status: e.status || 0, error: String((e.body && (e.body.error?.message || e.body.message)) || e.message).slice(0, 160) };
        if (e.status && e.status < 500) break;                 // 4xx: the option is not accepted — no retry
        await new Promise((r) => setTimeout(r, 1500 * (a + 1)));
      }
    }
    takes[id] = rec; writeFileSync(dataPath, JSON.stringify({ takes }, null, 0));
    log(`${id}: ${rec.ok ? 'ok ' + rec.f0 + ' Hz, heard «' + rec.heard + '»' : 'FAIL ' + rec.status + ' ' + rec.error}`);
    return rec;
  }
  const strip = (t) => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [v] of VOICES) for (const p of PHRASES) await take(`v-${v}-${p.id}`, p.kk, { voice: v }, p.kk);
  for (const f of FEATURES) await take('f-' + f.id, f.kk, { voice: f.voice, emotion: f.emotion, model: f.model }, strip(f.kk));
  // same audio as neutral → the option is accepted but changes nothing
  const neutral = takes['f-emo-neutral'];
  for (const f of FEATURES) { const t = takes['f-' + f.id]; if (t && t.ok && f.group.startsWith('Эмоция') && f.id !== 'emo-neutral' && neutral?.ok) t.sameAsNeutral = t.md5 === neutral.md5; }
  writeFileSync(dataPath, JSON.stringify({ takes }, null, 0));

  // median pitch with the voice studio's tested estimator (tools/voice_studio/qa.py), one python call for all takes
  const okIds = Object.keys(takes).filter((id) => takes[id].ok);
  const py = spawnSync('python3', ['-c', 'import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom voice_studio import qa, audio\nout={}\nfor f in sys.argv[3:]:\n  x,sr=audio.read_audio(sys.argv[2]+"/"+f+".mp3")\n  out[f]=round(qa.median_f0(x,sr)[0] or 0)\nprint(json.dumps(out))',
    join(ROOT, 'tools'), OUT, ...okIds], { encoding: 'utf8', maxBuffer: 1 << 24 });
  if (py.status === 0) { const f0 = JSON.parse(py.stdout); for (const id of okIds) takes[id].f0 = f0[id] || null; writeFileSync(dataPath, JSON.stringify({ takes }, null, 0)); }
  else log('pitch: python estimator failed, keeping the quick estimate — ' + String(py.stderr).slice(0, 200));

  const voices = VOICES.map(([id, label, gender, note]) => {
    const t = PHRASES.map((p) => takes[`v-${id}-${p.id}`]).filter(Boolean), okT = t.filter((x) => x.ok);
    const f0s = okT.map((x) => x.f0).filter(Boolean).sort((a, b) => a - b);
    return { id, label, gender, note, ok: okT.length > 0, status: okT.length ? 200 : (t[0] && t[0].status), f0: f0s.length ? f0s[f0s.length >> 1] : null,
      takes: PHRASES.map((p) => ({ phrase: p.id, file: okT.length ? `v-${id}-${p.id}` : null, heard: takes[`v-${id}-${p.id}`]?.heard, sim: takes[`v-${id}-${p.id}`]?.sim })) };
  });
  const features = FEATURES.map((f) => ({ ...f, file: takes['f-' + f.id]?.ok ? 'f-' + f.id : null, result: takes['f-' + f.id] }));
  const lab = { generated: new Date().toISOString().slice(0, 10), phrases: PHRASES, voices, features, notAvailable: NOT_AVAILABLE };
  writeFileSync(join(OUT, 'lab-data.js'), '/* generated by tools/make-voice-lab.mjs */\nwindow.QVLAB = ' + JSON.stringify(lab) + ';\n');
  log(`voices ok: ${voices.filter((v) => v.ok).length}/${voices.length}; features ok: ${features.filter((f) => f.file).length}/${features.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e.message); process.exit(1); });
