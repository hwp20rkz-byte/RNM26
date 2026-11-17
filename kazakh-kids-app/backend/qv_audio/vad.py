"""Voice activity detection: keep only the speech before it reaches the recogniser.

SileroVad uses the silero-vad ONNX model through sherpa-onnx; EnergyVad is a dependency-free fallback.
Both return the speech part of a 16 kHz mono float32 signal (or an empty array if nobody spoke).
"""
from __future__ import annotations

import numpy as np

SAMPLE_RATE = 16000


class EnergyVad:
    name = "energy"

    def __init__(self, frame_ms: int = 30, pad_ms: int = 150):
        self.frame = int(SAMPLE_RATE * frame_ms / 1000)
        self.pad = int(SAMPLE_RATE * pad_ms / 1000)

    def trim(self, samples: np.ndarray) -> np.ndarray:
        if len(samples) < self.frame:
            return samples[:0]
        n = len(samples) // self.frame
        rms = np.sqrt((samples[: n * self.frame].reshape(n, self.frame) ** 2).mean(axis=1))
        # 3× the noise floor, but never above a third of the loudest frame: a clip that is speech from
        # start to finish (already trimmed by the client) has no quiet frames to measure the floor on.
        thr = max(0.012, min(float(np.percentile(rms, 10)) * 3.0, float(rms.max()) * 0.35))
        voiced = np.nonzero(rms > thr)[0]
        if len(voiced) == 0:
            return samples[:0]
        a = max(0, voiced[0] * self.frame - self.pad)
        b = min(len(samples), (voiced[-1] + 1) * self.frame + self.pad)
        return samples[a:b]


class SileroVad:
    name = "silero-vad"

    def __init__(self, model_path: str, threshold: float = 0.5, min_silence: float = 0.4, pad_ms: int = 120):
        import sherpa_onnx

        cfg = sherpa_onnx.VadModelConfig()
        cfg.silero_vad.model = model_path
        cfg.silero_vad.threshold = threshold
        cfg.silero_vad.min_silence_duration = min_silence
        cfg.silero_vad.min_speech_duration = 0.1
        cfg.sample_rate = SAMPLE_RATE
        self._sherpa = sherpa_onnx
        self._cfg = cfg
        self.window = cfg.silero_vad.window_size
        self.pad = int(SAMPLE_RATE * pad_ms / 1000)

    def trim(self, samples: np.ndarray) -> np.ndarray:
        vad = self._sherpa.VoiceActivityDetector(self._cfg, buffer_size_in_seconds=30)
        for i in range(0, len(samples) - self.window + 1, self.window):
            vad.accept_waveform(samples[i:i + self.window])
        vad.flush()
        first, last = None, None
        while not vad.empty():
            seg = vad.front
            start, end = seg.start, seg.start + len(seg.samples)
            first = start if first is None else min(first, start)
            last = end if last is None else max(last, end)
            vad.pop()
        if first is None:
            return samples[:0]
        return samples[max(0, first - self.pad): min(len(samples), last + self.pad)]


def build_vad(model_path: str | None):
    if model_path:
        try:
            return SileroVad(model_path)
        except Exception as e:  # missing file or old sherpa-onnx: fall back, but say so
            print(f"[vad] silero unavailable ({e}); using the energy detector")
    return EnergyVad()
