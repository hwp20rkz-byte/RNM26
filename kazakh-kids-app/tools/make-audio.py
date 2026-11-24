#!/usr/bin/env python3
"""Synthesises every game phrase to web/audio/<key>.mp3.

Two engines produce the same files (same keys), so the game does not care which one was used:

  --engine piper      (default, runs on a laptop CPU, used for the bundled audio)
      Voice kk_KZ-issai-high (KazakhTTS by ISSAI, Nazarbayev University, CC BY 4.0).
      Character voices are *stand-ins*: the model's six speakers plus pitch/tempo shaping.
        curl -L -O https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-kk_KZ-issai-high.tar.bz2
        tar xjf vits-piper-kk_KZ-issai-high.tar.bz2 && pip install piper-tts      # plus ffmpeg on PATH

  --engine omnivoice  (GPU recommended; needs the reference bank from backend/tools/build_voice_bank.py)
      k2-fsa/OmniVoice zero-shot cloning with the reference voices K1…E6, see backend/qv_audio/tts.py.

Usage:
  node tools/collect-phrases.js > /tmp/phrases.json
  python3 tools/make-audio.py /tmp/phrases.json path/to/kk_KZ-issai-high.onnx
  python3 tools/make-audio.py /tmp/phrases.json --engine omnivoice --bank backend/voice_bank
Only missing files are generated; stale ones are removed; web/audio/index.js is rewritten.
"""
import argparse
import json
import re
import os
import subprocess
import sys
import tempfile
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'web', 'audio')

# Piper stand-ins for the voice matrix: (speaker id, length_scale, pitch shift in semitones, extra ffmpeg filter)
PIPER_VOICES = {
    'NARR': (2, 1.15, 0.0, ''),                                   # W1-like: clear young woman, slow for learners
    'M1': (0, 1.02, 1.0, ''),                                     # Батыр-X: bright young man
    'T4': (4, 0.95, 1.5, ''),                                     # Айсұлу Neon: upbeat teenage girl
    'K1': (5, 0.95, 5.0, ''),                                     # Тайсон-Тайпақ: boy
    'E4': (3, 1.25, -2.5, 'chorus=0.7:0.9:22:0.35:0.25:2'),       # Әже-Bot 3000: warm, slow, a touch robotic
    'E1': (1, 1.15, -1.5, ''),                                    # auction judge: deep, measured
}
# Personas of modules 2 & 4 (src/voice/personas.json): same tuple format; APAI uses the narrator tag.
try:
    with open(os.path.join(ROOT, 'src', 'voice', 'personas.json'), encoding='utf-8') as _fh:
        for _id, _p in json.load(_fh)['personas'].items():
            _pp = _p.get('piper', {})
            if 'speaker' in _pp:
                PIPER_VOICES[_id] = (_pp['speaker'], _pp.get('lengthScale', 1.0), _pp.get('pitchSt', 0.0), _pp.get('filter', ''))
except FileNotFoundError:
    pass
def audio_key(t):
    """Same FNV-1a key as web/data.js → QDATA.audioKey."""
    k = re.sub(r'\s+', ' ', re.sub(r'[«»"]', '', re.sub(r'[—–]', ' ', str(t).lower()))).strip()
    h = 0x811c9dc5
    for ch in k:   # JS charCodeAt; every Kazakh/Cyrillic letter is one UTF-16 unit
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xffffffff
    digits, out = '0123456789abcdefghijklmnopqrstuvwxyz', ''
    while True:
        h, r = divmod(h, 36)
        out = digits[r] + out
        if not h:
            return out


TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'


