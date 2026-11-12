"""Objective checks for generated voice takes (numpy only, no ML models).

Used to rank audition takes and to flag rendered lines whose voice drifted from the hero's reference.
They are *screens*, not a verdict: the final choice is made by ear on the audition page.

  pitch      median F0 (autocorrelation on voiced frames) vs the casting range — catches a «child» that
             came out as an adult, the most common voice-design failure
  loudness   RMS dBFS of active speech;  clipping  share of samples at full scale
  rate       letters per second — catches truncated or stretched takes
  timbre     cosine of a log-mel fingerprint (mean + std per band) — a rough same-speaker test
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from typing import Optional, Sequence, Tuple

import numpy as np


def _frames(x: np.ndarray, n: int, hop: int) -> np.ndarray:
    if len(x) < n:
        x = np.pad(x, (0, n - len(x)))
    k = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(k)[:, None]
    return x[idx]


def f0_track(x: np.ndarray, sr: int, fmin: float = 60.0, fmax: float = 600.0) -> np.ndarray:
    """F0 per 10 ms frame (0 = unvoiced) from the normalised autocorrelation with parabolic refinement."""
    x = np.asarray(x, dtype=np.float64)
    n, hop = int(0.04 * sr), int(0.01 * sr)
    fr = _frames(x, n, hop)
    fr = fr - fr.mean(axis=1, keepdims=True)
    energy = np.sqrt((fr ** 2).mean(axis=1))
    gate = max(1e-4, 0.1 * np.percentile(energy, 95)) if len(energy) else 1.0
    lo, hi = int(sr / fmax), min(int(sr / fmin), n - 2)
    win = np.hanning(n)
    out = np.zeros(len(fr))
    for i, f in enumerate(fr):
        if energy[i] < gate:
            continue
        f = f * win
        spec = np.fft.rfft(f, 2 * n)
        ac = np.fft.irfft(np.abs(spec) ** 2)[:n]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        seg = ac[lo:hi]
        if len(seg) < 3:
            continue
        j = int(np.argmax(seg))
        if seg[j] < 0.45:
            continue
        # prefer the shortest lag whose peak is almost as strong (octave-error guard)
        for k in range(1, 4):
            jj = int(round((j + lo) / (k + 1))) - lo
            if 1 <= jj < len(seg) - 1 and seg[jj] > 0.85 * seg[j] and seg[jj] >= seg[jj - 1] and seg[jj] >= seg[jj + 1]:
                j = jj
        if 0 < j < len(seg) - 1:
            a, b, c = seg[j - 1], seg[j], seg[j + 1]
            d = (a - c) / (2 * (a - 2 * b + c)) if (a - 2 * b + c) != 0 else 0.0
        else:
            d = 0.0
        out[i] = sr / (j + lo + d)
    return out


def median_f0(x: np.ndarray, sr: int) -> Tuple[float, float]:
    """(median F0 in Hz, voiced share)."""
    t = f0_track(x, sr)
    v = t[t > 0]
    return (float(np.median(v)) if len(v) else 0.0, float(len(v) / max(1, len(t))))


def mel_fingerprint(x: np.ndarray, sr: int, bands: int = 24) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64)
    n, hop = 1024, 256
    fr = _frames(x, n, hop) * np.hanning(n)
    p = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    e = p.sum(axis=1)
    p = p[e > 0.05 * (np.percentile(e, 95) if len(e) else 1)]   # active frames only
    if not len(p):
        return np.zeros(2 * bands)
    mel = lambda f: 2595 * np.log10(1 + f / 700.0)
    edges = 700 * (10 ** (np.linspace(mel(80), mel(min(8000, sr / 2)), bands + 2) / 2595) - 1)
    freqs = np.fft.rfftfreq(n, 1 / sr)
    fb = np.zeros((bands, len(freqs)))
    for b in range(bands):
        l, c, r = edges[b], edges[b + 1], edges[b + 2]
        fb[b] = np.clip(np.minimum((freqs - l) / (c - l), (r - freqs) / (r - c)), 0, None)
    m = np.log(p @ fb.T + 1e-10)
    m = m - m.mean()                                   # loudness-independent
    return np.concatenate([m.mean(axis=0), m.std(axis=0)])


def timbre_similarity(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    return float(a @ b / (na * nb)) if na and nb else 0.0


@dataclass
class TakeReport:
    seconds: float
    f0: float
    voiced: float
    rms_db: float
    clip: float
    rate: float
    pitch_score: float
    score: float
    notes: str

    def as_dict(self):
        return asdict(self)


def semitones(a: float, b: float) -> float:
    return 12 * math.log2(a / b) if a > 0 and b > 0 else 99.0


def assess(x: np.ndarray, sr: int, text: str, f0_range: Optional[Sequence[float]] = None) -> TakeReport:
    x = np.asarray(x, dtype=np.float64)
    secs = len(x) / sr
    f0, voiced = median_f0(x, sr)
    act = x[np.abs(x) > 0.01] if np.any(np.abs(x) > 0.01) else x
    rms = float(np.sqrt(np.mean(act ** 2))) if len(act) else 0.0
    rms_db = 20 * math.log10(rms) if rms > 0 else -120.0
    clip = float(np.mean(np.abs(x) >= 0.999)) if len(x) else 0.0
    letters = sum(ch.isalpha() for ch in text)
    rate = letters / secs if secs > 0 else 0.0
    notes = []
    ps = 1.0
    if f0_range:
        lo, hi = f0_range
        if f0 <= 0:
            ps = 0.0; notes.append("no pitch")
        elif f0 < lo:
            ps = max(0.0, 1 - 0.25 * semitones(lo, f0)); notes.append(f"pitch low ({f0:.0f} < {lo} Hz)")
        elif f0 > hi:
            ps = max(0.0, 1 - 0.25 * semitones(f0, hi)); notes.append(f"pitch high ({f0:.0f} > {hi} Hz)")
    loud = 1.0 if -32 <= rms_db <= -8 else 0.5
    if loud < 1:
        notes.append(f"level {rms_db:.0f} dBFS")
    clip_s = 1.0 if clip < 0.001 else 0.4
    if clip_s < 1:
        notes.append("clipping")
    rate_s = 1.0 if 5 <= rate <= 24 else 0.3
    if rate_s < 1:
        notes.append(f"rate {rate:.1f} letters/s")
    voice_s = 1.0 if voiced >= 0.25 else 0.5
    if voice_s < 1:
        notes.append("mostly unvoiced")
    score = round(100 * (0.5 * ps + 0.15 * loud + 0.1 * clip_s + 0.15 * rate_s + 0.1 * voice_s))
    return TakeReport(round(secs, 2), round(f0, 1), round(voiced, 2), round(rms_db, 1), round(clip, 4), round(rate, 1), round(ps, 2), score, "; ".join(notes))
