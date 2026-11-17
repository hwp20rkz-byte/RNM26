"""Scoring: properties + the shared vectors that web/score-core.js must reproduce exactly."""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from qv_audio import scoring  # noqa: E402

VECTORS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vectors.json")
CASES = [
    ("Сәлем, досым!", "Сәлем, досым!", None), ("салем досым", "Сәлем, досым!", 0.9), ("", "Қанша тұрады?", None),
    ("канша турады", "Қанша тұрады?", None), ("қанша тұрады", "Қанша тұрады?", 0.62), ("түсіріп беріңізші", "Түсіріп беріңізші!", None),
    ("тусирип беринизши", "Түсіріп беріңізші!", None), ("оңға бұрыл", "Оңға бұрыл!", 1.0), ("онга бурыл", "Оңға бұрыл!", 1.0),
    ("тоқта бағдаршам қызыл", "Тоқта, бағдаршам қызыл!", 0.8), ("шай ішіңіз ыстықтай", "Шай ішіңіз, ыстықтай!", None),
    ("мен мектепке барамын", "Мен таңертең мектепке барамын", None), ("абсолютно другое", "Ас болсын!", None),
    ("ёлка", "елка", None), ("Айдаһар", "айдахар", None), ("mong jejs", "мың жеті жүз", None),
    ("730", "жеті жүз отыз", None), ("1500 теңге", "Мың бес жүз теңге", 0.9), ("56", "елу алты", None), ("2 алма", "екі алма", None),
]


class ScoringTest(unittest.TestCase):
    def test_perfect(self):
        r = scoring.assess("Сәлем, досым!", "сәлем досым")
        self.assertEqual(r.score, 100.0)
        self.assertTrue(r.passed)
        self.assertEqual(r.missed, [])

    def test_special_letters_weigh_more(self):
        special = scoring.assess("канша", "қанша")     # қ → к
        plain = scoring.assess("ханша", "нанша")       # same position, ordinary letters
        self.assertLess(special.score, plain.score)
        self.assertEqual(special.missed, ["қ"])

    def test_confidence_scales_score(self):
        a = scoring.assess("қанша тұрады", "Қанша тұрады?", 1.0)
        b = scoring.assess("қанша тұрады", "Қанша тұрады?", 0.5)
        self.assertEqual(a.score, 100.0)
        self.assertEqual(b.score, 50.0)
        self.assertFalse(b.passed)

    def test_bounds(self):
        for hyp, tgt, conf in CASES:
            r = scoring.assess(hyp, tgt, conf)
            self.assertGreaterEqual(r.score, 0)
            self.assertLessEqual(r.score, 100)

    def test_feedback_names_missed_letters(self):
        r = scoring.assess("онга бурыл", "Оңға бұрыл!")
        self.assertEqual(sorted(r.missed), sorted(["ң", "ғ", "ұ"]))
        self.assertIn("Ң", r.feedback["kk"])

    def test_vectors_match_file(self):
        got = [{"hyp": h, "target": t, "conf": c, **{k: v for k, v in scoring.assess(h, t, c).to_dict().items() if k in ("score", "accuracy", "passed", "missed", "hypothesis")}}
               for h, t, c in CASES]
        if os.environ.get("QV_WRITE_VECTORS"):
            json.dump(got, open(VECTORS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        self.assertEqual(got, json.load(open(VECTORS, encoding="utf-8")))


if __name__ == "__main__":
    unittest.main()
