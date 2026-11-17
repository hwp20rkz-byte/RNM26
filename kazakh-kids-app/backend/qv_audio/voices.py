"""Voice Design Matrix for k2-fsa/OmniVoice (stock weights, no fine-tuning).

OmniVoice voice design accepts only a fixed attribute vocabulary:
    gender: male | female
    age:    child | teenager | young adult | middle-aged | elderly
    pitch:  very low pitch | low pitch | moderate pitch | high pitch | very high pitch
    style:  whisper          (+ English accents / Chinese dialects, not used here)
Free-form descriptors from the design brief ("energetic", "warm chest resonance", …) are not part of that
vocabulary, so they live in `brief` for the humans picking the takes; `instruct` is what the model gets.
Each category is rendered in three variants (pitch one step lower / as designed / one step higher) → K1…K3 etc.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

PITCHES = ["very low pitch", "low pitch", "moderate pitch", "high pitch", "very high pitch"]


@dataclass(frozen=True)
class Voice:
    id: str
    category: str
    instruct: str      # valid OmniVoice voice-design string
    brief: str         # the original creative brief (for casting, not sent to the model)
    languages: tuple
    speed: float = 1.0


def _triple(prefix: str, start: int, gender: str, age: str, pitch: str, category: str, brief: str, langs=("kk", "ru"), speed=1.0) -> List[Voice]:
    i = PITCHES.index(pitch)
    variants = [PITCHES[max(0, i - 1)], PITCHES[i], PITCHES[min(len(PITCHES) - 1, i + 1)]]
    return [Voice(f"{prefix}{start + n}", category, f"{gender}, {age}, {p}", brief, langs, speed) for n, p in enumerate(variants)]


VOICE_MATRIX: List[Voice] = (
    _triple("K", 1, "male", "child", "high pitch", "Ребёнок, мальчик 7–9 лет", "energetic, playful, bright resonance — задорный, звонкий", speed=1.05)
    + _triple("G", 1, "female", "child", "high pitch", "Ребёнок, девочка 7–9 лет", "cheerful, sweet, lively — любопытная, быстрая", speed=1.05)
    + _triple("T", 1, "male", "teenager", "moderate pitch", "Подросток, парень 14–16 лет", "casual, slightly raspy, fast pace — геймерский", speed=1.1)
    + _triple("T", 4, "female", "teenager", "moderate pitch", "Подросток, девушка 14–16 лет", "upbeat, confident, melodic — блогерская", speed=1.05)
    + _triple("M", 1, "male", "young adult", "high pitch", "Молодой парень 20–25 (эталон B2)", "clear articulation — чистый, харизматичный гид", langs=("kk",))
    + _triple("M", 4, "male", "young adult", "moderate pitch", "Молодой мужчина 25–30 (эталон A3)", "warm broadcast tone — уверенный ментор", langs=("ru",))
    + _triple("W", 1, "female", "young adult", "moderate pitch", "Молодая девушка 20–25", "soft, smiling tone, clear diction — вдохновляющая", speed=0.95)
    + _triple("E", 1, "male", "elderly", "low pitch", "Мудрый аксакал / батыр", "deep baritone, slow cadence, gravelly — эпичный", speed=0.9)
    + _triple("E", 4, "female", "elderly", "moderate pitch", "Добрая әже", "caring, warm, gentle vibrato — заботливая", speed=0.9)
)
BY_ID: Dict[str, Voice] = {v.id: v for v in VOICE_MATRIX}

# Who speaks with which reference voice (the game stores the same tags in web/world.js → LINE_VOICE).
CHARACTER_VOICES = {
    "batyr": "M1",      # Батыр-X — молодой, звонкий, харизматичный (эталон B2)
    "aisulu": "T4",     # Айсұлу Neon — позитивная девушка-тинейджер
    "azhe": "E4",       # Әже-Bot 3000 — нежная, заботливая пожилая женщина
    "tayson": "K1",     # Тайсон-Тайпақ — задорный мальчишеский голос
    "judge": "E1",      # судья аукциона
    "narrator": "W1",   # диктор уроков
    "mentor_ru": "M4",  # русские подсказки (эталон A3)
}

# Short, phonetically rich seed sentences used to record the reference takes (3–10 s each).
SEED_TEXT = {
    "kk": "Сәлем, достар! Бүгін біз қазақ тілін үйренеміз: әже, қоңыр үй, ұшқыш, өрік және жүгері.",
    "ru": "Привет, друзья! Сегодня мы вместе учим казахский язык — легко, весело и с настроением.",
}
