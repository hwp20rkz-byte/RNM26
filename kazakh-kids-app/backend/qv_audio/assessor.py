"""KazakhVoiceAssessor — the whole pipeline: audio → VAD → STT → pronunciation score."""
from __future__ import annotations

import io
import time
import wave
from typing import Optional

import numpy as np

from . import scoring
from .stt import SAMPLE_RATE, SttEngine
from .vad import EnergyVad


def read_wav(data: bytes) -> np.ndarray:
    """Decode a PCM WAV (any rate, mono/stereo, 16-bit) to float32 mono at 16 kHz."""
    try:
        with wave.open(io.BytesIO(data), "rb") as w:
            if w.getsampwidth() != 2:
                raise ValueError("only 16-bit PCM WAV is supported")
            rate, ch = w.getframerate(), w.getnchannels()
            pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    except (wave.Error, EOFError) as e:
        raise ValueError(f"not a PCM WAV file: {e}") from e
    if ch > 1:
        pcm = pcm.reshape(-1, ch).mean(axis=1)
    if rate != SAMPLE_RATE and len(pcm):
        n = int(round(len(pcm) * SAMPLE_RATE / rate))
        pcm = np.interp(np.linspace(0, len(pcm) - 1, n), np.arange(len(pcm)), pcm).astype(np.float32)
    return pcm


class KazakhVoiceAssessor:
    def __init__(self, engine: SttEngine, vad=None, max_seconds: float = 12.0, pad_seconds: float = 0.3):
        self.engine = engine
        self.vad = vad or EnergyVad()
        self.max_samples = int(max_seconds * SAMPLE_RATE)
        # Measured on the game's phrases: Whisper scores far better (35 → 56 on average) when the
        # speech is framed by a little silence instead of starting on the very first sample.
        self.pad = np.zeros(int(pad_seconds * SAMPLE_RATE), dtype=np.float32)

    def assess_samples(self, samples: np.ndarray, target: str) -> dict:
        t0 = time.time()
        speech = self.vad.trim(samples[: self.max_samples])
        if len(speech) < SAMPLE_RATE * 0.15:
            return {"error": "silence", "model": self.engine.name}
        text, conf = self.engine.transcribe(np.concatenate([self.pad, speech.astype(np.float32), self.pad]))
        res = scoring.assess(text, target, conf).to_dict()
        res.update(model=self.engine.name, vad=self.vad.name, speech_seconds=round(len(speech) / SAMPLE_RATE, 2),
                   ms=int((time.time() - t0) * 1000))
        return res

    def assess_wav(self, wav_bytes: bytes, target: str) -> dict:
        return self.assess_samples(read_wav(wav_bytes), target)

    def assess_pronunciation(self, audio_path: str, reference_text: str) -> dict:
        """Signature from the project blueprint."""
        with open(audio_path, "rb") as f:
            return self.assess_wav(f.read(), reference_text)
