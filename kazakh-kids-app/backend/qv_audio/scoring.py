"""Pronunciation scoring — the Python twin of web/score-core.js (same algorithm, same test vectors).

    Score = (1 - WLev(H, T) / max(|H|w, |T|w)) * Confidence          (0–100 %)

WLev is a grapheme-level Levenshtein distance in which an error on one of the nine specifically
Kazakh letters (Ә І Ң Ғ Ү Ұ Қ Ө Һ) costs 1.5 instead of 1; |x|w is the length under the same weights.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List

SPECIAL = "әіңғүұқөһ"
SPECIAL_W = 1.5
PASS = 70.0

_KEEP = re.compile(r"[^a-zа-яәіңғүұқөһ0-9\s]")
_WS = re.compile(r"\s+")


_UNITS = ["", "бір", "екі", "үш", "төрт", "бес", "алты", "жеті", "сегіз", "тоғыз"]
_TENS = ["", "он", "жиырма", "отыз", "қырық", "елу", "алпыс", "жетпіс", "сексен", "тоқсан"]
_DIGITS = re.compile(r"\d+")


def num_to_kk(n: int) -> str:
    """0–9999 in Kazakh words (recognisers like Whisper write «730» where the child said «жеті жүз отыз»)."""
    if n == 0:
        return "нөл"
    if n > 9999:
        return str(n)
    th, h, t, u = n // 1000, n % 1000 // 100, n % 100 // 10, n % 10
    out = []
    if th:
        out.append("мың" if th == 1 else _UNITS[th] + " мың")
    if h:
        out.append("жүз" if h == 1 else _UNITS[h] + " жүз")
    if t:
        out.append(_TENS[t])
    if u:
        out.append(_UNITS[u])
    return " ".join(out)


def normalize(text: str) -> str:
    """Lower-case, spell out numbers, drop punctuation, collapse whitespace (ё → е)."""
    t = (text or "").lower().replace("ё", "е")
    t = _DIGITS.sub(lambda m: " " + num_to_kk(int(m.group())) + " ", t)
    return _WS.sub(" ", _KEEP.sub(" ", t)).strip()


def _w(ch: str) -> float:
    return SPECIAL_W if ch in SPECIAL else 1.0


def _wlen(s: str) -> float:
    return sum(_w(c) for c in s)


@dataclass
class Op:
    op: str   # ok | sub | del | ins
    t: str    # target grapheme ("" for an insertion)
    h: str    # heard grapheme ("" for a deletion)


def align(hyp: str, tgt: str) -> tuple[float, List[Op]]:
    """Weighted alignment of the hypothesis against the target. Returns (distance, operations)."""
    n, m = len(hyp), len(tgt)
    d = [[0.0] * (m + 1) for _ in range(n + 1)]
    bt = [[""] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        d[i][0], bt[i][0] = d[i - 1][0] + 1, "ins"
    for j in range(1, m + 1):
        d[0][j], bt[0][j] = d[0][j - 1] + _w(tgt[j - 1]), "del"
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            same = hyp[i - 1] == tgt[j - 1]
            sub = d[i - 1][j - 1] + (0 if same else _w(tgt[j - 1]))
            dele = d[i][j - 1] + _w(tgt[j - 1])   # a target letter was not said
            ins = d[i - 1][j] + 1                  # an extra sound was said
            best = min(sub, dele, ins)
            d[i][j] = best
            bt[i][j] = ("ok" if same else "sub") if best == sub else ("del" if best == dele else "ins")
    ops: List[Op] = []
    i, j = n, m
    while i > 0 or j > 0:
        op = bt[i][j]
        if op in ("ok", "sub"):
            ops.append(Op(op, tgt[j - 1], hyp[i - 1])); i -= 1; j -= 1
        elif op == "del":
            ops.append(Op("del", tgt[j - 1], "")); j -= 1
        else:
            ops.append(Op("ins", "", hyp[i - 1])); i -= 1
    ops.reverse()
    return d[n][m], ops


@dataclass
class Assessment:
    target: str
    hypothesis: str
    accuracy: float        # 0–100, before the confidence factor
    confidence: float      # 0–1
    score: float           # 0–100
    passed: bool
    missed: List[str] = field(default_factory=list)   # special letters that were not pronounced clearly
    feedback: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "target": self.target, "hypothesis": self.hypothesis, "accuracy": self.accuracy,
            "confidence": self.confidence, "score": self.score, "passed": self.passed,
            "missed": self.missed, "feedback": self.feedback,
        }


def feedback(score: float, missed: List[str]) -> dict:
    if missed:
        letters = ", ".join(missed).upper()
        return {
            "kk": f"Назар аудар! Мына дыбыстарды анығырақ айт: {letters}",
            "ru": f"Обрати внимание! Произнеси чётче звуки: {letters}",
            "en": f"Listen closely! Say these sounds more clearly: {letters}",
        }
    if score >= 90:
        return {"kk": "Керемет айтылым!", "ru": "Отличное произношение!", "en": "Excellent pronunciation!"}
    if score >= PASS:
        return {"kk": "Жақсы! Тағы сәл анығырақ.", "ru": "Хорошо! Ещё чуть-чуть чётче.", "en": "Good! Just a little clearer."}
    return {"kk": "Тағы бір рет айтып көр.", "ru": "Попробуй сказать ещё раз.", "en": "Try saying it once more."}


def _round1(x: float) -> float:
    # round half up like JavaScript's Math.round(x * 10) / 10, so both sides report identical numbers
    import math
    return math.floor(x * 10 + 0.5) / 10


def assess(hypothesis: str, target: str, confidence: float | None = None) -> Assessment:
    h, t = normalize(hypothesis), normalize(target)
    conf = 1.0 if confidence is None else max(0.0, min(1.0, float(confidence)))
    dist, ops = align(h, t)
    denom = max(_wlen(h), _wlen(t))
    acc = max(0.0, 1 - dist / denom) if denom > 0 else 1.0
    missed: List[str] = []
    for o in ops:
        if o.t and o.t in SPECIAL and o.op != "ok" and o.t not in missed:
            missed.append(o.t)
    score = _round1(acc * conf * 100)
    return Assessment(t, h, _round1(acc * 100), conf, score, score >= PASS, missed, feedback(score, missed))
