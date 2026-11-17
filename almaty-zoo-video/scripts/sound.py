#!/usr/bin/env python3
"""Synthesised sound for the zoo video (numpy only, no samples to license) → public/audio/fx/*.wav, 48 kHz.
  music.wav  — 72 s cheerful loop: plucked «ukulele» (Karplus–Strong) on a pentatonic C-major progression, soft pad, light shaker
  birds.wav, water.wav (pond ambience), splash.wav, pop.wav, chime.wav, roar.wav (soft, child-friendly), toot.wav
"""
import os, wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio', 'fx')
rng = np.random.default_rng(7)


def save(name, x, peak=0.9):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    m = np.max(np.abs(x)) or 1.0
    x = (x / m * peak * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x.tobytes())


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / r)


def lowpass(x, k):
    """one-pole low-pass, k in (0,1): smaller = darker"""
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += k * (v - acc); y[i] = acc
    return y


def pluck(freq, dur, bright=0.5):
    n = int(SR * dur); p = int(SR / freq)
    buf = rng.uniform(-1, 1, p); out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.996 * (bright * buf[i % p] + (1 - bright) * 0.5 * (buf[i % p] + buf[(i + 1) % p]))
    return out * env(n, 0.002, dur * 0.6)


def note(m): return 440.0 * 2 ** ((m - 69) / 12)


def music(seconds=72, bpm=104):
    n = int(SR * seconds); mix = np.zeros((n, 2)); beat = 60 / bpm
    prog = [(60, [60, 64, 67]), (57, [57, 60, 64]), (65, [65, 69, 72]), (67, [67, 71, 74])]   # C – Am – F – G
    melody = [72, 74, 76, 79, 76, 74, 72, 69, 72, 74, 76, 74, 72, 67, 69, 72]                  # pentatonic, friendly
    step = 0; t = 0.0
    while t < seconds - 1:
        bar = int(t / (beat * 4)) % 4; root, chord = prog[bar]
        i0 = int(t * SR)
        # strum on beats 1 and 3, pluck arpeggio on the off-beats
        b = int(round(t / beat)) % 4
        if b in (0, 2):
            for k, m in enumerate(chord):
                s = pluck(note(m), 1.2, 0.45) * 0.28; j = i0 + k * 240
                mix[j:j + len(s), 0] += s[:max(0, min(len(s), n - j))] * 0.9; mix[j:j + len(s), 1] += s[:max(0, min(len(s), n - j))] * 1.0
            s = pluck(note(root - 12), 1.4, 0.3) * 0.35; mix[i0:i0 + len(s)] += s[:max(0, min(len(s), n - i0)), None]
        mel = melody[step % len(melody)]; step += 1
        s = pluck(note(mel), 0.5, 0.6) * 0.22; j = i0 + int(beat * SR / 2)
        if j < n: mix[j:j + len(s), 0] += s[:max(0, min(len(s), n - j))] * 1.0; mix[j:j + len(s), 1] += s[:max(0, min(len(s), n - j))] * 0.8
        # shaker on every eighth
        for h in (0, 0.5):
            j = i0 + int(h * beat * SR); m = int(0.05 * SR)
            if j + m < n: sh = rng.normal(0, 1, m) * env(m, 0.001, 0.015) * 0.05; mix[j:j + m] += sh[:, None]
        t += beat
    # soft pad: sine chords, slow fade, under everything
    tt = np.arange(n) / SR
    for bar in range(int(seconds / (beat * 4)) + 1):
        root, chord = prog[bar % 4]; a = int(bar * beat * 4 * SR); bnd = min(n, int((bar + 1) * beat * 4 * SR))
        if a >= n: break
        seg = np.zeros(bnd - a)
        for m in chord: seg += np.sin(2 * np.pi * note(m - 12) * tt[a:bnd]) * 0.03
        fade = np.minimum(1, np.minimum(np.arange(bnd - a), np.arange(bnd - a)[::-1]) / (0.3 * SR))
        mix[a:bnd] += (seg * fade)[:, None]
    fadein = np.minimum(1, tt / 1.5)[:, None]
    return mix * fadein


def birds(seconds=6):
    n = int(SR * seconds); x = np.zeros(n)
    for _ in range(14):
        j = int(rng.uniform(0, seconds - 0.4) * SR); m = int(rng.uniform(0.06, 0.14) * SR); t = np.arange(m) / SR
        f0, f1 = rng.uniform(2800, 4200), rng.uniform(3600, 5600)
        f = f0 + (f1 - f0) * (t / t[-1]) ** 0.5
        x[j:j + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * env(m, 0.004, 0.05) * rng.uniform(0.3, 0.7)
    return x


def water(seconds=8):
    n = int(SR * seconds); x = lowpass(rng.normal(0, 1, n), 0.06) * 0.6
    for _ in range(26):   # little bubbles / laps
        j = int(rng.uniform(0, seconds - 0.2) * SR); m = int(0.07 * SR); t = np.arange(m) / SR
        f = rng.uniform(500, 1100) * (1 + 2.5 * t / t[-1])
        x[j:j + m] += np.sin(2 * np.pi * np.cumsum(f) / SR) * env(m, 0.002, 0.03) * 0.25
    return x


def splash():
    n = int(SR * 1.2); x = rng.normal(0, 1, n) * env(n, 0.003, 0.25)
    x = lowpass(x, 0.35) * 0.8 + lowpass(rng.normal(0, 1, n), 0.9) * env(n, 0.002, 0.08) * 0.4
    m = int(0.18 * SR); t = np.arange(m) / SR; x[:m] += np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 20)) * t) * env(m, 0.002, 0.08) * 0.9
    return x


def pop():
    m = int(0.16 * SR); t = np.arange(m) / SR
    return np.sin(2 * np.pi * np.cumsum(500 + 900 * np.exp(-t * 30)) / SR) * env(m, 0.001, 0.05)


def chime():
    m = int(2.0 * SR); t = np.arange(m) / SR; x = np.zeros(m)
    for k, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        j = int(k * 0.09 * SR); x[j:] += np.sin(2 * np.pi * f * t[:m - j]) * env(m - j, 0.002, 0.6) * 0.5
    return x


def roar():
    """a soft, friendly «rrr» — a growl under a low formant, nothing scary for children"""
    m = int(1.1 * SR); t = np.arange(m) / SR
    src = np.sin(2 * np.pi * np.cumsum(110 + 20 * np.sin(2 * np.pi * 7 * t)) / SR) * (1 + 0.5 * rng.normal(0, 1, m) * 0.3)
    return lowpass(src, 0.12) * np.minimum(1, t / 0.15) * np.exp(-np.maximum(0, t - 0.6) / 0.2)


def toot():
    m = int(1.0 * SR); t = np.arange(m) / SR
    f = 330 + 180 * np.sin(np.pi * t / t[-1])
    x = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in (1, 2, 3, 4))
    return x * np.minimum(1, t / 0.05) * np.minimum(1, (t[-1] - t) / 0.2)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    save('music.wav', music(), 0.7)
    for name, fn in [('birds.wav', birds), ('water.wav', water), ('splash.wav', splash), ('pop.wav', pop), ('chime.wav', chime), ('roar.wav', roar), ('toot.wav', toot)]:
        save(name, fn()); print(name)
    print('music.wav')
