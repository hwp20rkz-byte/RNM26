#!/usr/bin/env python3
"""Measure a speech engine on the game's own phrases.

Decodes the bundled recordings (web/audio/*.mp3, synthetic voice) back to 16 kHz audio, runs the full
assessment pipeline and reports the mean score, pass rate and latency. A clean synthetic voice is the
*easy* case — real children will score lower — so treat the numbers as an upper bound for each engine.

    python3 tools/eval_stt.py phrases.json --engine whisper-onnx --model models/sherpa-onnx-whisper-turbo
"""
import argparse
import json
import os
import random
import statistics
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from qv_audio.assessor import KazakhVoiceAssessor  # noqa: E402
from qv_audio.stt import build_engine  # noqa: E402
from qv_audio.vad import build_vad  # noqa: E402

AUDIO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "web", "audio")


def decode(path: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("phrases")
    ap.add_argument("--engine", required=True)
    ap.add_argument("--model")
    ap.add_argument("--vad")
    ap.add_argument("-n", type=int, default=120)
    ap.add_argument("--min-chars", type=int, default=8, help="skip very short phrases (single short words)")
    ap.add_argument("--out")
    a = ap.parse_args()

    phrases = [p for p in json.load(open(a.phrases, encoding="utf-8")) if len(p["text"]) >= a.min_chars and p.get("voice", "NARR") == "NARR"]
    random.Random(7).shuffle(phrases)
    phrases = phrases[: a.n]
    assessor = KazakhVoiceAssessor(build_engine(a.engine, a.model), build_vad(a.vad))
    rows = []
    for p in phrases:
        f = os.path.join(AUDIO, p["key"] + ".mp3")
        if not os.path.exists(f):
            continue
        r = assessor.assess_samples(decode(f), p["text"])
        if "error" in r:
            rows.append({"text": p["text"], "score": 0.0, "passed": False, "hyp": "<" + r["error"] + ">", "ms": 0})
        else:
            rows.append({"text": p["text"], "score": r["score"], "passed": r["passed"], "hyp": r["hypothesis"], "ms": r["ms"]})
    scores = [r["score"] for r in rows]
    summary = {
        "engine": assessor.engine.name, "vad": assessor.vad.name, "phrases": len(rows),
        "mean_score": round(statistics.mean(scores), 1), "median_score": round(statistics.median(scores), 1),
        "pass_rate": round(100 * sum(r["passed"] for r in rows) / len(rows), 1),
        "perfect_rate": round(100 * sum(r["score"] >= 99.9 for r in rows) / len(rows), 1),
        "median_ms": int(statistics.median(r["ms"] for r in rows)),
    }
    print(json.dumps(summary, ensure_ascii=False))
    for r in sorted(rows, key=lambda r: r["score"])[:8]:
        print(f"  {r['score']:5.1f}  {r['text']!r} -> {r['hyp']!r}")
    if a.out:
        json.dump({"summary": summary, "rows": rows}, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
