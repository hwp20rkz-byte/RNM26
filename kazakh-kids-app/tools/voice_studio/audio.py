"""WAV in/out with numpy + the standard library; ffmpeg for anything else (same mp3 chain as make-audio.py)."""
from __future__ import annotations

import io
import os
import subprocess
import tempfile
import wave
from typing import Tuple

import numpy as np

SR = 24000
TRIM = ("silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-50dB,areverse")


def to_float(a: np.ndarray) -> np.ndarray:
    a = np.asarray(a)
    if a.ndim > 1:
        a = a.mean(axis=1) if a.shape[1] <= 8 else a.mean(axis=0)
    if a.dtype.kind in "iu":
        return a.astype(np.float32) / float(np.iinfo(a.dtype).max)
    return a.astype(np.float32)


def write_wav(path: str, x: np.ndarray, sr: int = SR) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    y = np.clip(to_float(x), -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((y * 32767).astype("<i2").tobytes())


def wav_bytes(x: np.ndarray, sr: int = SR) -> bytes:
    buf = io.BytesIO()
    y = np.clip(to_float(x), -1, 1)
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((y * 32767).astype("<i2").tobytes())
    return buf.getvalue()


def read_audio(path: str, sr: int = SR) -> Tuple[np.ndarray, int]:
    """Any file ffmpeg can read → mono float32 at `sr`. Plain 16-bit WAV at the right rate skips ffmpeg."""
    try:
        with wave.open(path, "rb") as w:
            if w.getsampwidth() == 2 and w.getframerate() == sr:
                a = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").reshape(-1, w.getnchannels())
                return to_float(a), sr
    except (wave.Error, EOFError):
        pass
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype="<i2").astype(np.float32) / 32767.0, sr


def read_bytes(data: bytes, sr: int = SR) -> Tuple[np.ndarray, int]:
    with tempfile.NamedTemporaryFile(suffix=".audio", delete=False) as t:
        t.write(data)
        p = t.name
    try:
        return read_audio(p, sr)
    finally:
        os.remove(p)


def to_mp3(x: np.ndarray, sr: int, dst: str) -> None:
    """Trim silence, loudness-normalise and encode exactly like tools/make-audio.py (22.05 kHz mono 32 kb/s)."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t:
        p = t.name
    try:
        write_wav(p, x, sr)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", p, "-af", TRIM + ",loudnorm=I=-16:TP=-1.5",
                        "-ac", "1", "-ar", "22050", "-b:a", "32k", dst], check=True)
    finally:
        os.remove(p)
