"""Character voices with k2-fsa/OmniVoice (stock weights) — two stages:

1. Voice Design Matrix → reference bank.  `build_bank()` renders every voice of `voices.VOICE_MATRIX`
   (K1…E6) from its design prompt and stores, per voice and language:
       <bank>/<ID>.<lang>.wav   16-bit 24 kHz PCM reference take
       <bank>/<ID>.<lang>.pt    reusable VoiceClonePrompt (what the brief calls the "speaker embedding")
2. Zero-shot cloning.  `generate_dialogue(text, character_id)` speaks any line in the chosen reference voice.

Reality check (documented, not hidden):
  * OmniVoice is a diffusion language model; it needs a GPU for comfortable speed. The phone never runs it —
    lines are rendered ahead of time by tools/make-audio.py --engine omnivoice and shipped as audio files.
  * Voice *design* was trained on Chinese and English only, so designed takes for Kazakh can be unstable.
    Listen to the three variants per category and keep the best one; the cloning stage is the stable one.
  * A reference recorded in another language leaves that language's accent, so Kazakh lines use the
    `.kk` references whenever they exist.
"""
from __future__ import annotations

import os
from typing import Dict, Optional

import numpy as np

from .voices import BY_ID, CHARACTER_VOICES, SEED_TEXT, VOICE_MATRIX

MODEL_ID = "k2-fsa/OmniVoice"
SAMPLE_RATE = 24000
EMOTION_SPEED = {"neutral": 1.0, "excited": 1.08, "calm": 0.92}


class OmniVoiceGameSpeaker:
    def __init__(self, model_path: str = MODEL_ID, reference_bank_dir: Optional[str] = None, device: Optional[str] = None):
        import torch
        from omnivoice import OmniVoice

        if device is None:
            device = "cuda:0" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        dtype = torch.float16 if device.startswith("cuda") else torch.float32
        self.engine = OmniVoice.from_pretrained(model_path, device_map=device, dtype=dtype)
        self.sample_rate = SAMPLE_RATE
        self.voice_prints: Dict[str, object] = {}
        if reference_bank_dir:
            self.voice_prints = self.load_reference_embeddings(reference_bank_dir)

    # ---------- stage 1: voice design → reference bank ----------
    def build_bank(self, out_dir: str, languages=("kk", "ru")) -> None:
        import soundfile as sf

        os.makedirs(out_dir, exist_ok=True)
        for v in VOICE_MATRIX:
            for lang in languages:
                if lang not in v.languages:
                    continue
                text = SEED_TEXT[lang]
                audio = self.engine.generate(text=text, language=lang, instruct=v.instruct, speed=v.speed)[0]
                wav = os.path.join(out_dir, f"{v.id}.{lang}.wav")
                sf.write(wav, audio, SAMPLE_RATE, subtype="PCM_16")
                self.engine.create_voice_clone_prompt(ref_audio=wav, ref_text=text).save(os.path.join(out_dir, f"{v.id}.{lang}.pt"))
                print(f"[bank] {v.id}.{lang}  «{v.instruct}»  ({v.category})")

    def load_reference_embeddings(self, bank_dir: str) -> Dict[str, object]:
        from omnivoice import VoiceClonePrompt

        prints = {}
        for f in sorted(os.listdir(bank_dir)):
            if f.endswith(".pt"):
                prints[f[:-3]] = VoiceClonePrompt.load(os.path.join(bank_dir, f))   # key "M1.kk"
        if not prints:
            raise FileNotFoundError(f"no reference prompts (*.pt) in {bank_dir}; run tools/build_voice_bank.py first")
        return prints

    # ---------- stage 2: zero-shot lines ----------
    def _prompt(self, voice_id: str, lang: str):
        for key in (f"{voice_id}.{lang}", f"{voice_id}.kk", f"{voice_id}.ru"):
            if key in self.voice_prints:
                return self.voice_prints[key]
        raise KeyError(f"voice {voice_id} is not in the reference bank")

    def generate_dialogue(self, text: str, character_id: str, emotion: str = "neutral", language: str = "kk") -> np.ndarray:
        """character_id is a matrix voice id (K1…E6) or a character name from CHARACTER_VOICES."""
        voice_id = CHARACTER_VOICES.get(character_id, character_id)
        base = BY_ID[voice_id].speed if voice_id in BY_ID else 1.0
        return self.engine.generate(
            text=text, language=language, voice_clone_prompt=self._prompt(voice_id, language),
            speed=base * EMOTION_SPEED.get(emotion, 1.0),
        )[0]

    def save(self, audio: np.ndarray, path: str) -> None:
        import soundfile as sf

        sf.write(path, audio, SAMPLE_RATE, subtype="PCM_16")
