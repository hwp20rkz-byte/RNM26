#!/usr/bin/env python3
"""QazaqVerse Voice Server — pronunciation assessment for the game over plain HTTP (standard library only).

    GET  /health                      → {"ok": true, "model": "...", "vad": "..."}
    POST /assess?target=<phrase>      body: 16-bit PCM WAV  → score JSON (see qv_audio/scoring.py)

Run it on a computer in the same Wi-Fi network as the phone and type its address into the game
(profile → «Дауыс»), e.g. http://192.168.1.10:8765

  # the model from the project spec (GPU recommended, needs torch + transformers)
  python3 server.py --engine hf

  # CPU-only laptop: Whisper turbo as INT8 ONNX through sherpa-onnx
  python3 server.py --engine whisper-onnx --model models/sherpa-onnx-whisper-turbo --vad models/silero_vad.onnx

  # small edge box: Omnilingual CTC (350 MB) or Dolphin (100 MB)
  python3 server.py --engine omnilingual --model models/sherpa-onnx-omnilingual-asr-1600-languages-300M-ctc-int8-2025-11-12
"""
from __future__ import annotations

import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from qv_audio.assessor import KazakhVoiceAssessor
from qv_audio.stt import build_engine
from qv_audio.vad import build_vad

MAX_BODY = 4 * 1024 * 1024   # ~2 minutes of 16 kHz audio; a phrase is a few seconds
MAX_TARGET = 300


def make_handler(assessor: KazakhVoiceAssessor, lock: threading.Lock):
    class Handler(BaseHTTPRequestHandler):
        server_version = "QazaqVerseVoice/3.0"

        def _send(self, code: int, payload: dict):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")           # the game runs from file://
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):  # CORS pre-flight
            self._send(204, {})

        def do_GET(self):
            if urlparse(self.path).path == "/health":
                self._send(200, {"ok": True, "model": assessor.engine.name, "vad": assessor.vad.name})
            else:
                self._send(404, {"error": "not_found"})

        def do_POST(self):
            url = urlparse(self.path)
            if url.path != "/assess":
                return self._send(404, {"error": "not_found"})
            target = (parse_qs(url.query).get("target") or [""])[0].strip()
            if not target or len(target) > MAX_TARGET:
                return self._send(400, {"error": "bad_target"})
            try:
                size = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                size = 0
            if size <= 44 or size > MAX_BODY:
                return self._send(413 if size > MAX_BODY else 400, {"error": "bad_audio"})
            data = self.rfile.read(size)
            try:
                with lock:                                   # one inference at a time
                    result = assessor.assess_wav(data, target)
            except ValueError as e:
                return self._send(400, {"error": "bad_audio", "detail": str(e)})
            except Exception as e:                           # never leak a traceback to the client
                print(f"[assess] {type(e).__name__}: {e}")
                return self._send(500, {"error": "server"})
            self._send(200, result)

        def log_message(self, fmt, *args):
            print("[http]", self.address_string(), fmt % args)

    return Handler


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", choices=["hf", "whisper-onnx", "dolphin", "omnilingual"], default="hf")
    ap.add_argument("--model", help="model directory (sherpa engines) or Hugging Face id (hf)")
    ap.add_argument("--vad", help="path to silero_vad.onnx (optional; an energy detector is used without it)")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()

    assessor = KazakhVoiceAssessor(build_engine(args.engine, args.model), build_vad(args.vad))
    httpd = ThreadingHTTPServer((args.host, args.port), make_handler(assessor, threading.Lock()))
    print(f"QazaqVerse Voice Server: {assessor.engine.name} + {assessor.vad.name} on http://{args.host}:{args.port}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
