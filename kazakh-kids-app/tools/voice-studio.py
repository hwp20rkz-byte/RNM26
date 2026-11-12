#!/usr/bin/env python3
"""Hero voice studio: design new character voices with free public models, audition them, pick one per hero,
then speak every line of that hero in the picked voice.

    pip install numpy gradio_client                 # + ffmpeg on PATH; HF_TOKEN (free account) raises GPU quota
    python3 tools/voice-studio.py cast                                   # casting sheet + instruct check
    python3 tools/voice-studio.py probe                                  # what the public Space exposes today
    python3 tools/voice-studio.py audition --heroes ALIBEK,ANEL --takes 3                 # OmniVoice design, Kazakh
    python3 tools/voice-studio.py audition --heroes K1 --via qwen-space                   # Qwen3 brief → OmniVoice
    open voice_studio/audition.html                                      # listen, compare scores
    python3 tools/voice-studio.py pick ALIBEK 2                          # take 2 becomes Әлібек's voice
    node tools/collect-phrases.js > /tmp/phrases.json
    python3 tools/voice-studio.py render /tmp/phrases.json --heroes ALIBEK --limit 10     # listen, then without --limit

Engines: omnivoice-space (free, public HF Space), omnivoice-local (your GPU), qwen-space (free, timbre design
only), freedomspeech (paid key). Rendered lines replace web/audio/<key>.mp3 for that hero's tag only; the
narrator and other heroes are untouched. Reruns skip what is done (render log keyed by the reference hash).
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_studio.audio import read_audio, to_mp3, write_wav  # noqa: E402
from voice_studio.engines import QuotaError, EngineError, check_instruct, make_engine  # noqa: E402
from voice_studio.qa import assess, mel_fingerprint, timbre_similarity  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAST = os.path.join(ROOT, "tools", "voice_studio", "cast.json")
PITCH = ["very low pitch", "low pitch", "moderate pitch", "high pitch", "very high pitch"]


def load_cast(path=CAST):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)["heroes"]


def pitch_variant(instruct: str, step: int) -> str:
    parts = [p.strip() for p in instruct.split(",")]
    for i, p in enumerate(parts):
        if p in PITCH:
            parts[i] = PITCH[max(0, min(len(PITCH) - 1, PITCH.index(p) + step))]
    return ", ".join(parts)


def read_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path, data, indent=1):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=indent)


def sha(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha1(fh.read()).hexdigest()[:12]


def retrying(fn, log, tries=4, wait=30.0):
    for i in range(tries):
        try:
            return fn()
        except QuotaError:
            raise
        except EngineError as e:
            if i == tries - 1:
                raise
            log(f"    retry {i + 1}/{tries - 1}: {e} — waiting {wait:.0f}s")
            time.sleep(wait)


# ------------------------------------------------------------------ cast / probe
def cmd_cast(a, log=print):
    heroes, bad = load_cast(a.cast), 0
    counts = {}
    if a.phrases:
        for p in read_json(a.phrases, []):
            counts[p.get("voice", "NARR")] = counts.get(p.get("voice", "NARR"), 0) + 1
    for tag, h in heroes.items():
        errs = check_instruct(h["instruct"])
        bad += bool(errs)
        log(f"{tag:8} {h['name']:20} {h['instruct']:38} f0 {h['f0'][0]}–{h['f0'][1]} Hz  lines {counts.get(tag, 0) if a.phrases else '?'}" + (f"  ✗ {errs}" if errs else ""))
    return 1 if bad else 0


def cmd_probe(a, log=print):
    from voice_studio.engines import GradioSpace
    sp = GradioSpace(a.space)
    for name, ep in sorted(sp.endpoints().items()):
        log(name)
        for p in ep.get("parameters", []):
            log(f"   - {p.get('parameter_name') or '?'}: {p.get('label')}  ({(p.get('python_type') or {}).get('type', '')})"
                + (f" default={p.get('parameter_default')!r}" if p.get("parameter_has_default") else ""))
    return 0


# ------------------------------------------------------------------ audition
def cmd_audition(a, log=print, engine=None, designer=None):
    heroes = load_cast(a.cast)
    tags = list(heroes) if a.heroes in (None, "all") else a.heroes.split(",")
    eng = engine or make_engine(a.engine, api_design=a.api_design, api_clone=a.api_clone, steps=a.steps, base_url=a.base_url)
    via = designer or (make_engine(a.via, api_design=a.api_design_via) if a.via else None)
    out = a.out
    report_path = os.path.join(out, "takes.json")
    report = read_json(report_path, {})
    for tag in tags:
        if tag not in heroes:
            log(f"unknown hero {tag}"); return 2
        h = heroes[tag]
        if check_instruct(h["instruct"]):
            log(f"{tag}: invalid instruct {check_instruct(h['instruct'])}"); return 2
        log(f"{tag} — {h['name']}")
        for t in range(1, a.takes + 1):
            dst = os.path.join(out, "takes", tag, f"t{t}.wav")
            if os.path.exists(dst) and not a.force:
                continue
            step = [0, -1, 1, 0, -1, 1][(t - 1) % 6]          # as designed / one pitch lower / one higher
            hv = dict(h, instruct=pitch_variant(h["instruct"], step))
            try:
                if via:
                    ru, sr = retrying(lambda: via.design(h["seed_ru"], hv, "ru"), log)
                    ref = os.path.join(out, "takes", tag, f"t{t}.design.wav")
                    write_wav(ref, ru, sr)
                    x, sr = retrying(lambda: eng.clone(h["seed"], ref, h["seed_ru"], "kk", h.get("speed", 1.0)), log)
                    how = f"{via.name}: «{h['design'][:60]}…» → {eng.name} clone"
                else:
                    x, sr = retrying(lambda: eng.design(h["seed"], hv, "kk"), log)
                    how = f"{eng.name}: {hv['instruct']}"
            except QuotaError as e:
                log("  " + str(e)); _write_report(out, report, heroes); return 3
            write_wav(dst, x, sr)
            r = assess(x, sr, h["seed"], h["f0"])
            report.setdefault(tag, {})[f"t{t}"] = dict(r.as_dict(), how=how, file=os.path.relpath(dst, out))
            log(f"  t{t}: score {r.score}  f0 {r.f0:.0f} Hz  {r.seconds}s  {r.notes or 'ok'}")
    _write_report(out, report, heroes)
    log("audition page: " + os.path.join(out, "audition.html"))
    return 0


def _write_report(out, report, heroes):
    os.makedirs(out, exist_ok=True)
    write_json(os.path.join(out, "takes.json"), report)
    bank = os.path.join(out, "bank")
    rows = []
    for tag, takes in report.items():
        h = heroes.get(tag, {"name": tag, "f0": ["?", "?"], "design": "", "instruct": ""})
        best = max(takes, key=lambda k: takes[k]["score"]) if takes else None
        picked = os.path.exists(os.path.join(bank, tag + ".kk.wav"))
        cells = []
        for k, r in sorted(takes.items()):
            cells.append(f"<div class='take{' best' if k == best else ''}'><b>{k}{' ★' if k == best else ''}</b>"
                         f"<audio controls preload='none' src='{html.escape(r['file'])}'></audio>"
                         f"<span class='sc'>{r['score']}</span><small>f0 {r['f0']:.0f} Hz · {r['seconds']} s · {r['rate']} letters/s</small>"
                         f"<small class='n'>{html.escape(r['notes'] or 'ok')}</small><small class='h'>{html.escape(r['how'])}</small>"
                         f"<code>python3 tools/voice-studio.py pick {tag} {k[1:]}</code></div>")
        rows.append(f"<section><h2>{html.escape(tag)} · {html.escape(h['name'])}{' <em>✓ picked</em>' if picked else ''}</h2>"
                    f"<p>{html.escape(h.get('design', ''))}<br><small>OmniVoice: {html.escape(h.get('instruct', ''))} · target {h['f0'][0]}–{h['f0'][1]} Hz</small></p>"
                    f"<div class='takes'>{''.join(cells)}</div></section>")
    page = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hero Voice Audition</title><style>
:root{{--bg:hsl(210 33% 97%);--card:hsl(0 0% 100%);--ink:hsl(218 30% 18%);--mute:hsl(214 14% 45%);--pri:hsl(199 84% 42%);--acc:hsl(43 100% 52%);--ok:hsl(104 70% 34%)}}
@media (prefers-color-scheme:dark){{:root{{--bg:hsl(218 30% 10%);--card:hsl(218 25% 16%);--ink:hsl(210 33% 94%);--mute:hsl(214 14% 65%)}}}}
body{{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}}main{{max-width:1200px;margin:auto}}
section{{background:var(--card);border-radius:16px;padding:16px 24px;margin:16px 0}}h2{{margin:0 0 8px;font-size:21px}}h2 em{{color:var(--ok);font-style:normal;font-size:14px}}
p{{color:var(--mute);margin:0 0 16px}}.takes{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}}
.take{{border:2px solid hsl(210 25% 85%);border-radius:12px;padding:8px 16px;display:flex;flex-direction:column;gap:4px}}.take.best{{border-color:var(--acc)}}
audio{{width:100%}}.sc{{font-size:28px;font-weight:800;color:var(--pri)}}small{{color:var(--mute)}}.n{{color:var(--ink)}}code{{font-size:12px;word-break:break-all}}
</style></head><body><main><h1>Hero voices · audition</h1><p>Score = pitch vs casting range (50%), level, clipping, speaking rate, voicing. It screens failures; choose by ear. Then run the <code>pick</code> command under the take.</p>
{''.join(rows)}</main></body></html>"""
    with open(os.path.join(out, "audition.html"), "w", encoding="utf-8") as fh:
        fh.write(page)


