"""Hero voice studio without network: QA maths on synthetic voices, the Space adapters against a fake gradio
client, the Freedom Speech adapter against a fake HTTP opener, and audition → pick → render end to end.
Run: python3 tests/voice_studio_test.py"""
import base64
import importlib.util
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
from voice_studio import engines as E  # noqa: E402
from voice_studio.audio import SR, read_audio, wav_bytes, write_wav  # noqa: E402
from voice_studio.qa import assess, median_f0, mel_fingerprint, timbre_similarity  # noqa: E402

spec = importlib.util.spec_from_file_location("vstudio", os.path.join(ROOT, "tools", "voice-studio.py"))
VS = importlib.util.module_from_spec(spec); spec.loader.exec_module(VS)


def voice(f0, seconds=2.0, sr=SR, bright=1.0, seed=0):
    """Speech-like test signal: harmonic source, slight vibrato, syllable envelope, a formant-ish tilt."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(seconds * sr)) / sr
    ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.02 * np.sin(2 * np.pi * 5 * t))) / sr
    x = sum((bright / k) * np.sin(k * ph) for k in range(1, 12))
    env = 0.5 * (1 + np.sin(2 * np.pi * 3.5 * t - 1.5)) ** 2
    x = x * env + 0.002 * rng.standard_normal(len(t))
    return (0.25 * x / np.max(np.abs(x))).astype(np.float32)


PITCH_HZ = {"very low pitch": 85, "low pitch": 110, "moderate pitch": 180, "high pitch": 280, "very high pitch": 360}


class FakeEngine:
    """design: pitch from the instruct; clone: pitch of the reference; counts calls; can run out of quota."""
    name = "fake"

    def __init__(self, quota_after=None):
        self.calls, self.quota_after = [], quota_after

    def _tick(self):
        self.calls.append(1)
        if self.quota_after is not None and len(self.calls) > self.quota_after:
            raise E.QuotaError("fake: quota")

    def design(self, text, hero, language="kk"):
        self._tick()
        p = next(a.strip() for a in hero["instruct"].split(",") if "pitch" in a)
        return voice(PITCH_HZ[p], seconds=max(1.0, len(text) / 14)), SR

    def clone(self, text, ref_wav, ref_text, language="kk", speed=1.0):
        self._tick()
        f0, _ = median_f0(*read_audio(ref_wav))
        return voice(f0, seconds=max(1.0, len(text) / 14), seed=len(self.calls)), SR


class QA(unittest.TestCase):
    def test_pitch_estimate(self):
        for f in (90, 120, 200, 260, 340):
            est, voiced = median_f0(voice(f), SR)
            self.assertLess(abs(est - f) / f, 0.03, (f, est))
            self.assertGreater(voiced, 0.3)

    def test_casting_score(self):
        child = assess(voice(300), SR, "Сәлем, достар! Мен Тайсонмын.", (220, 380))
        adult = assess(voice(120), SR, "Сәлем, достар! Мен Тайсонмын.", (220, 380))
        self.assertEqual(child.pitch_score, 1.0)
        self.assertLess(adult.pitch_score, 0.1)
        self.assertIn("pitch low", adult.notes)
        self.assertGreater(child.score, adult.score + 40)

    def test_timbre(self):
        a, b, c = mel_fingerprint(voice(200, seed=1), SR), mel_fingerprint(voice(200, seed=2), SR), mel_fingerprint(voice(200, bright=0.15), SR)
        self.assertGreater(timbre_similarity(a, b), 0.98)
        self.assertGreater(timbre_similarity(a, b), timbre_similarity(a, c))


class Cast(unittest.TestCase):
    def test_sheet(self):
        heroes = VS.load_cast()
        for tag in ("K1", "M1", "T4", "E4", "E1", "ALIBEK", "ANEL", "ZHALKAU", "ATA", "AZHE", "ARCH"):
            self.assertIn(tag, heroes)
        for tag, h in heroes.items():
            self.assertEqual(E.check_instruct(h["instruct"]), [], tag)
            self.assertTrue(any(ch in h["seed"] for ch in "әғқңөұүһі"), tag + ": seed should exercise Kazakh letters")
            self.assertLess(h["f0"][0], h["f0"][1])
            self.assertTrue(h["design"] and h["seed_ru"])

    def test_instruct_check(self):
        self.assertEqual(E.check_instruct("female, child, high pitch"), [])
        self.assertTrue(E.check_instruct("female, energetic"))
        self.assertTrue(E.check_instruct("male, female"))
        self.assertEqual(VS.pitch_variant("male, child, high pitch", 1), "male, child, very high pitch")
        self.assertEqual(VS.pitch_variant("male, child, very high pitch", 1), "male, child, very high pitch")


class FakeClient:
    """Mimics gradio_client.Client for the OmniVoice demo (omnivoice/cli/demo.py) and a Qwen-like Space."""

    def __init__(self, tmp, quota=False):
        self.tmp, self.quota, self.calls = tmp, quota, []

    def view_api(self, return_format="dict", print_info=False):
        p = lambda n, label: {"parameter_name": n, "label": label}
        clone = [p("text", "Text"), p("lang", "Language"), p("ref_aud", "Reference Audio"), p("ref_text", "Reference Text"), p("instruct", "Instruct")] + [p(f"s{i}", "x") for i in range(7)]
        design = [p("text", "Text"), p("lang", "Language")] + [p(f"s{i}", "x") for i in range(7)] + [p(f"g{i}", "group") for i in range(6)]
        qwen = [p("text", "Text to synthesize"), p("language", "Language"), p("voice_description", "Voice description")]
        return {"named_endpoints": {"/_clone_fn": {"parameters": clone}, "/_design_fn": {"parameters": design}, "/voice_design": {"parameters": qwen}}}

    def predict(self, *args, api_name=None, **kw):
        self.calls.append((api_name, args, kw))
        if self.quota:
            raise RuntimeError("You have exceeded your GPU quota (60s requested vs. 0s left)")
        path = os.path.join(self.tmp, f"out{len(self.calls)}.wav")
        write_wav(path, voice(200), SR)
        return path, "Done."


class Spaces(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_omnivoice_design_and_clone(self):
        fc = FakeClient(self.tmp)
        ov = E.OmniVoiceSpace(client=fc)
        x, sr = ov.design("Сәлем!", {"instruct": "female, child, high pitch", "speed": 0.95}, "kk")
        api, args, _ = fc.calls[-1]
        self.assertEqual(api, "/_design_fn")
        self.assertEqual(args[:2], ("Сәлем!", "Kazakh"))
        self.assertEqual(args[2:9], (32, 2.0, True, 0.95, None, True, True))
        self.assertEqual(args[9:13], ("Female / 女", "Child / 儿童", "High Pitch / 高音调", "Auto"))
        self.assertEqual(len(args), 15)
        self.assertEqual(sr, SR); self.assertGreater(len(x), 1000)
        ref = os.path.join(self.tmp, "ref.wav"); write_wav(ref, voice(250))
        ov.clone("Қайырлы таң!", ref, "Сәлем!", "kk", 1.0)
        api, args, _ = fc.calls[-1]
        self.assertEqual(api, "/_clone_fn")
        self.assertEqual((args[0], args[1], args[3], args[4]), ("Қайырлы таң!", "Kazakh", "Сәлем!", ""))
        self.assertEqual(len(args), 12)

    def test_qwen_maps_by_label(self):
        fc = FakeClient(self.tmp)
        q = E.QwenDesignSpace(client=fc)
        q.design("Привет!", {"design": "A cheerful boy"}, "ru")
        api, args, kw = fc.calls[-1]
        self.assertEqual(api, "/voice_design")
        self.assertEqual(kw, {"text": "Привет!", "language": "Russian", "voice_description": "A cheerful boy"})

    def test_quota_and_pinning(self):
        ov = E.OmniVoiceSpace(client=FakeClient(self.tmp, quota=True))
        with self.assertRaises(E.QuotaError):
            ov.design("Сәлем!", {"instruct": "male, child, high pitch"})
        with self.assertRaises(E.EngineError):
            E.OmniVoiceSpace(client=FakeClient(self.tmp), api_design="/nope").design("Сәлем!", {"instruct": "male"})

    def test_space_error_status(self):
        with self.assertRaises(E.EngineError):
            E._audio_from_result((None, "Error: ValueError: bad"))


class Freedom(unittest.TestCase):
    def test_design_and_clone(self):
        sent = []

        class Resp(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *a): return False

        def opener(req, timeout=0):
            sent.append(req)
            if req.full_url.endswith("/api/voice-design"):
                return Resp(json.dumps({"reference_wav_base64": base64.b64encode(wav_bytes(voice(220))).decode()}).encode())
            return Resp(wav_bytes(voice(220)))

        fs = E.FreedomSpeechCloud(base_url="http://mock", key="k", opener=opener)
        x, sr = fs.design("Сәлем!", {"design": "kind grandmother"}, "kk")
        self.assertEqual(sent[0].get_header("X-api-key"), "k")
        self.assertEqual(json.loads(sent[0].data)["instruct"], "kind grandmother")
        tmp = tempfile.mkdtemp()
        try:
            ref = os.path.join(tmp, "r.wav"); write_wav(ref, voice(220))
            fs.clone("Сәлем!", ref, "", "kk")
            self.assertIn(b'name="audio"', sent[1].data)
            self.assertIn("multipart/form-data", sent[1].get_header("Content-type"))
        finally:
            shutil.rmtree(tmp)


class EndToEnd(unittest.TestCase):
    def setUp(self):
        self.out = tempfile.mkdtemp()
        self.audio = os.path.join(self.out, "audio")
        os.makedirs(self.audio)
        self.ph = os.path.join(self.out, "phrases.json")
        with open(self.ph, "w", encoding="utf-8") as fh:
            json.dump([{"key": "k1", "text": "Сәлеметсіз бе! Мен Әлібекпін.", "voice": "ALIBEK"},
                       {"key": "k2", "text": "Бәйтерек өте биік.", "voice": "ALIBEK"},
                       {"key": "k3", "text": "Сәлем!", "voice": "NARR"},
                       {"key": "k4", "text": "Мен Әнелмін.", "voice": "ANEL"}], fh)
        self.logs = []

    def tearDown(self):
        shutil.rmtree(self.out)

    def run_vs(self, *argv, **kw):
        return VS.main(["--out", self.out] + list(argv), log=self.logs.append, **kw)

    def test_audition_pick_render(self):
        eng = FakeEngine()
        self.assertEqual(self.run_vs("audition", "--heroes", "ALIBEK,ANEL", "--takes", "3", engine=eng), 0)
        self.assertEqual(len(eng.calls), 6)
        rep = VS.read_json(os.path.join(self.out, "takes.json"))
        # take 2 is one pitch step lower ("moderate") → outside a child's range → lower score
        self.assertGreater(rep["ALIBEK"]["t1"]["score"], rep["ALIBEK"]["t2"]["score"])
        with open(os.path.join(self.out, "audition.html"), encoding="utf-8") as fh:
            page = fh.read()
        self.assertIn("pick ALIBEK 1", page); self.assertIn("<audio", page)
        self.assertEqual(self.run_vs("audition", "--heroes", "ALIBEK", engine=eng), 0)
        self.assertEqual(len(eng.calls), 6, "existing takes are kept")

        self.assertEqual(self.run_vs("pick", "ALIBEK", "1"), 0)
        self.assertTrue(os.path.exists(os.path.join(self.out, "bank", "ALIBEK.kk.txt")))
        self.assertEqual(self.run_vs("render", self.ph, "--heroes", "ALIBEK,ANEL", "--audio-dir", self.audio, engine=eng), 0)
        self.assertTrue(any("not picked yet" in l and "ANEL" in l for l in self.logs))
        self.assertEqual(sorted(os.listdir(self.audio)), ["k1.mp3", "k2.mp3"], "only the picked hero's lines, never the narrator")
        n = len(eng.calls)
        self.assertEqual(self.run_vs("render", self.ph, "--audio-dir", self.audio, engine=eng), 0)
        self.assertEqual(len(eng.calls), n, "rendered lines are skipped")
        self.run_vs("pick", "ALIBEK", "3")                     # a new reference → lines are redone
        self.assertEqual(self.run_vs("render", self.ph, "--audio-dir", self.audio, engine=eng), 0)
        self.assertGreater(len(eng.calls), n)
        log = VS.read_json(os.path.join(self.out, "render-log.json"))
        self.assertEqual(set(log), {"k1", "k2"})

    def test_quota_stops_and_resumes(self):
        self.assertEqual(self.run_vs("audition", "--heroes", "K1", "--takes", "3", engine=FakeEngine(quota_after=1)), 3)
        self.assertTrue(os.path.exists(os.path.join(self.out, "audition.html")), "report is written before stopping")
        self.assertEqual(self.run_vs("audition", "--heroes", "K1", "--takes", "3", engine=FakeEngine()), 0)
        self.assertEqual(len(os.listdir(os.path.join(self.out, "takes", "K1"))), 3)

    def test_via_designer(self):
        eng, des = FakeEngine(), FakeEngine()
        self.assertEqual(self.run_vs("audition", "--heroes", "ANEL", "--takes", "1", engine=eng, designer=des), 0)
        self.assertTrue(os.path.exists(os.path.join(self.out, "takes", "ANEL", "t1.design.wav")))
        self.assertEqual((len(des.calls), len(eng.calls)), (1, 1))


if __name__ == "__main__":
    unittest.main(verbosity=1)
