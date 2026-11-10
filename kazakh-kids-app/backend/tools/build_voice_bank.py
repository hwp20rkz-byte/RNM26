#!/usr/bin/env python3
"""Stage 1 of the TTS pipeline: render the Voice Design Matrix (K1…E6) into a reference bank.

    pip install torch torchaudio omnivoice soundfile
    python3 tools/build_voice_bank.py --out voice_bank

Then listen to the takes, delete the ones you do not like, and render the game audio with
    python3 ../tools/make-audio.py phrases.json --engine omnivoice --bank voice_bank
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from qv_audio.tts import OmniVoiceGameSpeaker  # noqa: E402

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="voice_bank")
    ap.add_argument("--model", default="k2-fsa/OmniVoice")
    ap.add_argument("--device")
    a = ap.parse_args()
    OmniVoiceGameSpeaker(a.model, device=a.device).build_bank(a.out)
