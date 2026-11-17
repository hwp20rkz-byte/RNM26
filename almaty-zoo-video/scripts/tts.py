#!/usr/bin/env python3
"""Voice every line of storyboard/storyboard.json → public/audio/<lang>/<scene>.wav (48 kHz mono, loudness-normalised).

Engines:
  piper (default) — offline neural voices (sherpa-onnx / Piper packs: kk_KZ-raya, kk_KZ-iseke, pl_PL-gosia, pl_PL-darkman)
  edge            — Microsoft edge-tts (kk-KZ-AigulNeural, kk-KZ-DauletNeural, pl-PL-ZofiaNeural, pl-PL-MarekNeural);
                    needs speech.platform.bing.com to be reachable.
A child timbre: the voice is pitched up with `asetrate`+`atempo` (tempo kept) and brightened slightly.
Usage: python3 scripts/tts.py --voices <dir with vits-piper-*> [--engine piper|edge]
"""
import argparse, json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDGE = {('kz', 'aisha'): ('kk-KZ-AigulNeural', '+8Hz'), ('kz', 'arman'): ('kk-KZ-DauletNeural', '+25Hz'),
        ('pl', 'aisha'): ('pl-PL-ZofiaNeural', '+8Hz'), ('pl', 'arman'): ('pl-PL-MarekNeural', '+25Hz')}


def piper(model_dir, text, out_wav):
    """Piper (piper-tts) with the pack's .onnx + .onnx.json; length_scale 1.05 — a little slower, clearer for learners."""
    import wave
    from piper import PiperVoice, SynthesisConfig
    name = os.path.basename(model_dir).replace('vits-piper-', '')
    m = os.path.join(model_dir, name + '.onnx')
    voice = PiperVoice.load(m, config_path=m + '.json')
    with wave.open(out_wav, 'wb') as w:
        voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=1.05))


def edge(voice, pitch, text, out_wav):
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f: mp3 = f.name
    subprocess.run([sys.executable, '-m', 'edge_tts', '--voice', voice, '--pitch', pitch, '--text', text, '--write-media', mp3], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, out_wav], check=True)


def child(in_wav, out_wav, pitch):
    """Pitch up by `pitch` keeping the tempo, gentle de-mud and presence, loudness −16 LUFS, 48 kHz mono."""
    sr = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', in_wav],
                            capture_output=True, text=True, check=True).stdout.strip())
    af = []
    if abs(pitch - 1) > 1e-3: af += ['asetrate=%d' % round(sr * pitch), 'aresample=%d' % sr, 'atempo=%.4f' % (1 / pitch)]
    af += ['highpass=f=90', 'equalizer=f=3500:t=q:w=1:g=2.5', 'loudnorm=I=-16:TP=-1.5:LRA=7', 'aresample=48000',
           'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', 'apad=pad_dur=0.12']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', in_wav, '-af', ','.join(af), '-ac', '1', out_wav], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voices', default=os.environ.get('PIPER_VOICES', ''))
    ap.add_argument('--engine', default='piper', choices=['piper', 'edge'])
    a = ap.parse_args()
    sb = json.load(open(os.path.join(ROOT, 'storyboard', 'storyboard.json'), encoding='utf-8'))
    for lang in ('kz', 'pl'):
        os.makedirs(os.path.join(ROOT, 'public', 'audio', lang), exist_ok=True)
        for sc in sb['scenes']:
            spk = sc['speaker']; v = sb['voices'][lang][spk]; text = sc['line'][lang]
            tmp = os.path.join(ROOT, '.cache', 'tts'); os.makedirs(tmp, exist_ok=True)
            raw = os.path.join(tmp, 'raw-%s-%s.wav' % (lang, sc['id']))
            if a.engine == 'edge': edge(EDGE[(lang, spk)][0], EDGE[(lang, spk)][1], text, raw); pitch = 1.0
            else:
                d = os.path.join(a.voices, 'vits-piper-' + v['model'])
                if not os.path.isdir(d): sys.exit('missing voice ' + d)
                piper(d, text, raw); pitch = v['pitch']
            out = os.path.join(ROOT, 'public', 'audio', lang, sc['id'] + '.wav')
            child(raw, out, pitch)
            print(lang, sc['id'], spk, v['model'], '→', os.path.relpath(out, ROOT))


if __name__ == '__main__':
    main()