def encode(wav_path, dst, pitch=0.0, extra='', rate=22050):
    chain = [TRIM]
    if abs(pitch) > 0.01:
        r = 2 ** (pitch / 12.0)
        chain.append(f'asetrate={int(rate * r)},aresample={rate},atempo={1 / r:.5f}')
    if extra:
        chain.append(extra)
    chain.append('loudnorm=I=-16:TP=-1.5')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav_path, '-af', ','.join(chain),
                    '-ac', '1', '-ar', '22050', '-b:a', '32k', dst], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('phrases')
    ap.add_argument('model', nargs='?', help='Piper .onnx model (engine=piper)')
    ap.add_argument('--engine', choices=['piper', 'omnivoice'], default='piper')
    ap.add_argument('--force-prune', action='store_true', help='allow deleting more than 10%% of the existing files')
    ap.add_argument('--bank', help='reference voice bank directory (engine=omnivoice)')
    ap.add_argument('--narrator', help='render only narrator phrases with this single-speaker Piper model (e.g. ISEKE) into --out')
    ap.add_argument('--out', default='audio', help='output folder inside web/ (default: audio)')
    ap.add_argument('--var', default='QAUDIO', help='global name written to <out>/index.js')
    ap.add_argument('--allow-issai', action='store_true', help='render web/audio/ with ISSAI (retired 13.11.2026; would overwrite nothing but re-adds narrator files)')
    args = ap.parse_args()
    if args.engine == 'piper' and not args.narrator and not args.allow_issai:
        sys.exit('ISSAI is retired (13.11.2026): narrator lines are ISEKE (--narrator <iseke.onnx> --out audio-iseke --var QAUDIO_ISEKE),\n'
                 'character lines are Freedom Speech catalog voices (node tools/make-audio-fs.mjs <phrases> --heroes tools/voice_studio/fs-cast.json).\n'
                 'Pass --allow-issai only to bring the old voice back on purpose.')

    global OUT_DIR
    OUT_DIR = os.path.join(ROOT, 'web', args.out)
    os.makedirs(OUT_DIR, exist_ok=True)
    phrases = json.load(open(args.phrases, encoding='utf-8'))
    if args.narrator:   # e.g. ISEKE: one speaker, narrator lines only; the game falls back to audio/ for the rest
        # A hero line with no take of its own yet (Freedom Speech down, 24.11) is voiced by the narrator under the plain
        # key, which TTS.file() reaches when audio/<key> is missing; the hero take wins as soon as it exists.
        hero_dir, seen = os.path.join(ROOT, 'web', 'audio'), set()
        fallback = []
        for p in phrases:
            if p.get('voice', 'NARR') != 'NARR' and p['key'] == audio_key(p['text']) and not os.path.exists(os.path.join(hero_dir, p['key'] + '.mp3')):
                fallback.append({'key': p['key'], 'text': p['text']})
        phrases = [p for p in phrases if p.get('voice', 'NARR') == 'NARR'] + fallback
        if fallback:
            print(f'{len(fallback)} hero line(s) without a take: narrator fallback', flush=True)
        args.model = args.narrator

    if args.engine == 'piper':
        from piper import PiperVoice, SynthesisConfig
        voice = PiperVoice.load(args.model, config_path=args.model + '.json')

        rate = voice.config.sample_rate

        def synth(text, tag, wav_path):
            sid, ls, pitch, extra = PIPER_VOICES.get(tag, PIPER_VOICES['NARR'])
            if args.narrator:
                sid, pitch, extra = None, 0.0, ''
            with wave.open(wav_path, 'wb') as w:
                voice.synthesize_wav(text, w, syn_config=SynthesisConfig(speaker_id=sid, length_scale=ls))
            return pitch, extra, rate
    else:
        sys.path.insert(0, os.path.join(ROOT, 'backend'))
        from qv_audio.tts import OmniVoiceGameSpeaker
        speaker = OmniVoiceGameSpeaker(reference_bank_dir=args.bank)

        def synth(text, tag, wav_path):
            speaker.save(speaker.generate_dialogue(text, 'W1' if tag == 'NARR' else tag), wav_path)
            return 0.0, '', speaker.sample_rate

    keys, made = set(), 0
    for i, p in enumerate(phrases):
        keys.add(p['key'])
        dst = os.path.join(OUT_DIR, p['key'] + '.mp3')
        if os.path.exists(dst):
            continue
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            wav_path = tmp.name
        pitch, extra, rate = synth(p['text'], p.get('voice', 'NARR'), wav_path)
        encode(wav_path, dst, pitch, extra, rate)
        os.remove(wav_path)
        made += 1
        if made % 100 == 0:
            print(f'{made} new / {i + 1} of {len(phrases)}', flush=True)

    stale = [f for f in os.listdir(OUT_DIR) if f.endswith('.mp3') and f[:-4] not in keys]
    have = len([f for f in os.listdir(OUT_DIR) if f.endswith('.mp3')])
    if have and len(stale) > have * 0.1 and not args.force_prune:   # a partial phrase list must never wipe a pack (24.11)
        sys.exit(f'refusing to delete {len(stale)} of {have} files — is the phrase list complete? (--force-prune to allow)')
    for f in stale:
        os.remove(os.path.join(OUT_DIR, f))

    with open(os.path.join(OUT_DIR, 'index.js'), 'w', encoding='utf-8') as fh:
        fh.write('/* generated by tools/make-audio.py */\nwindow.' + args.var + ' = {' + ','.join(f'"{k}":1' for k in sorted(keys)) + '};\n')
    print(f'done: {made} new, {len(keys)} total')


if __name__ == '__main__':
    main()
