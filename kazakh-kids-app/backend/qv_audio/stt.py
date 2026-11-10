"""Speech-to-text engines behind one small interface.

    engine.transcribe(samples: np.ndarray[float32, 16 kHz mono]) -> (text, confidence 0–1 or None)

Engines
-------
HFWhisperEngine      The model named in the project spec: shyngys879/kazakh-whisper-large-v3-turbo
                     (Hugging Face Transformers, GPU recommended). Token confidence comes from the
                     decoder's transition scores.
SherpaWhisperEngine  Whisper exported to ONNX and run with sherpa-onnx (INT8 on CPU). Works with the
                     stock `sherpa-onnx-whisper-turbo` and with an export of the Kazakh fine-tune.
SherpaCtcEngine      Light edge models for small boxes (Raspberry Pi class): Dolphin or Omnilingual CTC.
"""
from __future__ import annotations

import os
from typing import Optional, Tuple

import numpy as np

SPEC_MODEL_ID = "shyngys879/kazakh-whisper-large-v3-turbo"
SAMPLE_RATE = 16000


class SttEngine:
    name = "stt"

    def transcribe(self, samples: np.ndarray) -> Tuple[str, Optional[float]]:
        raise NotImplementedError


class HFWhisperEngine(SttEngine):
    """Whisper large-v3-turbo fine-tuned for Kazakh, via Transformers."""

    def __init__(self, model_id: str = SPEC_MODEL_ID, device: Optional[str] = None):
        import torch
        from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor

        self.torch = torch
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.dtype = torch.float16 if self.device.startswith("cuda") else torch.float32
        self.name = model_id
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id, torch_dtype=self.dtype, low_cpu_mem_usage=True, use_safetensors=True
        ).to(self.device)
        self.model.eval()

    def transcribe(self, samples: np.ndarray) -> Tuple[str, Optional[float]]:
        torch = self.torch
        feats = self.processor(samples, sampling_rate=SAMPLE_RATE, return_tensors="pt").input_features
        feats = feats.to(self.device, dtype=self.dtype)
        with torch.inference_mode():
            out = self.model.generate(
                feats, language="kazakh", task="transcribe", max_new_tokens=128,
                output_scores=True, return_dict_in_generate=True,
            )
        text = self.processor.batch_decode(out.sequences, skip_special_tokens=True)[0].strip()
        conf: Optional[float] = None
        try:  # mean probability of the generated tokens = Confidence_token in the score formula
            scores = self.model.compute_transition_scores(out.sequences, out.scores, normalize_logits=True)
            probs = torch.exp(scores[0].float())
            probs = probs[torch.isfinite(probs)]
            if probs.numel():
                conf = float(probs.mean().clamp(0, 1))
        except Exception:
            conf = None
        return text, conf


class SherpaWhisperEngine(SttEngine):
    """Whisper as ONNX (encoder/decoder/tokens) through sherpa-onnx; INT8 runs on a laptop CPU."""

    def __init__(self, model_dir: str, prefix: str = "turbo", language: str = "kk", num_threads: int = 4):
        import sherpa_onnx

        def pick(kind: str) -> str:
            for q in (".int8.onnx", ".onnx"):
                p = os.path.join(model_dir, f"{prefix}-{kind}{q}")
                if os.path.exists(p):
                    return p
            raise FileNotFoundError(f"{prefix}-{kind}(.int8).onnx not found in {model_dir}")

        self.name = f"whisper-onnx:{os.path.basename(os.path.normpath(model_dir))}"
        self.rec = sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=pick("encoder"), decoder=pick("decoder"), tokens=os.path.join(model_dir, f"{prefix}-tokens.txt"),
            language=language, task="transcribe", num_threads=num_threads,
        )

    def transcribe(self, samples: np.ndarray) -> Tuple[str, Optional[float]]:
        s = self.rec.create_stream()
        s.accept_waveform(SAMPLE_RATE, samples)
        self.rec.decode_stream(s)
        return s.result.text.strip(), None


class SherpaCtcEngine(SttEngine):
    """Small multilingual CTC models. kind = "dolphin" (≈100 MB) or "omnilingual" (≈350 MB)."""

    def __init__(self, model_dir: str, kind: str = "dolphin", num_threads: int = 4):
        import sherpa_onnx

        model = os.path.join(model_dir, "model.int8.onnx")
        tokens = os.path.join(model_dir, "tokens.txt")
        self.name = f"{kind}-ctc:{os.path.basename(os.path.normpath(model_dir))}"
        if kind == "dolphin":
            self.rec = sherpa_onnx.OfflineRecognizer.from_dolphin_ctc(model=model, tokens=tokens, num_threads=num_threads)
        elif kind == "omnilingual":
            self.rec = sherpa_onnx.OfflineRecognizer.from_omnilingual_asr_ctc(model=model, tokens=tokens, num_threads=num_threads)
        else:
            raise ValueError("kind must be 'dolphin' or 'omnilingual'")

    def transcribe(self, samples: np.ndarray) -> Tuple[str, Optional[float]]:
        s = self.rec.create_stream()
        s.accept_waveform(SAMPLE_RATE, samples)
        self.rec.decode_stream(s)
        return s.result.text.strip(), None


def build_engine(kind: str, model: Optional[str] = None, **kw) -> SttEngine:
    """Factory used by the server CLI: kind = hf | whisper-onnx | dolphin | omnilingual."""
    if kind == "hf":
        return HFWhisperEngine(model or SPEC_MODEL_ID, **kw)
    if not model:
        raise ValueError(f"engine '{kind}' needs --model <directory>")
    if kind == "whisper-onnx":
        return SherpaWhisperEngine(model, **kw)
    if kind in ("dolphin", "omnilingual"):
        return SherpaCtcEngine(model, kind, **kw)
    raise ValueError(f"unknown engine '{kind}'")