# ------------------------------------------------------------------ pick
def cmd_pick(a, log=print):
    heroes = load_cast(a.cast)
    if a.hero not in heroes:
        log("unknown hero " + a.hero); return 2
    src = os.path.join(a.out, "takes", a.hero, f"t{a.take}.wav")
    if not os.path.exists(src):
        log("no such take: " + src); return 2
    bank = os.path.join(a.out, "bank")
    os.makedirs(bank, exist_ok=True)
    shutil.copyfile(src, os.path.join(bank, a.hero + ".kk.wav"))
    with open(os.path.join(bank, a.hero + ".kk.txt"), "w", encoding="utf-8") as fh:
        fh.write(heroes[a.hero]["seed"] + "\n")
    log(f"{a.hero} ({heroes[a.hero]['name']}) → bank/{a.hero}.kk.wav")
    return 0


# ------------------------------------------------------------------ render
def cmd_render(a, log=print, engine=None):
    heroes = load_cast(a.cast)
    bank = os.path.join(a.out, "bank")
    picked = {t for t in heroes if os.path.exists(os.path.join(bank, t + ".kk.wav"))}
    tags = picked if a.heroes in (None, "all") else set(a.heroes.split(",")) & picked
    missing = (set(a.heroes.split(",")) - picked) if a.heroes not in (None, "all") else set()
    if missing:
        log("not picked yet (run audition + pick): " + ", ".join(sorted(missing)))
    phrases = [p for p in read_json(a.phrases, []) if p.get("voice", "NARR") in tags]
    log_path = os.path.join(a.out, "render-log.json")
    done = read_json(log_path, {})
    refs = {}
    for t in tags:
        with open(os.path.join(bank, t + ".kk.txt"), encoding="utf-8") as fh:
            refs[t] = (os.path.join(bank, t + ".kk.wav"), fh.read().strip())
    ref_hash = {t: sha(refs[t][0]) for t in tags}
    ref_print = {t: mel_fingerprint(*read_audio(refs[t][0])) for t in tags}
    todo = [p for p in phrases if a.force or done.get(p["key"], {}).get("ref") != ref_hash[p["voice"]]][: a.limit]
    log(f"render: {len(phrases)} lines of {', '.join(sorted(tags)) or '—'}; {len(todo)} to do" + (" (dry run)" if a.dry_run else ""))
    if a.dry_run or not todo:
        return 0
    eng = engine or make_engine(a.engine, api_clone=a.api_clone, steps=a.steps, base_url=a.base_url)
    audio_dir = a.audio_dir or os.path.join(ROOT, "web", "audio")
    flagged, made = [], 0
    for p in todo:
        tag, h = p["voice"], heroes[p["voice"]]
        best = None
        for attempt in range(2):                  # one re-roll when the screen fails
            try:
                x, sr = retrying(lambda: eng.clone(p["text"], refs[tag][0], refs[tag][1], "kk", h.get("speed", 1.0)), log)
            except QuotaError as e:
                log("  " + str(e)); break
            r = assess(x, sr, p["text"], h["f0"])
            sim = timbre_similarity(ref_print[tag], mel_fingerprint(x, sr))
            cand = (r.pitch_score + (0.5 if sim >= a.min_timbre else 0), x, sr, r, sim)
            if best is None or cand[0] > best[0]:
                best = cand
            if r.pitch_score >= 0.75 and sim >= a.min_timbre:
                break
        if best is None:
            break
        _, x, sr, r, sim = best
        to_mp3(x, sr, os.path.join(audio_dir, p["key"] + ".mp3"))
        done[p["key"]] = {"tag": tag, "ref": ref_hash[tag], "engine": eng.name, "f0": r.f0, "timbre": round(sim, 3), "score": r.score}
        made += 1
        if r.pitch_score < 0.75 or sim < a.min_timbre:
            flagged.append([p["key"], tag, r.f0, round(sim, 3), r.notes, p["text"]])
        if made % 20 == 0:
            write_json(log_path, done, 0)
            log(f"  {made}/{len(todo)}")
    write_json(log_path, done, 0)
    with open(os.path.join(a.out, "render-report.csv"), "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh); w.writerow(["key", "hero", "f0", "timbre", "notes", "text"]); w.writerows(flagged)
    log(f"done: {made} lines, {len(flagged)} flagged for listening → {os.path.join(a.out, 'render-report.csv')}")
    return 0


def main(argv=None, log=print, engine=None, designer=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cast", default=CAST)
    ap.add_argument("--out", default=os.path.join(ROOT, "voice_studio"))
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cast"); c.add_argument("phrases", nargs="?")
    p = sub.add_parser("probe"); p.add_argument("--space", default="k2-fsa/OmniVoice")
    for name in ("audition", "render"):
        s = sub.add_parser(name)
        if name == "render":
            s.add_argument("phrases")
            s.add_argument("--limit", type=int, default=None)
            s.add_argument("--dry-run", action="store_true")
            s.add_argument("--min-timbre", type=float, default=0.9)
            s.add_argument("--audio-dir")
        else:
            s.add_argument("--takes", type=int, default=3)
            s.add_argument("--via", choices=["qwen-space", "freedomspeech"])
            s.add_argument("--api-design-via")
        s.add_argument("--heroes", default="all")
        s.add_argument("--engine", default="omnivoice-space", choices=["omnivoice-space", "omnivoice-local", "freedomspeech"])
        s.add_argument("--api-design"); s.add_argument("--api-clone"); s.add_argument("--base-url")
        s.add_argument("--steps", type=int, default=32)
        s.add_argument("--force", action="store_true")
    k = sub.add_parser("pick"); k.add_argument("hero"); k.add_argument("take", type=int)
    a = ap.parse_args(argv)
    try:
        if a.cmd == "cast": return cmd_cast(a, log)
        if a.cmd == "probe": return cmd_probe(a, log)
        if a.cmd == "audition": return cmd_audition(a, log, engine, designer)
        if a.cmd == "pick": return cmd_pick(a, log)
        if a.cmd == "render": return cmd_render(a, log, engine)
    except EngineError as e:
        log("error: " + str(e)); return 1
    return 2


if __name__ == "__main__":
    sys.exit(main())
