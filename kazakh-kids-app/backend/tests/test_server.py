"""HTTP contract of the voice server, with a stub recogniser (no model download needed)."""
import io
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
import wave
from http.server import ThreadingHTTPServer

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from qv_audio.assessor import KazakhVoiceAssessor, read_wav  # noqa: E402
from qv_audio.stt import SttEngine  # noqa: E402
from server import make_handler  # noqa: E402


class StubEngine(SttEngine):
    name = "stub"

    def transcribe(self, samples):
        return "салем досым", 0.9


def wav_bytes(seconds=1.0, rate=16000, amp=0.3, channels=1):
    t = np.arange(int(seconds * rate)) / rate
    x = (np.sin(2 * np.pi * 220 * t) * amp * 32767).astype(np.int16)
    if channels == 2:
        x = np.repeat(x, 2)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels); w.setsampwidth(2); w.setframerate(rate); w.writeframes(x.tobytes())
    return buf.getvalue()


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(KazakhVoiceAssessor(StubEngine()), threading.Lock()))
        cls.base = f"http://127.0.0.1:{cls.httpd.server_address[1]}"
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def post(self, target, body):
        req = urllib.request.Request(self.base + "/assess?target=" + urllib.parse.quote(target), data=body, headers={"Content-Type": "audio/wav"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.load(r), r.headers
        except urllib.error.HTTPError as e:
            return e.code, json.load(e), e.headers

    def test_health(self):
        with urllib.request.urlopen(self.base + "/health") as r:
            self.assertEqual(json.load(r), {"ok": True, "model": "stub", "vad": "energy"})
            self.assertEqual(r.headers["Access-Control-Allow-Origin"], "*")

    def test_assess(self):
        code, j, headers = self.post("Сәлем, досым!", wav_bytes())
        self.assertEqual(code, 200)
        self.assertEqual(j["hypothesis"], "салем досым")
        self.assertEqual(j["missed"], ["ә"])
        self.assertAlmostEqual(j["score"], 78.3)
        self.assertEqual(headers["Access-Control-Allow-Origin"], "*")

    def test_silence_is_reported(self):
        code, j, _ = self.post("Сәлем", wav_bytes(amp=0.0))
        self.assertEqual((code, j["error"]), (200, "silence"))

    def test_rejects_bad_requests(self):
        self.assertEqual(self.post("", wav_bytes())[0], 400)                 # no target
        self.assertEqual(self.post("Сәлем", b"not a wav file at all" * 4)[0], 400)
        self.assertEqual(self.post("x" * 400, wav_bytes())[0], 400)          # absurd target

    def test_preflight(self):
        req = urllib.request.Request(self.base + "/assess", method="OPTIONS")
        with urllib.request.urlopen(req) as r:
            self.assertEqual(r.status, 204)
            self.assertIn("POST", r.headers["Access-Control-Allow-Methods"])

    def test_resampling_and_stereo(self):
        x = read_wav(wav_bytes(seconds=0.5, rate=48000, channels=2))
        self.assertAlmostEqual(len(x) / 16000, 0.5, places=2)


if __name__ == "__main__":
    unittest.main()
